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
