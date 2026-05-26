import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BFhpFxYt3kYasuWFa46gm8QVrPRBmmZRX--7ur2WID2hK9CfdlJz63bbAsqhI7J0tCnGbXJQ65TskT39RuUF6gU';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function isPushSubscribed() {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export async function subscribeToPush(studentId) {
  if (!isPushSupported()) return { ok: false, error: 'Push não suportado neste navegador' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, error: 'VAPID key não configurada' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, error: 'Permissão negada' };

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    await supabase.from('push_subscriptions').upsert(
      { student_id: studentId, subscription: sub.toJSON(), updated_at: new Date().toISOString() },
      { onConflict: 'student_id' }
    );

    return { ok: true, subscription: sub };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function unsubscribeFromPush(studentId) {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    if (studentId) await supabase.from('push_subscriptions').delete().eq('student_id', studentId);
  } catch { /* ignore */ }
}
