// input: push payload and subscription; output: push delivery result; pos: notification dispatch API, update this header and app/README.md when changed.
import { NextResponse } from "next/server";
import { sendPush } from "@/lib/push";

export async function POST(request: Request) {
  const body = await request.json();
  const subscription = body.subscription;
  const payload = body.payload ?? { title: "DraftRecall", body: "有卡片等待质询", url: "/" };
  if (!subscription) return NextResponse.json({ error: "subscription required" }, { status: 400 });
  try {
    await sendPush(subscription, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "推送发送失败" }, { status: 502 });
  }
}
