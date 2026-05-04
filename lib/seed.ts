// input: scheduler helpers and domain types; output: first-run sample state; pos: demo bootstrap, update this header and lib/README.md when changed.
import { computeCurveNextReview, createId } from "@/lib/scheduler";
import type { DraftRecallState } from "@/lib/types";

export function createSeedState(now = new Date()): DraftRecallState {
  const p0Id = createId("card");
  const p1Id = createId("card");
  const p2Id = createId("card");
  const p0Questions = [
    { id: createId("q"), question: "请用大白话解释 Proxy 如何拦截数据访问。", keyPoints: ["Proxy 包装对象并拦截 get/set/delete 等操作", "读取时可以触发依赖收集", "写入时可以触发更新通知"], manuallyEdited: false },
    { id: createId("q"), question: "track 和 trigger 分别解决什么问题？", keyPoints: ["track 在读取时记录 effect 与属性的依赖关系", "trigger 在写入时找到依赖并重新执行", "二者共同构成响应式更新链路"], manuallyEdited: false }
  ];
  const p1Questions = [
    { id: createId("q"), question: "缓存穿透、击穿、雪崩的差别是什么？", keyPoints: ["穿透是查询不存在数据绕过缓存", "击穿是热点 key 过期导致并发打到数据库", "雪崩是大量 key 同时失效造成系统压力"], manuallyEdited: false }
  ];
  const p2Questions = [
    { id: createId("q"), question: "用一个工程例子解释 tradeoff。", keyPoints: ["tradeoff 是为了一个收益接受另一个损失", "工程中常表现为性能、成本、复杂度之间取舍"], manuallyEdited: false }
  ];

  return {
    cards: [
      {
        id: p0Id,
        title: "Vue3 响应式原理",
        priority: "P0",
        sourceName: "vue3-reactivity.md",
        sourceType: "md",
        content: "Proxy 负责拦截对象读取、写入和删除。track 在读取时收集依赖，trigger 在写入时通知 effect 重新执行。",
        keywords: ["Proxy", "track", "trigger", "effect"],
        questions: p0Questions.map((item) => item.question),
        questionItems: p0Questions,
        scheduleMode: "curve",
        activeWindow: { start: "08:00", end: "22:00" },
        manualAlarms: [],
        parsePrompt: "",
        gradePrompt: "",
        resetCount: 0,
        notificationsEnabled: true,
        stage: 2,
        completedRounds: 2,
        nextReviewAt: new Date(now.getTime() - 5 * 60_000).toISOString(),
        status: "due",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: p1Id,
        title: "系统设计缓存策略",
        priority: "P1",
        sourceName: "cache.txt",
        sourceType: "txt",
        content: "缓存穿透用布隆过滤器或空值缓存缓解；缓存击穿用互斥锁；缓存雪崩用随机过期和多级缓存。",
        keywords: ["穿透", "击穿", "雪崩"],
        questions: p1Questions.map((item) => item.question),
        questionItems: p1Questions,
        scheduleMode: "curve",
        activeWindow: { start: "09:00", end: "21:30" },
        manualAlarms: [],
        parsePrompt: "",
        gradePrompt: "",
        resetCount: 0,
        notificationsEnabled: true,
        stage: 1,
        completedRounds: 1,
        nextReviewAt: computeCurveNextReview(1, now, { start: "09:00", end: "21:30" }).toISOString(),
        status: "cooling",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: p2Id,
        title: "英语表达：tradeoff",
        priority: "P2",
        sourceName: "english.md",
        sourceType: "md",
        content: "Tradeoff 表示为了获得一种好处而接受另一种损失，工程讨论里常用于解释方案取舍。",
        keywords: ["tradeoff", "工程表达"],
        questions: p2Questions.map((item) => item.question),
        questionItems: p2Questions,
        scheduleMode: "manual",
        activeWindow: { start: "08:00", end: "22:00" },
        manualAlarms: [
          {
            id: createId("alarm"),
            cardId: p2Id,
            time: "21:00",
            frequency: "daily",
            enabled: true,
            nextFireAt: new Date(now.getTime() + 4 * 60 * 60_000).toISOString(),
            createdAt: now.toISOString()
          }
        ],
        parsePrompt: "",
        gradePrompt: "",
        resetCount: 0,
        notificationsEnabled: true,
        stage: 0,
        completedRounds: 0,
        nextReviewAt: computeCurveNextReview(0, now, { start: "08:00", end: "22:00" }).toISOString(),
        status: "cooling",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ],
    records: [],
    warehouse: [],
    pushSubscriptions: [],
    notificationSettings: { globalEnabled: true },
    theme: "system"
  };
}
