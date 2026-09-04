import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Volume2,
  VolumeX,
  Vibrate,
  ShieldCheck,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Send,
  Play,
  Smartphone,
  Check,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NotificationPreferences } from '../types';
import {
  playNotificationSound,
  playSuccessChime,
  triggerVibration,
  triggerQuickHaptic
} from '../utils/notificationSound';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  registerDevicePushToken
} from '../services/fcmService';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PREFS: NotificationPreferences = {
  accountAlerts: true,
  depositAlerts: true,
  transferAlerts: true,
  securityAlerts: true,
  announcements: true,
  browserPush: true,
  soundEnabled: true,
  soundStyle: 'default',
  volume: 'high',
  vibrationEnabled: true
};

const STORAGE_KEY = 'masud_telecom_notif_prefs_v1';

export function getSavedNotificationPreferences(): NotificationPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PREFS, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_PREFS;
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, sendTestNotification } = useApp();

  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getSavedNotificationPreferences());
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isEnablingPush, setIsEnablingPush] = useState<boolean>(false);
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrefs(getSavedNotificationPreferences());
      setIsSupported(isPushNotificationSupported());
      setPermissionState(getNotificationPermissionState());
      setSaveSuccess(false);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof NotificationPreferences) => {
    triggerQuickHaptic();
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotificationPreferences(next);
      return next;
    });
  };

  const handleChangeSoundStyle = (style: 'default' | 'crisp' | 'cash') => {
    triggerQuickHaptic();
    setPrefs(prev => {
      const next = { ...prev, soundStyle: style };
      saveNotificationPreferences(next);
      return next;
    });
  };

  const handleChangeVolume = (volume: 'high' | 'medium' | 'low') => {
    triggerQuickHaptic();
    setPrefs(prev => {
      const next = { ...prev, volume };
      saveNotificationPreferences(next);
      return next;
    });
  };

  const handlePlaySampleSound = (style?: 'default' | 'crisp' | 'cash') => {
    const soundToPlay = style || prefs.soundStyle || 'default';
    if (soundToPlay === 'crisp') {
      playSuccessChime();
    } else {
      playNotificationSound();
    }
  };

  const handleTestVibration = () => {
    triggerVibration(1500);
    setTestResult('Vibration triggered on device');
    setTimeout(() => setTestResult(null), 2500);
  };

  const handleRequestPushPermission = async () => {
    if (!currentUser) return;
    setIsEnablingPush(true);
    setTestResult(null);

    try {
      const res = await registerDevicePushToken(currentUser);
      setPermissionState(getNotificationPermissionState());

      if (res.success) {
        setTestResult('Push notifications enabled & device registered successfully!');
        setPrefs(prev => {
          const next = { ...prev, browserPush: true };
          saveNotificationPreferences(next);
          return next;
        });
      } else {
        setTestResult(res.error || 'Failed to enable push notifications');
      }
    } catch (err: any) {
      setTestResult(err.message || 'Error enabling push');
    } finally {
      setIsEnablingPush(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const handleSendTestPush = async () => {
    setIsTestingPush(true);
    setTestResult(null);
    try {
      const success = await sendTestNotification();
      if (success) {
        setTestResult('Test notification sent! Check your notification panel.');
      } else {
        setTestResult('Notification dispatched to app feed.');
      }
    } catch (err: any) {
      setTestResult(err.message || 'Failed to send test push');
    } finally {
      setIsTestingPush(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const handleResetDefaults = () => {
    triggerQuickHaptic();
    setPrefs(DEFAULT_PREFS);
    saveNotificationPreferences(DEFAULT_PREFS);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveAndClose = () => {
    saveNotificationPreferences(prefs);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Notification Settings</h3>
              <p className="text-[11px] text-slate-400">Manage push alerts, sounds & categories</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-slate-800">
          {/* Status Feedback Toast */}
          {testResult && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{testResult}</span>
            </div>
          )}

          {/* 1. Real Push Notification System Status */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Mobile & Desktop Push Status
                </span>
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  permissionState === 'granted'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : permissionState === 'denied'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {permissionState === 'granted'
                  ? 'Active / Subscribed'
                  : permissionState === 'denied'
                  ? 'Blocked in Browser'
                  : 'Pending Permission'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time push notifications alert you instantly on Android lockscreen and computer desktop, even when the application is closed or minimized.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {permissionState !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestPushPermission}
                  disabled={isEnablingPush || !isSupported}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{isEnablingPush ? 'Enabling...' : 'Enable Push Notifications'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={isTestingPush}
                className="flex-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-blue-300" />
                <span>{isTestingPush ? 'Dispatching...' : 'Send Live Test Push'}</span>
              </button>
            </div>
          </div>

          {/* 2. Notification Types & Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Notification Categories / ধরণসমূহ</span>
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
              {/* Deposit Updates */}
              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Deposit Approvals & Updates (ডিপোজিট আপডেট)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Alerts when money deposit is approved, rejected, or submitted
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.depositAlerts}
                  onChange={() => handleToggle('depositAlerts')}
                  className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer accent-blue-900 shrink-0"
                />
              </div>

              {/* Transfer / Send Money Updates */}
              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Send Money & Transfers (সেন্ড মানি অ্যালার্ট)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Alerts for approved transfers, generated PINs, or cancellations
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.transferAlerts}
                  onChange={() => handleToggle('transferAlerts')}
                  className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer accent-blue-900 shrink-0"
                />
              </div>

              {/* Balance Adjustments & Charges */}
              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-800 shrink-0">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Service Fee & Commission Charges (চার্জ ও কমিশন)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Instant notifications on balance credits, debits, or rate changes
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.accountAlerts}
                  onChange={() => handleToggle('accountAlerts')}
                  className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer accent-blue-900 shrink-0"
                />
              </div>

              {/* Security Alerts */}
              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Security & Password Alerts (নিরাপত্তা সতর্কবার্তা)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Notifications on password resets, profile updates, and login checks
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.securityAlerts}
                  onChange={() => handleToggle('securityAlerts')}
                  className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer accent-blue-900 shrink-0"
                />
              </div>

              {/* Admin Broadcasts & Announcements */}
              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-800 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Admin Announcements & Notices (অফিসিয়াল নোটিশ)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Emergency broadcasts, holiday announcements, and system alerts
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.announcements}
                  onChange={() => handleToggle('announcements')}
                  className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer accent-blue-900 shrink-0"
                />
              </div>
            </div>
          </div>

          {/* 3. Audio & Sound Preferences */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Sound & Audio Feedback / শব্দ ও ভাইব্রেশন</span>
            </h4>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              {/* Master Sound Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {prefs.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Notification Chime Sound (অ্যালার্ট রিংটোন)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Play acoustic chime when an alert or notification arrives
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.soundEnabled}
                  onChange={() => handleToggle('soundEnabled')}
                  className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer accent-blue-900 shrink-0"
                />
              </div>

              {/* Sound Style Picker */}
              {prefs.soundEnabled && (
                <div className="space-y-2 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Chime Melody Style:</span>
                    <button
                      type="button"
                      onClick={() => handlePlaySampleSound()}
                      className="text-[10px] font-bold text-blue-900 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 text-blue-700" />
                      <span>Play Sample Tone</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleChangeSoundStyle('default');
                        handlePlaySampleSound('default');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        prefs.soundStyle === 'default'
                          ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Harmonic</span>
                      <span className="text-[9px] opacity-75 font-normal">Banking Chime</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleChangeSoundStyle('crisp');
                        handlePlaySampleSound('crisp');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        prefs.soundStyle === 'crisp'
                          ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Crisp Bell</span>
                      <span className="text-[9px] opacity-75 font-normal">Fast 2-Tone</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleChangeSoundStyle('cash');
                        handlePlaySampleSound('cash');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        prefs.soundStyle === 'cash'
                          ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Cash Ping</span>
                      <span className="text-[9px] opacity-75 font-normal">Register</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile Vibration Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                <div className="flex items-center gap-2">
                  <Vibrate className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Android Device Vibration (মোবাইল ভাইব্রেশন)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Vibrate phone during incoming transactions & notifications
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestVibration}
                    className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 cursor-pointer"
                  >
                    Test Vibrate
                  </button>
                  <input
                    type="checkbox"
                    checked={prefs.vibrationEnabled !== false}
                    onChange={() => handleToggle('vibrationEnabled')}
                    className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer accent-blue-900 shrink-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 py-2 px-3 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
