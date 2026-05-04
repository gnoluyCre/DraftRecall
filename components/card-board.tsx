// input: cards, review records, notification state and refresh callback; output: dashboard sections with per-card notification, kebab actions and question drawer; pos: home board, update this header and components/README.md when changed.
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, BellOff, ChevronDown, ChevronRight, Clock, Flame, ListChecks, MoreVertical, Pencil, Settings, Trash2, Warehouse, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardSettings } from "@/components/card-settings";
import { countdownLabel, deriveCardStatus, getEffectiveNextReview, sortCards } from "@/lib/scheduler";
import { cardMasteryCounts } from "@/lib/question-utils";
import { deleteCardCascade, loadState, saveState } from "@/lib/storage";
import type { Card, Priority, ReviewRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

function Progress({ stage }: { stage: number }) {
  return (
    <div className="grid grid-cols-7 gap-1" aria-label={`记忆进度 ${stage}/7`}>
      {Array.from({ length: 7 }).map((_, index) => (
        <span key={index} className={cn("h-1.5 rounded-full bg-line", index < stage && "bg-ink")} />
      ))}
    </div>
  );
}

function persistCard(card: Card) {
  const state = loadState();
  saveState({ ...state, cards: state.cards.map((item) => item.id === card.id ? { ...card, updatedAt: new Date().toISOString() } : item) });
}

function QuestionDrawer({ card, records, open, onClose }: { card: Card; records: ReviewRecord[]; open: boolean; onClose: () => void }) {
  if (!open) return null;
  const counts = cardMasteryCounts(card, records);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/35 backdrop-blur-sm">
      <motion.aside initial={{ x: 380 }} animate={{ x: 0 }} className="h-full w-full max-w-md overflow-auto border-l border-white/15 bg-paper/90 p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-neutral-500">Questions</p>
            <h2 className="mt-1 text-xl font-semibold">{card.title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭题目列表">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {counts.map(({ item, count }) => (
            <div key={item.id} className="rounded-md border border-line bg-white/45 p-3">
              <p className="text-sm leading-6">{item.question}</p>
              <div className="mt-3 h-3 rounded-sm border border-line bg-transparent shadow-[inset_0_0_0_.5px_rgba(23,23,23,.08)]">
                <div
                  className={cn("h-full rounded-sm bg-moss transition-all", count >= 7 && "shadow-[0_0_10px_rgba(63,111,87,.55)]")}
                  style={{ width: `${(count / 7) * 100}%`, opacity: count === 0 ? 0 : count <= 2 ? 0.3 : count <= 5 ? 0.62 : 1 }}
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500">通过 {count}/7</p>
            </div>
          ))}
        </div>
      </motion.aside>
    </div>
  );
}

