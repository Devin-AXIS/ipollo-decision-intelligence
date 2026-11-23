import {extractSlides} from './slides.ts';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const base='/ipollo-decision-intelligence', space=el<HTMLSelectElement>('workspace'),topic=el<HTMLTextAreaElement>('topic');
const viewer=el<HTMLIFrameElement>('viewer'),dialog=el<HTMLDialogElement>('confirm');
let selected='',title='储能产业链 · 示例',slides='',html='',pending='',busy=false,fileGeneration=0,viewGeneration=0;
let theme=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
type Row={id:string;title:string;state:string;session:string};
const button=(id:string)=>el<HTMLButtonElement>(id);
function message(value:string){el('notice').textContent=value}
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
function controls(){button('generate').disabled=busy||!space.value||!(topic.value.trim()||slides);button('publish').disabled=busy||!selected||!html;button('download').disabled=!html;space.disabled=busy;el<HTMLInputElement>('import').disabled=busy||!space.value}
function url(action:string,id=''){return base+'/'+action+'?'+new URLSearchParams({workspace:space.value,id,theme})}
async function api(action:string,id='',payload?:unknown){
  const response=await fetch(url(action,id),payload===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  if(!response.ok){const body=await response.json().catch(()=>({}));throw Error(body.error||'请求失败 '+response.status)}
  return response;
}
async function show(id='',name='储能产业链 · 示例'){
  const generation=++viewGeneration;
  selected=id;title=name;html='';viewer.srcdoc='';el('current').textContent=title;controls();
  const result=await (await api(id?'view':'example',id)).text();
  if(generation!==viewGeneration)return;
  html=result;viewer.srcdoc=html;controls();
  for(const b of el('reports').querySelectorAll('button'))b.setAttribute('aria-current',String(b.dataset.id===id));
}
async function list(){
  const workspace=space.value;if(!workspace)return;
  const rows:Row[]=await (await api('reports')).json();if(workspace!==space.value)return;
  const target=el('reports');target.replaceChildren();
  for(const r of rows){
    const b=document.createElement('button'),small=document.createElement('small');
    b.textContent=r.title;b.dataset.id=r.id;b.setAttribute('aria-current',String(r.id===selected));
    small.textContent=r.state==='ready'?'可讲解':r.state==='failed'?'提交失败':r.state==='attention'?'会话已结束，尚未保存图谱':'等待调查会话保存';
    b.append(small);target.append(b);
    b.onclick=()=>r.state==='ready'?void show(r.id,r.title).catch(e=>message(errorText(e))):message('可在 DSH 对话中查看调查进度。会话 '+r.session);
    if(r.id===pending&&r.state==='attention'){pending='';message('请打开 DSH 调查会话查看模型或保存问题，完成后点刷新。')}
    if(r.id===pending&&r.state==='ready'){pending='';await show(r.id,r.title);message('调查已保存。')}
  }
  if(!rows.length)target.textContent='尚无已保存的调查。';
}
async function run(action:()=>Promise<void>){if(busy)return;busy=true;controls();try{await action()}catch(e){message(errorText(e))}finally{busy=false;controls()}}
topic.oninput=controls;
button('clearFile').onclick=()=>{fileGeneration++;slides='';el('fileinfo').textContent='';el<HTMLInputElement>('ppt').value='';button('clearFile').hidden=true;controls()};
el<HTMLInputElement>('ppt').onchange=async e=>{
  const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
  const version=++fileGeneration;slides='';controls();button('clearFile').hidden=false;
  try{if(file.size>20*1024*1024)throw Error('PPTX 超过 20 MB');const data=extractSlides(new Uint8Array(await file.arrayBuffer()));if(version!==fileGeneration)return;slides=data.text;el('fileinfo').textContent=file.name+' · '+data.pages+' 页'+(data.empty?' · '+data.empty+' 页无文字':'')}
  catch(e){if(version===fileGeneration)el('fileinfo').textContent=errorText(e)}controls();
};
button('generate').onclick=()=>void run(async()=>{
  message('正在提交给工作区 AI…');const r=await(await api('investigate','',{topic:topic.value.trim(),slides})).json();pending=r.id;
  message('调查已进入 DSH 会话。完成后图谱会自动打开。');await list();
});
el<HTMLInputElement>('import').onchange=e=>void run(async()=>{
  const input=e.target as HTMLInputElement,file=input.files?.[0];if(!file)return;input.value='';
  if(file.size>2_000_000)throw Error('图谱超过 2 MB');
  const report=JSON.parse(await file.text());const result=await(await api('import','',report)).json();
  await list();await show(result.id,report.title);message('已保存到当前工作区。');
});
space.onchange=()=>{pending='';el('reports').replaceChildren();message('');void show().catch(e=>message(errorText(e)));void list().catch(e=>message(errorText(e)));controls()};
button('refresh').onclick=()=>void list().catch(e=>message(errorText(e)));
button('sample').onclick=()=>void show().catch(e=>message(errorText(e)));
button('toggle').onclick=()=>{const closed=el('shell').classList.toggle('collapsed');button('toggle').textContent=closed?'展开输入':'收起输入';button('toggle').setAttribute('aria-expanded',String(!closed))};
button('download').onclick=()=>{if(!html)return;const u=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=title.replace(/[\\/:*?"<>|]/g,'_')+' · 打开讲解.html';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)};
button('publish').onclick=()=>{el('publicTitle').textContent=title;el('shareStatus').textContent='';el('shareLink').hidden=true;button('submitPublish').hidden=false;dialog.showModal()};
button('close').onclick=()=>dialog.close();
button('submitPublish').onclick=async()=>{
  const id=selected;button('submitPublish').disabled=true;el('shareStatus').textContent='正在发布选定版本…';
  try{const r=await(await api('publish',id,{confirm:id})).json();const a=el<HTMLAnchorElement>('shareLink');a.href=r.url;a.textContent=r.url;a.hidden=false;el('shareStatus').textContent='访客链接';button('submitPublish').hidden=true}
  catch(e){el('shareStatus').textContent=errorText(e)}finally{button('submitPublish').disabled=false}
};
function applyTheme(value:string){theme=value;document.body.classList.toggle('light',theme==='light');if(html)void show(selected,title).catch(e=>message(errorText(e)))}
window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='decision-theme')applyTheme(e.data.theme==='light'?'light':'dark')});
async function start(){
  applyTheme(theme);await show();
  const rows:{id:string;title:string}[]=await(await api('workspaces')).json();
  rows.forEach(r=>space.add(new Option(r.title,r.id)));
  if(rows.length){space.value=rows[0]!.id;await list()}else message('先在 DSH 创建工作区，即可开始调查。');
}
start().catch(e=>message(errorText(e))).finally(controls);
let polling=false;
setInterval(async()=>{if(polling||busy||document.hidden||!space.value||(!pending&&!el('reports').textContent?.includes('等待调查会话保存')))return;polling=true;try{await list()}catch(e){message(errorText(e))}finally{polling=false}},8000);
