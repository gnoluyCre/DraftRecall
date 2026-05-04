一旦我所属的文件夹有所变化请更新我。
`app` 是 Next.js App Router 的页面、布局和服务端 API。
页面负责组合体验，业务规则优先调用 `lib`。

- `layout.tsx`: 全局 HTML、PWA 元信息和字体。
- `page.tsx`: Dashboard 入口，包含动态刷新、全局通知开关、设置导航和卡片操作菜单。
- `globals.css`: Tailwind、主题 CSS 变量和全局极简视觉变量。
- `inquiry/[cardId]/page.tsx`: 全屏质询页路由。
- `settings/page.tsx`: OpenAI 兼容 AI 引擎设置页，支持加密保存、连通性测试、主题选择、自动订阅测试推送和反馈弹窗。
- `warehouse/page.tsx`: 仓库 BI 页面，展示重置统计和问题掌握覆盖率。
- `api/ai/parse/route.ts`: OpenAI 兼容文档解析 API。
- `api/ai/grade/route.ts`: OpenAI 兼容 key points 回答评估 API。
- `api/ai/test/route.ts`: AI 引擎连通性和延迟测试 API。
- `api/push/subscribe/route.ts`: Web Push 订阅接收 API。
- `api/push/send/route.ts`: Web Push 发送 API，返回明确的发送错误。
- `api/alarms/due/route.ts`: Cron 可调用的 Supabase 到期卡片扫描和推送 API。
