// input: AI provider config request body; output: connectivity test and latency; pos: settings connection probe API, update this header and app/README.md when changed.
import { NextResponse } from "next/server";
import { testAIConnection } from "@/lib/ai-service";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const result = await testAIConnection(body.aiConfig ?? body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "连接测试失败" }, { status: 502 });
  }
}
