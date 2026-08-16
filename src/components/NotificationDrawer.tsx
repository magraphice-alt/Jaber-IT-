import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, X, CheckCircle2, AlertTriangle, Info, Trash2, FileText, RotateCcw, Lock } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { Transaction } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, transactions, currentUser, markNotificationRead, deleteNotification, clearNotifications, startResendTransaction } = useApp();
  const [activeReceiptTxn, setActiveReceiptTxn] = useState<Transaction | null>(null);

  if (!isOpen) return null;

  // Filter for current user or admin
  const userNotifs = notifications.filter(
    n => n.userId === currentUser?.id || n.userId === 'all' || (currentUser?.role === 'admin' && n.userId === 'admin')
  );

  const handleClearAll = () => {
    clearNotifications();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
        <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-base">Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              {userNotifs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear</span>
                </button>
              )}
              <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {userNotifs.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-500" />
                <p className="text-sm font-semibold text-slate-700">No new notifications</p>
                <p className="text-xs text-slate-400 mt-1">All caught up!</p>
              </div>
            ) : (
              userNotifs.map(n => {
                // Check if notification matches a specific transaction
                const matchedTxn = n.txnId
                  ? transactions.find(t => t.id === n.txnId)
                  : undefined;

                return (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`p-3.5 rounded-xl border transition-all relative group ${
                      n.read
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : 'bg-blue-50/70 border-blue-200 text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                      {n.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                      {n.type === 'alert' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
                      {n.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-900">{n.title}</span>
                          <span className="text-[10px] text-slate-500">{n.timestamp}</span>
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
    </>
  );
};
