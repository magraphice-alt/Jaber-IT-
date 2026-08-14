// Notification, Sound & 3+ Second Vibration Utility for Mobile Home Screen & Real-time Activities

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
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

// Automatically unlock audio on first user touch/interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      }).catch(() => {});
    } else if (ctx) {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Energetic chime sequence (E5 -> G5 -> B5 -> E6)
    const tones = [
      { freq: 659.25, time: 0.00, dur: 0.25 },
      { freq: 783.99, time: 0.12, dur: 0.25 },
      { freq: 987.77, time: 0.24, dur: 0.30 },
      { freq: 1318.51, time: 0.38, dur: 0.55 },
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
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
    console.warn('Audio playback error:', err);
  }
}

/**
 * Trigger continuous vibration for minimum 3+ seconds on mobile
 * Pattern: 800ms vibrate, 150ms rest, 800ms vibrate, 150ms rest, 800ms vibrate, 150ms rest, 800ms vibrate = 3,650ms (~3.65s)
 */
export function triggerVibration(durationMs: number = 3400): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([800, 150, 800, 150, 800, 150, 800]);
    }
  } catch (err) {
    console.warn('Vibration error:', err);
  }
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
 * Triggers full activity alert: sound + minimum 3-second vibration + system notification
 */
export async function sendHomeScreenNotification(
  title: string = '🎉 Masud Telecom Alert',
  body: string = 'Activity updated in your Masud Telecom account.'
): Promise<void> {
  // 1. Play sound chime
  playNotificationSound();

  // 2. Trigger minimum 3.4 seconds vibration
  triggerVibration(3400);

  // 3. Dispatch system notification to mobile screen
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        reg.active.postMessage({
          type: 'SHOW_HOME_SCREEN_NOTIFICATION',
          title,
          body
        });
        return;
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        tag: `masud-telecom-activity-${Date.now()}`
      });
    }
  } catch (err) {
    console.warn('Failed to dispatch notification:', err);
  }
}
