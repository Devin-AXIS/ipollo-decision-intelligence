import {createHash} from 'node:crypto';
import type {IpolloData,DataApp,DataRecord,DataStatement} from './services.ts';
import {parseReport,type Report} from './report.ts';

const schemaReady=new WeakMap<IpolloData,Map<string,Promise<unknown>>>();

export async function openStore(service:IpolloData,workspace:string) {
  const suffix=createHash('sha256').update(workspace).digest('hex').slice(0,24);
  const app=await service.open('iPollo 决策情报 · '+suffix);
  let byApp=schemaReady.get(service);
  if(!byApp){byApp=new Map();schemaReady.set(service,byApp)}
  let ready=byApp.get(app.id);
  if(!ready){
    ready=app.run({batch:[
    {define:'reports',fields:{title:'text',state:'text',session:'text',count:'number',digest:'text'},strict:true,public:[],users:[]},
    {define:'parts',fields:{report:'text',sequence:'number',body:'text'},strict:true,public:[],users:[]}
    ]});
    byApp.set(app.id,ready);
  }
  try{await ready}catch(error){byApp.delete(app.id);throw error}
  return app;
}
export const queueReport=(app:DataApp,title:string,session='')=>app.collection('reports').insert({title,state:'pending',session,count:0,digest:''});
export async function saveReport(app:DataApp,row:DataRecord,raw:unknown) {
  const report=parseReport(raw), payload=JSON.stringify(report), digest=createHash('sha256').update(payload).digest('hex');
  if(row.state==='ready' && row.digest===digest) return row.id;
  if(row.state!=='pending') throw Error('该版本已经结束，请创建新版本');
  if(payload.length>1200000) throw Error('图谱过大，请缩减嵌入图片');
  // Bound by UTF-16 length so even quotes or non-ASCII characters fit a 16 KiB data record.
  const chunks=[];
  for(let offset=0;offset<payload.length;) {
    let end=Math.min(offset+2600,payload.length);
    if(end<payload.length && /[\uD800-\uDBFF]/.test(payload[end-1]!)) end--;
    chunks.push({report:row.id,sequence:chunks.length,body:payload.slice(offset,end)}); offset=end;
  }
  const batch:DataStatement[]=[];
  for(let i=0;i<chunks.length;i+=100) batch.push({insert:'parts',values:chunks.slice(i,i+100)});
  batch.push({update:'reports',id:row.id,version:row.version,set:{title:report.title,state:'ready',digest,count:chunks.length}});
  await app.run({batch});
  return row.id;
}
export async function readReport(app:DataApp,id:string):Promise<Report> {
  const row=await app.collection('reports').get(id);
  if(row.state!=='ready') throw Error('调查尚未完成');
  const parts=await app.collection('parts').all({where:{report:id},sort:'sequence'});
  const payload=parts.map(p=>p.body).join('');
  if(parts.length!==row.count||createHash('sha256').update(payload).digest('hex')!==row.digest) throw Error('图谱数据不完整');
  return parseReport(JSON.parse(payload));
}
