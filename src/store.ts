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
const saves=new Map<string,Promise<unknown>>();

export async function saveSessionReport(app:DataApp,session:string,raw:unknown) {
  const report=parseReport(raw);
  const payload=JSON.stringify(report);
  if(payload.length>1200000) throw Error('图谱过大，请缩减嵌入图片');
  const digest=createHash('sha256').update(payload).digest('hex');
  const key=app.id+':'+session;
  const previous=saves.get(key);
  const current=(async()=>{
    await previous?.catch(()=>{});
    const reports=app.collection('reports');
    const exact=await reports.find({where:{session,state:'ready',digest},limit:1});
    if(exact.items[0]) return exact.items[0].id;

    // Reuse unfinished reservations from earlier releases and safely retry a failed data write.
    const pending=await reports.find({where:{session,state:'pending'},sort:'-createdAt',limit:1});
    const row=pending.items[0] ?? await reports.insert({title:report.title,state:'pending',session,count:0,digest:''});
    return saveReport(app,row,report,payload,digest);
  })();
  saves.set(key,current);
  try {return await current}
  finally {if(saves.get(key)===current)saves.delete(key)}
}

async function saveReport(app:DataApp,row:DataRecord,report:Report,payload:string,digest:string) {
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
