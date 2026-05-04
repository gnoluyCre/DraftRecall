// input: browser localStorage and optional Supabase client; output: DraftRecall repository helpers with V1.1 migration; pos: persistence boundary, update this header and lib/README.md when changed.
"use client";

import { createSeedState } from "@/lib/seed";
import { normalizeQuestionItems, syncQuestions } from "@/lib/question-utils";
import type { Card, DraftRecallState, ReviewRecord, WarehouseEntry } from "@/lib/types";

const STORAGE_KEY = "draftrecall.state.v1";

export function loadState(): DraftRecallState {
  if (typeof window === "undefined") return createSeedState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedState();
    saveState(seed);
    return seed;
  }
  try {
    return migrateState(JSON.parse(raw) as DraftRecallState);
  } catch {
    const seed = createSeedState();
    saveState(seed);
    return seed;
  }
}

function migrateState(state: DraftRecallState): DraftRecallState {
  return {
    cards: (state.cards ?? []).map((card) => ({
      ...card,
      questionItems: normalizeQuestionItems(card),
      questions: syncQuestions(normalizeQuestionItems(card)),
      parsePrompt: card.parsePrompt ?? "",
      gradePrompt: card.gradePrompt ?? "",
      resetCount: card.resetCount ?? 0,
      notificationsEnabled: card.notificationsEnabled ?? true
    })),
    records: state.records ?? [],
    warehouse: (state.warehouse ?? []).map((entry) => ({
      ...entry,
      resetCount: entry.resetCount ?? 0,
      questions: entry.questions ?? [],
      masteredQuestions: entry.masteredQuestions ?? []
    })),
    pushSubscriptions: state.pushSubscriptions ?? [],
    notificationSettings: state.notificationSettings ?? { globalEnabled: true },
    theme: state.theme ?? "system"
  };
}

export function saveState(state: DraftRecallState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function upsertCard(card: Card) {
  const state = loadState();
  const cards = state.cards.some((item) => item.id === card.id)
    ? state.cards.map((item) => (item.id === card.id ? card : item))
    : [card, ...state.cards];
  const next = { ...state, cards };
  saveState(next);
  return next;
}

export function addRecord(record: ReviewRecord) {
  const state = loadState();
  const next = { ...state, records: [record, ...state.records] };
  saveState(next);
  return next;
}

export function archiveCard(card: Card, entry: WarehouseEntry) {
  const state = loadState();
  const next = {
    ...state,
    cards: state.cards.filter((item) => item.id !== card.id),
    warehouse: [entry, ...state.warehouse]
  };
  saveState(next);
  return next;
}

export function deleteCardCascade(cardId: string) {
  const state = loadState();
  const next = {
    ...state,
    cards: state.cards.filter((item) => item.id !== cardId),
    records: state.records.filter((item) => item.cardId !== cardId)
  };
  saveState(next);
  return next;
}
