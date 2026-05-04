// input: browser Web Crypto, localStorage and AI provider forms; output: encrypted provider config helpers; pos: client AI settings persistence, update this header and lib/README.md when changed.
"use client";

import type { AIProviderConfig } from "@/lib/types";

const SETTINGS_KEY = "draftrecall.ai-settings.v1";

const emptyConfig: AIProviderConfig = {
  providerName: "",
  baseUrl: "",
  apiKey: "",
  modelId: ""
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(window.atob(value), (char) => char.charCodeAt(0));
}

async function cryptoKey() {
  const material = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${window.location.origin}:${navigator.userAgent}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("draftrecall-ai-settings"), iterations: 120000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function maskApiKey(apiKey: string) {
  if (!apiKey) return "";
  if (apiKey.length <= 8) return "••••";
  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
}

export async function loadAISettings(): Promise<AIProviderConfig> {
  if (typeof window === "undefined") return emptyConfig;
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) return emptyConfig;
  try {
    const payload = JSON.parse(raw) as { iv: string; data: string };
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
      await cryptoKey(),
      base64ToBytes(payload.data)
    );
    return { ...emptyConfig, ...JSON.parse(new TextDecoder().decode(decrypted)) };
  } catch {
    return emptyConfig;
  }
}

export async function saveAISettings(config: AIProviderConfig) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await cryptoKey(),
    new TextEncoder().encode(JSON.stringify(config))
  );
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted))
  }));
}

export function publicAISettings(config: AIProviderConfig) {
  return {
    providerName: config.providerName,
    baseUrl: config.baseUrl,
    modelId: config.modelId,
    apiKey: maskApiKey(config.apiKey)
  };
}
