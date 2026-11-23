window.__ModuleLoader__.load({
  id: '@ipollo/dsh-decision-intelligence',
  factory(require) {
    const React = require('react');
    const tab = 'ipollo-decision-intelligence';

    function AtlasPanel({sessionId, useTabInfo, themeStore}) {
      const theme = React.useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot).active.colorScheme;
      const {tab: {visible}} = useTabInfo();
      const frame = React.useRef(null);
      const initialTheme = React.useRef(theme);
      function sync() {
        const target = frame.current?.contentWindow;
        target?.postMessage({type: 'decision-view', theme, visible}, location.origin === 'null' ? '*' : location.origin);
      }
      React.useEffect(sync, [theme, visible]);
      const url = new URL('ipollo-decision-intelligence/editor', document.baseURI);
      url.search = new URLSearchParams({session: sessionId, theme: initialTheme.current}).toString();
      return React.createElement('iframe', {
        ref: frame, onLoad: sync, title: 'iPollo 决策情报', src: url.href,
        style: {width: '100%', height: '100%', border: 0, display: 'block'},
      });
    }

    return {
      inject: ['slots', 'sidebarRightTabs', 'theme'],
      apply(ctx) {
        if ('__DSH_LIVESHARE_VIEWER__' in globalThis) return;
        const title = () => '决策情报';
        const themeStore = {
          subscribe: listener => ctx.on('theme/change', listener),
          getSnapshot: () => ctx.theme.getTheme(),
        };
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: tab, kind: tab, title, keepMounted: true,
          guide: [{id: tab, order: 13, title, description: () => '查看当前工作区的决策图谱'}],
        }));
        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab', key: tab, inject: () => ({themeStore}),
        }, props => React.createElement(AtlasPanel, {...props, key: props.sessionId}))));
      },
    };
  },
});
