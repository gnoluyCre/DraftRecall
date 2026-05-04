// input: file upload, AI settings, parse API and storage helpers; output: new DraftRecall card; pos: capture workflow, update this header and components/README.md when changed.
"use client";

import { useState } from "react";
import { FileUp, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loadAISettings } from "@/lib/ai-settings";
import { parsedToQuestionItems, syncQuestions } from "@/lib/question-utils";
import { computeCurveNextReview, computeManualNextFire, createId } from "@/lib/scheduler";
import { upsertCard } from "@/lib/storage";
import type { Card, ParsedDocument, Priority, ScheduleMode } from "@/lib/types";

export function CardComposer({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceName, setSourceName] = useState("draft.md");
  const [priority, setPriority] = useState<Priority>("P0");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("curve");
  const [alarmTime, setAlarmTime] = useState("21:00");
  const [activeStart, setActiveStart] = useState("08:00");
  const [activeEnd, setActiveEnd] = useState("22:00");
  const [error, setError] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;
    setSourceName(file.name);
    setTitle(file.name.replace(/\.[^.]+$/, ""));
    setContent(await file.text());
  }

  async function createCard() {
    if (!content.trim()) return;
    setBusy(true);
    setError("");
    const aiConfig = await loadAISettings();
    const response = await fetch("/api/ai/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content, filename: sourceName, aiConfig })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "AI 解析失败" }));
      setError(result.error || "AI 解析失败");
      setBusy(false);
      return;
    }
    const parsed = (await response.json()) as ParsedDocument;
    const now = new Date();
    const id = createId("card");
    const manualAlarms = scheduleMode === "manual"
      ? [{
          id: createId("alarm"),
          cardId: id,
          time: alarmTime,
          frequency: "daily" as const,
          enabled: true,
          nextFireAt: computeManualNextFire({ time: alarmTime, frequency: "daily" }, now).toISOString(),
          createdAt: now.toISOString()
        }]
      : [];
    const questionItems = parsedToQuestionItems(parsed);
    const card: Card = {
      id,
      title: title || parsed.title,
      priority,
      sourceName,
      sourceType: sourceName.endsWith(".pdf") ? "pdf" : sourceName.endsWith(".txt") ? "txt" : "md",
      content,
      keywords: parsed.keywords.slice(0, 5),
      questions: syncQuestions(questionItems),
      questionItems,
      scheduleMode,
      activeWindow: { start: activeStart, end: activeEnd },
      manualAlarms,
      parsePrompt: "",
      gradePrompt: "",
      resetCount: 0,
      notificationsEnabled: true,
      stage: 0,
      completedRounds: 0,
      nextReviewAt: computeCurveNextReview(0, now, { start: activeStart, end: activeEnd }).toISOString(),
      status: "cooling",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    card.questions = card.questions.slice(0, 20);
    upsertCard(card);
    setBusy(false);
    setOpen(false);
    onCreated();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        新卡片
      </Button>
      <Dialog open={open} title="录入单文档" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <label className="grid cursor-pointer place-items-center rounded-md border border-dashed border-line p-6 text-sm text-neutral-500">
            <FileUp className="mb-2 h-5 w-5" />
            上传 .txt / .md / .pdf
            <input className="sr-only" type="file" accept=".txt,.md,.pdf" onChange={(event) => handleFile(event.target.files?.[0])} />
          </label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="卡片标题" />
          <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="粘贴文档内容" />
          <div className="grid grid-cols-3 gap-2">
            {(["P0", "P1", "P2"] as Priority[]).map((item) => (
              <Button key={item} type="button" variant={priority === item ? "solid" : "outline"} onClick={() => setPriority(item)}>
                {item}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={scheduleMode === "curve" ? "solid" : "outline"} onClick={() => setScheduleMode("curve")}>费曼曲线</Button>
            <Button type="button" variant={scheduleMode === "manual" ? "solid" : "outline"} onClick={() => setScheduleMode("manual")}>手动闹钟</Button>
          </div>
          {scheduleMode === "manual" ? <Input type="time" value={alarmTime} onChange={(event) => setAlarmTime(event.target.value)} /> : (
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={activeStart} onChange={(event) => setActiveStart(event.target.value)} />
              <Input type="time" value={activeEnd} onChange={(event) => setActiveEnd(event.target.value)} />
            </div>
          )}
          <Button className="w-full" disabled={busy || !content.trim()} onClick={createCard}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            创建并解析
          </Button>
          {error ? <p className="text-sm text-signal">{error}</p> : null}
        </div>
      </Dialog>
    </>
  );
}
