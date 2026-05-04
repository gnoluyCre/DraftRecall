# DraftRecall

极简 PWA 草稿唤醒工具：上传单文档，AI 生成费曼式质询，通过手动闹钟和艾宾浩斯曲线双轨调度完成 7 轮复习，结业后进入仓库 BI。

## Run

```bash
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env.local`. Supabase is optional at runtime because the app has localStorage fallback, but `supabase/schema.sql` defines production tables. AI is configured at `/settings` with any OpenAI-compatible `Base URL`, `API Key`, and `Model ID`; the key is stored in encrypted localStorage.

## Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: Minimal shadcn-style UI primitives and feature components.
- `lib/`: domain model, scheduler, encrypted AI settings, OpenAI-compatible AI service, storage, push utilities.
- `public/`: PWA manifest and service worker.
- `supabase/`: SQL schema for Cards, Alarms, Records, Warehouse.

## Docs

- `DraftRecall (草稿唤醒) 产品需求文档 (PRD).md`: product requirements.
- `技术文档.md`: architecture, data flow, scheduling, AI, persistence, PWA and API implementation principles.
- `文档结构分形.txt`: documentation maintenance convention.
