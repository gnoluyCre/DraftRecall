// input: card, storage helpers and scheduler reset rules; output: glass settings drawer for per-card question-keypoint pairs, prompts and scheduling; pos: card personalization panel, update this header and components/README.md when changed.
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, HelpCircle, Loader2, Plus, RotateCcw, Save, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loadAISettings } from "@/lib/ai-settings";
import { DEFAULT_GRADE_PROMPT, DEFAULT_PARSE_PROMPT } from "@/lib/ai-service";
import { normalizeQuestionItems, parsedToQuestionItems, syncQuestions } from "@/lib/question-utils";
import { computeManualNextFire, createId, resetMemoryCurve } from "@/lib/scheduler";
import { loadState, saveState } from "@/lib/storage";
import type { Alarm, Card, ScheduleMode } from "@/lib/types";

export function CardSettings({ card, open, onClose, onSaved }: { card: Card; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Card>(card);
  const [newQuestion, setNewQuestion] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function persistDraft(next: Card, close = false, nextMessage = "已保存") {
    const items = normalizeQuestionItems(next);
    const normalized = {
      ...next,
      questionItems: items,
      questions: syncQuestions(items),
      updatedAt: new Date().toISOString()
    };
    const state = loadState();
    saveState({ ...state, cards: state.cards.map((item) => item.id === normalized.id ? normalized : item) });
    setDraft(normalized);
    setMessage(nextMessage);
    onSaved();
    if (close) onClose();
  }

  function updateQuestion(index: number, value: string) {
    const items = normalizeQuestionItems(draft).map((item, itemIndex) =>
      itemIndex === index ? { ...item, question: value, manuallyEdited: true } : item
    );
    persistDraft({ ...draft, questionItems: items, questions: syncQuestions(items) }, false, "问题已同步");
  }

  function updateKeyPoints(index: number, value: string) {
    const keyPoints = value.split("\n").map((item) => item.trim()).filter(Boolean);
    const items = normalizeQuestionItems(draft).map((item, itemIndex) =>
      itemIndex === index ? { ...item, keyPoints, manuallyEdited: true } : item
    );
    persistDraft({ ...draft, questionItems: items, questions: syncQuestions(items) }, false, "要点已同步");
  }

  function deleteQuestion(index: number) {
    const items = normalizeQuestionItems(draft).filter((_, itemIndex) => itemIndex !== index);
    persistDraft({ ...draft, questionItems: items, questions: syncQuestions(items) }, false, "问题已同步");
  }

  function addQuestion() {
    const value = newQuestion.trim();
    const items = normalizeQuestionItems(draft);
    if (!value || items.length >= 20) return;
    const nextItems = [...items, { id: createId("q"), question: value, keyPoints: [], manuallyEdited: true }];
    persistDraft({ ...draft, questionItems: nextItems, questions: syncQuestions(nextItems) }, false, "问题已同步");
    setNewQuestion("");
  }

  function setScheduleMode(mode: ScheduleMode) {
    const now = new Date();
    const manualAlarms: Alarm[] = mode === "manual"
      ? draft.manualAlarms.length
        ? draft.manualAlarms.map((alarm) => ({ ...alarm, enabled: true, nextFireAt: computeManualNextFire(alarm, now).toISOString() }))
        : [{
            id: createId("alarm"),
            cardId: draft.id,
            time: "21:00",
            frequency: "daily",
            enabled: true,
            nextFireAt: computeManualNextFire({ time: "21:00", frequency: "daily" }, now).toISOString(),
            createdAt: now.toISOString()
          }]
      : draft.manualAlarms;
    persistDraft({ ...draft, scheduleMode: mode, manualAlarms }, false, "调度已同步");
  }

  function updateAlarmTime(time: string) {
    const now = new Date();
    const alarm = draft.manualAlarms[0] ?? {
      id: createId("alarm"),
      cardId: draft.id,
      time,
      frequency: "daily" as const,
      enabled: true,
      nextFireAt: now.toISOString(),
      createdAt: now.toISOString()
    };
    persistDraft({
      ...draft,
      manualAlarms: [{ ...alarm, time, enabled: true, nextFireAt: computeManualNextFire({ ...alarm, time }, now).toISOString() }]
    }, false, "闹钟已同步");
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    persistDraft(resetMemoryCurve(draft), false, "记忆曲线已重置，30 分钟后重新质询");
    setConfirmReset(false);
  }

  async function reparseQuestions() {
    setBusy(true);
    setMessage("");
    const aiConfig = await loadAISettings();
    const response = await fetch("/api/ai/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: draft.content,
        filename: draft.sourceName,
        aiConfig,
        parsePrompt: draft.parsePrompt
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "重新解析失败");
      setBusy(false);
      return;
    }
    const items = parsedToQuestionItems(result);
    persistDraft({
      ...draft,
      title: result.title || draft.title,
      keywords: result.keywords?.slice(0, 5) ?? draft.keywords,
      questionItems: items,
      questions: syncQuestions(items)
    }, false, "已重新解析并同步问题");
    setBusy(false);
  }

  const questionItems = normalizeQuestionItems(draft);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/35 backdrop-blur-sm">
      <motion.aside
        initial={{ x: 420, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="h-full w-full max-w-xl overflow-auto border-l border-white/15 bg-paper/90 p-5 shadow-[inset_0_0_0_.5px_rgba(255,255,255,.45)]"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-neutral-500">Card Settings</p>
            <h2 className="mt-2 text-2xl font-semibold">{draft.title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭设置">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[.16em] text-neutral-500">问答对 {questionItems.length}/20</h3>
            <div className="space-y-2">
              {questionItems.map((item, index) => (
                <div key={item.id} className={`rounded-md border bg-white/45 p-3 ${item.keyPoints.length ? "border-line" : "border-signal/60"}`}>
                  <div className="flex gap-2">
                    <Textarea className="min-h-16 flex-1 bg-white/55 text-sm" value={item.question} onChange={(event) => updateQuestion(index, event.target.value)} placeholder="问题" />
                    <Button variant="ghost" size="icon" onClick={() => deleteQuestion(index)} aria-label="删除问题">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    className={`mt-2 min-h-20 bg-white/55 text-sm ${item.keyPoints.length ? "" : "border-signal/60"}`}
                    value={item.keyPoints.join("\n")}
                    onChange={(event) => updateKeyPoints(index, event.target.value)}
                    placeholder="参考要点，每行一个。缺少要点会降低 AI 判分准确度。"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newQuestion} onChange={(event) => setNewQuestion(event.target.value)} placeholder="新增自定义问题" />
              <Button size="icon" onClick={addQuestion} disabled={questionItems.length >= 20 || !newQuestion.trim()} aria-label="新增问题">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[.16em] text-neutral-500">调度</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={draft.scheduleMode === "curve" ? "solid" : "outline"} onClick={() => setScheduleMode("curve")}>费曼曲线</Button>
              <Button type="button" variant={draft.scheduleMode === "manual" ? "solid" : "outline"} onClick={() => setScheduleMode("manual")}>手动闹钟</Button>
            </div>
            {draft.scheduleMode === "manual" ? (
              <Input type="time" value={draft.manualAlarms[0]?.time ?? "21:00"} onChange={(event) => updateAlarmTime(event.target.value)} />
            ) : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[.16em] text-neutral-500">提示词</h3>
            <label className="block space-y-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[.16em] text-neutral-500">
                回答打分提示词
                <span title="定义 AI 评价你回答的严苛程度及反馈角度">
                  <HelpCircle className="h-3.5 w-3.5" aria-label="定义 AI 评价你回答的严苛程度及反馈角度" />
                </span>
              </span>
              <Textarea className="min-h-32 bg-white/55" value={draft.gradePrompt ?? ""} onChange={(event) => persistDraft({ ...draft, gradePrompt: event.target.value }, false, "提示词已同步")} placeholder={DEFAULT_GRADE_PROMPT} />
            </label>
            <label className="mb-5 block space-y-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[.16em] text-neutral-500">
                文档解析提示词
                <span title="决定 AI 从原文中提取知识点和生成问题的逻辑">
                  <HelpCircle className="h-3.5 w-3.5" aria-label="决定 AI 从原文中提取知识点和生成问题的逻辑" />
                </span>
              </span>
              <Textarea className="min-h-28 bg-white/55" value={draft.parsePrompt ?? ""} onChange={(event) => persistDraft({ ...draft, parsePrompt: event.target.value }, false, "提示词已同步")} placeholder={DEFAULT_PARSE_PROMPT} />
            </label>
            <Button variant="outline" onClick={reparseQuestions} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              重新解析问题
            </Button>
          </section>

          <section className="rounded-md border border-signal/30 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-signal" />
              <div className="flex-1">
                <p className="text-sm font-semibold">重置记忆曲线</p>
                <p className="mt-1 text-sm text-neutral-600">下一次复习将被设为当前时间 + 30 分钟，并记录为重置统计。</p>
              </div>
            </div>
            <Button className="mt-4" variant={confirmReset ? "danger" : "outline"} onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              {confirmReset ? "确认重置" : "重置记忆曲线"}
            </Button>
          </section>
        </div>

        <div className="sticky bottom-0 -mx-5 mt-6 flex items-center justify-between border-t border-line bg-paper/95 px-5 py-4 backdrop-blur">
          <p className="text-sm text-neutral-500">{message}</p>
          <Button onClick={() => {
            persistDraft(draft, false, "设置已保存");
            setFeedback("卡片设置已保存");
          }}>
            <Save className="h-4 w-4" />
            保存设置
          </Button>
        </div>
      </motion.aside>
      <Dialog open={Boolean(feedback)} title="保存成功" onClose={() => setFeedback("")}>
        <p className="text-sm leading-6 text-neutral-700">{feedback}</p>
        <Button className="mt-4 w-full" onClick={() => {
          setFeedback("");
          onClose();
        }}>完成</Button>
      </Dialog>
    </div>
  );
}
