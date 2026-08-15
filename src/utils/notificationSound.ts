// Notification, Sound & Vibration Utility for Mobile Home Screen & Real-time Activities

let sharedAudioCtx: AudioContext | null = null;
let isAppClosing = false;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    isAppClosing = true;
    if (sharedAudioCtx) {
      try {
        sharedAudioCtx.close().catch(() => {});
      } catch {}
    }
  });

  window.addEventListener('pagehide', () => {
    isAppClosing = true;
    if (sharedAudioCtx) {
      try {
        sharedAudioCtx.close().catch(() => {});
      } catch {}
    }
  });
}

function getAudioContext(): AudioContext | null {
  if (isAppClosing) return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        sharedAudioCtx = new AudioContextClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn('AudioContext init error:', err);
    return null;
  }
}

/**
 * Plays a banking alert chime with dual oscillators and harmonics
 * Engineered to cut through mobile phone speakers clearly.
 */
export function playNotificationSound(): void {
  if (isAppClosing) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Multi-frequency harmonic chords (C6 -> E6 -> G6 -> C7)
    const tones = [
      { freq: 1046.50, harmonic: 2093.00, time: 0.00, dur: 0.28 }, // C6
      { freq: 1318.51, harmonic: 2637.02, time: 0.12, dur: 0.30 }, // E6
      { freq: 1567.98, harmonic: 3135.96, time: 0.24, dur: 0.35 }, // G6
      { freq: 2093.00, harmonic: 4186.01, time: 0.38, dur: 0.65 }, // C7
    ];

    tones.forEach(t => {
      // Primary Oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(t.freq, now + t.time);

      gain.gain.setValueAtTime(0.001, now + t.time);
      gain.gain.linearRampToValueAtTime(0.38, now + t.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.time + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.time);
      osc.stop(now + t.time + t.dur + 0.05);

      // Overtone harmonic layer for sharpness on phone speakers
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(t.harmonic, now + t.time);

      gain2.gain.setValueAtTime(0.001, now + t.time);
      gain2.gain.linearRampToValueAtTime(0.18, now + t.time + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + t.time + (t.dur * 0.8));

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + t.time);
      osc2.stop(now + t.time + t.dur + 0.05);
    });
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

/**
 * Short crisp success tone for instant feedback on successful operation
 */
export function playSuccessChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const tones = [
      { freq: 880.00, time: 0.00, dur: 0.16 }, // A5
      { freq: 1318.51, time: 0.10, dur: 0.35 }, // E6
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(t.freq, now + t.time);

      gain.gain.setValueAtTime(0.001, now + t.time);
      gain.gain.linearRampToValueAtTime(0.35, now + t.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.time + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.time);
      osc.stop(now + t.time + t.dur + 0.05);
    });
  } catch (err) {
    console.warn('Success chime error:', err);
  }
}

/**
 * Trigger continuous vibration for minimum 3+ seconds on mobile devices
 * Pattern: 600ms vibrate, 150ms rest, 600ms vibrate, 150ms rest, 600ms vibrate, 150ms rest, 600ms vibrate (~3.45s)
 */
export function triggerVibration(durationMs: number = 3400): void {
  if (isAppClosing) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([600, 150, 600, 150, 600, 150, 600]);
    }
  } catch (err) {
    console.warn('Vibration error:', err);
  }
}

/**
 * Trigger quick tactile feedback (60ms) for button taps / operations
 */
export function triggerQuickHaptic(): void {
  if (isAppClosing) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(60);
    }
  } catch {}
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

/**
 * Formats notification title cleanly to avoid spam detection by mobile OS
 */
function cleanNotificationTitle(title: string): string {
  const sanitized = title.replace(/^[^\w\s]+/, '').trim();
  if (sanitized.toLowerCase().startsWith('masud telecom')) {
    return sanitized;
  }
  return `Masud Telecom: ${sanitized}`;
}

/**
 * Triggers full activity alert: sound chime + 3+ second vibration + system notification in mobile status bar
 */
export async function sendHomeScreenNotification(
  title: string = 'Masud Telecom: Account Notification',
  body: string = 'Activity updated in your Masud Telecom account.'
): Promise<void> {
  if (isAppClosing) return;
  const cleanTitle = cleanNotificationTitle(title);

  // 1. Play loud audible chime
  playNotificationSound();

  // 2. Trigger 3+ seconds vibration
  triggerVibration(3400);

  // 3. Dispatch system notification to mobile notification status bar
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        if (reg.showNotification && Notification.permission === 'granted') {
          await reg.showNotification(cleanTitle, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [600, 150, 600, 150, 600, 150, 600],
            silent: false,
            timestamp: Date.now(),
            tag: `masud-txn-${Date.now()}`,
            renotify: true,
            requireInteraction: false,
            data: { url: '/?tab=send', timestamp: Date.now() }
          } as unknown as NotificationOptions);
          return;
        } else if (reg.active) {
          reg.active.postMessage({
            type: 'SHOW_HOME_SCREEN_NOTIFICATION',
            title: cleanTitle,
            body,
            url: '/?tab=send'
          });
          return;
        }
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(cleanTitle, {
        body,
        icon: '/icon-192.png',
        tag: `masud-txn-${Date.now()}`
      });
    }
  } catch (err) {
    console.warn('Failed to dispatch notification to status bar:', err);
  }
}
