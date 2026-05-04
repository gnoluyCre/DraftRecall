// input: Shared app data contracts; output: DraftRecall entity and AI settings types; pos: domain schema, update this header and lib/README.md when changed.
export type Priority = "P0" | "P1" | "P2";

export type ScheduleMode = "curve" | "manual";

export type CardStatus = "active" | "cooling" | "due" | "graduated";

export type AlarmFrequency = "once" | "daily" | "weekdays" | "custom";

export type ThemeMode = "system" | "dark" | "light" | "forest" | "rose" | "lavender";

export interface QuestionItem {
  id: string;
  question: string;
  keyPoints: string[];
  manuallyEdited?: boolean;
}

export interface Alarm {
  id: string;
  cardId: string;
  time: string;
  frequency: AlarmFrequency;
  weekdays?: number[];
  enabled: boolean;
  nextFireAt: string;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  cardId: string;
  sessionId?: string;
  question: string;
  questionIndex?: number;
  answer: string;
  feedback: string;
  result: "passed" | "failed" | "revealed";
  stageBefore: number;
  stageAfter: number;
  createdAt: string;
  depth: number;
  score?: number;
  gaps?: string[];
  keyPoints?: string[];
  hitPoints?: string[];
  missedPoints?: string[];
}

export interface WarehouseEntry {
  id: string;
  cardId: string;
  title: string;
  priority: Priority;
  keywords: string[];
  domain: string;
  graduatedAt: string;
  rounds: number;
  report: string;
  resetCount: number;
  questions: string[];
  masteredQuestions: string[];
}

export interface Card {
  id: string;
  title: string;
  priority: Priority;
  sourceName: string;
  sourceType: "txt" | "md" | "pdf";
  content: string;
  keywords: string[];
  questions: string[];
  questionItems: QuestionItem[];
  scheduleMode: ScheduleMode;
  activeWindow: {
    start: string;
    end: string;
  };
  manualAlarms: Alarm[];
  parsePrompt?: string;
  gradePrompt?: string;
  resetCount: number;
  notificationsEnabled: boolean;
  stage: number;
  completedRounds: number;
  nextReviewAt: string;
  status: CardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DraftRecallState {
  cards: Card[];
  records: ReviewRecord[];
  warehouse: WarehouseEntry[];
  pushSubscriptions: PushSubscriptionJSON[];
  notificationSettings: {
    globalEnabled: boolean;
  };
  theme: ThemeMode;
}

export interface AIProviderConfig {
  providerName: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
}

export interface ParsedDocument {
  title: string;
  keywords: string[];
  questions: string[];
  questionItems?: QuestionItem[];
}

export interface GradeResult {
  passed: boolean;
  score: number;
  feedback: string;
  gaps: string[];
  hitPoints?: string[];
  missedPoints?: string[];
}
