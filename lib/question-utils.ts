// input: cards, parsed AI question payloads and review records; output: normalized question-keypoint items and mastery counts; pos: V1.2 question mapping helpers, update this header and lib/README.md when changed.
import { createId } from "@/lib/scheduler";
import type { Card, ParsedDocument, QuestionItem, ReviewRecord } from "@/lib/types";

export function normalizeQuestionItems(card: Pick<Card, "questions" | "questionItems" | "content">): QuestionItem[] {
  const source = card.questionItems?.length
    ? card.questionItems
    : (card.questions ?? []).map((question) => ({
        id: createId("q"),
        question,
        keyPoints: [question],
        manuallyEdited: false
      }));

  return source
    .filter((item) => item.question.trim())
    .slice(0, 20)
    .map((item) => ({
      id: item.id || createId("q"),
      question: item.question,
      keyPoints: (item.keyPoints?.length ? item.keyPoints : [item.question]).filter(Boolean),
      manuallyEdited: item.manuallyEdited ?? false
    }));
}

export function parsedToQuestionItems(parsed: ParsedDocument): QuestionItem[] {
  if (parsed.questionItems?.length) {
    return parsed.questionItems.slice(0, 20).map((item) => ({
      id: item.id || createId("q"),
      question: item.question,
      keyPoints: (item.keyPoints ?? []).filter(Boolean),
      manuallyEdited: false
    }));
  }
  return parsed.questions.slice(0, 20).map((question) => ({
    id: createId("q"),
    question,
    keyPoints: [question],
    manuallyEdited: false
  }));
}

export function syncQuestions(items: QuestionItem[]) {
  return items.map((item) => item.question).slice(0, 20);
}

export function masteryCount(question: QuestionItem, records: ReviewRecord[]) {
  return Math.min(7, records.filter((record) =>
    record.result === "passed" &&
    (record.questionIndex !== undefined ? record.questionIndex === records.find((item) => item.id === record.id)?.questionIndex : record.question === question.question) &&
    record.question === question.question
  ).length);
}

export function cardMasteryCounts(card: Card, records: ReviewRecord[]) {
  return normalizeQuestionItems(card).map((item, index) => ({
    item,
    count: Math.min(7, records.filter((record) => record.cardId === card.id && record.result === "passed" && (record.questionIndex === index || record.question === item.question)).length)
  }));
}
