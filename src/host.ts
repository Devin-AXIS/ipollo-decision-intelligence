import type {Context} from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-workspace';
import type {} from '@deepseek-ai/dsh-host-webserver';
import type {} from '@deepseek-ai/dsh-sandbox-policy';
import type {} from '@deepseek-ai/dsh-skill';
import {defineTool} from '@deepseek-ai/dsh-tools';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import type {IncomingMessage,ServerResponse} from 'node:http';
import type {IpolloData} from './services.ts';
import type {ServiceCenter} from './services.ts';
import {publishReport} from './publish.ts';
import {openStore,readReport,saveSessionReport} from './store.ts';
import {renderReport} from './report.ts';

export const name='ipollo-decision-intelligence';
export const inject=['webServer','connection','connection.authentication','workspaceRegistry','skills','tools','sandboxPolicy'];
interface Host extends Context {connection:{admit(req:IncomingMessage):{rejection:number}|{peer:{principal:{kind:string}}}}}
const base='/ipollo-decision-intelligence';
class HttpError extends Error {constructor(readonly status:number,message:string){super(message)}}
function reply(res:ServerResponse,body:string,type='application/json; charset=utf-8',status=200) {
  res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(body);
}
async function input(req:IncomingMessage) {
  if(!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415,'需要 JSON');
  const chunks:Buffer[]=[];let length=0;
  for await(const chunk of req){length+=chunk.length;if(length>2_000_000)throw new HttpError(413,'导入内容超过 2 MB');chunks.push(chunk)}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function apply(ctx:Host) {
  let data:IpolloData|undefined,services:ServiceCenter|undefined;
  ctx.inject(['ipolloData'],scope=>scope.effect(()=>{data=(scope as Context & {ipolloData:IpolloData}).ipolloData;return ()=>{data=undefined}}));
  ctx.inject(['ipolloServices'],scope=>scope.effect(()=>{services=(scope as Context & {ipolloServices:ServiceCenter}).ipolloServices;return ()=>{services=undefined}}));
  const [template,editor,script,skill]=await Promise.all(['../viewer/report.html','../viewer/editor.html','./editor.js','../skills/decision-intelligence/SKILL.md'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
  const lifetime=new AbortController();
  ctx.effect(()=>()=>lifetime.abort());
  const store=(workspace:string)=>{
    if(!data) throw new HttpError(503,'请先启用 iPolloWork 套件中的应用数据插件并登录。');
    return openStore(data,workspace);
  };
  ctx.effect(()=>ctx.skills.register({name:'decision-intelligence',description:'研究决策问题或 PPT，建立可追溯的产业关系、驱动因素和指标图谱。',content:skill,source:'runtime',resourceBase:{kind:'directory',path:fileURLToPath(new URL('../skills/decision-intelligence/',import.meta.url))}}));
  ctx.effect(()=>ctx.tools.register(defineTool({
    name:'decision_intelligence_save',description:'Save a complete decision atlas from the current conversation to its workspace. Use the decision-intelligence skill. The result appears in the Decision Intelligence tab in the right sidebar.',
    parameters:{report:{type:'object',required:true,additionalProperties:true,description:'Atlas version 1 with title, question, tree, sources and links.'}},
    output:{schema:{type:'json'},render:(_args,v)=>[{type:'text',text:JSON.stringify(v)}]},
    presentCall:()=>({card:'generic',title:'保存决策情报',kind:'edit'}),
    async execute(args,exec){
      const session=exec.agent?.session;
      const ws=session && ctx.workspaceRegistry.list().find(w=>w.path===session.header.cwd&&w.sessionIds.includes(session.id));
      if(!session||!ws||ctx.workspaceRegistry.archivedSessionIds.includes(session.id)||ctx.sandboxPolicy.resolve({session}).mode==='read-only')throw Error('此会话没有保存权限');
      const app=await store(ws.id);
      const id=await saveSessionReport(app,session.id,args.report);
      return {id,title:'iPollo 决策情报',location:'当前工作区 → 右侧「决策情报」'};
    }
  })));
  ctx.effect(()=>ctx.webServer.register({kind:'prefix',path:base,handler:async(req,res)=>{
    try {
      const access=ctx.connection.admit(req);
      if('rejection' in access)throw new HttpError(access.rejection,'请登录 DSH');
      if(access.peer.principal.kind!=='owner'||['cross-site','same-site'].includes(req.headers['sec-fetch-site']||''))throw new HttpError(403,'无权打开此工作区');
      const url=new URL(req.url||'/','http://localhost');
      const path=url.pathname.slice(base.length),action=req.method+' '+path;
      if(action==='GET /editor')return reply(res,editor,'text/html; charset=utf-8');
      if(action==='GET /editor.js')return reply(res,script,'text/javascript; charset=utf-8');
      const session=url.searchParams.get('session');
      const ws=session && ctx.workspaceRegistry.list().find(w=>w.sessionIds.some(id=>id===session));
      if(!ws)throw new HttpError(404,'当前对话没有关联工作区');
      const app=await store(ws.id), id=url.searchParams.get('id')||'';
      if(action==='GET /reports'){
        const rows=await app.collection('reports').all({where:{state:'ready'},sort:'-createdAt',fields:['title']});
        return reply(res,JSON.stringify(rows.map(row=>({id:row.id,title:row.title}))));
      }
      if(action==='GET /view')return reply(res,renderReport(template,await readReport(app,id),url.searchParams.get('theme')||''),'text/html; charset=utf-8');
      if(action==='POST /publish'){
        const body=await input(req);
        if(body.confirm!==id||!id)throw new HttpError(400,'请确认要公开的版本');
        const binding=await services?.bind(lifetime.signal);
        if(!binding)throw new HttpError(503,'账号尚未启用网页发布，可下载独立网页发送。');
        const result=await publishReport(binding,app,ws.id,id,template);
        return reply(res,JSON.stringify({url:result.url}));
      }
      throw new HttpError(404,'未找到入口');
    }catch(err){
      const e=err as Error & {status?:number;code?:string};
      const message=e.code==='IPW_SIGN_IN_REQUIRED'?'请先登录 iPolloWork 账号。':e.message||'请求未完成';
      reply(res,JSON.stringify({error:message.slice(0,500)}),'application/json; charset=utf-8',e.status&&e.status>=400&&e.status<=599?e.status:400);
    }
  }}));
}
