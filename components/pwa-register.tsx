// input: browser service worker and notification APIs; output: registration and subscription side effects; pos: PWA bootstrap, update this header and components/README.md when changed.
"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PwaRegister() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
    navigator.serviceWorker.register("/sw.js");
    setPermission(Notification.permission);
  }, []);

  async function enablePush() {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") return;
    const registration = await navigator.serviceWorker.ready;
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key)
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(subscription)
    });
  }

  if (permission === "granted") return null;

  return (
    <Button variant="outline" size="sm" onClick={enablePush}>
      <Bell className="h-4 w-4" />
      开启提醒
    </Button>
  );
}
