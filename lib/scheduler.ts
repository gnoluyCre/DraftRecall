// input: Card, Alarm and ReviewRecord domain types; output: scheduling, reset, regression and graduation rules; pos: core memory engine, update this header and lib/README.md when changed.
import type { Alarm, Card, Priority, ReviewRecord, WarehouseEntry } from "@/lib/types";

export const CURVE_INTERVALS_MINUTES = [30, 720, 1440, 2880, 5760, 10080, 21600] as const;
export const GRADUATION_ROUNDS = 7;

export function priorityRank(priority: Priority) {
  return priority === "P0" ? 0 : priority === "P1" ? 1 : 2;
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function parseTimeOnDate(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function clampToActiveWindow(target: Date, window: Card["activeWindow"]) {
  const start = parseTimeOnDate(target, window.start);
  const end = parseTimeOnDate(target, window.end);

  if (start <= end) {
    if (target < start) return start;
    if (target > end) {
      const tomorrow = new Date(target);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return parseTimeOnDate(tomorrow, window.start);
    }
    return target;
  }

  if (target >= start || target <= end) return target;
  return start;
}

export function computeCurveNextReview(stage: number, from: Date, activeWindow: Card["activeWindow"]) {
  const index = Math.max(0, Math.min(stage, CURVE_INTERVALS_MINUTES.length - 1));
  return clampToActiveWindow(addMinutes(from, CURVE_INTERVALS_MINUTES[index]), activeWindow);
}

export function computeManualNextFire(alarm: Pick<Alarm, "time" | "frequency" | "weekdays">, from = new Date()) {
  let candidate = parseTimeOnDate(from, alarm.time);
  if (candidate <= from) candidate.setDate(candidate.getDate() + 1);

  if (alarm.frequency === "once") return candidate;
  if (alarm.frequency === "daily") return candidate;
  if (alarm.frequency === "weekdays") {
    while (![1, 2, 3, 4, 5].includes(candidate.getDay())) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }
  const days = alarm.weekdays?.length ? alarm.weekdays : [from.getDay()];
  while (!days.includes(candidate.getDay())) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

export function getEffectiveNextReview(card: Card) {
  if (card.scheduleMode === "manual") {
    const enabled = card.manualAlarms.filter((alarm) => alarm.enabled);
    if (enabled.length) {
      return enabled.reduce((earliest, alarm) =>
        new Date(alarm.nextFireAt) < new Date(earliest.nextFireAt) ? alarm : earliest
      ).nextFireAt;
    }
  }
  return card.nextReviewAt;
}

export function deriveCardStatus(card: Card, now = new Date()): Card["status"] {
  if (card.status === "graduated") return "graduated";
  return new Date(getEffectiveNextReview(card)) <= now ? "due" : "cooling";
}

export function sortCards(cards: Card[], now = new Date()) {
  return [...cards].sort((a, b) => {
    const priority = priorityRank(a.priority) - priorityRank(b.priority);
    if (priority !== 0) return priority;
    const due = Number(deriveCardStatus(b, now) === "due") - Number(deriveCardStatus(a, now) === "due");
    if (due !== 0) return due;
    return new Date(getEffectiveNextReview(a)).getTime() - new Date(getEffectiveNextReview(b)).getTime();
  });
}

export function applyReviewResult(card: Card, result: ReviewRecord["result"], now = new Date()) {
  const stageBefore = card.stage;
  const passed = result === "passed";
  const stageAfter = result === "revealed" ? Math.max(0, card.stage - 1) : passed ? Math.min(7, card.stage + 1) : Math.max(0, card.stage - 1);
  const completedRounds = result === "passed" ? card.completedRounds + 1 : Math.max(0, card.completedRounds - 1);
  const graduated = completedRounds >= GRADUATION_ROUNDS && passed;
  const nextReviewAt = graduated ? now.toISOString() : computeCurveNextReview(stageAfter, now, card.activeWindow).toISOString();

  return {
    card: {
      ...card,
      stage: stageAfter,
      completedRounds,
      status: graduated ? "graduated" as const : deriveCardStatus({ ...card, stage: stageAfter, nextReviewAt }, now),
      nextReviewAt,
      updatedAt: now.toISOString()
    },
    stageBefore,
    stageAfter,
    graduated
  };
}

export function resetMemoryCurve(card: Card, now = new Date()) {
  return {
    ...card,
    stage: 0,
    completedRounds: 0,
    status: "cooling" as const,
    nextReviewAt: addMinutes(now, 30).toISOString(),
    resetCount: (card.resetCount ?? 0) + 1,
    updatedAt: now.toISOString()
  };
}

export function graduateCard(card: Card, records: ReviewRecord[], now = new Date()): WarehouseEntry {
  const related = records.filter((record) => record.cardId === card.id);
  const passCount = related.filter((record) => record.result === "passed").length;
  const revealCount = related.filter((record) => record.result === "revealed").length;
  const domain = card.keywords[0] ?? "未分类";
  const masteredQuestions = [...new Set(related
    .filter((record) => (record.score ?? 0) > 60)
    .map((record) => record.question))];

  return {
    id: createId("wh"),
    cardId: card.id,
    title: card.title,
    priority: card.priority,
    keywords: card.keywords,
    domain,
    graduatedAt: now.toISOString(),
    rounds: card.completedRounds,
    report: `完成 ${card.completedRounds} 轮复习；通过 ${passCount} 次；直接看答案 ${revealCount} 次；重置 ${card.resetCount ?? 0} 次。下一步可把 ${domain} 扩展成相邻主题。`,
    resetCount: card.resetCount ?? 0,
    questions: card.questions,
    masteredQuestions
  };
}

export function countdownLabel(dateISO: string, now = new Date()) {
  const delta = new Date(dateISO).getTime() - now.getTime();
  if (delta <= 0) return "现在";
  const minutes = Math.ceil(delta / 60_000);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `${hours} 小时`;
  return `${Math.ceil(hours / 24)} 天`;
}
