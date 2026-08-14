import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Transaction, TransferMethod } from '../types';
import { X, Clock, Lock, AlertCircle, Edit3, Trash2, Send, CheckCircle2, MessageCircle, Phone } from 'lucide-react';
import { amountToWords } from '../utils/numberToWords';

interface EditSendModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export const EditSendModal: React.FC<EditSendModalProps> = ({ transaction, onClose }) => {
  const { editPendingSendRequest, cancelPendingSendRequest } = useApp();

  const [mobileNumber, setMobileNumber] = useState(transaction.recipientMobile || '');
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [method, setMethod] = useState<TransferMethod | ''>(transaction.method || 'Bkash Personal');
  const [comment, setComment] = useState(transaction.comment || '');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Compute remaining time out of 10 minutes (600,000 ms)
  const TEN_MINS_MS = 10 * 60 * 1000;
  const createdMs = new Date(transaction.createdAt).getTime();

  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedMs = Math.max(0, nowMs - createdMs);
  const remainingMs = Math.max(0, TEN_MINS_MS - elapsedMs);
  const isExpired = remainingMs <= 0;

  const totalSecondsLeft = Math.floor(remainingMs / 1000);
  const minutesLeft = Math.floor(totalSecondsLeft / 60);
  const secondsLeft = totalSecondsLeft % 60;
  const formattedTimeLeft = `${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`;
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / TEN_MINS_MS) * 100));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      setErrorMsg('Time limit reached (10 mins). Contact Admin to edit or cancel this transaction.');
      return;
    }

    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(0, 11);
    if (cleanMobile.length !== 11) {
      setErrorMsg(`Target Mobile Number must be exactly 11 digits (Current: ${cleanMobile.length}/11).`);
      return;
    }

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg('Please enter a valid send amount.');
      return;
    }
    if (!method) {
      setErrorMsg('Please select a transfer method.');
      return;
    }

    setIsSubmitting(true);
    const res = editPendingSendRequest(transaction.id, {
      recipientMobile: cleanMobile,
      amount: numAmt,
      method: method as TransferMethod,
      comment: comment.trim()
    });
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleCancelRequest = () => {
    if (isExpired) {
      setErrorMsg('Time limit reached (10 mins). Contact Admin to edit or cancel this transaction.');
      return;
    }

    setIsSubmitting(true);
    const res = cancelPendingSendRequest(transaction.id);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleContactAdmin = () => {
    const message = encodeURIComponent(
      `Hello Admin, I need help editing/cancelling my pending transaction (ID: ${transaction.id}, Target: ${transaction.recipientMobile}, Amount: ৳${transaction.amount}).`
    );
    window.open(`https://api.whatsapp.com/send?phone=+8801700000000&text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 to-blue-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800/60 rounded-xl border border-blue-700/50">
              <Edit3 className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">Edit Pending Request</h3>
              <p className="text-xs text-blue-200 font-mono">ID: {transaction.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 10-Minute Timer Bar / Locked Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80">
          {!isExpired ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <div className="flex items-center gap-1.5 text-amber-700">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>10-Minute Edit Window Active</span>
                </div>
                <span className="font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold text-xs">
                  ⏱️ {formattedTimeLeft} left
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                You can edit or cancel this pending send request within 10 minutes of creation.
              </p>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-start gap-2.5">
                <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Time Limit Reached (10 Mins Passed)</h4>
                  <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                    This request is now locked. Please contact Admin if you need to edit or cancel this transaction.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleContactAdmin}
                className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Contact Admin on WhatsApp</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Recipient Mobile */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Target Mobile Number
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                mobileNumber.replace(/\D/g, '').length === 11
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {mobileNumber.replace(/\D/g, '').length}/11 Digits
              </span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              disabled={isExpired}
              value={mobileNumber}
              onChange={e => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="01XXXXXXXXX (11 digits)"
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-3 text-sm font-mono font-bold text-slate-900 outline-none transition-all disabled:opacity-60 disabled:bg-slate-100"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount (৳)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              disabled={isExpired}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none transition-all disabled:opacity-60 disabled:bg-slate-100"
            />

            {/* Dynamic Amount in Words */}
            {amountToWords(amount) && (
              <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100 px-1 py-0.5 rounded shrink-0">
                  In Words:
                </span>
                <span className="text-xs font-bold text-blue-950 leading-tight">
                  {amountToWords(amount)}
                </span>
              </div>
            )}
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transfer Method
            </label>
            <select
              disabled={isExpired}
              value={method}
              onChange={e => setMethod(e.target.value as TransferMethod)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none transition-all disabled:opacity-60 disabled:bg-slate-100"
            >
              <option value="Bkash Personal">Bkash Personal</option>
              <option value="Nagad Personal">Nagad Personal</option>
              <option value="Rocket Personal">Rocket Personal</option>
              <option value="Upay Personal">Upay Personal</option>
              <option value="Bank Receipt Deposit">Bank Receipt Deposit</option>
            </select>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Comment / Note
            </label>
            <input
              type="text"
              disabled={isExpired}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Optional comment"
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-3 text-sm text-slate-900 outline-none transition-all disabled:opacity-60 disabled:bg-slate-100"
            />
          </div>

          {/* Actions */}
          {!showConfirmCancel ? (
            <div className="flex gap-2 pt-2">
              {!isExpired && (
                <button
                  type="button"
                  onClick={() => setShowConfirmCancel(true)}
                  className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Cancel Request</span>
                </button>
              )}

              {!isExpired ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <Send className="w-4 h-4 text-blue-300" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContactAdmin}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <Phone className="w-4 h-4" />
                  <span>Contact Admin to Request Changes</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-rose-900">
                Are you sure you want to cancel this pending send request?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  disabled={isSubmitting}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  {isSubmitting ? 'Cancelling...' : 'Yes, Cancel Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmCancel(false)}
                  className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
