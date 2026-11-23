import {strFromU8,unzipSync} from 'fflate';

export function extractSlides(bytes:Uint8Array) {
  if(bytes.length>20*1024*1024) throw Error('PPTX 超过 20 MB');
  let expanded=0;
  const files=unzipSync(bytes,{filter:entry=>{
    if(!/^ppt\/(presentation\.xml|_rels\/presentation\.xml\.rels|slides\/slide\d+\.xml)$/.test(entry.name))return false;
    expanded+=entry.originalSize;
    if(entry.originalSize>4*1024*1024||expanded>24*1024*1024)throw Error('幻灯片文字超出导入范围');
    return true;
  }});
  const xml=(path:string)=>{
    if(!files[path])throw Error('PPTX 缺少幻灯片结构');
    const doc=new DOMParser().parseFromString(strFromU8(files[path]),'application/xml');
    if(doc.querySelector('parsererror'))throw Error('幻灯片 XML 无法读取');
    return doc;
  };
  const rels=new Map(Array.from(xml('ppt/_rels/presentation.xml.rels').getElementsByTagNameNS('*','Relationship')).map(r=>[r.getAttribute('Id'),r.getAttribute('Target')||'']));
  const ordered=Array.from(xml('ppt/presentation.xml').getElementsByTagNameNS('*','sldId'));
  if(ordered.length>200)throw Error('一次最多导入 200 页');
  const slides=ordered.map((el,i)=>{
    const relation=Array.from(el.attributes).find(a=>a.localName==='id'&&a.namespaceURI?.endsWith('/relationships'));
    const target=rels.get(relation?.value||'')||'';
    const path=target.startsWith('/ppt/')?target.slice(1):'ppt/'+target.replace(/^\.\//,'');
    if(!/^ppt\/slides\/slide\d+\.xml$/.test(path))throw Error('无法解析幻灯片顺序');
    const paragraphs=Array.from(xml(path).getElementsByTagNameNS('*','p')).map(p=>Array.from(p.getElementsByTagNameNS('*','t')).map(t=>t.textContent).join('')).filter(Boolean);
    return paragraphs.length?'第 '+(i+1)+' 页\n'+paragraphs.join('\n'):'';
  });
  const text=slides.filter(Boolean).join('\n\n');
  if(!text)throw Error('这份 PPTX 没有可提取的文字。请在左侧输入问题或粘贴图中文字。');
  if(text.length>64000)throw Error('文字超过 64,000 字符，请分拆材料后导入。');
  return {text,pages:ordered.length,empty:slides.filter(s=>!s).length};
}
