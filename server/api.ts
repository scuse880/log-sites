import { reorderOne } from './reorder';

export interface Env {
  DB: D1Database;
  MY_BUCKET: R2Bucket;
  UPLOAD_SECRET: string;
}
type Context = { waitUntil(promise: Promise<unknown>): void };
type Session = { token_hash: string; csrf_token: string; created_at: number; last_active: number; expires_at: number; mode: 'public' | 'private'; preference_set: number };
type Upload = { id: string; name: string; size: number; content_type: string; object_key: string; multipart_id: string | null; state: string; committed: number; day: string; created_at: number; uploaded_at: number | null; expires_at: number; sort_order: number; session_hash: string };
const CHUNK = 8 * 1024 * 1024;
const MAX_FILE = 100_000_000;
const MAX_TOTAL = 5_000_000_000;
const IDLE = 5 * 60_000;
const PUBLIC_LIFE = 15 * 60_000;
const PRIVATE_LIFE = 12 * 60 * 60_000;
const UPLOAD_LIFE = 30 * 60_000;
const COOKIE = '__Host-learning_log_session';
const json = (value: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});
class ApiError extends Error { constructor(public status: number, message: string, public code?: string) { super(message); } }
function fail(status: number, message: string, code?: string): never { throw new ApiError(status, message, code); }
const kstDay = (now: number) => new Date(now + 9 * 60 * 60_000).toISOString().slice(0, 10);
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
const cookie = (value: string, age?: number) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict${age === undefined ? '' : `; Max-Age=${age}`}`;
const effectiveExpiry = (s: Session) => s.mode === 'public' ? Math.min(s.expires_at, s.last_active + IDLE) : s.expires_at;
const sessionInfo = (s: Session) => ({ authenticated: true, csrfToken: s.csrf_token, mode: s.mode, expiresAt: effectiveExpiry(s) });

async function limitedBody(request: Request, maximum: number): Promise<Uint8Array> {
  const length = request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) fail(413, '요청 크기가 너무 큽니다.');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { void reader.cancel(); reject(new ApiError(408, '전송 시간이 초과되었습니다. 다시 시도하세요.')); }, 60_000); });
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      total += value.byteLength;
      if (total > maximum) { void reader.cancel(); fail(413, '요청 크기가 너무 큽니다.'); }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return body;
  } finally { if (timer !== undefined) clearTimeout(timer); reader.releaseLock(); }
}
async function bodyJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail(415, 'JSON 요청이 필요합니다.');
  try {
    const value = JSON.parse(new TextDecoder().decode(await limitedBody(request, 64 * 1024)));
    if (!value || Array.isArray(value) || typeof value !== 'object') fail(400, '잘못된 요청입니다.');
    return value;
  } catch (error) { if (error instanceof ApiError) throw error; return fail(400, 'JSON 형식이 잘못되었습니다.'); }
}
function sameOrigin(request: Request) {
  if (request.headers.get('Origin') !== new URL(request.url).origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') fail(403, '다른 사이트에서 보낸 요청은 허용하지 않습니다.', 'csrf');
}
async function rate(env: Env, key: string, limit: number, windowMs: number, now: number) {
  const bucket = Math.floor(now / windowMs);
  const result = await env.DB.prepare(`INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits < ? RETURNING hits`)
    .bind(`${key}:${bucket}`, (bucket + 1) * windowMs, limit).first<{ hits: number }>();
  if (!result) fail(429, '요청이 많습니다. 잠시 후 다시 시도하세요.', 'rate_limit');
}
async function getSession(request: Request, env: Env, now: number): Promise<Session | null> {
  const raw = request.headers.get('Cookie')?.split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null;
  const key = await hash(raw);
  const s = await env.DB.prepare('SELECT * FROM sessions WHERE token_hash=?').bind(key).first<Session>();
  if (!s) return null;
  if (effectiveExpiry(s) <= now) { await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(key).run(); return null; }
  return s;
}
async function requireSession(request: Request, env: Env, now: number, mutate = false) {
  const s = await getSession(request, env, now);
  if (!s) fail(401, '관리자 로그인이 필요하거나 세션이 만료되었습니다.', 'unauthorized');
  if (mutate) {
    sameOrigin(request);
    if (request.headers.get('X-CSRF-Token') !== s.csrf_token) fail(403, '인증 정보가 일치하지 않습니다. 새로 로그인하세요.', 'csrf');
    await rate(env, `write:${s.token_hash}`, 90, 60_000, now);
    // Only explicit authenticated activity extends the idle window. Polling never does.
    const updated = await env.DB.prepare('UPDATE sessions SET last_active=? WHERE token_hash=? AND expires_at>? AND (mode=\'private\' OR last_active>?) RETURNING *').bind(now, s.token_hash, now, now - IDLE).first<Session>();
    if (!updated) fail(401, '세션이 만료되었습니다.', 'unauthorized');
    return updated;
  }
  return s;
}
async function upload(env: Env, id: string) {
  const value = await env.DB.prepare('SELECT * FROM uploads WHERE id=?').bind(id).first<Upload>();
  if (!value) fail(404, '파일 또는 업로드를 찾을 수 없습니다.');
  return value;
}
function ownUpload(value: Upload, s: Session, now: number) {
  if (value.session_hash !== s.token_hash) fail(403, '이 로그인에서 시작한 업로드만 처리할 수 있습니다.');
  if (value.expires_at <= now || !['pending', 'completing'].includes(value.state)) fail(409, '만료되었거나 이미 처리 중인 업로드입니다.');
}
function missingMultipart(error: unknown) { return /NoSuchUpload|does not exist|not found|already.*(abort|complete)/i.test(String(error)); }

async function removeObject(env: Env, value: Upload) {
  if (!value.committed && value.multipart_id) {
    try { await env.MY_BUCKET.resumeMultipartUpload(value.object_key, value.multipart_id).abort(); }
    catch (error) { if (!missingMultipart(error)) throw error; }
  }
  await env.MY_BUCKET.delete(value.object_key);
  // Release reservations only after storage cleanup has succeeded.
  await env.DB.prepare("DELETE FROM uploads WHERE id=? AND state IN ('aborting','deleting')").bind(value.id).run();
}
export async function cleanup(env: Env, now = Date.now()) {
  // Bound combined D1 + R2 subrequests below the Free plan's per-invocation limits.
  const stale = await env.DB.prepare("SELECT * FROM uploads WHERE (state IN ('pending','completing') AND expires_at<=?) OR state IN ('aborting','deleting') ORDER BY expires_at LIMIT 8").bind(now).all<Upload>();
  for (const value of stale.results) {
    const claimed = await env.DB.prepare("UPDATE uploads SET state=CASE WHEN committed=1 THEN 'deleting' ELSE 'aborting' END WHERE id=? AND ((state IN ('pending','completing') AND expires_at<=?) OR state IN ('aborting','deleting')) RETURNING id").bind(value.id, now).first();
    if (claimed) { try { await removeObject(env, value); } catch { /* Keep accounting intact and retry next scheduled sweep. */ } }
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at<=? OR (mode='public' AND last_active<=?)").bind(now, now - IDLE),
    env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<=?').bind(now),
    env.DB.prepare('DELETE FROM daily_usage WHERE day<? AND day NOT IN (SELECT day FROM uploads)').bind(kstDay(now - 7 * 86400000)),
  ]);
}

async function handle(request: Request, env: Env, ctx: Context) {
  if (!env.DB || !env.MY_BUCKET) fail(503, '파일 저장소가 아직 설정되지 않았습니다. 관리자에게 문의하세요.', 'not_configured');
  const now = Date.now();
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');
  const method = request.method;
  const ip = await hash(request.headers.get('CF-Connecting-IP') || 'local');
  // Application cap bounds accepted API work; edge requests themselves still count on Cloudflare.
  // A traffic cap must not prevent an administrator from revoking a session.
  if (path !== '/api/auth/logout') await rate(env, 'api-global', 20_000, 86400000, now);

  if (path === '/api/auth/login' && method === 'POST') {
    sameOrigin(request);
    await rate(env, `login:${ip}`, 5, 15 * 60_000, now);
    await rate(env, 'login-global', 30, 15 * 60_000, now);
    if (!env.UPLOAD_SECRET) fail(503, '관리자 비밀번호가 설정되지 않았습니다.', 'not_configured');
    const data = await bodyJson(request);
    if (typeof data.password !== 'string' || data.password.length > 1024) fail(400, '비밀번호를 입력하세요.');
    const [given, expected] = await Promise.all([hash(data.password), hash(env.UPLOAD_SECRET)]);
    let different = 0;
    for (let i = 0; i < expected.length; i++) different |= given.charCodeAt(i) ^ expected.charCodeAt(i);
    if (different) fail(401, '비밀번호가 올바르지 않습니다.', 'invalid_password');
    const previous = await getSession(request, env, now);
    if (previous) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(previous.token_hash).run();
    const raw = token();
    const s: Session = { token_hash: await hash(raw), csrf_token: token(), created_at: now, last_active: now, expires_at: now + PUBLIC_LIFE, mode: 'public', preference_set: 0 };
    await env.DB.prepare('INSERT INTO sessions(token_hash,csrf_token,created_at,last_active,expires_at,mode) VALUES(?,?,?,?,?,?)').bind(s.token_hash, s.csrf_token, now, now, s.expires_at, s.mode).run();
    return json(sessionInfo(s), 200, { 'Set-Cookie': cookie(raw) });
  }
  if (path === '/api/session' && method === 'GET') {
    await rate(env, `session:${ip}`, 120, 60_000, now);
    const s = await getSession(request, env, now);
    return s ? json(sessionInfo(s)) : json({ authenticated: false }, 200, { 'Set-Cookie': cookie('', 0) });
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    sameOrigin(request);
    const s = await getSession(request, env, now);
    if (s) {
      if (request.headers.get('X-CSRF-Token') !== s.csrf_token) fail(403, '인증 정보가 일치하지 않습니다.', 'csrf');
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(s.token_hash).run();
    }
    return json({ authenticated: false }, 200, { 'Set-Cookie': cookie('', 0) });
  }
  if (path === '/api/auth/activity' && method === 'POST') return json(sessionInfo(await requireSession(request, env, now, true)));
  if (path === '/api/auth/remember' && method === 'POST') {
    const s = await requireSession(request, env, now, true);
    const data = await bodyJson(request);
    if (typeof data.remember !== 'boolean') fail(400, '로그인 유지 여부를 선택하세요.');
    if (s.preference_set || now - s.created_at > 2 * 60_000) fail(409, '로그인 유지 선택 시간이 지났습니다. 다시 로그인하세요.');
    const updated = await env.DB.prepare('UPDATE sessions SET mode=?,expires_at=?,preference_set=1 WHERE token_hash=? AND preference_set=0 RETURNING *').bind(data.remember ? 'private' : 'public', s.created_at + (data.remember ? PRIVATE_LIFE : PUBLIC_LIFE), s.token_hash).first<Session>();
    if (!updated) fail(409, '이미 로그인 유지 설정을 선택했습니다.');
    const raw = request.headers.get('Cookie')!.split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE}=`))!.slice(COOKIE.length + 1);
    return json(sessionInfo(updated), 200, { 'Set-Cookie': cookie(raw, data.remember ? Math.max(0, Math.floor((updated.expires_at - now) / 1000)) : undefined) });
  }
  if (path === '/api/admin/usage' && method === 'GET') {
    await requireSession(request, env, now);
    const usage = await env.DB.prepare('SELECT used_bytes,reserved_bytes FROM storage_usage WHERE id=1').first<{ used_bytes: number; reserved_bytes: number }>();
    const daily = await env.DB.prepare('SELECT uploads FROM daily_usage WHERE day=?').bind(kstDay(now)).first<{ uploads: number }>();
    return json({ usedBytes: usage!.used_bytes, reservedBytes: usage!.reserved_bytes, remainingUploads: Math.max(0, 30 - (daily?.uploads ?? 0)), dailyLimit: 30, maxFileBytes: MAX_FILE, maxTotalBytes: MAX_TOTAL });
  }
  if (path === '/api/files' && method === 'GET') {
    await rate(env, `list:${ip}`, 120, 60_000, now);
    const revision = (await env.DB.prepare('SELECT revision FROM storage_usage WHERE id=1').first<{ revision: number }>())!.revision;
    const headers = { 'Cache-Control': 'public, max-age=15, s-maxage=30', ETag: `"files-${revision}"`, 'X-Content-Type-Options': 'nosniff' };
    if (request.headers.get('If-None-Match') === headers.ETag) return new Response(null, { status: 304, headers });
    const cacheKey = new Request(`${url.origin}/api/cache/files/${revision}`);
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;
    const result = await env.DB.prepare("SELECT id,name,size,uploaded_at AS uploadedAt FROM uploads WHERE state='ready' ORDER BY sort_order,uploaded_at,id").all();
    const response = json({ files: result.results, revision }, 200, headers);
    ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    return response;
  }
  const download = path.match(/^\/api\/files\/([a-f0-9-]{36})\/download$/);
  if (download && (method === 'GET' || method === 'HEAD')) {
    await rate(env, `download:${ip}`, 30, 60_000, now);
    const value = await upload(env, download[1]);
    if (value.state !== 'ready') fail(404, '파일을 찾을 수 없습니다.');
    const range = request.headers.get('Range');
    if (range && !/^bytes=(\d+-\d*|-\d+)$/.test(range)) fail(416, '지원하지 않는 다운로드 범위입니다.');
    if (range) {
      const [start, end] = range.slice(6).split('-');
      if (value.size === 0 || (start && (Number(start) >= value.size || (end && Number(end) < Number(start)))) || (!start && Number(end) === 0)) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${value.size}`, 'Cache-Control': 'no-store' } });
      }
    }
    const cacheKey = new Request(`${url.origin}/api/cache/download/${value.id}`);
    if (!range && method === 'GET') { const cached = await caches.default.match(cacheKey); if (cached) return cached; }
    const object = method === 'HEAD' ? await env.MY_BUCKET.head(value.object_key) : await env.MY_BUCKET.get(value.object_key, range ? { range: request.headers } : undefined);
    if (!object) fail(404, '저장된 파일을 찾을 수 없습니다.');
    const headers = new Headers({ 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(value.name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cache-Control': 'public, max-age=60, s-maxage=300', 'Accept-Ranges': 'bytes', ETag: object.httpEtag });
    let status = 200;
    const objectRange = 'range' in object ? object.range : undefined;
    if (range && objectRange && 'offset' in objectRange && 'length' in objectRange && objectRange.offset !== undefined && objectRange.length !== undefined) {
      status = 206;
      headers.set('Content-Range', `bytes ${objectRange.offset}-${objectRange.offset + objectRange.length - 1}/${value.size}`);
      headers.set('Content-Length', String(objectRange.length));
    } else headers.set('Content-Length', String(value.size));
    const response = new Response('body' in object ? (object as R2ObjectBody).body : null, { status, headers });
    if (!range && method === 'GET' && value.size <= CHUNK) ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    return response;
  }
  if (path === '/api/uploads' && method === 'POST') {
    const s = await requireSession(request, env, now, true);
    const data = await bodyJson(request);
    if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 240 || /[\x00-\x1f\x7f/\\]/.test(data.name)) fail(400, '파일명이 올바르지 않습니다. (최대 240자)');
    if (!Number.isSafeInteger(data.size) || Number(data.size) < 0 || Number(data.size) > MAX_FILE) fail(413, '개별 파일은 최대 100MB입니다.');
    // Opportunistic sweep also recovers quota if the maintenance Worker is briefly unavailable.
    await cleanup(env, now);
    const id = crypto.randomUUID();
    const key = `files/${id}`;
    await env.DB.prepare("INSERT INTO uploads(id,name,size,content_type,object_key,state,day,created_at,expires_at,session_hash) VALUES(?,?,?,?,?,'pending',?,?,?,?)").bind(id, data.name, data.size, 'application/octet-stream', key, kstDay(now), now, now + UPLOAD_LIFE, s.token_hash).run();
    let multipart: R2MultipartUpload | undefined;
    try {
      if (Number(data.size) > 0) {
        multipart = await env.MY_BUCKET.createMultipartUpload(key, { storageClass: 'Standard', httpMetadata: { contentType: 'application/octet-stream' } });
        await env.DB.prepare('UPDATE uploads SET multipart_id=? WHERE id=?').bind(multipart.uploadId, id).run();
      }
    } catch {
      let cleaned = !multipart;
      if (multipart) {
        try { await multipart.abort(); cleaned = true; } catch { /* Keep the reservation until cleanup succeeds. */ }
      }
      if (cleaned) await env.DB.prepare('DELETE FROM uploads WHERE id=?').bind(id).run();
      else {
        try { await env.DB.prepare("UPDATE uploads SET state='aborting',multipart_id=? WHERE id=?").bind(multipart!.uploadId, id).run(); }
        catch { /* Original reservation stays. The R2 lifecycle is the crash-window fallback. */ }
      }
      fail(503, '저장소에 업로드를 준비하지 못했습니다. 잠시 후 다시 시도하세요.');
    }
    return json({ id, chunkSize: CHUNK, partCount: Math.ceil(Number(data.size) / CHUNK) }, 201);
  }
  const part = path.match(/^\/api\/uploads\/([a-f0-9-]{36})\/parts\/(\d+)$/);
  if (part && method === 'PUT') {
    const s = await requireSession(request, env, now, true);
    const value = await upload(env, part[1]);
    ownUpload(value, s, now);
    if (value.state !== 'pending' || !value.multipart_id) fail(409, '파일 조각을 받을 수 없는 상태입니다.');
    const number = Number(part[2]);
    const count = Math.ceil(value.size / CHUNK);
    if (!Number.isInteger(number) || number < 1 || number > count) fail(400, '파일 조각 번호가 올바르지 않습니다.');
    const expected = Math.min(CHUNK, value.size - (number - 1) * CHUNK);
    await env.DB.prepare("UPDATE uploads SET expires_at=? WHERE id=? AND state='pending'").bind(now + UPLOAD_LIFE, value.id).run();
    const bytes = await limitedBody(request, expected);
    if (bytes.byteLength !== expected) fail(400, '파일 조각 크기가 일치하지 않습니다. 다시 시도하세요.');
    const locked = await env.DB.prepare("INSERT INTO upload_parts(upload_id,part_number) SELECT ?,? WHERE EXISTS(SELECT 1 FROM uploads WHERE id=? AND state='pending') ON CONFLICT DO NOTHING RETURNING part_number").bind(value.id, number, value.id).first();
    if (!locked) fail(409, '이미 전송했거나 처리 중인 파일 조각입니다.');
    try {
      const result = await env.MY_BUCKET.resumeMultipartUpload(value.object_key, value.multipart_id).uploadPart(number, bytes);
      await env.DB.prepare('UPDATE upload_parts SET etag=? WHERE upload_id=? AND part_number=?').bind(result.etag, value.id, number).run();
      return json({ partNumber: number });
    } catch {
      await env.DB.prepare('DELETE FROM upload_parts WHERE upload_id=? AND part_number=?').bind(value.id, number).run();
      fail(503, '파일 조각 저장에 실패했습니다. 다시 시도하세요.');
    }
  }
  const finish = path.match(/^\/api\/uploads\/([a-f0-9-]{36})\/complete$/);
  if (finish && method === 'POST') {
    const s = await requireSession(request, env, now, true);
    const value = await upload(env, finish[1]);
    if (value.state === 'ready' && value.session_hash === s.token_hash) return json({ id: value.id });
    ownUpload(value, s, now);
    const parts = await env.DB.prepare('SELECT part_number AS partNumber,etag FROM upload_parts WHERE upload_id=? ORDER BY part_number').bind(value.id).all<{ partNumber: number; etag: string | null }>();
    if (parts.results.length !== Math.ceil(value.size / CHUNK) || parts.results.some(p => !p.etag)) fail(409, '모든 파일 조각의 업로드가 끝나지 않았습니다.');
    const claimed = await env.DB.prepare("UPDATE uploads SET state='completing',expires_at=? WHERE id=? AND state='pending' RETURNING id").bind(now + UPLOAD_LIFE, value.id).first();
    if (!claimed && value.state !== 'completing') fail(409, '이미 처리 중인 업로드입니다.');
    const existing = await env.MY_BUCKET.head(value.object_key);
    if (!existing) {
      if (value.size === 0) await env.MY_BUCKET.put(value.object_key, new Uint8Array(), { storageClass: 'Standard' });
      else {
        if (!value.multipart_id) fail(409, '업로드 정보가 누락되었습니다.');
        try { await env.MY_BUCKET.resumeMultipartUpload(value.object_key, value.multipart_id).complete(parts.results as R2UploadedPart[]); }
        catch { const recovered = await env.MY_BUCKET.head(value.object_key); if (!recovered || recovered.size !== value.size) fail(503, '파일 저장을 마무리하지 못했습니다. 다시 시도하세요.'); }
      }
    }
    const stored = await env.MY_BUCKET.head(value.object_key);
    if (!stored || stored.size !== value.size) fail(503, '저장된 파일 크기를 확인하지 못했습니다.');
    await env.DB.prepare("UPDATE uploads SET state='ready',committed=1,uploaded_at=?,sort_order=(SELECT COALESCE(MAX(sort_order),0)+1 FROM uploads WHERE state='ready') WHERE id=? AND state='completing'").bind(now, value.id).run();
    return json({ id: value.id }, 201);
  }
  const cancel = path.match(/^\/api\/uploads\/([a-f0-9-]{36})$/);
  if (cancel && method === 'DELETE') {
    const s = await requireSession(request, env, now, true);
    const value = await upload(env, cancel[1]);
    if (value.session_hash !== s.token_hash || value.committed) fail(403, '취소할 수 없는 업로드입니다.');
    if (value.state === 'completing') fail(409, '저장 중인 파일입니다. 완료 후 삭제하세요.');
    const claimed = await env.DB.prepare("UPDATE uploads SET state='aborting' WHERE id=? AND committed=0 AND state IN ('pending','aborting') RETURNING *").bind(value.id).first<Upload>();
    if (!claimed) fail(409, '파일 저장 상태가 변경되었습니다. 완료 후 삭제하세요.');
    await removeObject(env, claimed);
    return json({ cancelled: true });
  }
  if (path === '/api/files/delete' && method === 'POST') {
    await requireSession(request, env, now, true);
    const data = await bodyJson(request);
    const ids = validIds(data.ids);
    const values = await env.DB.prepare("UPDATE uploads SET state='deleting' WHERE id IN (SELECT value FROM json_each(?)) AND state IN ('ready','deleting') RETURNING *").bind(JSON.stringify(ids)).all<Upload>();
    if (values.results.length) {
      try {
        // R2 accepts up to 1,000 keys in a single delete; SQL uses one JSON binding.
        await env.MY_BUCKET.delete(values.results.map(value => value.object_key));
        await env.DB.prepare("DELETE FROM uploads WHERE id IN (SELECT value FROM json_each(?)) AND state='deleting'").bind(JSON.stringify(values.results.map(value => value.id))).run();
      } catch { fail(503, '파일 삭제를 마무리하지 못했습니다. 서버가 자동으로 재시도합니다.'); }
    }
    return json({ deleted: values.results.length });
  }
  if (path === '/api/files/order' && method === 'PUT') {
    await requireSession(request, env, now, true);
    const data = await bodyJson(request);
    if (!Number.isSafeInteger(data.revision)) fail(400, '목록 버전이 필요합니다.');
    if ('id' in data) {
      if (typeof data.id !== 'string' || !/^[a-f0-9-]{36}$/.test(data.id) ||
        (data.beforeId !== null && (typeof data.beforeId !== 'string' || !/^[a-f0-9-]{36}$/.test(data.beforeId)))) fail(400, '이동할 파일 위치가 올바르지 않습니다.');
      const moved = await reorderOne(env.DB, data.id, data.beforeId as string | null, Number(data.revision));
      if (!moved) fail(409, '다른 곳에서 목록을 변경했습니다. 새로고침 후 다시 정렬하세요.', 'conflict');
      return json({ revision: Number(data.revision) + 1 });
    }
    const ids = validIds(data.ids);
    // D1 batch is one transaction: compare revision/full membership, update all positions,
    // then advance the revision only if every expected row changed. Competing writes serialize.
    const result = await env.DB.batch([
      env.DB.prepare(`UPDATE uploads SET sort_order=(SELECT CAST(key AS INTEGER) FROM json_each(?) WHERE value=uploads.id)
        WHERE state='ready' AND (SELECT revision FROM storage_usage WHERE id=1)=?
        AND (SELECT COUNT(*) FROM uploads WHERE state='ready')=?
        AND (SELECT COUNT(*) FROM uploads WHERE state='ready' AND id IN (SELECT value FROM json_each(?)))=? RETURNING id`)
        .bind(JSON.stringify(ids), data.revision, ids.length, JSON.stringify(ids), ids.length),
      env.DB.prepare('UPDATE storage_usage SET revision=revision+1 WHERE id=1 AND revision=? AND changes()=? RETURNING revision').bind(data.revision, ids.length),
    ]);
    if (result[0].results.length !== ids.length || !result[1].results.length) fail(409, '다른 곳에서 목록을 변경했습니다. 새로고침 후 다시 정렬하세요.', 'conflict');
    return json({ revision: Number(data.revision) + 1 });
  }
  fail(404, '요청한 API를 찾을 수 없습니다.');
}
function validIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 1000 || value.some(id => typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) || new Set(value).size !== value.length) fail(400, '파일 목록이 올바르지 않습니다.');
  return value as string[];
}
export async function handleRequest(request: Request, env: Env, ctx: Context): Promise<Response> {
  try { return await handle(request, env, ctx); }
  catch (error) {
    if (error instanceof ApiError) return json({ error: error.message, code: error.code }, error.status, error.status === 429 ? { 'Retry-After': '60' } : {});
    const message = String(error);
    if (message.includes('storage_limit')) return json({ error: '전체 저장 용량 5GB를 초과합니다. 진행 중인 업로드도 포함합니다.', code: 'storage_limit' }, 409);
    if (message.includes('daily_limit')) return json({ error: '오늘 업로드 한도 30개를 모두 사용했습니다. (한국시간 기준)', code: 'daily_limit' }, 409);
    // Never echo storage exceptions, SQL, credentials, request bodies, or tokens.
    return json({ error: '서버 처리에 실패했습니다. 잠시 후 다시 시도하세요.' }, 503);
  }
}
