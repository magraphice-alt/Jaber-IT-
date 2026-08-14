// Notification, Sound & 3+ Second Vibration Trigger Utility

export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Sequence of 4 chime tones
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.45);
    });
  } catch (err) {
    console.error('Audio playback error:', err);
  }
}

export function triggerVibration(durationMs: number = 3200): void {
  try {
    if ('vibrate' in navigator) {
      // 3.4 seconds pattern: [1000ms vibrate, 150ms pause, 1000ms vibrate, 150ms pause, 1100ms vibrate]
      navigator.vibrate([1000, 150, 1000, 150, 1100]);
    }
  } catch (err) {
    console.error('Vibration error:', err);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

export async function sendHomeScreenNotification(
  title: string = '🎉 Masud Telecom Added to Home Screen',
  body: string = 'App shortcut is successfully saved on your mobile home screen. Tap anytime to open!'
): Promise<void> {
  // 1. Play sound
  playNotificationSound();

  // 2. Trigger minimum 3 second vibration
  triggerVibration(3200);

  // 3. Send system notification to mobile screen
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        reg.active?.postMessage({
          type: 'SHOW_HOME_SCREEN_NOTIFICATION',
          title,
          body
        });
        return;
      }
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        tag: 'home-screen-shortcut'
      });
    }
  } catch (err) {
    console.error('Failed to dispatch notification:', err);
  }
}
