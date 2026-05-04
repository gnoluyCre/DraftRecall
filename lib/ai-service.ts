// input: OpenAI-compatible provider config, prompts, documents and key point payloads; output: parsed question items, grading and connection checks; pos: AI integration boundary, update this header and lib/README.md when changed.
import type { AIProviderConfig, GradeResult, ParsedDocument } from "@/lib/types";

export const DEFAULT_PARSE_PROMPT = [
  "你是 DraftRecall 的文档解析器。",
  "只返回 JSON，不要 Markdown，不要解释。",
  "JSON 结构必须是 {\"title\":string,\"keywords\":string[],\"questionItems\":[{\"question\":string,\"keyPoints\":string[]}]}。",
  "keywords 返回 3-5 个，questionItems 返回 10 个费曼式质询问题。",
  "每个问题都必须带 keyPoints。keyPoints 是该问题的核心得分要点，由知识密度动态决定，禁止固定为 3-5 个；简单问题可以只有 1 个，复杂机制应列出多个必要逻辑点。",
  "问题必须迫使用户解释机制、边界、反例和迁移应用。"
].join("\n");

export const DEFAULT_GRADE_PROMPT = [
  "你是 DraftRecall 的严苛费曼质询官。",
  "只返回 JSON，不要 Markdown，不要解释。",
  "JSON 结构必须是 {\"passed\":boolean,\"score\":number,\"feedback\":string,\"gaps\":string[],\"hitPoints\":string[],\"missedPoints\":string[]}。",
  "score 使用 0-100 整数。你只能依据题目关联的 keyPoints 判分，不要要求用户复述原文。",
  "只要回答在语义上覆盖关键要点，即使用词完全不同也应给分；如果漏掉必要逻辑点，score 必须低于或等于 60。",
  "feedback 必须明确指出命中的核心逻辑和漏掉的细节。"
].join("\n");

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

function normalizeChatCompletionsUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("Base URL 不能为空");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

function requireConfig(config?: Partial<AIProviderConfig>): AIProviderConfig {
  if (!config?.baseUrl?.trim()) throw new Error("Base URL 未配置");
  if (!config?.apiKey?.trim()) throw new Error("API Key 未配置");
  if (!config?.modelId?.trim()) throw new Error("Model ID 未配置");
  return {
    providerName: config.providerName?.trim() || "Custom Provider",
    baseUrl: config.baseUrl.trim(),
    apiKey: config.apiKey.trim(),
    modelId: config.modelId.trim()
  };
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) return cleaned.slice(start, end + 1);
  return cleaned;
}

function safeJson<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(extractJson(text)) as T;
  } catch {
    return fallback;
  }
}

function fallbackParse(content: string, filename: string): ParsedDocument {
  const words = content.split(/\s+/).filter(Boolean);
  return {
    title: filename.replace(/\.[^.]+$/, "") || "未命名草稿",
    keywords: [...new Set(words.map((word) => word.replace(/[，。,.!?！？]/g, "")).filter(Boolean))].slice(0, 5),
    questions: [
      "请用自己的话解释这份文档最核心的观点。",
      "如果把这份文档教给新人，你会先讲哪三个概念？",
      "这份文档中的机制在什么情况下会失效？",
      "请举一个能验证本文观点的具体例子。",
      "请指出本文最容易被误解的一处，并解释原因。",
      "如果反过来设计，你会如何挑战本文结论？",
      "本文的关键词之间是什么因果关系？",
      "请把本文内容迁移到一个相邻场景中。",
      "本文哪些信息是结论，哪些是证据？",
      "如果只能保留一句话，你会保留什么，为什么？"
    ],
    questionItems: [
      { id: "fallback_1", question: "请用自己的话解释这份文档最核心的观点。", keyPoints: ["说清文档核心结论", "解释结论背后的理由"], manuallyEdited: false },
      { id: "fallback_2", question: "如果把这份文档教给新人，你会先讲哪三个概念？", keyPoints: ["识别关键概念", "说明概念之间的关系"], manuallyEdited: false },
      { id: "fallback_3", question: "这份文档中的机制在什么情况下会失效？", keyPoints: ["指出适用边界", "给出失效条件"], manuallyEdited: false }
    ]
  };
}

