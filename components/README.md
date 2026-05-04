一旦我所属的文件夹有所变化请更新我。
`components` 放置极简 shadcn 风格 UI 和 DraftRecall 业务组件。
组件保持移动优先，所有重要操作都能在窄屏完成。

- `ui/button.tsx`: 基础按钮。
- `ui/input.tsx`: 基础输入。
- `ui/textarea.tsx`: 基础多行输入。
- `ui/dialog.tsx`: 轻量弹窗。
- `card-board.tsx`: Dashboard P0/P1/P2 与冷却区看板，提供卡片级通知、点击空白关闭的 Kebab 菜单、重命名、等级、删除、操作反馈和查看题目抽屉。
- `card-composer.tsx`: 单文档录入、OpenAI 兼容 AI 解析、问题-要点初始化和手动/曲线调度设置。
- `card-settings.tsx`: 卡片设置抽屉，管理问答对、参考要点、调度、自定义提示词、曲线重置和保存反馈弹窗。
- `inquiry-room.tsx`: 全屏原子化多题质询、问题选择、回答缓存、查看提示要点、单题即时判分、质询总结弹窗和最终结算。
- `pwa-register.tsx`: Service Worker 注册和通知授权。
- `theme-provider.tsx`: 全局主题启动器，按设置或系统偏好写入 `data-theme`。
- `warehouse-bi.tsx`: 仓库 Treemap、速率曲线、热力图和重置瓶颈统计。
