import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://learning-log.test';
const cookieName = '__Host-learning_log_session';
const chunkSize = 8 * 1024 * 1024;
const minute = 60_000;
const dayLength = 86_400_000;
const kstDay = now => new Date(now + 9 * 60 * minute).toISOString().slice(0, 10);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const migration = await readFile(path.join(root, 'migrations/0001_files.sql'), 'utf8');
const bundled = new Map();

async function bundle(now, dev = false) {
  const key = `${dev ? 'dev' : 'production'}:${now ?? 'realtime'}`;
  if (!bundled.has(key)) {
    bundled.set(key, build({
      absWorkingDir: root,
      entryPoints: [dev ? 'server/dev-worker.ts' : 'server/test-worker.ts'],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      ...(now === undefined ? {} : {
        // Substitute only the test bundle's clock so KST boundaries need no sleep.
        define: { 'Date.now': '__fixtureNow' },
        banner: { js: `function __fixtureNow() { return ${now}; }` },
      }),
    }).then(result => result.outputFiles[0].text));
  }
  return bundled.get(key);
}

function statements(sql) {
  // Preserve trigger bodies as single statements when applying the real migration.
  const result = [];
  let buffer = '';
  for (const line of sql.split(/\r?\n/)) {
    buffer += `${line}\n`;
    const trigger = /^\s*CREATE TRIGGER/i.test(buffer);
    if (trigger ? /^END;\s*$/i.test(line) : /;\s*$/.test(line)) {
      result.push(buffer.trim());
      buffer = '';
    }
  }
  assert.equal(buffer.trim(), '', 'All migration statements must be consumed');
  return result;
}

async function fixture(t, { now, dev = false } = {}) {
  const requestOrigin = dev ? 'http://127.0.0.1:5173' : origin;
  const sessionCookieName = dev ? 'learning_log_dev_session' : cookieName;
  const directory = await mkdtemp(path.join(tmpdir(), 'learning-log-api-test-'));
  const password = randomBytes(32).toString('hex');
  const options = convertV4MiniflareOptions({
    modules: true,
    script: await bundle(now, dev),
    compatibilityDate: '2026-10-23',
    bindings: { UPLOAD_SECRET: password },
    d1Databases: ['MY_DB'],
    r2Buckets: ['MY_BUCKET'],
    resourcePersistencePath: directory,
    unsafeTriggerHandlers: true,
    cf: false,
    log: new Log(LogLevel.ERROR),
    telemetry: { enabled: false },
  });
  // v5 proxies normally replace this header for local requests; the fixture uses
  // separate synthetic visitors to exercise the actual IP-based SQL limiter.
  for (const worker of options.workers) worker.dev.stripCfConnectingIp = false;
  const f = { mf: new Miniflare(options), password, now: now ?? Date.now() };
  t.after(async () => {
    await f.mf.dispose();
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
    assert.ok(path.basename(resolved).startsWith('learning-log-api-test-'));
    await rm(resolved, { recursive: true, force: true });
  });
  async function bindings() {
    f.db = await f.mf.getD1Database('MY_DB');
    f.bucket = await f.mf.getR2Bucket('MY_BUCKET');
  }
  await bindings();
  for (const statement of statements(migration)) await f.db.prepare(statement).run();
  f.restart = async () => {
    await f.mf.dispose();
    f.mf = new Miniflare(options);
    await bindings();
  };
  f.request = (route, { method = 'GET', auth, data, body, headers = {}, ip = '198.51.100.10', sameOrigin = true } = {}) => {
    const requestHeaders = new Headers({ 'CF-Connecting-IP': ip, ...headers });
    if (!['GET', 'HEAD'].includes(method) && sameOrigin && !requestHeaders.has('Origin')) requestHeaders.set('Origin', requestOrigin);
    if (auth) {
      requestHeaders.set('Cookie', auth.cookie);
      if (!requestHeaders.has('X-CSRF-Token')) requestHeaders.set('X-CSRF-Token', auth.csrfToken);
    }
    if (data !== undefined) {
      requestHeaders.set('Content-Type', 'application/json');
      body = JSON.stringify(data);
    }
    return f.mf.dispatchFetch(`${requestOrigin}${route}`, { method, headers: requestHeaders, body });
  };
  f.login = async (ip = '198.51.100.10') => {
    const response = await f.request('/api/auth/login', { method: 'POST', data: { password }, ip });
    const info = await expectJson(response, 200);
    const setCookie = response.headers.get('Set-Cookie');
    assert.ok(setCookie, 'A successful login must set a session cookie');
    const auth = { ...info, cookie: setCookie.split(';')[0], setCookie, ip };
    auth.hash = sha256(auth.cookie.slice(sessionCookieName.length + 1));
    return auth;
  };
  f.reserve = async (auth, name, size) => {
    const response = await f.request('/api/uploads', { method: 'POST', auth, data: { name, size } });
    return expectJson(response, 201);
  };
  f.putPart = (auth, id, number, bytes) => f.request(`/api/uploads/${id}/parts/${number}`, {
    method: 'PUT', auth, body: bytes, headers: { 'Content-Type': 'application/octet-stream' },
  });
  f.complete = (auth, id) => f.request(`/api/uploads/${id}/complete`, { method: 'POST', auth });
  f.upload = async (auth, name, bytes) => {
    const reservation = await f.reserve(auth, name, bytes.byteLength);
    assert.equal(reservation.chunkSize, chunkSize);
    for (let offset = 0, part = 1; offset < bytes.byteLength; offset += chunkSize, part++) {
      await expectJson(await f.putPart(auth, reservation.id, part, bytes.subarray(offset, offset + chunkSize)), 200);
    }
    await expectJson(await f.complete(auth, reservation.id), 201);
    return reservation.id;
  };
  f.list = async (options) => expectJson(await f.request('/api/files', options), 200);
  f.usage = async auth => expectJson(await f.request('/api/admin/usage', { auth }), 200);
  f.sweep = async () => {
    const worker = await f.mf.getWorker();
    return worker.scheduled({ scheduledTime: f.now, cron: '*/15 * * * *' });
  };
  return f;
}

