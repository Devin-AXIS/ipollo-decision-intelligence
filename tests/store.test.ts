import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { DataApp, DataRecord } from '../src/services.ts';
import { readReport, saveSessionReport } from '../src/store.ts';

const atlas = JSON.parse(readFileSync(new URL('../viewer/example.json', import.meta.url), 'utf8'));

function memoryApp(id: string, legacy?: DataRecord) {
  const reports = new Map<string, DataRecord>(legacy ? [[legacy.id, legacy]] : []);
  let parts: DataRecord[] = [];
  let fail = false;
  const app = {
    id,
    collection(name: string) {
      if (name === 'parts') return { all: async ({ where }: { where: { report: string } }) => parts.filter(part => part.report === where.report) };
      return {
        get: async (key: string) => { const row = reports.get(key); assert.ok(row); return row; },
        insert: async (fields: Record<string, string | number>) => {
          const row = { ...fields, id: String(reports.size + 1), version: 1 };
          reports.set(row.id, row);
          return row;
        },
        find: async ({ where }: { where: Record<string, string> }) => ({
          items: [...reports.values()].filter(row => Object.entries(where).every(([field, value]) => row[field] === value)),
        }),
      };
    },
    async run({ batch }: { batch: Parameters<DataApp['run']>[0]['batch'] }) {
      if (fail) throw Error('storage unavailable');
      for (const entry of batch) {
        if ('insert' in entry)
          parts = parts.concat(entry.values.map((part, index) => ({ ...part, id: String(index), version: 1 })));
        if ('update' in entry) {
          const row = reports.get(entry.id);
          assert.ok(row);
          assert.equal(row.version, entry.version);
          reports.set(entry.id, { ...row, ...entry.set, version: row.version + 1 });
        }
      }
    },
  } as DataApp;
  return { app, reports, setFail(value: boolean) { fail = value; } };
}

test('native conversation saves without a prior reservation and concurrent retries reuse the result', async () => {
  const first = memoryApp('workspace-1');
  const second = memoryApp('workspace-2');
  const saved = await Promise.all([
    saveSessionReport(first.app, 'native-chat', atlas),
    saveSessionReport(first.app, 'native-chat', atlas),
  ]);
  assert.equal(saved[0], saved[1]);
  assert.equal(first.reports.size, 1);
  assert.equal((await readReport(first.app, saved[0]!)).title, atlas.title);
  await assert.rejects(readReport(second.app, saved[0]!));
  const revision = await saveSessionReport(first.app, 'native-chat', { ...atlas, title: '新版图谱' });
  assert.notEqual(revision, saved[0]);
  assert.equal((await readReport(first.app, revision)).title, '新版图谱');
});

test('retry completes an earlier version reservation without exposing an unfinished atlas', async () => {
  const legacy = { id: 'old', version: 1, state: 'pending', session: 'legacy-chat', count: 0, digest: '', title: '旧版调查' };
  const store = memoryApp('legacy-workspace', legacy);
  store.setFail(true);
  await assert.rejects(saveSessionReport(store.app, 'legacy-chat', atlas), /storage unavailable/);
  await assert.rejects(readReport(store.app, legacy.id), /尚未完成/);
  store.setFail(false);
  assert.equal(await saveSessionReport(store.app, 'legacy-chat', atlas), legacy.id);
  assert.equal((await readReport(store.app, legacy.id)).title, atlas.title);
});

test('an atlas with embedded art uses a private attachment and restores the original document', async t => {
  const store = memoryApp('art-workspace');
  const image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
  const report = { ...atlas, photos: { [atlas.tree.id]: { caption: '外景', url: image } } };
  const fileId = '3fc6fbda-2895-4b85-9e2e-9271678c44aa';
  let snapshot: Uint8Array | undefined;
  store.app.files = {
    upload: async (name, bytes, options) => {
      assert.match(name, /\.json$/);
      assert.equal(options.mime, 'application/json');
      snapshot = bytes;
      return { id: fileId };
    },
    download: async id => {
      assert.equal(id, fileId);
      return { url: 'https://storage.example/signed-snapshot' };
    },
  };
  t.mock.method(globalThis, 'fetch', async () => {
    assert.ok(snapshot);
    return new Response(new Uint8Array(snapshot).buffer);
  });
  const id = await saveSessionReport(store.app, 'current-chat', report);
  const parts = await store.app.collection('parts').all({ where: { report: id } });
  assert.equal(parts.length, 1);
  assert.equal(parts[0]?.body, fileId);
  assert.equal((await readReport(store.app, id)).photos?.[atlas.tree.id]?.url, image);
  snapshot = new TextEncoder().encode('{}');
  await assert.rejects(readReport(store.app, id), /图谱数据不完整/);
});
