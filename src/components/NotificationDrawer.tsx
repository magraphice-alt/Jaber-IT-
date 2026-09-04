import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  FileText,
  RotateCcw,
  Lock,
  CheckCheck,
  Megaphone,
  Sparkles,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  ExternalLink,
  Settings
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { Transaction, NotificationItem } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabFilter = 'all' | 'unread' | 'read';

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    transactions,
    currentUser,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearNotifications,
    startResendTransaction,
    setActiveUserTab,
    sendTestNotification
  } = useApp();

  const [activeReceiptTxn, setActiveReceiptTxn] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  if (!isOpen) return null;

  // Filter for current user or admin
  const userNotifs = notifications.filter(
    n => n.userId === currentUser?.id || n.userId === 'all' || (currentUser?.role === 'admin' && n.userId === 'admin')
  );

  const unreadCount = userNotifs.filter(n => !n.read).length;

  const filteredNotifs = userNotifs.filter(n => {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'read') return n.read;
    return true;
  });

  const handleClearAll = () => {
    clearNotifications();
  };

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.read) {
      markNotificationRead(n.id);
    }
    if (n.url) {
      const match = n.url.match(/tab=([a-z]+)/);
      if (match && match[1]) {
        setActiveUserTab(match[1] as any);
        onClose();
      }
    }
  };

  const handleTestClick = async () => {
    setIsSendingTest(true);
    try {
      await sendTestNotification();
    } finally {
      setIsSendingTest(false);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'deposit_approved':
      case 'withdrawal_approved':
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />;
      case 'deposit_rejected':
      case 'withdrawal_rejected':
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />;
      case 'deposit_submitted':
        return <ArrowDownLeft className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />;
      case 'money_sent':
        return <ArrowUpRight className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />;
      case 'welcome':
      case 'new_user':
        return <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />;
      case 'system_announcement':
        return <Megaphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />;
      case 'security_alert':
        return <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />;
      case 'test':
        return <BellRing className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
        <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex flex-col gap-2 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="w-5 h-5 text-blue-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Notifications</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                      FCM Push & Firestore
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    title="Mark all as read"
                    className="text-xs text-blue-200 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] font-semibold">Read All</span>
                  </button>
                )}

                {userNotifs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer active:scale-95"
                    title="Clear notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[11px] font-semibold">Clear</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  title="Notification & Sound Settings"
                  className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 cursor-pointer transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-300" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl mt-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({userNotifs.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer relative ${
                  activeTab === 'unread'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('read')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'read'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Read ({userNotifs.length - unreadCount})
              </button>
            </div>
          </div>

          {/* Quick test bar */}
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Verify system alerts</span>
            <button
              type="button"
              onClick={handleTestClick}
              disabled={isSendingTest}
              className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-blue-600" />
              <span>{isSendingTest ? 'Sending...' : 'Test Alert'}</span>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredNotifs.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-500" />
                <p className="text-sm font-semibold text-slate-700">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
                <p className="text-xs text-slate-400 mt-1">All caught up!</p>
              </div>
            ) : (
              filteredNotifs.map(n => {
                const matchedTxn = n.txnId
                  ? transactions.find(t => t.id === n.txnId)
                  : undefined;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 rounded-xl border transition-all relative group cursor-pointer ${
                      n.read
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                        : 'bg-blue-50/70 border-blue-200 text-slate-900 font-medium hover:bg-blue-50 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {renderIcon(n.type)}

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-900">{n.title}</span>
                          <span className="text-[10px] text-slate-500 shrink-0 ml-1">{n.timestamp}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600 mb-2">{n.message}</p>

                        {matchedTxn && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setActiveReceiptTxn(matchedTxn);
                              }}
                              className="bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-300" />
                              <span>View Receipt</span>
                            </button>

                            {matchedTxn.status === 'rejected' && matchedTxn.type === 'send' && (
                              matchedTxn.isResent ? (
                                <span
                                  title={`Already resent${matchedTxn.resentTxnId ? ` as ${matchedTxn.resentTxnId}` : ''}`}
                                  className="bg-slate-100 border border-slate-300 text-slate-600 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-not-allowed shadow-2xs"
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Resent & Locked</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    startResendTransaction(matchedTxn);
                                    onClose();
                                  }}
                                  className="bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-white" />
                                  <span>Resend & Correct</span>
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {n.url && !matchedTxn && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-blue-700 mt-1">
                            <span>Open destination</span>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      {/* Individual dismiss button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        title="Remove notification"
                        className="opacity-60 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {activeReceiptTxn && (
        <ReceiptModal
          transaction={activeReceiptTxn}
          onClose={() => setActiveReceiptTxn(null)}
        />
      )}

      {/* NOTIFICATION SETTINGS MODAL */}
      <NotificationSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  );
};