async function expectJson(response, status, code) {
  const text = await response.text();
  assert.equal(response.status, status, `${response.status} != ${status}: ${text}`);
  const value = JSON.parse(text);
  if (code) assert.equal(value.code, code);
  return value;
}

async function seedRate(f, name, hits, window, now = f.now) {
  const bucket = Math.floor(now / window);
  await f.db.prepare('INSERT OR REPLACE INTO rate_limits(key,hits,expires_at) VALUES(?,?,?)')
    .bind(`${name}:${bucket}`, hits, (bucket + 1) * window).run();
}

test('local development uses an isolated HTTP cookie and still authenticates uploads', async t => {
  const f = await fixture(t, { dev: true });
  const auth = await f.login();
  assert.match(auth.setCookie, /^learning_log_dev_session=[a-f0-9]{64};/);
  assert.doesNotMatch(auth.setCookie, /__Host-|; Secure/);
  assert.match(auth.setCookie, /HttpOnly/);
  assert.equal((await expectJson(await f.request('/api/session', { auth }), 200)).authenticated, true);
  const bytes = Buffer.from('local file library');
  const id = await f.upload(auth, 'local-test.txt', bytes);
  const download = await f.request(`/api/files/${id}/download`);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  const remote = await f.mf.dispatchFetch('https://not-loopback.example/api/session');
  assert.equal(remote.status, 403);
  await expectJson(await f.request('/api/auth/activity', { method: 'POST', auth, headers: { Origin: 'https://hostile.test' } }), 403, 'csrf');
});

test('public reads work; every privileged route authenticates and validates CSRF', async t => {
  const f = await fixture(t);
  assert.deepEqual((await f.list()).files, []);
  assert.equal((await expectJson(await f.request('/api/session'), 200)).authenticated, false);
  const id = randomUUID();
  const writes = [
    ['/api/auth/remember', 'POST', { remember: true }],
    ['/api/auth/activity', 'POST'],
    ['/api/uploads', 'POST', { name: 'x.txt', size: 1 }],
    [`/api/uploads/${id}/parts/1`, 'PUT'],
    [`/api/uploads/${id}/complete`, 'POST'],
    [`/api/uploads/${id}`, 'DELETE'],
    ['/api/files/delete', 'POST', { ids: [id] }],
    ['/api/files/order', 'PUT', { ids: [id], revision: 0 }],
  ];
  for (const [route, method, data] of writes) {
    await expectJson(await f.request(route, { method, data }), 401, 'unauthorized');
  }
  await expectJson(await f.request('/api/admin/usage'), 401, 'unauthorized');
  const auth = await f.login();
  for (const [route, method, data] of writes) {
    await expectJson(await f.request(route, { method, data, auth, headers: { 'X-CSRF-Token': '' } }), 403, 'csrf');
    await expectJson(await f.request(route, { method, data, auth, headers: { Origin: 'https://hostile.test' } }), 403, 'csrf');
  }
  await expectJson(await f.request('/api/auth/activity', { method: 'POST', auth, headers: { 'Sec-Fetch-Site': 'cross-site' } }), 403, 'csrf');
  await expectJson(await f.request('/api/auth/login', { method: 'POST', data: { password: f.password }, sameOrigin: false }), 403, 'csrf');
});

test('login stores a token hash, applies secure session cookies, and logout invalidates replay', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  assert.match(auth.setCookie, /^__Host-learning_log_session=[a-f0-9]{64};/);
  for (const attribute of ['Path=/', 'HttpOnly', 'Secure', 'SameSite=Strict']) assert.ok(auth.setCookie.includes(attribute));
  assert.doesNotMatch(auth.setCookie, /Max-Age|Expires=/i);
  assert.equal(auth.mode, 'public');
  const stored = await f.db.prepare('SELECT * FROM sessions WHERE token_hash=?').bind(auth.hash).first();
  assert.ok(stored);
  assert.notEqual(stored.token_hash, auth.cookie.split('=')[1]);
  assert.ok(!JSON.stringify(stored).includes(f.password));
  assert.equal(stored.expires_at - stored.created_at, 15 * minute);
  await expectJson(await f.request('/api/auth/logout', { method: 'POST', auth, headers: { 'X-CSRF-Token': 'wrong' } }), 403, 'csrf');
  const logout = await f.request('/api/auth/logout', { method: 'POST', auth });
  await expectJson(logout, 200);
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal(await f.db.prepare('SELECT * FROM sessions WHERE token_hash=?').bind(auth.hash).first(), null);
  await expectJson(await f.request('/api/uploads', { method: 'POST', auth, data: { name: 'replayed.txt', size: 0 } }), 401, 'unauthorized');
  assert.equal((await expectJson(await f.request('/api/session', { auth }), 200)).authenticated, false);
});

