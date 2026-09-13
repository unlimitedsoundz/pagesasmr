/**
 * Client-side notification utilities: Web Audio Chimes & Browser Push Notifications
 */

export function playNotificationChime(type: 'success' | 'alert' = 'success') {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {}
}

export function sendBrowserPushNotification(
  title: string,
  options?: { body?: string; icon?: string; tag?: string; url?: string }
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: options?.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: options?.tag || 'pinkroom-pages-alert',
        body: options?.body,
      });

      notif.onclick = () => {
        window.focus();
        if (options?.url) {
          window.location.href = options.url;
        }
        notif.close();
      };
    } catch (err) {
      console.warn('Browser push notification error:', err);
    }
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    return await Notification.requestPermission();
  } catch (e) {
    return 'denied';
  }
}

export function getBrowserNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}
