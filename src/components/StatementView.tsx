import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Search, Calendar, Phone, ArrowUpRight, PlusCircle, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { PendingSendWidget } from './PendingSendWidget';
import { EditSendModal } from './EditSendModal';
import { Transaction } from '../types';

interface StatementViewProps {
  onOpenNotifications: () => void;
}

export const StatementView: React.FC<StatementViewProps> = ({ onOpenNotifications }) => {
  const { transactions, currentUser, notifications } = useApp();
  const [selectedReceiptTxn, setSelectedReceiptTxn] = useState<Transaction | null>(null);
  const [selectedEditTxn, setSelectedEditTxn] = useState<Transaction | null>(null);

  const [singleDate, setSingleDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [activeFilter, setActiveFilter] = useState<{
    singleDate?: string;
    fromDate?: string;
    toDate?: string;
    mobile?: string;
  }>({});

  const unreadCount = notifications.filter(
    n => !n.read && (n.userId === currentUser?.id || n.userId === 'all')
  ).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilter({
      singleDate: singleDate || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      mobile: searchMobile.trim() || undefined
    });
  };

  const handleClearFilter = () => {
    setSingleDate('');
    setFromDate('');
    setToDate('');
    setSearchMobile('');
    setActiveFilter({});
  };

  // Filter user's transactions based on active filter
  const userTxns = transactions.filter(t => {
    if (t.userId !== currentUser?.id) return false;

    // Mobile filter
    if (activeFilter.mobile) {
      const q = activeFilter.mobile.toLowerCase();
      const matchMobile = t.recipientMobile?.toLowerCase().includes(q);
      const matchComment = t.comment?.toLowerCase().includes(q);
      if (!matchMobile && !matchComment) return false;
    }

    const txnDate = new Date(t.createdAt).toISOString().split('T')[0];

    // Single date filter
    if (activeFilter.singleDate && txnDate !== activeFilter.singleDate) {
      return false;
    }

    // From date filter
    if (activeFilter.fromDate && txnDate < activeFilter.fromDate) {
      return false;
    }

    // To date filter
    if (activeFilter.toDate && txnDate > activeFilter.toDate) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 max-w-md mx-auto shadow-xl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img
            src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'}
            alt="User Avatar"
            className="w-10 h-10 rounded-full object-cover border border-slate-300"
          />
          <h1 className="text-xl font-bold text-blue-950">Statement</h1>
        </div>
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-6 h-6 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4">
        {/* Filters Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Single Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Single Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={singleDate}
                  onChange={e => setSingleDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Date Range */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Date Range</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-2.5 px-3 text-xs text-slate-800 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-2.5 px-3 text-xs text-slate-800 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Mobile Number Search */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number
              </label>
              <input
                type="text"
                value={searchMobile}
                onChange={e => setSearchMobile(e.target.value)}
                placeholder="Enter mobile number"
                className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
              {(activeFilter.singleDate || activeFilter.fromDate || activeFilter.toDate || activeFilter.mobile) && (
                <button
                  type="button"
                  onClick={handleClearFilter}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Statement History List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-slate-900">
              Transaction Records ({userTxns.length})
            </h2>
          </div>

          {userTxns.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">No transactions match your query</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting the date or mobile filters</p>
            </div>
          ) : (
            userTxns.map(t => {
              const isSend = t.type === 'send';
              const isCharge = t.type === 'charge';
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-xl text-white ${
                          isCharge
                            ? 'bg-rose-600'
                            : isSend
                            ? 'bg-blue-900'
                            : 'bg-emerald-600'
                        }`}
                      >
                        {isCharge ? (
                          <ArrowUpRight className="w-4 h-4 rotate-90" />
                        ) : isSend ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <PlusCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900 block leading-tight">
                          {t.comment || (isCharge ? 'Commission Charge / Deduction' : isSend ? `Send to ${t.recipientMobile}` : 'Deposit')}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Method: {t.method} &bull; ID: {t.id}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        isCharge
                          ? 'bg-rose-100 text-rose-800'
                          : t.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {(isCharge || t.status === 'approved') && <CheckCircle className="w-3 h-3" />}
                      {t.status === 'pending' && <Clock className="w-3 h-3" />}
                      {t.status === 'rejected' && <AlertCircle className="w-3 h-3" />}
                      <span className="capitalize">{isCharge ? 'Deducted' : t.status}</span>
                    </span>
                  </div>

                  {/* Send Money Amount & Date Row */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between my-1">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Amount</span>
                      <div className={`text-base sm:text-lg font-black font-mono ${isSend || isCharge ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isSend || isCharge ? '-' : '+'}৳{t.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Date & Time</span>
                      <span className="text-xs text-slate-600 font-medium">{new Date(t.createdAt).toLocaleString('en-BD')}</span>
                    </div>
                  </div>

                  {/* Target Number & Admin Security PIN (Under the send money amount) */}
                  {(t.recipientMobile || t.adminPin) && (
                    <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-200 text-xs space-y-1.5 my-1">
                      {t.recipientMobile && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Target Number:</span>
                          <span className="font-mono font-bold text-slate-900">{t.recipientMobile}</span>
                        </div>
                      )}
                      {t.adminPin && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Admin Security PIN:</span>
                          <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            🔑 {t.adminPin}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pending Send Widget with 10-Min Timer Bar */}
                  {t.status === 'pending' && (
                    <PendingSendWidget
                      transaction={t}
                      onOpenEdit={() => setSelectedEditTxn(t)}
                    />
                  )}

                  {/* Last: View Receipt Button */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedReceiptTxn(t);
                      }}
                      className="bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-300" />
                      <span>View Receipt</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
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
    </div>
  );
};