test('logout still revokes the server session after the global API budget is exhausted', async t => {
  const f = await fixture(t, { now: Date.parse('2026-10-23T03:30:20Z') });
  const auth = await f.login();
  await seedRate(f, 'api-global', 20_000, dayLength);
  await expectJson(await f.request('/api/files'), 429, 'rate_limit');
  await expectJson(await f.request('/api/auth/logout', { method: 'POST', auth, headers: { 'X-CSRF-Token': 'invalid' } }), 403, 'csrf');
  assert.ok(await f.db.prepare('SELECT token_hash FROM sessions WHERE token_hash=?').bind(auth.hash).first());
  const logout = await f.request('/api/auth/logout', { method: 'POST', auth });
  await expectJson(logout, 200);
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal(await f.db.prepare('SELECT token_hash FROM sessions WHERE token_hash=?').bind(auth.hash).first(), null);
  await seedRate(f, 'api-global', 0, dayLength);
  await expectJson(await f.request('/api/uploads', { method: 'POST', auth, data: { name: 'replay', size: 1 } }), 401, 'unauthorized');
});

test('public sessions enforce five-minute idle and fifteen-minute absolute expiry server-side', async t => {
  const f = await fixture(t);
  const idle = await f.login();
  const oldActivity = Date.now() - 4 * minute;
  await f.db.prepare('UPDATE sessions SET last_active=? WHERE token_hash=?').bind(oldActivity, idle.hash).run();
  await expectJson(await f.request('/api/session', { auth: idle }), 200);
  await f.usage(idle);
  assert.equal((await f.db.prepare('SELECT last_active FROM sessions WHERE token_hash=?').bind(idle.hash).first()).last_active, oldActivity, 'background reads cannot prolong idle expiry');
  await expectJson(await f.request('/api/auth/activity', { method: 'POST', auth: idle }), 200);
  assert.ok((await f.db.prepare('SELECT last_active FROM sessions WHERE token_hash=?').bind(idle.hash).first()).last_active > oldActivity);
  await f.db.prepare('UPDATE sessions SET last_active=? WHERE token_hash=?').bind(Date.now() - 5 * minute - 1_000, idle.hash).run();
  await expectJson(await f.request('/api/admin/usage', { auth: idle }), 401, 'unauthorized');
  const absolute = await f.login('198.51.100.11');
  await f.db.prepare('UPDATE sessions SET created_at=?,last_active=?,expires_at=? WHERE token_hash=?')
    .bind(Date.now() - 15 * minute - 1_000, Date.now(), Date.now() - 1_000, absolute.hash).run();
  await expectJson(await f.request('/api/auth/activity', { method: 'POST', auth: absolute }), 401, 'unauthorized');
});

test('remember choice is single-use; private sessions expire at twelve hours without extension', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  const response = await f.request('/api/auth/remember', { method: 'POST', auth, data: { remember: true } });
  const info = await expectJson(response, 200);
  assert.equal(info.mode, 'private');
  const maxAge = Number(response.headers.get('Set-Cookie').match(/Max-Age=(\d+)/)?.[1]);
  assert.ok(maxAge > 43_190 && maxAge <= 43_200);
  let stored = await f.db.prepare('SELECT * FROM sessions WHERE token_hash=?').bind(auth.hash).first();
  assert.equal(stored.expires_at - stored.created_at, 12 * 60 * minute);
  await expectJson(await f.request('/api/auth/remember', { method: 'POST', auth, data: { remember: true } }), 409);
  await f.db.prepare('UPDATE sessions SET last_active=? WHERE token_hash=?').bind(Date.now() - 60 * minute, auth.hash).run();
  await f.usage(auth);
  await expectJson(await f.request('/api/auth/activity', { method: 'POST', auth }), 200);
  assert.equal((await f.db.prepare('SELECT expires_at FROM sessions WHERE token_hash=?').bind(auth.hash).first()).expires_at, stored.expires_at);
  await f.db.prepare('UPDATE sessions SET expires_at=? WHERE token_hash=?').bind(Date.now() - 1, auth.hash).run();
  await expectJson(await f.request('/api/admin/usage', { auth }), 401, 'unauthorized');
  const common = await f.login('198.51.100.12');
  const noRemember = await f.request('/api/auth/remember', { method: 'POST', auth: common, data: { remember: false } });
  assert.equal((await expectJson(noRemember, 200)).mode, 'public');
  assert.doesNotMatch(noRemember.headers.get('Set-Cookie'), /Max-Age|Expires=/i);
});

