import React, { useState, useEffect } from 'react';
import { Smartphone, Bell, Volume2, Sparkles, X, CheckCircle2 } from 'lucide-react';
import {
  sendHomeScreenNotification,
  requestNotificationPermission,
  playNotificationSound,
  triggerVibration
} from '../utils/notificationSound';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const HomeScreenInstallWidget: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [tested, setTested] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA / Home screen mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Capture install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    // When shortcut is successfully saved on mobile home screen
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      // Trigger mobile home screen notification + sound + 3+ second vibration!
      sendHomeScreenNotification(
        '🎉 Masud Telecom Saved to Home Screen!',
        'App shortcut is now saved on your mobile home screen with sound and vibration enabled.'
      );
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    await requestNotificationPermission();

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        // Trigger notification, sound & minimum 3 second vibration
        await sendHomeScreenNotification(
          '🎉 Masud Telecom Added to Home Screen!',
          'Shortcut is saved to your phone. Launch anytime with fast offline access!'
        );
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // Manual add to home screen or iOS Safari
      await sendHomeScreenNotification(
        '📱 Masud Telecom Home Screen Shortcut',
        'Tap browser menu ⋮ or Share ⎋ -> "Add to Home Screen" to install.'
      );
    }
  };

  const handleTestAlert = async () => {
    setTested(true);
    await requestNotificationPermission();
    playNotificationSound();
    triggerVibration(3200);
    await sendHomeScreenNotification(
      '🔔 Test Notification: Home Screen Alert',
      'Masud Telecom home screen notification alert with sound and 3-second vibration!'
    );
    setTimeout(() => setTested(false), 3500);
  };

  if (!showBanner && isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-sm mx-auto bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-blue-500/30 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-md shrink-0">
            <Smartphone className="w-5 h-5 text-sky-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wide text-white">Save Shortcut to Home Screen</span>
              <span className="bg-sky-500/20 text-sky-300 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-sky-400/30">
                PWA
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-tight mt-0.5">
              Get instant home screen notifications with sound & 3-second vibration.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowBanner(false)}
          className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-95 text-white py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Add to Home Screen</span>
        </button>

        <button
          type="button"
          onClick={handleTestAlert}
          title="Test sound and 3-second vibration notification"
          className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
        >
          {tested ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">Vibrating...</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3 h-3 text-sky-400" />
              <span>Test 3s Alert</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
