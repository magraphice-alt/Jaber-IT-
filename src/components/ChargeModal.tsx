import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { X, Percent, Calculator, ArrowDownRight, ArrowUpRight, CheckCircle2, History, AlertCircle, PlusCircle, MinusCircle } from 'lucide-react';

interface ChargeModalProps {
  user: User;
  onClose: () => void;
  defaultMode?: 'credit' | 'debit';
}

export const ChargeModal: React.FC<ChargeModalProps> = ({ user, onClose, defaultMode = 'credit' }) => {
  const { currentUser, transactions, manualAdjustUserBalance, users } = useApp();
  const [mode, setMode] = useState<'credit' | 'debit'>(defaultMode);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Get live user from state to reflect instant updates
  const liveUser = users.find(u => u.id === user.id) || user;

  // Filter transactions for this user (both manual credits and charges/debits)
  const userAdjustments = transactions.filter(
    t => t.userId === liveUser.id && (
      t.type === 'charge' || 
      t.comment?.toLowerCase().includes('credit') || 
      t.comment?.toLowerCase().includes('debit') ||
      t.method?.toLowerCase().includes('admin')
    )
  );

  const userCharges = transactions.filter(
    t => t.userId === liveUser.id && (t.type === 'charge' || t.comment?.toLowerCase().includes('charge'))
  );
  const userChargesTotal = userCharges.reduce((sum, t) => sum + t.amount, 0);

  // Calculate commission: (user total send / 1000) * 7.5 minus charges
  const userTotalSend = liveUser.totalSend || 0;
  const grossCommission = (userTotalSend / 1000) * 7.5;
  const calculatedCommission = liveUser.totalCommission !== undefined
    ? liveUser.totalCommission
    : Math.max(0, grossCommission - userChargesTotal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setFeedback({ type: 'error', msg: 'Please enter a valid amount greater than 0.' });
      return;
    }

    setIsSubmitting(true);
    const result = manualAdjustUserBalance(liveUser.id, mode, amt, reason.trim());
    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', msg: result.message });
      setAmount('');
      setReason('');
    } else {
      setFeedback({ type: 'error', msg: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-400/30 text-blue-300">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Admin Credit & Debit Control Box</h2>
              <p className="text-xs text-slate-400 font-medium">User: {liveUser.name} ({liveUser.mobile || liveUser.email})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Commission & Live Balance Summary Card */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" />
                Commission Calculation Formula
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                (Total Send ÷ 1000) × 7.5
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-100">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Send Amount</span>
                <strong className="text-base font-black text-slate-900 font-mono">
                  ৳{userTotalSend.toLocaleString('en-BD')}
                </strong>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-300/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Commission</span>
                <strong className="text-base font-black text-emerald-700 font-mono">
                  ৳{calculatedCommission.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">User Available Balance</span>
                <strong className={`text-sm font-black font-mono ${liveUser.balance < 0 ? 'text-rose-600' : 'text-blue-950'}`}>
                  {liveUser.balance < 0
                    ? `-৳${Math.abs(liveUser.balance).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`
                    : `৳${liveUser.balance.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`}
                </strong>
              </div>
              {liveUser.balance < 0 ? (
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                  Negative Balance
                </span>
              ) : (
                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  Active Account
                </span>
              )}
            </div>
          </div>

          {/* Admin Credit / Debit Form with Tabs */}
          {isAdmin ? (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
              
              {/* Tab Selector */}
              <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('credit');
                    setFeedback(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'credit'
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Manual Credit (Add Balance)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('debit');
                    setFeedback(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'debit'
                      ? 'bg-rose-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MinusCircle className="w-4 h-4" />
                  <span>- Manual Debit (Deduct)</span>
                </button>
              </div>

              {feedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{feedback.msg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {mode === 'credit' ? 'Credit Amount (৳) *' : 'Debit Amount (৳) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 500"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className={`w-full bg-white border rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none font-mono ${
                        mode === 'credit'
                          ? 'border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                          : 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Reason / Reference Note
                    </label>
                    <input
                      type="text"
                      placeholder={mode === 'credit' ? 'e.g. Manual Deposit / Bonus' : 'e.g. Service Charge / Comm'}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-sm text-white ${
                    mode === 'credit'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {mode === 'credit' ? (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      <span>+ Credit & Add Funds (+৳{amount || '0'})</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-4 h-4" />
                      <span>- Deduct & Debit Balance (-৳{amount || '0'})</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 font-medium text-center">
              Account credit and debit balance adjustments are managed directly by Admin.
            </div>
          )}

          {/* Manual Adjustments & Charge History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-900" />
                Adjustment Activity History ({userAdjustments.length})
              </h3>
            </div>

            {userAdjustments.length === 0 ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                No manual credit/debit adjustments recorded for this user yet.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {userAdjustments.map(c => {
                    const isCreditItem = c.type === 'deposit' || c.comment?.toLowerCase().includes('credit');
                    return (
                      <div key={c.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-900">{c.comment || (isCreditItem ? 'Admin Credit' : 'Service Charge Debit')}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {c.id} &bull; {new Date(c.createdAt).toLocaleString('en-BD')}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-black text-sm ${isCreditItem ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {isCreditItem ? '+' : '-'}৳{c.amount.toLocaleString('en-BD')}
                          </span>
                          <div className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded inline-block ml-1 border ${
                            isCreditItem 
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-200' 
                              : 'text-rose-800 bg-rose-50 border-rose-200'
                          }`}>
                            {isCreditItem ? 'Credit' : 'Debit'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer transition-colors"
          >
            Close Box
          </button>
        </div>

      </div>
    </div>
  );
};
