import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';
import { reorderOne } from '../server/reorder.ts';

async function fixture(t) {
  const options = convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("test"); } };',
    compatibilityDate: '2026-10-23',
    d1Databases: ['MY_DB'],
    cf: false,
    log: new Log(LogLevel.ERROR),
    telemetry: { enabled: false },
  });
  const mf = new Miniflare(options);
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('MY_DB');
  const schema = await readFile(new URL('../migrations/0001_files.sql', import.meta.url), 'utf8');
  let statement = '';
  for (const line of schema.split(/\r?\n/)) {
    statement += `${line}\n`;
    if (/^\s*CREATE TRIGGER/i.test(statement) ? /^END;\s*$/i.test(line) : /;\s*$/.test(line)) {
      await db.prepare(statement).run();
      statement = '';
    }
  }
  const seed = async (id, order, day = '2026-10-23', state = 'ready') => {
    await db.prepare(`INSERT INTO uploads(id,name,size,content_type,object_key,state,day,created_at,expires_at,session_hash,sort_order,uploaded_at)
      VALUES(?,?,0,'application/octet-stream',?,'pending',?,1,9999999999999,'test',?,1)`)
      .bind(id, id, `files/${id}`, day, order).run();
    if (state === 'ready') await db.prepare("UPDATE uploads SET state='ready',committed=1 WHERE id=?").bind(id).run();
  };
  const ready = async () => (await db.prepare("SELECT id,sort_order FROM uploads WHERE state='ready' ORDER BY sort_order,uploaded_at,id").all()).results;
  const revision = async () => (await db.prepare('SELECT revision FROM storage_usage WHERE id=1').first()).revision;
  return { db, seed, ready, revision };
}

test('single moves preserve every other relative order and produce dense integer positions', async t => {
  const f = await fixture(t);
  for (const [id, order] of [['a', 5], ['b', 5], ['c', 22], ['d', 50]]) await f.seed(id, order);
  await f.seed('pending', 999, '2026-10-23', 'pending');
  const initial = await f.revision();
  assert.equal(await reorderOne(f.db, 'd', 'b', initial), true);
  assert.deepEqual(await f.ready(), [
    { id: 'a', sort_order: 1 }, { id: 'd', sort_order: 2 },
    { id: 'b', sort_order: 3 }, { id: 'c', sort_order: 4 },
  ]);
  assert.equal(await f.revision(), initial + 1);
  assert.equal(await reorderOne(f.db, 'a', 'c', initial + 1), true);
  assert.deepEqual((await f.ready()).map(row => row.id), ['d', 'b', 'a', 'c']);
  assert.equal(await reorderOne(f.db, 'd', null, initial + 2), true);
  assert.deepEqual((await f.ready()).map(row => row.id), ['b', 'a', 'c', 'd']);
  assert.deepEqual((await f.ready()).map(row => row.sort_order), [1, 2, 3, 4]);
  assert.equal((await f.db.prepare("SELECT sort_order FROM uploads WHERE id='pending'").first()).sort_order, 999);
});

test('stale revisions, missing files, non-ready files and self targets leave the database unchanged', async t => {
  const f = await fixture(t);
  await f.seed('a', 3);
  await f.seed('b', 9);
  await f.seed('pending', 22, '2026-10-23', 'pending');
  const revision = await f.revision();
  const original = await f.ready();
  for (const [id, before, expected] of [
    ['a', 'b', revision - 1], ['missing', 'a', revision],
    ['a', 'missing', revision], ['a', 'a', revision],
    ['pending', 'a', revision], ['a', 'pending', revision],
  ]) {
    assert.equal(await reorderOne(f.db, id, before, expected), false);
    assert.deepEqual(await f.ready(), original);
    assert.equal(await f.revision(), revision);
  }
});

test('two competing moves at one revision have exactly one winner', async t => {
  const f = await fixture(t);
  for (const [position, id] of ['a', 'b', 'c'].entries()) await f.seed(id, position);
  const revision = await f.revision();
  const outcomes = await Promise.all([
    reorderOne(f.db, 'a', null, revision),
    reorderOne(f.db, 'c', 'a', revision),
  ]);
  assert.equal(outcomes.filter(Boolean).length, 1);
  assert.equal(await f.revision(), revision + 1);
  assert.deepEqual((await f.ready()).map(row => row.id), outcomes[0] ? ['b', 'c', 'a'] : ['c', 'a', 'b']);
});

test('an upload commit or deletion invalidates a previously read ordering revision', async t => {
  const f = await fixture(t);
  await f.seed('a', 1);
  await f.seed('b', 2);
  const beforeUpload = await f.revision();
  await f.seed('c', 3);
  assert.equal(await reorderOne(f.db, 'a', null, beforeUpload), false);
  const beforeDelete = await f.revision();
  await f.db.prepare("UPDATE uploads SET state='deleting' WHERE id='c'").run();
  assert.equal(await reorderOne(f.db, 'a', null, beforeDelete), false);
  assert.deepEqual((await f.ready()).map(row => row.id), ['a', 'b']);
});

test('a list beyond the old 1,000-file ceiling still needs only two statements and four bindings', async t => {
  const f = await fixture(t);
  // Each day admits 30 zero-byte files under the real reservation trigger.
  for (let i = 0; i < 1002; i++) await f.seed(`file-${String(i).padStart(4, '0')}`, i * 3, `fixture-day-${Math.floor(i / 30)}`);
  const revision = await f.revision();
  let statements = 0;
  let bindings = 0;
  const measured = {
    prepare(sql) {
      statements++;
      return { bind(...values) { bindings += values.length; return f.db.prepare(sql).bind(...values); } };
    },
    batch(queries) { return f.db.batch(queries); },
  };
  assert.equal(await reorderOne(measured, 'file-1001', 'file-0000', revision), true);
  assert.equal(statements, 2);
  assert.equal(bindings, 4);
  const rows = await f.ready();
  assert.equal(rows.length, 1002);
  assert.equal(rows[0].id, 'file-1001');
  assert.deepEqual(rows.map(row => row.sort_order), Array.from({ length: 1002 }, (_, i) => i + 1));
});
