// input: card id, AI settings, keypoint grade API and storage helpers; output: atomic multi-question inquiry workflow; pos: recall critical path, update this header and components/README.md when changed.
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Eraser, Eye, ListChecks, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { loadAISettings } from "@/lib/ai-settings";
import { normalizeQuestionItems } from "@/lib/question-utils";
import { archiveCard, loadState, saveState } from "@/lib/storage";
import { applyReviewResult, createId, graduateCard } from "@/lib/scheduler";
import type { Card, GradeResult, QuestionItem, ReviewRecord } from "@/lib/types";

function pickRandomIndexes(length: number, count: number) {
  const indexes = Array.from({ length }).map((_, index) => index);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[swap]] = [indexes[swap], indexes[index]];
  }
  return indexes.slice(0, Math.min(count, length));
}

export function InquiryRoom({ cardId }: { cardId: string }) {
  const state = useMemo(() => loadState(), []);
  const [card, setCard] = useState<Card | undefined>(() => state.cards.find((item) => item.id === cardId));
  const questionItems = useMemo(() => card ? normalizeQuestionItems(card) : [], [card]);
  const initialSelection = useMemo(() => pickRandomIndexes(questionItems.length, 3), [questionItems.length]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>(initialSelection);
  const [activeIndex, setActiveIndex] = useState(initialSelection[0] ?? 0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<number, GradeResult>>({});
  const [hintOpen, setHintOpen] = useState<Record<number, boolean>>({});
  const [graduationReport, setGraduationReport] = useState("");
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [error, setError] = useState("");

  if (!card) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper p-4 text-center">
        <div>
          <p className="mb-4 text-sm text-neutral-500">卡片不存在或已归档</p>
          <Link href="/" className="inline-flex h-10 items-center justify-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-paper">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  const activeItem = questionItems[activeIndex];
  const selectedQuestions = selectedIndexes.map((index) => ({ index, item: questionItems[index] })).filter((entry): entry is { index: number; item: QuestionItem } => Boolean(entry.item));
  const activePosition = Math.max(0, selectedIndexes.indexOf(activeIndex));
  const allGraded = selectedQuestions.length > 0 && selectedQuestions.every((entry) => feedbacks[entry.index]);

  async function gradeQuestion(index: number) {
    if (!card) return;
    const currentCard = card;
    const item = questionItems[index];
    if (!item || !(answers[index] ?? "").trim()) return;
    setError("");
    setBusyIndex(index);
    const aiConfig = await loadAISettings();
    const response = await fetch("/api/ai/grade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: item.question,
        keyPoints: item.keyPoints,
        answer: answers[index] ?? "",
        aiConfig,
        gradePrompt: currentCard.gradePrompt
      })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "AI 判分失败" }));
      setError(result.error || "AI 判分失败");
      setBusyIndex(null);
      return;
    }
    setFeedbacks({ ...feedbacks, [index]: (await response.json()) as GradeResult });
    setBusyIndex(null);
  }

  function finalizeSession() {
    if (!card || !allGraded) return;
    setFinalizing(true);
    const currentCard = card;
    const passed = selectedQuestions.every((entry) => (feedbacks[entry.index]?.score ?? 0) > 60);
    const now = new Date();
    const applied = applyReviewResult(currentCard, passed ? "passed" : "failed", now);
    const sessionId = createId("session");
    const records: ReviewRecord[] = selectedQuestions.map((entry) => {
      const grade = feedbacks[entry.index];
      const answer = answers[entry.index] ?? "";
      return {
        id: createId("record"),
        sessionId,
        cardId: currentCard.id,
        question: entry.item.question,
        questionIndex: entry.index,
        answer,
        feedback: grade.feedback,
        result: grade.score > 60 ? "passed" : "failed",
        stageBefore: applied.stageBefore,
        stageAfter: applied.stageAfter,
        createdAt: now.toISOString(),
        depth: Math.min(5, Math.max(1, Math.ceil(answer.length / 80))),
        score: grade.score,
        gaps: grade.gaps,
        keyPoints: entry.item.keyPoints,
        hitPoints: grade.hitPoints ?? [],
        missedPoints: grade.missedPoints ?? []
      };
    });
    const latest = loadState();
    const nextState = { ...latest, records: [...records, ...latest.records] };
    saveState(nextState);
    if (applied.graduated) {
      const entry = graduateCard(applied.card, nextState.records, now);
      archiveCard(applied.card, entry);
      setGraduationReport(entry.report);
    } else {
      const afterRecords = loadState();
      saveState({ ...afterRecords, cards: afterRecords.cards.map((item) => item.id === currentCard.id ? applied.card : item) });
    }
    setCard(applied.card);
    setFinalizing(false);
    setSummaryOpen(false);
  }

  function toggleQuestion(index: number) {
    const exists = selectedIndexes.includes(index);
    const next = exists ? selectedIndexes.filter((item) => item !== index) : [...selectedIndexes, index];
    if (!next.length) return;
    setSelectedIndexes(next);
    if (!next.includes(activeIndex)) setActiveIndex(next[0]);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-5 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[.18em] text-neutral-500">{card.priority} · {card.completedRounds}/7</span>
        </div>

        <section className="flex flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-neutral-500">质询 {activePosition + 1}/{selectedIndexes.length}</p>
            <Button variant="outline" size="sm" onClick={() => setPanelOpen(true)}>
              <ListChecks className="h-4 w-4" />
              题目
            </Button>
          </div>
          <motion.h1 key={activeIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold leading-tight sm:text-4xl">{activeItem?.question}</motion.h1>
          <Textarea
            className="mt-8 min-h-[34vh] bg-white/50 text-base leading-7"
            value={answers[activeIndex] ?? ""}
            onChange={(event) => setAnswers({ ...answers, [activeIndex]: event.target.value })}
            placeholder="强制输出。先写，再判断。"
            autoFocus
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={activePosition <= 0} onClick={() => setActiveIndex(selectedIndexes[activePosition - 1])}>
                <ChevronLeft className="h-4 w-4" />
                上一题
              </Button>
              <Button variant="outline" size="sm" disabled={activePosition >= selectedIndexes.length - 1} onClick={() => setActiveIndex(selectedIndexes[activePosition + 1])}>
                下一题
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setHintOpen({ ...hintOpen, [activeIndex]: !hintOpen[activeIndex] })}>
                <Eye className="h-4 w-4" />
                {hintOpen[activeIndex] ? "隐藏提示要点" : "查看提示要点"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAnswers({ ...answers, [activeIndex]: "" })}>
                <Eraser className="h-4 w-4" />
                清除回答
              </Button>
            </div>
          </div>

          {hintOpen[activeIndex] ? (
            <div className="mt-4 rounded-md border border-line bg-white/55 p-4 text-sm leading-6">
              <p className="mb-2 font-semibold">知识核心要素</p>
              <ul className="space-y-1">
                {(activeItem?.keyPoints.length ? activeItem.keyPoints : ["此题暂无参考要点，请在卡片设置中补充。"]).map((point) => (
                  <li key={point}>- {point}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-3">
            <Button disabled={busyIndex === activeIndex || !(answers[activeIndex] ?? "").trim()} onClick={() => gradeQuestion(activeIndex)}>
              {busyIndex === activeIndex ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              提交答案
            </Button>
            {feedbacks[activeIndex] ? (
              <span className={cnScore(feedbacks[activeIndex].score)}>{Math.round(feedbacks[activeIndex].score)} 分</span>
            ) : null}
          </div>

          {feedbacks[activeIndex] ? (
            <div className={`mt-4 rounded-md border bg-white/55 p-4 text-sm leading-6 ${feedbacks[activeIndex].score > 60 ? "border-moss" : "border-signal/50"}`}>
              <p className="font-semibold">AI 即时反馈</p>
              <p className="mt-2 text-neutral-700">{feedbacks[activeIndex].feedback}</p>
              <p className="mt-2 text-neutral-500">命中：{feedbacks[activeIndex].hitPoints?.join(" / ") || "暂无"}</p>
              <p className="mt-1 text-neutral-500">遗漏：{feedbacks[activeIndex].missedPoints?.join(" / ") || feedbacks[activeIndex].gaps.join(" / ")}</p>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-signal">{error}</p> : null}
        </section>

        {graduationReport ? (
          <div className="mb-4 rounded-md border border-moss bg-white p-4 text-sm">
            <p className="font-semibold">结业报告</p>
            <p className="mt-2 text-neutral-700">{graduationReport}</p>
          </div>
        ) : null}

        <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${selectedIndexes.length}, minmax(0, 1fr))` }}>
            {selectedIndexes.map((index) => (
              <button
                key={index}
                className={`h-1.5 rounded-full ${feedbacks[index] ? feedbacks[index].score > 60 ? "bg-moss" : "bg-signal" : answers[index]?.trim() ? "bg-ink" : "bg-line"}`}
                aria-label={`第 ${selectedIndexes.indexOf(index) + 1} 题完成状态`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
          <Button className="w-full" disabled={!allGraded || finalizing} onClick={() => setSummaryOpen(true)}>
            {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            完成本次质询
          </Button>
        </div>
      </div>

      {panelOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/35 backdrop-blur-sm">
          <motion.aside initial={{ x: 360 }} animate={{ x: 0 }} className="h-full w-full max-w-md overflow-auto border-l border-line bg-paper p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">问题选择</h2>
              <Button variant="ghost" size="icon" onClick={() => setPanelOpen(false)} aria-label="关闭问题选择">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {questionItems.map((item, index) => (
                <label key={item.id} className="flex cursor-pointer gap-3 rounded-md border border-line bg-white/45 p-3 text-sm leading-6">
                  <input type="checkbox" checked={selectedIndexes.includes(index)} onChange={() => toggleQuestion(index)} />
                  <span className="flex-1" onClick={() => setActiveIndex(index)}>{item.question}</span>
                </label>
              ))}
            </div>
          </motion.aside>
        </div>
      ) : null}
      <Dialog open={summaryOpen} title="本次质询总结" onClose={() => setSummaryOpen(false)}>
        <div className="space-y-3">
          {selectedQuestions.map((entry, index) => {
            const grade = feedbacks[entry.index];
            const passed = (grade?.score ?? 0) > 60;
            return (
              <div key={entry.item.id} className="rounded-md border border-line bg-white/55 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">第 {index + 1} 题</p>
                  <span className={passed ? "text-moss" : "text-signal"}>{Math.round(grade?.score ?? 0)} 分 · {passed ? "通过" : "未通过"}</span>
                </div>
                <p className="mt-2 leading-6 text-neutral-700">{entry.item.question}</p>
              </div>
            );
          })}
          <div className={`rounded-md border p-4 text-sm ${selectedQuestions.every((entry) => (feedbacks[entry.index]?.score ?? 0) > 60) ? "border-moss bg-white/60" : "border-signal/50 bg-white/60"}`}>
            {selectedQuestions.every((entry) => (feedbacks[entry.index]?.score ?? 0) > 60)
              ? "本次问询通过，确认后记忆阶段将前进一轮。"
              : "本次问询未通过，确认后记忆阶段将回退一轮。"}
          </div>
          <Button className="w-full" disabled={finalizing} onClick={finalizeSession}>
            {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            确认结算
          </Button>
        </div>
      </Dialog>
    </main>
  );
}

function cnScore(score: number) {
  return `rounded px-2 py-1 text-xs font-semibold ${score > 60 ? "bg-moss text-white" : "bg-signal text-white"}`;
}
