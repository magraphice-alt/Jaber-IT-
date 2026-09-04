import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { NotificationType, UserDevice } from '../types';
import {
  Send,
  BellRing,
  Megaphone,
  Radio,
  Users,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  Info,
  ExternalLink
} from 'lucide-react';

export const AdminBroadcastSection: React.FC = () => {
  const { users, currentUser, sendAdminBroadcast, sendTestNotification } = useApp();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'selected' | 'admins'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [type, setType] = useState<NotificationType>('system_announcement');
  const [targetUrl, setTargetUrl] = useState('/?tab=send');

  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live registered push devices in Firestore
  const [devices, setDevices] = useState<UserDevice[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'userDevices'), snapshot => {
      const devList: UserDevice[] = [];
      snapshot.forEach(doc => {
        devList.push(doc.data() as UserDevice);
      });
      setDevices(devList);
    }, err => {
      console.warn('Devices listener warning:', err);
    });

    return () => unsub();
  }, []);

  const mobileDevices = devices.filter(d => d.deviceType === 'mobile');
  const desktopDevices = devices.filter(d => d.deviceType === 'desktop');

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map(u => u.id));
    }
  };

  const handleApplyPreset = (presetTitle: string, presetMessage: string, presetType: NotificationType) => {
    setTitle(presetTitle);
    setMessage(presetMessage);
    setType(presetType);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setStatusMsg({ type: 'error', text: 'Title and message cannot be empty.' });
      return;
    }

    if (target === 'selected' && selectedUserIds.length === 0) {
      setStatusMsg({ type: 'error', text: 'Please select at least one target user.' });
      return;
    }

    setIsSending(true);
    setStatusMsg(null);

    try {
      const result = await sendAdminBroadcast({
        title: title.trim(),
        message: message.trim(),
        target,
        selectedUserIds,
        type,
        url: targetUrl
      });

      if (result.success) {
        setStatusMsg({
          type: 'success',
          text: `Push broadcast sent to ${result.count} recipient(s) and pushed to ${devices.length} registered device(s)!`
        });
        setTitle('');
        setMessage('');
        setSelectedUserIds([]);
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to send broadcast.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Error dispatching broadcast.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    setStatusMsg(null);
    try {
      const ok = await sendTestNotification();
      if (ok) {
        setStatusMsg({
          type: 'success',
          text: 'Test push notification fired! Sound, vibration, and in-app alert triggered.'
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Failed to trigger test notification.' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / System Status */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400 animate-pulse" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">
                Push Notification & Broadcast Hub
              </h2>
              <p className="text-[11px] text-slate-400">
                PWA Cloud Messaging (FCM) & Real-time Firestore Pipeline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Testing...' : 'Send Test Alert'}</span>
          </button>
        </div>

        {/* Live Device Counters */}
        <div className="grid grid-cols-3 gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 text-center">
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center justify-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-400" />
              <span>Mobile</span>
            </div>
            <div className="text-base font-black text-white font-mono">{mobileDevices.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center justify-center gap-1">
              <Laptop className="w-3 h-3 text-blue-400" />
              <span>Desktop</span>
            </div>
            <div className="text-base font-black text-white font-mono">{desktopDevices.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center justify-center gap-1">
              <Users className="w-3 h-3 text-amber-400" />
              <span>Total Tokens</span>
            </div>
            <div className="text-base font-black text-emerald-400 font-mono">{devices.length}</div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold animate-in fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Broadcast Composer Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-600" />
            <span className="font-extrabold text-sm text-slate-900">Compose Broadcast</span>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
            Real-Time Push
          </span>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
            Quick Announcement Presets:
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                handleApplyPreset(
                  '📢 System Maintenance Notice',
                  'Masud Telecom will undergo a brief scheduled server upgrade tonight from 12:00 AM to 12:30 AM BST.',
                  'system_announcement'
                )
              }
              className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer transition-colors"
            >
              Maintenance
            </button>
            <button
              type="button"
              onClick={() =>
                handleApplyPreset(
                  '🎉 Daily Commission Bonus',
                  'Higher commission rates are active today! Earn up to ৳8.5 per ৳1,000 sent via bKash/Nagad.',
                  'system_announcement'
                )
              }
              className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer transition-colors"
            >
              Bonus Rate
            </button>
            <button
              type="button"
              onClick={() =>
                handleApplyPreset(
                  '🔒 Security Reminder',
                  'Please do not share your account login credentials or PIN with anyone. Admin will never ask for your PIN.',
                  'security_alert'
                )
              }
              className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer transition-colors"
            >
              Security Alert
            </button>
            <button
              type="button"
              onClick={() =>
                handleApplyPreset(
                  '🕌 Eid Mubarak Greeting',
                  'Masud Telecom wishes you and your family a joyous Eid Mubarak! Enjoy special transaction rates.',
                  'welcome'
                )
              }
              className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer transition-colors"
            >
              Holiday Greeting
            </button>
          </div>
        </div>

        <form onSubmit={handleSendBroadcast} className="space-y-3">
          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Audience
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTarget('all')}
                className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                  target === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Users ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setTarget('selected')}
                className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                  target === 'selected'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Selected ({selectedUserIds.length})
              </button>
              <button
                type="button"
                onClick={() => setTarget('admins')}
                className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                  target === 'admins'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Admins Only
              </button>
            </div>
          </div>

          {/* Selected Users Multi-Select List */}
          {target === 'selected' && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Choose Recipients:</span>
                <button
                  type="button"
                  onClick={handleSelectAllUsers}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  {selectedUserIds.length === users.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {users.map(u => (
                  <label
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => handleToggleUser(u.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-slate-900">{u.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{u.mobile}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notification Type & Destination */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notification Type
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as NotificationType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="system_announcement">📢 Announcement</option>
                <option value="security_alert">🔒 Security Alert</option>
                <option value="welcome">✨ Welcome / Celebration</option>
                <option value="deposit_submitted">📥 Deposit Notice</option>
                <option value="money_sent">💸 Transfer Update</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target App URL
              </label>
              <select
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="/?tab=send">Send Transfer Tab</option>
                <option value="/?tab=statement">Statement History</option>
                <option value="/?tab=deposit">Deposit Tab</option>
                <option value="/?tab=profile">Profile Page</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Important System Update"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notification Body
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Enter push notification message displayed on Android panel and Desktop notification center..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSending}
            className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-98 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Dispatching Push Notification...' : 'Send Push Broadcast Now'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
