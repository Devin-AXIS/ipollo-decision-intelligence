window.__ModuleLoader__.load({id:'@ipollo/dsh-decision-intelligence',factory(require){
 const React=require('react'),h=React.createElement,panel='ipollo-decision-intelligence';
 function Panel({themeStore}){
   const theme=React.useSyncExternalStore(themeStore.subscribe,themeStore.getSnapshot).active.colorScheme;
   const ref=React.useRef(null);
   function sync(){ref.current?.contentWindow?.postMessage({type:'decision-theme',theme},location.origin)}
   React.useEffect(sync,[theme]);
   return h('iframe',{ref,onLoad:sync,title:'iPollo 决策情报',src:'/ipollo-decision-intelligence/editor',style:{width:'100%',height:'100%',border:0,paddingTop:'var(--dsh-frame-top-clearance,0px)',boxSizing:'border-box'}});
 }
 return {inject:['slots','layout','theme'],apply(ctx){
  ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:panel,inject:()=>({themeStore:{subscribe:fn=>ctx.on('theme/change',fn),getSnapshot:()=>ctx.theme.getTheme()}})},Panel));
  ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:panel,order:9,label:()=>'iPollo 决策情报'},()=>h('svg',{width:18,height:18,viewBox:'0 0 20 20',fill:'none',stroke:'currentColor','aria-hidden':true},h('path',{d:'M4 13l6-8 6 8H4'}),...[[4,13],[10,5],[16,13]].map(([cx,cy])=>h('circle',{key:cx,cx,cy,r:2,fill:'currentColor'})))));
  ctx.slots.inject('plugins.bundle.config',()=>ctx.slots.register({name:'plugins.bundle.config',key:'@ipollo/dsh-decision-intelligence'},()=>h('button',{onClick:()=>ctx.layout.selectPanel(panel)},'打开决策情报')));
 }};
}});