test('bad passwords and concurrent login attempts are throttled without returning the secret', async t => {
  const f = await fixture(t);
  const responses = await Promise.all(Array.from({ length: 8 }, () => f.request('/api/auth/login', {
    method: 'POST', data: { password: 'incorrect' }, ip: '203.0.113.90',
  })));
  assert.equal(responses.filter(r => r.status === 401).length, 5);
  assert.equal(responses.filter(r => r.status === 429).length, 3);
  for (const response of responses) {
    const value = await response.text();
    assert.ok(!value.includes(f.password));
    if (response.status === 429) assert.ok(Number(response.headers.get('Retry-After')) > 0);
  }
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS count FROM sessions').first()).count, 0);
  await seedRate(f, 'login-global', 30, 15 * minute);
  await expectJson(await f.request('/api/auth/login', { method: 'POST', data: { password: f.password }, ip: '203.0.113.91' }), 429, 'rate_limit');
});

test('real multipart upload downloads exact bytes; duplicate names, empty files, deletion and cache revisions work', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  const bytes = Buffer.alloc(chunkSize + 257, 0x6d);
  bytes.write('학습 자료 multipart 검사', 0, 'utf8');
  bytes[chunkSize] = 0xff;
  const large = await f.reserve(auth, '같은 이름.txt', bytes.length);
  assert.equal(large.partCount, 2);
  assert.equal((await f.usage(auth)).reservedBytes, bytes.length);
  assert.equal((await f.list()).files.length, 0);
  await expectJson(await f.putPart(auth, large.id, 1, bytes.subarray(0, chunkSize)), 200);
  await expectJson(await f.putPart(auth, large.id, 2, bytes.subarray(chunkSize)), 200);
  await expectJson(await f.complete(auth, large.id), 201);
  await expectJson(await f.complete(auth, large.id), 200, undefined);
  const smallBytes = Buffer.from('별도 파일 바이트\n');
  const small = await f.upload(auth, '같은 이름.txt', smallBytes);
  const empty = await f.upload(auth, '빈 파일.txt', Buffer.alloc(0));
  assert.notEqual(large.id, small);
  const listResponse = await f.request('/api/files');
  const listing = await expectJson(listResponse, 200);
  assert.equal(listing.files.length, 3);
  assert.equal(listing.files.filter(file => file.name === '같은 이름.txt').length, 2);
  assert.ok(listing.files.every(file => Number.isInteger(file.uploadedAt) && Number.isInteger(file.size)));
  assert.match(listResponse.headers.get('Cache-Control'), /public/);
  const notModified = await f.request('/api/files', { headers: { 'If-None-Match': listResponse.headers.get('ETag') } });
  assert.equal(notModified.status, 304);
  const rawObject = await f.bucket.get(`files/${large.id}`);
  assert.deepEqual(Buffer.from(await rawObject.arrayBuffer()), bytes);
  const download = await f.request(`/api/files/${large.id}/download`);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('Content-Type'), 'application/octet-stream');
  assert.match(download.headers.get('Content-Disposition'), /attachment;/);
  assert.equal(download.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  const smallDownload = await f.request(`/api/files/${small}/download`);
  assert.deepEqual(Buffer.from(await smallDownload.arrayBuffer()), smallBytes);
  const head = await f.request(`/api/files/${large.id}/download`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers.get('Content-Length')), bytes.length);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  const range = await f.request(`/api/files/${large.id}/download`, { headers: { Range: 'bytes=3-12' } });
  assert.equal(range.status, 206);
  assert.deepEqual(Buffer.from(await range.arrayBuffer()), bytes.subarray(3, 13));
  await expectJson(await f.request(`/api/files/${large.id}/download`, { headers: { Range: 'bytes=1-2,4-5' } }), 416);
  for (const [id, size, invalidRange] of [
    [small, smallBytes.length, 'bytes=999999999-'],
    [small, smallBytes.length, 'bytes=5-2'],
    [small, smallBytes.length, 'bytes=-0'],
    [empty, 0, 'bytes=0-'],
  ]) {
    const invalid = await f.request(`/api/files/${id}/download`, { headers: { Range: invalidRange } });
    assert.equal(invalid.status, 416);
    assert.equal(invalid.headers.get('Content-Range'), `bytes */${size}`);
    await invalid.arrayBuffer();
  }
  const used = await f.usage(auth);
  assert.equal(used.usedBytes, bytes.length + smallBytes.length);
  assert.equal(used.reservedBytes, 0);
  assert.equal(used.remainingUploads, 27);
  assert.equal((await expectJson(await f.request('/api/files/delete', { method: 'POST', auth, data: { ids: [large.id, small, empty] } }), 200)).deleted, 3);
  for (const id of [large.id, small, empty]) {
    assert.equal(await f.bucket.get(`files/${id}`), null);
    await expectJson(await f.request(`/api/files/${id}/download`), 404);
  }
  assert.deepEqual((await f.list()).files, []);
  const afterDelete = await f.usage(auth);
  assert.equal(afterDelete.usedBytes, 0);
  assert.equal(afterDelete.remainingUploads, 27, 'Deleting successful files must not restore daily upload quota');
});

