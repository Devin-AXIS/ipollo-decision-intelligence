import type {DataApp} from './services.ts';
import type {ServiceBinding} from './services.ts';
import {readReport} from './store.ts';
import {renderReport} from './report.ts';

/** Only the selected, validated report enters the single-file visitor snapshot. */
export async function publishReport(binding:ServiceBinding,app:DataApp,workspaceId:string,id:string,template:string) {
  if(!binding.publish||!await binding.publicationStatus?.()) throw Error('账号尚未启用网页发布，可下载独立网页发送。');
  const bytes=new TextEncoder().encode(renderReport(template,await readReport(app,id)));
  const entry='decision-'+id+'/index.html';
  const result=await binding.publish({workspaceId,entry,files:[{path:entry,bytes:bytes.length,open:()=>new Blob([bytes]).stream()}]});
  if(!/^https?:\/\//.test(result.url))throw Error('发布服务未返回访问地址');
  return result;
}
