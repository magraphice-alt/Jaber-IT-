import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Transaction } from '../types';
import { X, Percent, Calculator, ArrowDownRight, DollarSign, CheckCircle2, History, AlertCircle } from 'lucide-react';

interface ChargeModalProps {
  user: User;
  onClose: () => void;
}

export const ChargeModal: React.FC<ChargeModalProps> = ({ user, onClose }) => {
  const { currentUser, transactions, chargeUserBalance } = useApp();
  const [chargeAmount, setChargeAmount] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Calculate commission: (user total send / 1000) * 7.5
  const userTotalSend = user.totalSend || 0;
  const calculatedCommission = (userTotalSend / 1000) * 7.5;

  // Filter charges for this user
  const userCharges = transactions.filter(
    t => t.userId === user.id && (t.type === 'charge' || t.comment?.toLowerCase().includes('charge'))
  );

  const handleApplyCharge = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const amt = parseFloat(chargeAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setFeedback({ type: 'error', msg: 'Please enter a valid charge amount greater than 0.' });
      return;
    }

    setIsSubmitting(true);
    const result = chargeUserBalance(user.id, amt, reason.trim() || 'Admin Service Charge');
    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', msg: result.message });
      setChargeAmount('');
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
              <h2 className="text-base font-bold tracking-tight">Commission & Charge Box</h2>
              <p className="text-xs text-slate-400 font-medium">User: {user.name} ({user.mobile})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Commission Calculation Card */}
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
                <strong className="text-sm font-black text-blue-950 font-mono">
                  ৳{user.balance.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                Active Account
              </span>
            </div>
          </div>

          {/* Admin Charge Table & Input Form */}
          {isAdmin ? (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-rose-600" />
                  Apply Charge to User Balance
                </h3>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                  Admin Control
                </span>
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

              <form onSubmit={handleApplyCharge} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Charge Amount (৳) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 50"
                      value={chargeAmount}
                      onChange={e => setChargeAmount(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Reason / Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Service Fee"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-sm"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Deduct & Charge from User Balance</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 font-medium text-center">
              Account charge deductions are managed directly by Admin.
            </div>
          )}

          {/* Charge Table / History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-900" />
                Charge History Table ({userCharges.length})
              </h3>
            </div>

            {userCharges.length === 0 ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                No previous charges recorded for this user.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {userCharges.map(c => (
                    <div key={c.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900">{c.comment || 'Service Charge'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {c.id} • {new Date(c.createdAt).toLocaleString('en-BD')}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-rose-600 text-sm">
                          -৳{c.amount.toLocaleString('en-BD')}
                        </span>
                        <div className="text-[9px] font-bold uppercase text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded inline-block ml-1 border border-rose-200">
                          Deducted
                        </div>
                      </div>
                    </div>
                  ))}
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
