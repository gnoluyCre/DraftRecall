// input: PushSubscription JSON request body; output: accepted subscription response; pos: push subscription API, update this header and app/README.md when changed.
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const memorySubscriptions: PushSubscriptionJSON[] = [];

export async function POST(request: Request) {
  const body = await request.json();
  const subscription = (body.endpoint ? body : body.subscription) as PushSubscriptionJSON;
  const userId = body.userId ?? null;
  const supabase = getSupabaseServerClient();
  if (supabase && subscription.endpoint) {
    await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      subscription
    }, { onConflict: "endpoint" });
  }
  memorySubscriptions.push(subscription);
  return NextResponse.json({ ok: true, stored: memorySubscriptions.length });
}
