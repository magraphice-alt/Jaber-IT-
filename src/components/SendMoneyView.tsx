import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Bell, ShieldCheck, Phone, CheckCircle, Send as SendIcon } from 'lucide-react';
import { TransferMethod } from '../types';

interface SendMoneyViewProps {
  onBack: () => void;
  onOpenNotifications: () => void;
}

export const SendMoneyView: React.FC<SendMoneyViewProps> = ({ onBack, onOpenNotifications }) => {
  const { createSendRequest, notifications, currentUser } = useApp();

  const [mobileNumber, setMobileNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<TransferMethod | ''>('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const unreadCount = notifications.filter(
    n => !n.read && (n.userId === currentUser?.id || n.userId === 'all')
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const numAmt = parseFloat(amount);
    if (!mobileNumber.trim()) {
      setErrorMsg('Please enter a valid recipient mobile number.');
      return;
    }
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg('Please enter a valid transfer amount.');
      return;
    }
    if (!method) {
      setErrorMsg('Please select a transfer method.');
      return;
    }

    setIsSubmitting(true);

    const ok = await createSendRequest(
      mobileNumber.trim(),
      numAmt,
      method as TransferMethod,
      comment.trim()
    );

    setIsSubmitting(false);

    if (ok) {
      setSuccessMsg(`Send request of ৳${numAmt.toLocaleString('en-BD')} to ${mobileNumber} submitted to Admin for approval.`);
      setMobileNumber('');
      setAmount('');
      setMethod('');
      setComment('');
    } else {
      setErrorMsg('Failed to process request. Please check balance or try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 max-w-md mx-auto shadow-xl">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-blue-950">Send Money</h1>
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

      {/* Main Content Form Card */}
      <div className="p-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          {/* Header Banner */}
          <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
            <div className="w-11 h-11 rounded-full bg-blue-900 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Send Money to Admin
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Secure transfer to central accounts
              </p>
            </div>
          </div>

          {/* Success Alert */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Request Submitted!</strong>
                <p className="mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* MOBILE NUMBER */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  placeholder="+880 1XX XXX XXXX"
                  required
                  className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* AMOUNT (BDT) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Amount (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-3 pl-9 pr-4 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* WAY */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Way
              </label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as TransferMethod)}
                required
                className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-3 px-3.5 text-sm text-slate-900 outline-none transition-all cursor-pointer"
              >
                <option value="" disabled>
                  Select transfer method
                </option>
                <option value="bKash">bKash Personal / Agent</option>
                <option value="Nagad">Nagad Transfer</option>
                <option value="Rocket">Rocket Mobile Banking</option>
                <option value="Bank">Bank Wire Deposit</option>
                <option value="Cash">Cash Handover</option>
              </select>
            </div>

            {/* COMMENT */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Comment
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a note (optional)"
                className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all resize-none"
              />
            </div>

            {/* SEND BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <SendIcon className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
