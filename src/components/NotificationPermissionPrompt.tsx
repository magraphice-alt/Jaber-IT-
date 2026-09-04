import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, CheckCircle2, X, Smartphone, ShieldCheck, Volume2 } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  registerDevicePushToken
} from '../services/fcmService';
import { playSuccessChime, triggerQuickHaptic } from '../utils/notificationSound';

export const NotificationPermissionPrompt: React.FC = () => {
  const { currentUser } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setIsVisible(false);
      return;
    }

    // Check support and permission
    if (!isPushNotificationSupported()) return;

    const perm = getNotificationPermissionState();
    if (perm === 'granted' || perm === 'denied') {
      return;
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('masud_telecom_notif_prompt_dismissed');
    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 48) {
        return;
      }
    }

    // Delay prompt by 2.5 seconds after login so user isn't startled immediately
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentUser]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('masud_telecom_notif_prompt_dismissed', String(Date.now()));
  };

  const handleEnable = async () => {
    if (!currentUser) return;
    setIsRegistering(true);
    triggerQuickHaptic();

    try {
      const res = await registerDevicePushToken(currentUser);
      if (res.success) {
        playSuccessChime();
        setShowSuccess(true);
        setTimeout(() => {
          setIsVisible(false);
          setShowSuccess(false);
        }, 2200);
      } else {
        // If denied or error, close
        setIsVisible(false);
      }
    } catch (err) {
      console.warn('Notification enable error:', err);
      setIsVisible(false);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fade-in">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-blue-500/30 backdrop-blur-md">
        {showSuccess ? (
          <div className="flex items-center gap-3 py-2 text-emerald-400">
            <CheckCircle2 className="w-7 h-7 shrink-0 text-emerald-400" />
            <div>
              <p className="font-bold text-sm text-white">Notifications Activated!</p>
              <p className="text-xs text-emerald-300/90">
                You'll receive instant alerts on this device even when closed.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-blue-400 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white leading-tight">
                    Enable Push Notifications
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Instant alerts for deposits, transfers & security
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
                title="Not Now"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 grid grid-cols-3 gap-1 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5 justify-center">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>Mobile Panel</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Audio Chime</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Closed App</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleEnable}
                disabled={isRegistering}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isRegistering ? 'Connecting Device...' : 'Enable Notifications'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors font-semibold cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