test('ordering is stored in D1 across restarts and rejects stale or competing revisions', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  const ids = [];
  for (const name of ['하나', '둘', '셋']) ids.push(await f.upload(auth, `${name}.txt`, Buffer.from(name)));
  const first = await f.list();
  const reversed = [...ids].reverse();
  await expectJson(await f.request('/api/files/order', { method: 'PUT', auth, data: { ids: reversed, revision: first.revision } }), 200);
  await expectJson(await f.request('/api/files/order', { method: 'PUT', auth, data: { ids, revision: first.revision } }), 409, 'conflict');
  await f.restart();
  assert.deepEqual((await f.list({ ip: '203.0.113.70' })).files.map(file => file.id), reversed);
  const current = await f.list();
  const options = [ids, [ids[1], ids[0], ids[2]]];
  const simultaneous = await Promise.all(options.map(order => f.request('/api/files/order', {
    method: 'PUT', auth, data: { ids: order, revision: current.revision },
  })));
  assert.equal(simultaneous.filter(response => response.status === 200).length, 1);
  assert.equal(simultaneous.filter(response => response.status === 409).length, 1);
  const winner = simultaneous.findIndex(response => response.status === 200);
  for (const response of simultaneous) await response.text();
  assert.deepEqual((await f.list()).files.map(file => file.id), options[winner]);
  const latest = await f.list();
  await expectJson(await f.request('/api/files/order', { method: 'PUT', auth, data: { ids: ids.slice(0, 2), revision: latest.revision } }), 409, 'conflict');
  await expectJson(await f.request('/api/files/order', { method: 'PUT', auth, data: { ids: [ids[0], ids[0]], revision: latest.revision } }), 400);
});

test('move-before ordering and bulk deletion support more than 100 real stored files', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  const ids = [];
  for (let index = 0; index < 125; index++) {
    const id = randomUUID();
    ids.push(id);
    const uploaded = f.now - (index + 1) * 1_000;
    const day = kstDay(f.now - (Math.floor(index / 25) + 1) * dayLength);
    await f.bucket.put(`files/${id}`, new Uint8Array());
    await f.db.batch([
      f.db.prepare("INSERT INTO uploads(id,name,size,content_type,object_key,state,day,created_at,expires_at,session_hash,sort_order) VALUES(?,?,0,'application/octet-stream',?,'pending',?,?,?,?,?)")
        .bind(id, `historical-${index}.txt`, `files/${id}`, day, uploaded, f.now + dayLength, auth.hash, index),
      f.db.prepare("UPDATE uploads SET state='ready',committed=1,uploaded_at=? WHERE id=?").bind(uploaded, id),
    ]);
  }
  const first = await f.list();
  assert.deepEqual(first.files.map(file => file.id), ids);
  const moved = ids.at(-1);
  await expectJson(await f.request('/api/files/order', {
    method: 'PUT', auth, data: { id: moved, beforeId: ids[0], revision: first.revision },
  }), 200);
  const front = await f.list();
  assert.deepEqual(front.files.map(file => file.id), [moved, ...ids.slice(0, -1)]);
  await expectJson(await f.request('/api/files/order', {
    method: 'PUT', auth, data: { id: moved, beforeId: null, revision: first.revision },
  }), 409, 'conflict');
  await expectJson(await f.request('/api/files/order', {
    method: 'PUT', auth, data: { id: moved, beforeId: null, revision: front.revision },
  }), 200);
  assert.deepEqual((await f.list()).files.map(file => file.id), ids);
  const deletion = await expectJson(await f.request('/api/files/delete', { method: 'POST', auth, data: { ids } }), 200);
  assert.equal(deletion.deleted, ids.length);
  assert.equal((await f.list()).files.length, 0);
  assert.equal((await f.bucket.list({ prefix: 'files/' })).objects.length, 0);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM uploads').first()).n, 0);
  assert.equal((await f.db.prepare('SELECT SUM(uploads) AS n FROM daily_usage').first()).n, ids.length);
});

test('racing upload completion against cancellation never leaves a visible file without its R2 object', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  for (let iteration = 0; iteration < 10; iteration++) {
    const item = await f.reserve(auth, `finish-cancel-${iteration}.bin`, 3);
    await expectJson(await f.putPart(auth, item.id, 1, Buffer.from('abc')), 200);
    const responses = await Promise.all([
      f.complete(auth, item.id),
      f.request(`/api/uploads/${item.id}`, { method: 'DELETE', auth }),
    ]);
    const codes = responses.map(response => response.status);
    for (const response of responses) await response.text();
    assert.ok(codes[0] === 201 || codes[1] === 200, `Neither operation won: ${codes}`);
    const row = await f.db.prepare('SELECT * FROM uploads WHERE id=?').bind(item.id).first();
    const object = await f.bucket.head(`files/${item.id}`);
    if (row) {
      assert.equal(row.state, 'ready');
      assert.equal(row.committed, 1);
      assert.equal(object?.size, 3, 'A visible file must still have its R2 object');
    } else {
      assert.equal(object, null, 'Cancellation must leave no orphan object');
    }
  }
  const ledger = await f.usage(auth);
  assert.equal(ledger.reservedBytes, 0);
  assert.equal(ledger.usedBytes, (await f.list()).files.length * 3);
});

