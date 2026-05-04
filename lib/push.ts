// input: VAPID env vars and subscription payloads; output: Web Push sender; pos: notification server boundary, update this header and lib/README.md when changed.
import webpush from "web-push";

export function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendPush(subscription: webpush.PushSubscription, payload: unknown) {
  if (!configureWebPush()) {
    throw new Error("Missing VAPID keys");
  }
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}
