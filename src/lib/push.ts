import { getApiUrl } from "@/lib/api-config";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getExistingPushSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<boolean> {
  if (!pushSupported()) return false;

  const keyResponse = await fetch(getApiUrl("/api/push/vapid-key"));
  if (!keyResponse.ok) return false;
  const { publicKey, configured } = (await keyResponse.json()) as {
    publicKey: string | null;
    configured: boolean;
  };
  if (!configured || !publicKey) return false;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const response = await fetch(getApiUrl("/api/push/subscribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  return response.ok;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!pushSupported()) return true;
  const subscription = await getExistingPushSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => undefined);

  const response = await fetch(getApiUrl("/api/push/unsubscribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ endpoint }),
  });

  return response.ok;
}