test('part validation, cross-session ownership and cancellation preserve quota and remove R2 data', async t => {
  const f = await fixture(t);
  const owner = await f.login();
  const other = await f.login('203.0.113.40');
  const item = await f.reserve(owner, '중단.txt', 12);
  await expectJson(await f.putPart(other, item.id, 1, Buffer.alloc(12)), 403);
  await expectJson(await f.request(`/api/uploads/${item.id}`, { method: 'DELETE', auth: other }), 403);
  await expectJson(await f.putPart(owner, item.id, 0, Buffer.alloc(12)), 400);
  await expectJson(await f.putPart(owner, item.id, 2, Buffer.alloc(12)), 400);
  await expectJson(await f.putPart(owner, item.id, 1, Buffer.alloc(11)), 400);
  await expectJson(await f.putPart(owner, item.id, 1, Buffer.alloc(13)), 413);
  await expectJson(await f.complete(owner, item.id), 409);
  await expectJson(await f.putPart(owner, item.id, 1, Buffer.alloc(12, 0x42)), 200);
  await expectJson(await f.putPart(owner, item.id, 1, Buffer.alloc(12, 0x43)), 409);
  const record = await f.db.prepare('SELECT * FROM uploads WHERE id=?').bind(item.id).first();
  await expectJson(await f.request(`/api/uploads/${item.id}`, { method: 'DELETE', auth: owner }), 200);
  assert.equal(await f.db.prepare('SELECT * FROM uploads WHERE id=?').bind(item.id).first(), null);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM upload_parts WHERE upload_id=?').bind(item.id).first()).n, 0);
  assert.equal(await f.bucket.get(record.object_key), null);
  await assert.rejects(f.bucket.resumeMultipartUpload(record.object_key, record.multipart_id).uploadPart(1, Buffer.alloc(12)));
  const usage = await f.usage(owner);
  assert.equal(usage.reservedBytes, 0);
  assert.equal(usage.usedBytes, 0);
  assert.equal(usage.remainingUploads, 30);
});

test('scheduled cleanup removes expired parts, stranded completed objects and expired auth records', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  const pending = await f.reserve(auth, '중단된 파일.txt', 7);
  await expectJson(await f.putPart(auth, pending.id, 1, Buffer.from('pending')), 200);
  const pendingRecord = await f.db.prepare('SELECT * FROM uploads WHERE id=?').bind(pending.id).first();
  const completed = await f.reserve(auth, '완료 도중 중단.txt', 4);
  const completedRecord = await f.db.prepare('SELECT * FROM uploads WHERE id=?').bind(completed.id).first();
  await f.bucket.put(completedRecord.object_key, Buffer.from('data'));
  await f.db.prepare("UPDATE uploads SET state='completing' WHERE id=?").bind(completed.id).run();
  await f.db.prepare('UPDATE uploads SET expires_at=?').bind(Date.now() - 1_000).run();
  await f.db.prepare('UPDATE sessions SET last_active=?').bind(Date.now() - 6 * minute).run();
  await f.db.prepare('INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,?,?)').bind('expired-fixture', 1, Date.now() - 1_000).run();
  await f.sweep();
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM uploads').first()).n, 0);
  assert.equal(await f.bucket.get(completedRecord.object_key), null);
  await assert.rejects(f.bucket.resumeMultipartUpload(pendingRecord.object_key, pendingRecord.multipart_id).uploadPart(1, Buffer.from('pending')));
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM sessions').first()).n, 0);
  assert.equal(await f.db.prepare('SELECT * FROM rate_limits WHERE key=?').bind('expired-fixture').first(), null);
  const ledger = await f.db.prepare('SELECT * FROM storage_usage WHERE id=1').first();
  assert.equal(ledger.reserved_bytes, 0);
  assert.equal(ledger.used_bytes, 0);
  assert.equal((await f.db.prepare('SELECT uploads FROM daily_usage WHERE day=?').bind(kstDay(f.now)).first()).uploads, 0);
});

test('bounded scheduled sweeps eventually clear a backlog of abandoned multipart uploads', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  const abandoned = [];
  for (let index = 0; index < 17; index++) abandoned.push(await f.reserve(auth, `abandoned-${index}`, 1));
  assert.equal((await f.usage(auth)).reservedBytes, 17);
  await f.db.prepare('UPDATE uploads SET expires_at=?').bind(Date.now() - 1_000).run();
  await f.sweep();
  const remaining = (await f.db.prepare('SELECT COUNT(*) AS n FROM uploads').first()).n;
  assert.ok(remaining > 0 && remaining < 17, 'One free-plan sweep must make progress while keeping the batch bounded');
  await f.sweep();
  await f.sweep();
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM uploads').first()).n, 0);
  const ledger = await f.db.prepare('SELECT reserved_bytes FROM storage_usage WHERE id=1').first();
  assert.equal(ledger.reserved_bytes, 0);
  assert.equal((await f.db.prepare('SELECT uploads FROM daily_usage WHERE day=?').bind(kstDay(f.now)).first()).uploads, 0);
});

