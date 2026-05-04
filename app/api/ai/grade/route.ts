// input: question, key points, answer, AI config and optional prompt; output: AI grade feedback; pos: OpenAI-compatible keypoint grading API, update this header and app/README.md when changed.
import { NextResponse } from "next/server";
import { gradeAnswerWithAI } from "@/lib/ai-service";

export async function POST(request: Request) {
  const body = await request.json();
  const question = String(body.question ?? "");
  const keyPoints = Array.isArray(body.keyPoints) ? body.keyPoints.map(String) : [];
  const answer = String(body.answer ?? "");
  if (!question || !answer.trim()) return NextResponse.json({ error: "question and answer required" }, { status: 400 });
  try {
    const grade = await gradeAnswerWithAI(question, keyPoints, answer, body.aiConfig, body.gradePrompt);
    return NextResponse.json(grade);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI 判分失败" }, { status: 502 });
  }
}
