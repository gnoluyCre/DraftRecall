// input: document content, filename, AI config and optional prompt; output: parsed title, keywords and questions; pos: OpenAI-compatible parse API, update this header and app/README.md when changed.
import { NextResponse } from "next/server";
import { parseDocumentWithAI } from "@/lib/ai-service";

export async function POST(request: Request) {
  const body = await request.json();
  const content = String(body.content ?? "");
  const filename = String(body.filename ?? "draft.md");
  if (!content.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });
  try {
    const parsed = await parseDocumentWithAI(content, filename, body.aiConfig, body.parsePrompt);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI 解析失败" }, { status: 502 });
  }
}
