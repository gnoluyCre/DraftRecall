// input: Supabase due cards, active windows, card notification switches and push subscriptions; output: Web Push notifications for due recalls; pos: scheduled alarm dispatcher, update this header and app/README.md when changed.
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase service role env missing" }, { status: 503 });

  const now = new Date().toISOString();
  const { data: globalSettings } = await supabase
    .from("notification_settings")
    .select("global_enabled")
    .is("user_id", null)
    .maybeSingle();
  if (globalSettings?.global_enabled === false) return NextResponse.json({ ok: true, muted: true, sent: 0 });

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id,title,priority,next_review_at,user_id,notifications_enabled,active_window_start,active_window_end")
    .neq("status", "graduated")
    .eq("notifications_enabled", true)
    .lte("next_review_at", now)
    .limit(50);

  if (cardsError) return NextResponse.json({ error: cardsError.message }, { status: 500 });
  const inActiveWindow = (card: { active_window_start: string; active_window_end: string }) => {
    const current = new Date();
    const minutes = current.getHours() * 60 + current.getMinutes();
    const [startHour, startMinute] = card.active_window_start.slice(0, 5).split(":").map(Number);
    const [endHour, endMinute] = card.active_window_end.slice(0, 5).split(":").map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return start <= end ? minutes >= start && minutes <= end : minutes >= start || minutes <= end;
  };
  const eligibleCards = (cards ?? []).filter(inActiveWindow);
  const deferredCards = (cards ?? []).filter((card) => !inActiveWindow(card));

  if (!eligibleCards.length) return NextResponse.json({ ok: true, sent: 0, deferred: deferredCards.length });

  const userIds = [...new Set(eligibleCards.map((card) => card.user_id).filter(Boolean))];
  const subscriptionsQuery = supabase.from("push_subscriptions").select("subscription,user_id");
  const { data: subscriptions, error: subscriptionsError } = userIds.length
    ? await subscriptionsQuery.in("user_id", userIds)
    : await subscriptionsQuery.is("user_id", null);

  if (subscriptionsError) return NextResponse.json({ error: subscriptionsError.message }, { status: 500 });

  let sent = 0;
  for (const card of eligibleCards) {
    const targets = subscriptions?.filter((item) => item.user_id === card.user_id || (!item.user_id && !card.user_id)) ?? [];
    await Promise.allSettled(targets.map((target) => sendPush(target.subscription, {
      title: `DraftRecall · ${card.priority}`,
      body: `${card.title} 等待质询`,
      url: `/inquiry/${card.id}`
    }).then(() => { sent += 1; })));
  }

  await supabase.from("cards").update({ status: "due", updated_at: now }).in("id", eligibleCards.map((card) => card.id));
  return NextResponse.json({ ok: true, due: eligibleCards.length, deferred: deferredCards.length, sent });
}
