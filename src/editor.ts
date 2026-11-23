const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const base='/ipollo-decision-intelligence';
const params=new URLSearchParams(location.search);
const session=params.get('session') ?? '';
const viewer=el<HTMLIFrameElement>('viewer');
const versions=el<HTMLSelectElement>('versions');
const dialog=el<HTMLDialogElement>('confirm');
const button=(id:string)=>el<HTMLButtonElement>(id);
let theme=params.get('theme')==='light'?'light':'dark';
let selected='',title='',html='',generation=0,visible=true,loading=false,viewFailed=false;
type Row={id:string;title:string};
let rows:Row[]=[];

function message(text:string){el('notice').textContent=text}
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
function controls(){
  button('publish').disabled=button('download').disabled=!html;
  el('toolbar').hidden=!rows.length;
  viewer.hidden=!html;
  el('empty').hidden=Boolean(rows.length);
}
async function api(action:string,id='',payload?:unknown){
  const url=base+'/'+action+'?'+new URLSearchParams({session,id,theme});
  const response=await fetch(url,payload===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  if(!response.ok){
    const body=await response.json().catch(()=>({}));
    throw Error(body.error||'请求失败 '+response.status);
  }
  return response;
}
async function show(row:Row){
  const request=++generation;
  selected=row.id;
  title=row.title;
  versions.value=row.id;
  viewFailed=false;
  html='';
  viewer.removeAttribute('srcdoc');
  controls();
  message('正在打开图谱…');
  try{
    const result=await (await api('view',row.id)).text();
    if(request!==generation)return;
    html=result;
    viewer.srcdoc=result;
    controls();
    message('');
  }catch(error){
    if(request!==generation)return;
    viewFailed=true;
    message(errorText(error));
  }
}
async function refresh(){
  if(loading)return;
  loading=true;
  try{
    const next:Row[]=await (await api('reports')).json();
    const followsLatest=!selected||selected===rows[0]?.id;
    const row=(followsLatest?undefined:next.find(item=>item.id===selected))??next[0];
    if(JSON.stringify(rows)!==JSON.stringify(next)){
      rows=next;
      versions.replaceChildren(...next.map(item=>new Option(item.title,item.id)));
    }
    if(row){
      versions.value=row.id;
      if(row.id!==selected||viewFailed)await show(row);
    }else{
      if(selected)generation++;
      selected='';
      html='';
      viewer.removeAttribute('srcdoc');
      message('');
    }
    controls();
  }catch(error){message(errorText(error))}
  finally{loading=false}
}
versions.onchange=()=>{
  const row=rows.find(item=>item.id===versions.value);
  if(row)void show(row);
};
button('refresh').onclick=()=>void refresh();
button('download').onclick=()=>{
  if(!html)return;
  const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;
  link.download=title.replace(/[\\/:*?"<>|]/g,'_')+' · 决策图谱.html';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
};
let target:Row|undefined;
button('publish').onclick=()=>{
  target={id:selected,title};
  el('publicTitle').textContent=target.title;
  el('shareStatus').textContent='';
  el('shareLink').hidden=true;
  button('submitPublish').hidden=false;
  dialog.showModal();
};
button('close').onclick=()=>dialog.close();
button('submitPublish').onclick=async()=>{
  if(!target)return;
  const id=target.id;
  button('submitPublish').disabled=true;
  button('close').disabled=true;
  el('shareStatus').textContent='正在发布…';
  try{
    const result=await (await api('publish',id,{confirm:id})).json();
    const link=el<HTMLAnchorElement>('shareLink');
    link.href=result.url;
    link.hidden=false;
    el('shareStatus').textContent='已生成访客链接';
    button('submitPublish').hidden=true;
  }catch(error){el('shareStatus').textContent=errorText(error)}
  finally{
    button('submitPublish').disabled=false;
    button('close').disabled=false;
  }
};
dialog.addEventListener('cancel',event=>{
  if(button('submitPublish').disabled)event.preventDefault();
});

document.body.classList.toggle('light',theme==='light');
controls();
window.addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='decision-view')return;
  const next=event.data.theme==='light'?'light':'dark';
  const appeared=!visible&&Boolean(event.data.visible);
  visible=Boolean(event.data.visible);
  if(next!==theme){
    theme=next;
    document.body.classList.toggle('light',theme==='light');
    const row=rows.find(item=>item.id===selected);
    if(row)void show(row);
  }
  if(appeared)void refresh();
});
message('正在加载图谱…');
void refresh();
setInterval(()=>{
  if(visible&&!document.hidden&&!dialog.open)void refresh();
},6000);
