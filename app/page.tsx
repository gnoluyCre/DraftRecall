// input: local storage state via client dashboard; output: home route with settings navigation; pos: dashboard route, update this header and app/README.md when changed.
"use client";

import Link from "next/link";
import { Archive, Bell, BellOff, RotateCw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CardBoard } from "@/components/card-board";
import { CardComposer } from "@/components/card-composer";
import { Button } from "@/components/ui/button";
import { loadState, saveState } from "@/lib/storage";
import type { DraftRecallState } from "@/lib/types";

export default function DashboardPage() {
  const [state, setState] = useState<DraftRecallState | null>(null);
  const [spinning, setSpinning] = useState(false);
  const refresh = () => setState(loadState());

  function handleRefresh() {
    setSpinning(true);
    refresh();
    window.setTimeout(() => setSpinning(false), 550);
  }

  function toggleGlobalNotifications() {
    const latest = loadState();
    const next = {
      ...latest,
      notificationSettings: { globalEnabled: !latest.notificationSettings.globalEnabled }
    };
    saveState(next);
    setState(next);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-neutral-500">DraftRecall</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-5xl">草稿唤醒</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="刷新">
              <motion.span animate={{ rotate: spinning ? 360 : 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
                <RotateCw className="h-4 w-4" />
              </motion.span>
            </Button>
            <motion.span whileTap={{ scale: 0.86 }} transition={{ type: "spring", stiffness: 420, damping: 18 }}>
              <Button variant="outline" size="icon" onClick={toggleGlobalNotifications} aria-label="全局通知开关">
                {state?.notificationSettings.globalEnabled ? <Bell className="h-4 w-4 fill-current" /> : <BellOff className="h-4 w-4" />}
              </Button>
            </motion.span>
            <Link href="/settings">
              <Button variant="outline" size="icon" aria-label="设置">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/warehouse">
              <Button variant="outline">
                <Archive className="h-4 w-4" />
                仓库
              </Button>
            </Link>
            <CardComposer onCreated={refresh} />
          </div>
        </header>
        {state ? <CardBoard cards={state.cards} records={state.records} globalNotificationsEnabled={state.notificationSettings.globalEnabled} onChanged={refresh} /> : <div className="h-40 rounded-md border border-line bg-white/40" />}
      </div>
    </main>
  );
}
