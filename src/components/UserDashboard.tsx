import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, ArrowUpRight, Percent, ChevronRight, Send, PlusCircle, ShoppingCart, MoreHorizontal, TrendingUp, FileText, CheckCircle2, Clock, RotateCcw, AlertCircle, Lock } from 'lucide-react';
import { UserTab } from './UserNavbar';
import { ReceiptModal } from './ReceiptModal';
import { ChargeModal } from './ChargeModal';
import { PendingSendWidget } from './PendingSendWidget';
import { EditSendModal } from './EditSendModal';
import { Transaction } from '../types';
import { isBDToday, formatBDDateTime, getLiveBDClock, getBDTodayRange } from '../utils/timeHelper';

interface UserDashboardProps {
  onTabChange: (tab: UserTab) => void;
  onOpenNotifications: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onTabChange, onOpenNotifications }) => {
  const { currentUser, transactions, notifications, startResendTransaction } = useApp();
  const [selectedReceiptTxn, setSelectedReceiptTxn] = useState<Transaction | null>(null);
  const [selectedEditTxn, setSelectedEditTxn] = useState<Transaction | null>(null);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);

  // Live Bangladesh Clock (BST)
  const [bdClock, setBdClock] = useState(getLiveBDClock());

  useEffect(() => {
    const timer = setInterval(() => {
      setBdClock(getLiveBDClock());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter(
    n => !n.read && (n.userId === currentUser?.id || n.userId === 'all')
  ).length;

  // Compute Today's Send strictly starting from Bangladeshi 6:00 AM
  const todaySends = transactions.filter(
    t =>
      t.userId === currentUser?.id &&
      t.type === 'send' &&
      t.status === 'approved' &&
      isBDToday(t.createdAt)
  );

  const todaySendTotal = todaySends.reduce((sum, t) => sum + t.amount, 0);

  // User's recent transactions (top 5)
  const myUserTxns = transactions.filter(t => t.userId === currentUser?.id);
  const myTxns = myUserTxns.slice(0, 5);

  const myCharges = myUserTxns.filter(t => t.type === 'charge').reduce((acc, t) => acc + t.amount, 0);
  const grossComm = ((currentUser?.totalSend || 0) / 1000) * 7.5;
  const netCommission = currentUser?.totalCommission !== undefined ? currentUser.totalCommission : Math.max(0, grossComm - myCharges);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-24 max-w-md mx-auto shadow-xl">
      {/* Black Top Header */}
      <div className="bg-black text-white px-5 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'}
            alt="User Avatar"
            className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
          />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
              {currentUser?.name || 'Sarah Jenkins'}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              ID: {currentUser?.id || '8492-4921-A'} {currentUser?.mobile ? `• ${currentUser.mobile}` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-full hover:bg-slate-800 transition-colors"
        >
          <Bell className="w-6 h-6 text-slate-200" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-black" />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4">
        {/* Bangladesh Time & 6 AM Cycle Bar */}
        <div className="bg-slate-900 text-white px-3.5 py-2 rounded-xl flex items-center justify-between text-xs border border-slate-800 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5 font-bold">
                <span>🇧🇩 BD Time:</span>
                <span className="font-mono text-emerald-300">{bdClock.time12}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Daily stats cycle: 6:00 AM BST</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-semibold border border-slate-700">
            {bdClock.dateMedium}
          </span>
        </div>

        {/* Available Balance Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span>Available Balance</span>
              {currentUser && currentUser.balance < 0 && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  Credit / Negative
                </span>
              )}
            </span>
            <button className="text-slate-400 hover:text-slate-600 p-1">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className={`text-3xl font-extrabold tracking-tight my-1 font-mono ${currentUser && currentUser.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {currentUser && currentUser.balance < 0
              ? `-৳${Math.abs(currentUser.balance).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`
              : `৳${(currentUser?.balance || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mt-2">
            <TrendingUp className="w-4 h-4" />
            <span>+৳1,250.00</span>
            <span className="text-slate-600 font-normal ml-1">vs last month</span>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between text-xs font-medium text-slate-500">
            <span>Commission Rate: <strong className="text-blue-900 font-bold">{currentUser?.commissionRate || 2.5}%</strong></span>
            <span>ID: {currentUser?.id || '8492-4921-A'}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Today Send */}
          <div
            onClick={() => onTabChange('send')}
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 cursor-pointer hover:border-blue-300 transition-all"
          >
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <div className="p-1.5 rounded-full bg-slate-100">
                <ArrowUpRight className="w-4 h-4 text-slate-700" />
              </div>
              <span className="text-xs font-medium">Today Send</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              ৳{(todaySendTotal || 1200).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Commission */}
          <div
            onClick={() => setIsChargeModalOpen(true)}
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-emerald-50 transition-colors">
                <Percent className="w-4 h-4 text-slate-700 group-hover:text-emerald-700" />
              </div>
              <span className="text-xs font-medium group-hover:text-emerald-800">Commission</span>
            </div>
            <div className="text-lg font-bold text-emerald-600">
              +৳{netCommission.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>


        {/* Recent Activity */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
            <button
              onClick={() => onTabChange('statement')}
              className="text-xs font-semibold text-blue-900 hover:text-blue-700"
            >
              View All
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {myTxns.map(t => {
              const isSend = t.type === 'send';
              const isCharge = t.type === 'charge';

              return (
                <div
                  key={t.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onTabChange('statement')}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isCharge
                          ? 'bg-rose-100 text-rose-600'
                          : isSend
                          ? 'bg-blue-900 text-white'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {isCharge ? (
                        <Percent className="w-5 h-5" />
                      ) : isSend ? (
                        <Send className="w-5 h-5" />
                      ) : (
                        <PlusCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 leading-snug">
                        {t.comment || (isCharge ? 'Commission Charge / Service Fee' : isSend ? `Transfer to ${t.recipientMobile}` : 'Deposit Request')}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {formatBDDateTime(t.createdAt, false)}
                      </div>
                      {t.adminPin && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            🔑 PIN: {t.adminPin}
                          </div>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedReceiptTxn(t);
                            }}
                            className="text-[10px] bg-blue-900 hover:bg-blue-800 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <FileText className="w-3 h-3 text-blue-300" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      )}
                      {!t.adminPin && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedReceiptTxn(t);
                            }}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <FileText className="w-3 h-3 text-blue-300" />
                            <span>Receipt</span>
                          </button>

                          {t.status === 'rejected' && t.type === 'send' && (
                            t.isResent ? (
                              <span
                                title={`Already resent${t.resentTxnId ? ` as ${t.resentTxnId}` : ''}`}
                                className="text-[10px] bg-slate-100 border border-slate-300 text-slate-500 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 cursor-not-allowed shadow-2xs"
                              >
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                <span>Locked</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  startResendTransaction(t);
                                }}
                                className="text-[10px] bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
                              >
                                <RotateCcw className="w-3 h-3 text-white" />
                                <span>Resend & Correct</span>
                              </button>
                            )
                          )}
                        </div>
                      )}

                      {/* Rejection Cause Callout */}
                      {t.status === 'rejected' && t.rejectionReason && (
                        <div className="mt-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-[9px] text-rose-800 font-semibold flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
                          <span className="break-words">Reject: {t.rejectionReason}</span>
                        </div>
                      )}

                      {/* Pending Send Widget with 10-Min Timer Bar */}
                      {t.status === 'pending' && (
                        <PendingSendWidget
                          transaction={t}
                          onOpenEdit={() => setSelectedEditTxn(t)}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold ${
                          isSend || isCharge ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isSend || isCharge ? '-' : '+'}৳{t.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          t.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : t.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isCharge ? 'Deducted' : t.status}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedReceiptTxn && (
        <ReceiptModal
          transaction={selectedReceiptTxn}
          onClose={() => setSelectedReceiptTxn(null)}
        />
      )}

      {selectedEditTxn && (
        <EditSendModal
          transaction={selectedEditTxn}
          onClose={() => setSelectedEditTxn(null)}
        />
      )}

      {isChargeModalOpen && currentUser && (
        <ChargeModal
          user={currentUser}
          onClose={() => setIsChargeModalOpen(false)}
        />
      )}
    </div>
  );
};