test('failed second parts and a missing R2 multipart upload can be cancelled without leaking reservations', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  const interrupted = await f.reserve(auth, '두 번째 조각 실패.bin', chunkSize + 9);
  await expectJson(await f.putPart(auth, interrupted.id, 1, Buffer.alloc(chunkSize, 0x55)), 200);
  await expectJson(await f.putPart(auth, interrupted.id, 2, Buffer.alloc(8)), 400);
  await expectJson(await f.complete(auth, interrupted.id), 409);
  assert.equal((await f.usage(auth)).reservedBytes, chunkSize + 9);
  assert.equal((await f.list()).files.length, 0);
  await expectJson(await f.request(`/api/uploads/${interrupted.id}`, { method: 'DELETE', auth }), 200);
  assert.equal((await f.usage(auth)).reservedBytes, 0);

  // Break the real R2 multipart state, without replacing storage with a mock.
  const missing = await f.reserve(auth, '저장소 실패.bin', 3);
  const record = await f.db.prepare('SELECT * FROM uploads WHERE id=?').bind(missing.id).first();
  await f.bucket.resumeMultipartUpload(record.object_key, record.multipart_id).abort();
  await expectJson(await f.putPart(auth, missing.id, 1, Buffer.from('abc')), 503);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM upload_parts WHERE upload_id=?').bind(missing.id).first()).n, 0);
  assert.equal((await f.usage(auth)).reservedBytes, 3);
  await expectJson(await f.request(`/api/uploads/${missing.id}`, { method: 'DELETE', auth }), 200);
  const usage = await f.usage(auth);
  assert.equal(usage.reservedBytes, 0);
  assert.equal(usage.usedBytes, 0);
  assert.equal(usage.remainingUploads, 30);
});

test('a D1 persistence failure during multipart initialization releases the failed reservation', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  // Fault injection uses a real SQLite trigger; R2 still creates/aborts a real MPU.
  await f.db.prepare("CREATE TRIGGER reject_fixture_multipart BEFORE UPDATE OF multipart_id ON uploads BEGIN SELECT RAISE(ABORT,'fixture persistence failure'); END;").run();
  await expectJson(await f.request('/api/uploads', { method: 'POST', auth, data: { name: '실패 초기화.bin', size: 12 } }), 503);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM uploads').first()).n, 0);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM upload_parts').first()).n, 0);
  const usage = await f.usage(auth);
  assert.equal(usage.reservedBytes, 0);
  assert.equal(usage.remainingUploads, 30);
  await f.db.prepare('DROP TRIGGER reject_fixture_multipart').run();
  const recovered = await f.upload(auth, '재시도.bin', Buffer.from('restored'));
  assert.ok(await f.bucket.head(`files/${recovered}`));
});

test('100 MB is accepted without one giant request; oversize and unsafe names are rejected', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  const maximum = await f.reserve(auth, '100MB.bin', 100_000_000);
  assert.equal(maximum.partCount, Math.ceil(100_000_000 / chunkSize));
  assert.ok(maximum.chunkSize < 100_000_000);
  await expectJson(await f.request(`/api/uploads/${maximum.id}`, { method: 'DELETE', auth }), 200);
  for (const size of [100_000_001, -1, 0.1, '12']) {
    await expectJson(await f.request('/api/uploads', { method: 'POST', auth, data: { name: 'file.bin', size } }), 413);
  }
  for (const name of ['', '   ', '../x', 'a\\b', 'line\nbreak', 'x'.repeat(241)]) {
    await expectJson(await f.request('/api/uploads', { method: 'POST', auth, data: { name, size: 1 } }), 400);
  }
  assert.equal((await f.usage(auth)).reservedBytes, 0);
});

test('a full 100,000,000-byte file is stored in multipart R2 and downloaded with the same SHA-256', { timeout: 120_000 }, async t => {
  const f = await fixture(t);
  const auth = await f.login();
  const total = 100_000_000;
  const item = await f.reserve(auth, '최대 크기 100MB.bin', total);
  const partBytes = Buffer.alloc(item.chunkSize, 0xa7);
  const expectedDigest = createHash('sha256');
  for (let offset = 0, number = 1; offset < total; offset += item.chunkSize, number++) {
    const bytes = partBytes.subarray(0, Math.min(item.chunkSize, total - offset));
    expectedDigest.update(bytes);
    await expectJson(await f.putPart(auth, item.id, number, bytes), 200);
  }
  await expectJson(await f.complete(auth, item.id), 201);
  assert.equal((await f.bucket.head(`files/${item.id}`)).size, total);
  const usage = await f.usage(auth);
  assert.equal(usage.usedBytes, total);
  assert.equal(usage.reservedBytes, 0);
  const response = await f.request(`/api/files/${item.id}/download`);
  assert.equal(response.status, 200);
  assert.equal(Number(response.headers.get('Content-Length')), total);
  const actualDigest = createHash('sha256');
  let received = 0;
  for await (const bytes of response.body) {
    actualDigest.update(bytes);
    received += bytes.byteLength;
  }
  assert.equal(received, total);
  assert.equal(actualDigest.digest('hex'), expectedDigest.digest('hex'));
  await expectJson(await f.request('/api/files/delete', { method: 'POST', auth, data: { ids: [item.id] } }), 200);
  assert.equal(await f.bucket.head(`files/${item.id}`), null);
  assert.equal((await f.usage(auth)).usedBytes, 0);
});

