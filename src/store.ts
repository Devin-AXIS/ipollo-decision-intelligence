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
const maxReportLength=1_200_000;
const maxSnapshotBytes=maxReportLength*3;

export async function saveSessionReport(app:DataApp,session:string,raw:unknown) {
  const report=parseReport(raw);
  const payload=JSON.stringify(report);
  if(payload.length>maxReportLength) throw Error('图谱过大，请缩减嵌入图片');
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
  const chunks:{report:string;sequence:number;body:string}[]=[];
  if(Object.values(report.photos??{}).some(photo=>photo.url.startsWith('data:'))){
    // The data service stores binary-bearing documents as private object-storage attachments.
    if(!app.files)throw Error('应用数据附件服务不可用，无法保存带内嵌图片的图谱');
    const file=await app.files.upload(row.id+'.json',new TextEncoder().encode(payload),{mime:'application/json'});
    chunks.push({report:row.id,sequence:-1,body:file.id});
  }else{
    // Bound each legacy-format part so quoted or non-ASCII text fits a data record.
    for(let offset=0;offset<payload.length;){
      let end=Math.min(offset+2600,payload.length);
      if(end<payload.length&&/[\uD800-\uDBFF]/.test(payload[end-1]!))end--;
      chunks.push({report:row.id,sequence:chunks.length,body:payload.slice(offset,end)});
      offset=end;
    }
  }
  const batch:DataStatement[]=[];
  for(let i=0;i<chunks.length;i+=100)batch.push({insert:'parts',values:chunks.slice(i,i+100)});
  batch.push({update:'reports',id:row.id,version:row.version,set:{title:report.title,state:'ready',digest,count:chunks.length}});
  await app.run({batch});
  return row.id;
}
export async function readReport(app:DataApp,id:string):Promise<Report> {
  const row=await app.collection('reports').get(id);
  if(row.state!=='ready') throw Error('调查尚未完成');
  const parts=await app.collection('parts').all({where:{report:id},sort:'sequence'});
  if(parts.length!==row.count)throw Error('图谱数据不完整');
  const attachment=parts.length===1&&parts[0]?.sequence===-1?String(parts[0].body):null;
  const payload=attachment?await readSnapshot(app,attachment):parts.map(p=>p.body).join('');
  if(createHash('sha256').update(payload).digest('hex')!==row.digest)throw Error('图谱数据不完整');
  return parseReport(JSON.parse(payload));
}

async function readSnapshot(app:DataApp,id:string):Promise<string> {
  if(!app.files||!/^[0-9a-f-]{36}$/i.test(id))throw Error('图谱附件不可用');
  const location=new URL((await app.files.download(id)).url);
  if(location.protocol!=='https:'||location.username||location.password)throw Error('图谱附件地址无效');
  const response=await fetch(location,{redirect:'error',signal:AbortSignal.timeout(20_000)});
  if(!response.ok||!response.body)throw Error('无法读取图谱附件');
  const reader=response.body.getReader();
  const chunks:Uint8Array[]=[];
  let length=0;
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      length+=value.byteLength;
      if(length>maxSnapshotBytes)throw Error('图谱附件过大');
      chunks.push(value);
    }
  }finally{await reader.cancel().catch(()=>{})}
  return Buffer.concat(chunks).toString('utf8');
}
