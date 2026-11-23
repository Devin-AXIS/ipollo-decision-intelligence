import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {parseReport,renderReport} from '../src/report.ts';
const raw=JSON.parse(readFileSync(new URL('../viewer/example.json',import.meta.url),'utf8'));
test('existing atlas keeps indicators, charts and evidence',()=>{const p=parseReport(raw);assert.ok(p.highlights?.storage);assert.ok(p.panels);assert.ok(Object.keys(p.sources).length)});
test('bad references and duplicate IDs cannot enter a snapshot',()=>{
  assert.throws(()=>parseReport({...raw,links:[{...raw.links[0],start:'missing'}]}));
  assert.throws(()=>parseReport({...raw,tree:{...raw.tree,children:[raw.tree.children[0],raw.tree.children[0]]}}));
});
test('sharing strips unrecognized fields and escapes material in the data script',()=>{
  const p=parseReport({...raw,title:'</script>$&',privatePrompt:'PRIVATE MATERIAL'});
  const html=renderReport('<script id="initial" type="application/json">/*CASE*/</script>',p);
  assert.ok(!html.includes('PRIVATE MATERIAL'));assert.equal(JSON.parse(html.slice(html.indexOf('>')+1,-9)).title,'</script>$&');
});
