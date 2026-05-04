// input: local storage state via client page; output: warehouse BI route with reset and coverage stats; pos: archive route, update this header and app/README.md when changed.
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { WarehouseBI } from "@/components/warehouse-bi";
import { Button } from "@/components/ui/button";
import { loadState } from "@/lib/storage";
import type { DraftRecallState } from "@/lib/types";

export default function WarehousePage() {
  const [state, setState] = useState<DraftRecallState | null>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-ink">
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
            <h1 className="text-3xl font-semibold sm:text-5xl">仓库</h1>
          </div>
          <div className="text-right text-sm text-neutral-500">
            <p>{state?.warehouse.length ?? 0} 张结业卡片</p>
            <p>{state?.records.length ?? 0} 次质询记录</p>
          </div>
        </header>
        {state ? <WarehouseBI cards={state.cards} warehouse={state.warehouse} records={state.records} /> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state?.warehouse.map((entry) => (
            <article key={entry.id} className="rounded-md border border-line bg-white/55 p-4">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-neutral-500">{entry.priority} · {entry.domain}</p>
              <h2 className="mt-2 text-lg font-semibold">{entry.title}</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-700">{entry.report}</p>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                  <span>随机覆盖率</span>
                  <span>{entry.masteredQuestions.length}/{Math.max(entry.questions.length, 1)}</span>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {(entry.questions.length ? entry.questions : Array.from({ length: 20 }).map((_, index) => `问题 ${index + 1}`)).slice(0, 20).map((question, index) => (
                    <span
                      key={`${index}-${question}`}
                      title={question}
                      className={`aspect-square rounded-sm border border-line ${entry.masteredQuestions.includes(question) ? "bg-moss" : "bg-black/[.04]"}`}
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
