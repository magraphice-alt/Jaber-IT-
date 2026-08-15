import React, { useState, useEffect } from 'react';
import { Smartphone, Volume2, Sparkles, X, CheckCircle2, Share, MoreVertical, PlusSquare, ArrowRight } from 'lucide-react';
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

const DISMISS_STORAGE_KEY = 'masud_telecom_pwa_dismissed';

export const HomeScreenInstallWidget: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [tested, setTested] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA installed on home screen
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Capture install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // When shortcut is successfully saved to home screen
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      handleDismiss();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('localStorage error:', e);
    }
  };

  const handleInstallClick = async () => {
    await requestNotificationPermission();

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          handleDismiss();
        }
        setDeferredPrompt(null);
        return;
      } catch (err) {
        console.warn('Prompt error:', err);
      }
    }

    // If native prompt is not available, show visual instructions
    setShowInstructions(true);
  };

  const handleTestAlert = async () => {
    setTested(true);
    await requestNotificationPermission();
    playNotificationSound();
    triggerVibration(3400);
    await sendHomeScreenNotification(
      '🔔 Test Notification: Home Screen Alert',
      'Masud Telecom activity alert with sound and 3-second vibration!'
    );
    setTimeout(() => setTested(false), 3600);
  };

  // If user tapped 'X' (cross) or app is already running installed standalone, hide banner completely!
  if (isDismissed || isInstalled) {
    // Still render instructions modal if user opened it before
    if (showInstructions) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 text-white shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">Add to Home Screen</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-sky-300 mb-1 flex items-center gap-1.5">
                  <MoreVertical className="w-4 h-4 text-sky-400" /> Android / Chrome:
                </p>
                <p className="text-[11px] text-slate-300">
                  Tap the top-right <strong className="text-white">3 dots (⋮)</strong> in your browser, then tap <strong className="text-white">"Add to Home screen"</strong> or <strong className="text-white">"Install app"</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                  <Share className="w-4 h-4 text-amber-400" /> iPhone / Safari:
                </p>
                <p className="text-[11px] text-slate-300">
                  Tap the <strong className="text-white">Share button (⎋)</strong> at the bottom, scroll down and tap <strong className="text-white">"Add to Home Screen (+)"</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowInstructions(false);
                handleDismiss();
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Got it, Close
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {/* Bottom Floating Bar */}
      <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-sm mx-auto bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-blue-500/40 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
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

          {/* Close cross button */}
          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
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

      {/* Instructions Modal if triggered */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 text-white shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">Add to Home Screen</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-sky-300 mb-1 flex items-center gap-1.5">
                  <MoreVertical className="w-4 h-4 text-sky-400" /> Android / Chrome:
                </p>
                <p className="text-[11px] text-slate-300">
                  Tap the top-right <strong className="text-white">3 dots (⋮)</strong> in your browser, then tap <strong className="text-white">"Add to Home screen"</strong> or <strong className="text-white">"Install app"</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                  <Share className="w-4 h-4 text-amber-400" /> iPhone / Safari:
                </p>
                <p className="text-[11px] text-slate-300">
                  Tap the <strong className="text-white">Share button (⎋)</strong> at the bottom, scroll down and tap <strong className="text-white">"Add to Home Screen (+)"</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowInstructions(false);
                handleDismiss();
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Got it, Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