function CardItem({ card, now, records, globalNotificationsEnabled, onChanged }: { card: Card; now: Date; records: ReviewRecord[]; globalNotificationsEnabled: boolean; onChanged: () => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [title, setTitle] = useState(card.title);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const status = deriveCardStatus(card, now);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setRenameOpen(false);
        setDeleteConfirm(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [menuOpen]);

  function showAction(message: string) {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(""), 1800);
  }

  function updatePriority(priority: Priority) {
    persistCard({ ...card, priority });
    setMenuOpen(false);
    showAction(`已设为 ${priority}`);
    onChanged();
  }

  function toggleNotifications() {
    persistCard({ ...card, notificationsEnabled: !card.notificationsEnabled });
    showAction(card.notificationsEnabled ? "已关闭此卡片提醒" : "已开启此卡片提醒");
    onChanged();
  }

  function renameCard() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    persistCard({ ...card, title: nextTitle });
    setRenameOpen(false);
    setMenuOpen(false);
    showAction("标题已更新");
    onChanged();
  }

  function deleteCard() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      showAction("再次点击确认删除");
      return;
    }
    deleteCardCascade(card.id);
    onChanged();
  }

  return (
    <article className="rounded-md border border-line bg-white/55 p-4 shadow-hairline transition hover:border-ink">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/inquiry/${card.id}`} className="min-w-0 flex-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {card.priority === "P0" && status === "due" ? <span className="h-2 w-2 animate-pulse rounded-full bg-signal" /> : null}
              <h3 className="truncate text-base font-semibold">{card.title}</h3>
            </div>
            <p className="mt-1 text-xs text-neutral-500">{card.sourceName}</p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <span className={cn("rounded px-2 py-1 text-xs font-semibold", status === "due" ? "bg-signal text-white" : "bg-black/5 text-neutral-600")}>
            {status === "due" ? "待质询" : "冷却"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", !globalNotificationsEnabled && "opacity-50")}
            onClick={toggleNotifications}
            title={!globalNotificationsEnabled ? "全局通知已关闭，此提醒暂不生效" : card.notificationsEnabled ? "关闭此卡片提醒" : "开启此卡片提醒"}
            aria-label="卡片提醒开关"
          >
            {card.notificationsEnabled ? <Bell className="h-4 w-4 fill-current" /> : <BellOff className="h-4 w-4" />}
          </Button>
          <div className="relative" ref={menuRef}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMenuOpen(!menuOpen)} aria-label="卡片操作菜单">
              <MoreVertical className="h-4 w-4" />
            </Button>
            {menuOpen ? (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute right-0 top-9 z-20 w-56 rounded-md border border-white/30 bg-paper/85 p-2 shadow-hairline backdrop-blur">
                <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-black/5" onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}>
                  <Settings className="h-4 w-4" /> 设置
                </button>
                <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-black/5" onClick={() => setRenameOpen(!renameOpen)}>
                  <Pencil className="h-4 w-4" /> 重命名
                </button>
                {renameOpen ? (
                  <div className="space-y-2 px-2 py-2">
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                    <Button size="sm" className="w-full" onClick={renameCard}>保存标题</Button>
                  </div>
                ) : null}
                <div className="px-3 py-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-neutral-500">Priority</p>
                  <div className="grid grid-cols-3 gap-1">
                    {(["P0", "P1", "P2"] as Priority[]).map((priority) => (
                      <Button key={priority} size="sm" variant={card.priority === priority ? "solid" : "outline"} onClick={() => updatePriority(priority)}>{priority}</Button>
                    ))}
                  </div>
                </div>
                <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-black/5" onClick={() => { setQuestionsOpen(true); setMenuOpen(false); }}>
                  <ListChecks className="h-4 w-4" /> 查看题目
                </button>
                <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-signal hover:bg-signal/10" onClick={deleteCard}>
                  <Trash2 className="h-4 w-4" /> {deleteConfirm ? "确认删除" : "删除"}
                </button>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
      {actionMessage ? (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-md border border-line bg-paper/85 px-3 py-2 text-xs text-neutral-600 shadow-hairline backdrop-blur">
          {actionMessage}
        </motion.div>
      ) : null}
      <Link href={`/inquiry/${card.id}`} className="block">
        <div className="mt-4 flex flex-wrap gap-1.5">
          {card.keywords.map((keyword) => (
            <span key={keyword} className="rounded border border-line px-2 py-1 text-xs text-neutral-600">
              {keyword}
            </span>
          ))}
        </div>
        <div className="mt-4">
          <Progress stage={card.completedRounds} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {countdownLabel(getEffectiveNextReview(card), now)}
          </span>
          <span>{card.scheduleMode === "manual" ? "手动闹钟" : "费曼曲线"} · 重置 {card.resetCount ?? 0}</span>
        </div>
      </Link>
      <CardSettings card={card} open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={onChanged} />
      <QuestionDrawer card={card} records={records} open={questionsOpen} onClose={() => setQuestionsOpen(false)} />
    </article>
  );
}

function Section({ title, icon, cards, now, records, globalNotificationsEnabled, onChanged }: { title: string; icon?: ReactNode; cards: Card[]; now: Date; records: ReviewRecord[]; globalNotificationsEnabled: boolean; onChanged: () => void }) {
  if (!cards.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-[.16em] text-neutral-500">{title}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <CardItem key={card.id} card={card} now={now} records={records} globalNotificationsEnabled={globalNotificationsEnabled} onChanged={onChanged} />)}
      </div>
    </section>
  );
}

export function CardBoard({ cards, records, globalNotificationsEnabled, onChanged }: { cards: Card[]; records: ReviewRecord[]; globalNotificationsEnabled: boolean; onChanged: () => void }) {
  const [openCooling, setOpenCooling] = useState(false);
  const now = useMemo(() => new Date(), []);
  const active = sortCards(cards.filter((card) => deriveCardStatus(card, now) === "due"), now);
  const cooling = sortCards(cards.filter((card) => deriveCardStatus(card, now) === "cooling"), now);
  const p0 = sortCards(cards.filter((card) => card.priority === "P0"), now);
  const byPriority = (priority: Priority) => active.filter((card) => card.priority === priority);

  return (
    <div className="space-y-8">
      <Section title="P0 核心资产" icon={<Flame className="h-4 w-4 text-signal" />} cards={p0} now={now} records={records} globalNotificationsEnabled={globalNotificationsEnabled} onChanged={onChanged} />
      <Section title="活跃 P1" cards={byPriority("P1")} now={now} records={records} globalNotificationsEnabled={globalNotificationsEnabled} onChanged={onChanged} />
      <Section title="活跃 P2" cards={byPriority("P2")} now={now} records={records} globalNotificationsEnabled={globalNotificationsEnabled} onChanged={onChanged} />
      <section className="space-y-3">
        <button className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[.16em] text-neutral-500" onClick={() => setOpenCooling(!openCooling)}>
          {openCooling ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          冷却区 {cooling.length}
        </button>
        {openCooling ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cooling.map((card) => <CardItem key={card.id} card={card} now={now} records={records} globalNotificationsEnabled={globalNotificationsEnabled} onChanged={onChanged} />)}</div> : null}
      </section>
      {!cards.length ? (
        <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-line text-sm text-neutral-500">
          <Warehouse className="mb-2 h-5 w-5" />
          没有活跃卡片
        </div>
      ) : null}
    </div>
  );
}
