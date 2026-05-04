// input: encrypted AI settings storage and connection test API; output: global settings route; pos: AI provider settings UI, update this header and app/README.md when changed.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Check, Loader2, PlugZap, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { loadAISettings, maskApiKey, saveAISettings } from "@/lib/ai-settings";
import { loadState, saveState } from "@/lib/storage";
import type { AIProviderConfig, ThemeMode } from "@/lib/types";

const themes: Array<{ id: ThemeMode; label: string }> = [
  { id: "system", label: "Sync System" },
  { id: "dark", label: "Deep Dark" },
  { id: "light", label: "Pure White" },
  { id: "forest", label: "Forest Sage" },
  { id: "rose", label: "Dusty Rose" },
  { id: "lavender", label: "Misty Lavender" }
];

export default function SettingsPage() {
  const [config, setConfig] = useState<AIProviderConfig>({ providerName: "", baseUrl: "", apiKey: "", modelId: "" });
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    loadAISettings().then((stored) => {
      setConfig(stored);
      setSavedKey(stored.apiKey);
      setApiKeyInput(maskApiKey(stored.apiKey));
    });
    setTheme(loadState().theme);
  }, []);

  function resolvedConfig(): AIProviderConfig {
    const apiKey = apiKeyInput.includes("•") ? savedKey : apiKeyInput;
    return { ...config, apiKey };
  }

  async function handleSave() {
    setBusy("save");
    const next = resolvedConfig();
    await saveAISettings(next);
    setConfig(next);
    setSavedKey(next.apiKey);
    setApiKeyInput(maskApiKey(next.apiKey));
    setStatus("已保存到加密 localStorage");
    setFeedback("AI 引擎配置已保存");
    setBusy(null);
  }

  async function handleTest() {
    setBusy("test");
    setStatus("");
    const response = await fetch("/api/ai/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ aiConfig: resolvedConfig() })
    });
    const result = await response.json();
    setStatus(response.ok ? `连接可用 · ${result.latencyMs}ms` : result.error || "连接测试失败");
    setBusy(null);
  }

  function chooseTheme(nextTheme: ThemeMode) {
    const latest = loadState();
    const next = { ...latest, theme: nextTheme };
    saveState(next);
    setTheme(nextTheme);
    window.dispatchEvent(new Event("draftrecall-theme"));
  }

  async function testPush() {
    setPushStatus("");
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      setPushStatus("当前浏览器不支持推送通知");
      return;
    }
    setPushBusy(true);
    await navigator.serviceWorker.register("/sw.js");
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      setPushStatus("请先允许浏览器通知权限后再发送测试通知");
      setPushBusy(false);
      return;
    }
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) {
      setPushStatus("缺少 NEXT_PUBLIC_VAPID_PUBLIC_KEY，无法创建推送订阅");
      setPushBusy(false);
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription)
      });
    }
    const response = await fetch("/api/push/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscription,
        payload: { title: "DraftRecall", body: "测试请求已发送，请检查系统通知栏", url: "/" }
      })
    });
    const result = await response.json().catch(() => ({}));
    setPushStatus(response.ok ? "测试请求已发送，请检查系统通知栏" : result.error || "测试通知发送失败");
    if (response.ok) setFeedback("测试请求已发送，请检查系统通知栏");
    setPushBusy(false);
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-6 text-paper sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto max-w-3xl"
      >
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-paper/55 hover:text-paper">
          <ArrowLeft className="h-4 w-4" />
          返回
        </Link>

        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-paper/45">Settings</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal sm:text-6xl">AI 引擎</h1>
        </header>

        <section className="rounded-md border border-white/15 bg-white/[.04] p-5 shadow-[inset_0_0_0_.5px_rgba(255,255,255,.16)] backdrop-blur">
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[.16em] text-paper/45">Provider Name</span>
              <Input className="border-white/15 bg-black/20 text-paper placeholder:text-paper/30" value={config.providerName} onChange={(event) => setConfig({ ...config, providerName: event.target.value })} placeholder="DeepSeek / OpenAI / 自定义" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[.16em] text-paper/45">Base URL</span>
              <Input className="border-white/15 bg-black/20 text-paper placeholder:text-paper/30" value={config.baseUrl} onChange={(event) => setConfig({ ...config, baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[.16em] text-paper/45">API Key</span>
              <Input
                className="border-white/15 bg-black/20 text-paper placeholder:text-paper/30"
                type="password"
                value={apiKeyInput}
                onFocus={() => apiKeyInput.includes("•") && setApiKeyInput("")}
                onChange={(event) => setApiKeyInput(event.target.value)}
                placeholder="sk-••••"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[.16em] text-paper/45">Model ID</span>
              <Input className="border-white/15 bg-black/20 text-paper placeholder:text-paper/30" value={config.modelId} onChange={(event) => setConfig({ ...config, modelId: event.target.value })} placeholder="gpt-4o / deepseek-chat" />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="bg-paper text-ink hover:bg-paper/90" onClick={handleSave} disabled={busy !== null}>
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存
            </Button>
            <Button variant="outline" className="border-white/15 text-paper hover:bg-white/10" onClick={handleTest} disabled={busy !== null}>
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
              Test Connection
            </Button>
          </div>

          {status ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 inline-flex items-center gap-2 text-sm text-paper/65">
              <Check className="h-4 w-4" />
              {status}
            </motion.p>
          ) : null}
        </section>

        <section className="mt-5 rounded-md border border-white/15 bg-white/[.04] p-5 shadow-[inset_0_0_0_.5px_rgba(255,255,255,.16)] backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[.18em] text-paper/45">Theme</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {themes.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.98 }}
                className={`rounded-md border px-3 py-3 text-left text-sm ${theme === item.id ? "border-paper bg-paper text-ink" : "border-white/15 bg-black/10 text-paper"}`}
                onClick={() => chooseTheme(item.id)}
              >
                {item.label}
              </motion.button>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-md border border-white/15 bg-white/[.04] p-5 shadow-[inset_0_0_0_.5px_rgba(255,255,255,.16)] backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[.18em] text-paper/45">调度与通知设置</h2>
          <Button className="mt-4 bg-paper text-ink hover:bg-paper/90" onClick={testPush} disabled={pushBusy}>
            {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            发送测试通知
          </Button>
          {pushStatus ? <p className="mt-3 text-sm text-paper/65">{pushStatus}</p> : null}
        </section>
      </motion.div>
      <Dialog open={Boolean(feedback)} title="操作反馈" onClose={() => setFeedback("")}>
        <p className="text-sm leading-6 text-neutral-700">{feedback}</p>
        <Button className="mt-4 w-full" onClick={() => setFeedback("")}>知道了</Button>
      </Dialog>
    </main>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
