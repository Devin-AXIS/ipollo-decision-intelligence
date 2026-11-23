# iPollo 决策情报

iPolloWork 的独立 DSH 插件。在原生对话提出决策问题或附上 PPT，工作区 AI 整理产业关系、驱动因素、关键指标和证据来源。全景可逐层展开，也可进入单个节点核对依据。

## 安装与使用

从 [GitHub Releases](https://github.com/Devin-AXIS/ipollo-decision-intelligence/releases) 下载发布包，在 iPolloWork 插件管理器中安装，或运行：

    dsh plugin --profile web add /absolute/path/ipollo-dsh-decision-intelligence-1.0.2.tgz

1. 在当前工作区的原生对话提出需求，可直接附上 PPT。「请用决策情报 Skill 生成图谱」即可启动调查。
2. 在右侧栏点「＋ → 决策情报」。图谱自动保存到当前工作区，可切换历史版本。
3. 可下载独立网页，或在确认后生成访客链接。

适配 DSH 0.2.2-rc.3。调查需要已配置模型的可写工作区。保存需要登录 iPolloWork 并启用应用数据插件，在线分享需要账号的网页发布能力。

## 开发

使用 Node.js 24.9 或更高版本，执行 npm ci 和 npm run check。执行 npm pack 生成独立包。DSH 通过 cordis.patch.yml 注册组件，运行时入口为 dist/host.js 与 dist/client.js。数据及发布服务由当前 iPolloWork 宿主提供，仓库中的 src/services.ts 描述插件调用的接口。

## 许可

见 [LICENSE](LICENSE) 和 [NOTICE.txt](NOTICE.txt)。
