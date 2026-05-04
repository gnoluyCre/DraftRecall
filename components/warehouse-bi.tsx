// input: active cards, warehouse entries and review records; output: treemap, velocity curve, heatmap and reset bottleneck chart; pos: knowledge warehouse BI, update this header and components/README.md when changed.
"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from "recharts";
import type { Card, ReviewRecord, WarehouseEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

function dayKey(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function WarehouseBI({ cards, warehouse, records }: { cards: Card[]; warehouse: WarehouseEntry[]; records: ReviewRecord[] }) {
  const treemap = useMemo(() => {
    const map = new Map<string, number>();
    warehouse.forEach((entry) => map.set(entry.domain, (map.get(entry.domain) ?? 0) + 1));
    return [...map.entries()].map(([name, size]) => ({ name, size }));
  }, [warehouse]);

  const velocity = useMemo(() => {
    const map = new Map<string, number>();
    warehouse.forEach((entry) => map.set(dayKey(entry.graduatedAt), (map.get(dayKey(entry.graduatedAt)) ?? 0) + 1));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [warehouse]);

  const heat = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 35 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (34 - index));
      const key = dayKey(date.toISOString());
      const depth = records.filter((record) => dayKey(record.createdAt) === key).reduce((sum, record) => sum + record.depth, 0);
      return { key, depth };
    });
  }, [records]);

  const resetStats = useMemo(() => {
    const active = cards.map((card) => ({ title: card.title, resetCount: card.resetCount ?? 0 }));
    const archived = warehouse.map((entry) => ({ title: entry.title, resetCount: entry.resetCount ?? 0 }));
    return [...active, ...archived].filter((item) => item.resetCount > 0).sort((a, b) => b.resetCount - a.resetCount).slice(0, 6);
  }, [cards, warehouse]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-md border border-line bg-white/55 p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[.16em] text-neutral-500">知识分布</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={treemap.length ? treemap : [{ name: "暂无", size: 1 }]} dataKey="size" nameKey="name" stroke="#f7f6f1" fill="#3f6f57" />
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white/55 p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[.16em] text-neutral-500">掌握速率</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={velocity.length ? velocity : [{ date: "今日", count: 0 }]}>
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#171717" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white/55 p-4 lg:col-span-2">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[.16em] text-neutral-500">质询热力</h2>
        <div className="grid grid-cols-7 gap-2">
          {heat.map((item) => (
            <div
              key={item.key}
              title={`${item.key}: ${item.depth}`}
              className={cn("aspect-square rounded-sm border border-line bg-black/[.04]", item.depth > 0 && "bg-moss/30", item.depth > 3 && "bg-moss/55", item.depth > 7 && "bg-moss")}
            />
          ))}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white/55 p-4 lg:col-span-2">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[.16em] text-neutral-500">重置统计</h2>
        <div className="space-y-3">
          {(resetStats.length ? resetStats : [{ title: "暂无重置", resetCount: 0 }]).map((item) => (
            <div key={item.title} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <span className="truncate text-sm">{item.title}</span>
              <span className="text-xs text-neutral-500">{item.resetCount} 次</span>
              <div className="col-span-2 h-2 rounded-full bg-black/[.05]">
                <div className="h-full rounded-full bg-signal" style={{ width: `${Math.max(4, Math.min(100, item.resetCount * 18))}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
