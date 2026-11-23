import { z } from 'zod';

const key = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).refine(v => !['__proto__','constructor','prototype'].includes(v));
const text = z.string().max(6000);
const url = z.string().url().regex(/^https?:\/\//i);
const refs = z.array(key).max(1000);
const source = z.object({title:text.min(1),org:text.optional(),date:text.optional(),scope:text.optional(),url:z.union([url,z.literal('')]).optional()});
const node = z.object({
  id:key, label:text.min(1), kind:text.optional(), role:text.optional(), finding:text.optional(),
  note:text.optional(), mechanism:text.optional(), gap:text.optional(),metric:text.optional(), metric_label:text.optional(),refs:refs.optional(),
  get children(): z.ZodOptional<z.ZodArray<typeof node>> {return z.array(node).optional()}
});
const panel = z.object({kind:text,title:text,unit:text,rows:z.array(z.tuple([text,z.number()])).min(1).max(100),caption:text.optional(),refs:refs.optional()});
const schema = z.object({version:z.literal(1),key:key,title:text.min(1).max(240),question:text.min(1),tree:node,
  sources:z.record(key,source).default({}),links:z.array(z.object({start:key,end:key,label:text,status:text,reason:text})).default([]),
  highlights:z.record(key,z.array(z.object({ref:key,value:text,label:text,kind:text.optional()}))).optional(),
  panels:z.record(key,z.array(panel)).optional(),charts:z.record(key,z.object({title:text,rows:z.array(z.tuple([text,z.number(),text])).min(1),caption:text.optional(),refs:refs.optional()})).optional(),
  photos:z.record(key,z.object({caption:text,url:z.union([url,z.string().regex(/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/)])})).optional(),
  figures:z.record(key,z.object({title:text,url,image:url})).optional()
});
export type Report = z.infer<typeof schema>;
export function parseReport(raw:unknown): Report {
  function checkDepth(v:unknown, depth:number) {
    if(depth>48) throw Error('图谱层级过深');
    if(v && typeof v==='object') for(const item of Object.values(v)) checkDepth(item,depth+1);
  }
  checkDepth(raw,0);
  const p=schema.parse(raw), ids=new Set<string>();
  function visit(n:Report['tree']) {
    if(ids.has(n.id)||ids.size>=6000) throw Error('节点重复或超过 6000 个');
    ids.add(n.id);
    if(n.refs?.some(r=>!Object.hasOwn(p.sources,r))) throw Error('节点引用的来源不存在');
    n.children?.forEach(visit);
  }
  visit(p.tree);
  const linked=[...p.links.flatMap(l=>[l.start,l.end]), ...Object.entries(p.highlights||{}).flatMap(([id,items])=>[id,...items.map(i=>i.ref)]),
  ...Object.entries(p.panels||{}).flatMap(([id,items])=>[id,...items.flatMap(i=>i.refs||[])])];
  if(linked.some(id=>!ids.has(id))) throw Error('关系、图表或指标引用的节点不存在');
  return p;
}
export function renderReport(template:string,report:Report,theme?:string) {
  const json=JSON.stringify(report).replace(/</g,'\\u003c');
  return template.replace('/*CASE*/',()=>json).replace("applyTheme(matchMedia('(prefers-color-scheme: light)').matches);",theme==='light'||theme==='dark'?'applyTheme('+String(theme==='light')+');':"applyTheme(matchMedia('(prefers-color-scheme: light)').matches);");
}
