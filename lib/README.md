一旦我所属的文件夹有所变化请更新我。
`lib` 承载 DraftRecall 的领域模型、调度、AI、存储和推送边界。
业务规则先在本地纯函数完成，再由页面或 API 调用。

- `types.ts`: 核心数据结构，定义 Cards/QuestionItems/Alarms/Records/Warehouse/AIProviderConfig/Theme 等模型。
- `utils.ts`: shadcn 风格 className 合并工具。
- `scheduler.ts`: 手动闹钟与艾宾浩斯曲线双轨调度、曲线重置、回退、7 轮归档逻辑。
- `question-utils.ts`: 问题-要点归一化、解析结果转换、题目熟练度统计。
- `seed.ts`: 首次打开时的示例数据。
- `storage.ts`: localStorage 优先、Supabase 可接入的数据仓储，并执行 V1.1 字段迁移。
- `ai-service.ts`: OpenAI 兼容文档解析、动态 key points 提取、答案判分、默认提示词和连通性测试。
- `ai-settings.ts`: 浏览器端 AI 引擎配置加密 localStorage 持久化和 API Key 脱敏。
- `supabase.ts`: 可选 Supabase 客户端。
- `supabase-server.ts`: 服务端 Supabase service role 客户端。
- `push.ts`: Web Push 发送工具。