function fallbackGrade(answer: string): GradeResult {
  const passed = answer.trim().length >= 80;
  return {
    passed,
    score: passed ? 72 : 38,
    feedback: passed ? "回答覆盖了部分主要内容，请继续补充边界条件和反例。" : "回答不足以证明已掌握，请补充核心机制、具体例子和因果解释。",
    gaps: passed ? ["边界条件", "反例"] : ["核心机制", "具体例子", "因果解释"],
    hitPoints: passed ? ["主要概念"] : [],
    missedPoints: passed ? ["边界条件", "反例"] : ["核心机制", "具体例子", "因果解释"]
  };
}

async function chatCompletion(configInput: Partial<AIProviderConfig> | undefined, messages: ChatMessage[], timeoutMs = 20000) {
  const config = requireConfig(configInput);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(normalizeChatCompletionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelId,
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 401 || response.status === 403) throw new Error("API Key 错误或无权限");
      if (response.status === 404) throw new Error("Base URL 或 Model ID 不可用");
      throw new Error(body.slice(0, 180) || `AI 服务返回 ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI 响应为空");
    return String(content);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("AI 请求超时");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function parseDocumentWithAI(
  content: string,
  filename: string,
  config?: Partial<AIProviderConfig>,
  customPrompt?: string
): Promise<ParsedDocument> {
  const fallback = fallbackParse(content, filename);
  if (!config?.apiKey || !config.baseUrl || !config.modelId) return fallback;

  const text = await chatCompletion(config, [
    { role: "system", content: customPrompt?.trim() || DEFAULT_PARSE_PROMPT },
    { role: "user", content: `文件名：${filename}\n请解析以下文档并生成 10 个初始问题，问题总数不得超过 20。每个问题必须包含动态数量的 keyPoints。\n\n${content.slice(0, 18000)}` }
  ]);
  const parsed = safeJson<ParsedDocument>(text, fallback);
  const questionItems = (parsed.questionItems?.length ? parsed.questionItems : parsed.questions?.map((question, index) => ({ id: `ai_${index + 1}`, question, keyPoints: [question] }))).slice(0, 20);
  return {
    title: parsed.title || fallback.title,
    keywords: (parsed.keywords || fallback.keywords).slice(0, 5),
    questions: questionItems.map((item) => item.question).filter(Boolean).slice(0, 20),
    questionItems: questionItems.map((item, index) => ({
      id: item.id || `ai_${index + 1}`,
      question: item.question,
      keyPoints: (item.keyPoints?.length ? item.keyPoints : [item.question]).filter(Boolean),
      manuallyEdited: false
    }))
  };
}

export async function gradeAnswerWithAI(
  question: string,
  keyPoints: string[],
  answer: string,
  config?: Partial<AIProviderConfig>,
  customPrompt?: string
): Promise<GradeResult> {
  const fallback = fallbackGrade(answer);
  if (!config?.apiKey || !config.baseUrl || !config.modelId) return fallback;

  const text = await chatCompletion(config, [
    { role: "system", content: customPrompt?.trim() || DEFAULT_GRADE_PROMPT },
    { role: "user", content: `问题：${question}\n\n参考要点：\n${keyPoints.map((point, index) => `${index + 1}. ${point}`).join("\n") || "无参考要点"}\n\n用户回答：${answer}` }
  ]);
  const grade = safeJson<GradeResult>(text, fallback);
  const score = Math.max(0, Math.min(100, Number(grade.score ?? 0)));
  return {
    passed: score > 60 && Boolean(grade.passed),
    score,
    feedback: grade.feedback || fallback.feedback,
    gaps: Array.isArray(grade.gaps) ? grade.gaps.slice(0, 6) : fallback.gaps,
    hitPoints: Array.isArray(grade.hitPoints) ? grade.hitPoints : fallback.hitPoints,
    missedPoints: Array.isArray(grade.missedPoints) ? grade.missedPoints : fallback.missedPoints
  };
}

export async function testAIConnection(config?: Partial<AIProviderConfig>) {
  const started = Date.now();
  const text = await chatCompletion(config, [
    { role: "system", content: "只返回 JSON：{\"ok\":true,\"message\":\"pong\"}" },
    { role: "user", content: "ping" }
  ], 12000);
  safeJson(text, { ok: true, message: "pong" });
  return { ok: true, latencyMs: Date.now() - started };
}