test('concurrent reservations atomically enforce the total 5 GB cap including in-flight bytes', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  // Seed historical file metadata only; no multi-gigabyte buffers or remote objects.
  for (let index = 0; index < 50; index++) {
    const id = randomUUID();
    const size = index === 49 ? 99_999_000 : 100_000_000;
    const oldDay = kstDay(f.now - (index < 25 ? 1 : 2) * dayLength);
    await f.db.batch([
      f.db.prepare("INSERT INTO uploads(id,name,size,content_type,object_key,state,day,created_at,expires_at,session_hash) VALUES(?,?,?,?,?,'pending',?,?,?,?)")
        .bind(id, `historical-${index}`, size, 'application/octet-stream', `seed/${id}`, oldDay, f.now - dayLength, f.now + dayLength, auth.hash),
      f.db.prepare("UPDATE uploads SET committed=1,state='ready',uploaded_at=? WHERE id=?").bind(f.now - dayLength, id),
    ]);
  }
  assert.equal((await f.usage(auth)).usedBytes, 4_999_999_000);
  const responses = await Promise.all(Array.from({ length: 8 }, (_, i) => f.request('/api/uploads', {
    method: 'POST', auth, data: { name: `race-${i}`, size: 400 },
  })));
  assert.equal(responses.filter(response => response.status === 201).length, 2);
  assert.equal(responses.filter(response => response.status === 409).length, 6);
  const accepted = [];
  for (const response of responses) {
    const result = await expectJson(response, response.status, response.status === 409 ? 'storage_limit' : undefined);
    if (response.status === 201) accepted.push(result.id);
  }
  const usage = await f.usage(auth);
  assert.equal(usage.reservedBytes, 800);
  assert.ok(usage.usedBytes + usage.reservedBytes <= 5_000_000_000);
  assert.equal(usage.remainingUploads, 28);
  for (const id of accepted) await expectJson(await f.request(`/api/uploads/${id}`, { method: 'DELETE', auth }), 200);
  assert.equal((await f.usage(auth)).reservedBytes, 0);
});

test('concurrent reservations enforce 30 files per Korean day and failed reservations roll back', async t => {
  const f = await fixture(t);
  const auth = await f.login();
  await f.db.prepare('INSERT INTO daily_usage(day,uploads) VALUES(?,28)').bind(kstDay(f.now)).run();
  const responses = await Promise.all(Array.from({ length: 8 }, (_, i) => f.request('/api/uploads', {
    method: 'POST', auth, data: { name: `day-race-${i}`, size: 10 },
  })));
  assert.equal(responses.filter(response => response.status === 201).length, 2);
  assert.equal(responses.filter(response => response.status === 409).length, 6);
  const accepted = [];
  for (const response of responses) {
    const result = await expectJson(response, response.status, response.status === 409 ? 'daily_limit' : undefined);
    if (response.status === 201) accepted.push(result.id);
  }
  const usage = await f.usage(auth);
  assert.equal(usage.remainingUploads, 0);
  assert.equal(usage.reservedBytes, 20);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM uploads').first()).n, 2);
  for (const id of accepted) await expectJson(await f.request(`/api/uploads/${id}`, { method: 'DELETE', auth }), 200);
  assert.equal((await f.usage(auth)).remainingUploads, 2);
});

test('daily upload accounting changes exactly at midnight Korea time', async t => {
  for (const [clock, expected] of [
    ['2026-10-23T14:59:59.000Z', '2026-10-23'],
    ['2026-10-23T15:00:00.000Z', '2026-10-24'],
  ]) {
    await t.test(clock, async child => {
      const f = await fixture(child, { now: Date.parse(clock) });
      const auth = await f.login();
      const previousDay = kstDay(f.now - dayLength);
      await f.db.prepare('INSERT INTO daily_usage(day,uploads) VALUES(?,30)').bind(previousDay).run();
      const item = await f.reserve(auth, '한국시간.txt', 1);
      assert.equal((await f.db.prepare('SELECT day FROM uploads WHERE id=?').bind(item.id).first()).day, expected);
      assert.equal((await f.usage(auth)).remainingUploads, 29);
      assert.equal((await f.db.prepare('SELECT uploads FROM daily_usage WHERE day=?').bind(previousDay).first()).uploads, 30);
    });
  }
});

test('public list, downloads, writes and account API cap enforce request limits', async t => {
  const f = await fixture(t, { now: Date.parse('2026-10-23T03:30:20Z') });
  const auth = await f.login();
  const id = await f.upload(auth, 'rate.txt', Buffer.from('rate'));
  const ip = '198.51.100.10';
  await seedRate(f, `list:${sha256(ip)}`, 119, minute);
  await f.list();
  await expectJson(await f.request('/api/files'), 429, 'rate_limit');
  await f.list({ ip: '203.0.113.31' });
  await seedRate(f, `download:${sha256(ip)}`, 29, minute);
  assert.equal((await f.request(`/api/files/${id}/download`)).status, 200);
  await expectJson(await f.request(`/api/files/${id}/download`), 429, 'rate_limit');
  await seedRate(f, `write:${auth.hash}`, 90, minute);
  await expectJson(await f.request('/api/uploads', { method: 'POST', auth, data: { name: 'blocked', size: 1 } }), 429, 'rate_limit');
  await seedRate(f, 'api-global', 19_999, dayLength);
  await f.list({ ip: '203.0.113.32' });
  await expectJson(await f.request('/api/files', { ip: '203.0.113.33' }), 429, 'rate_limit');
});
