import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Bell,
  ShieldCheck,
  Phone,
  CheckCircle,
  Send as SendIcon,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Users,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { TransferMethod } from '../types';
import { amountToWords } from '../utils/numberToWords';
import {
  formatSendMoneyMessage,
  getWhatsAppGroupUrl,
  getWhatsAppNumberUrl,
  triggerWhatsAppAutoSend,
  copyToClipboardSafe
} from '../utils/whatsappHelper';
import { WhatsAppNoticeModal } from './WhatsAppNoticeModal';

interface SendMoneyViewProps {
  onBack: () => void;
  onOpenNotifications: () => void;
}

export const SendMoneyView: React.FC<SendMoneyViewProps> = ({ onBack, onOpenNotifications }) => {
  const { createSendRequest, notifications, currentUser, users, settings } = useApp();

  const [mobileNumber, setMobileNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<TransferMethod | ''>('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // WhatsApp Auto-Message & Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [lastWhatsAppNotice, setLastWhatsAppNotice] = useState<string>('');
  const [copiedInline, setCopiedInline] = useState(false);

  // Find Admin profile WhatsApp config
  const adminUser = users.find(u => u.role === 'admin');
  const whatsAppGroupLink = adminUser?.whatsAppGroupLink || settings.whatsAppGroupLink || '';
  const whatsAppNumber = adminUser?.whatsAppNumber || settings.whatsAppNumber || '+880 1793-567814';

  const unreadCount = notifications.filter(
    n => !n.read && (n.userId === currentUser?.id || n.userId === 'all')
  ).length;

  const inWords = amountToWords(amount);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits, maximum 11 digits
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setMobileNumber(digitsOnly);
    if (errorMsg) setErrorMsg(null);
  };

  const handleCopyNoticeInline = async () => {
    if (!lastWhatsAppNotice) return;
    const ok = await copyToClipboardSafe(lastWhatsAppNotice);
    if (ok) {
      setCopiedInline(true);
      setTimeout(() => setCopiedInline(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const cleanMobile = mobileNumber.trim();
    if (cleanMobile.length !== 11) {
      setErrorMsg(`Recipient Mobile Number must be exactly 11 digits (Current: ${cleanMobile.length}/11). Please enter a valid 11-digit number (e.g. 017XXXXXXXX).`);
      return;
    }

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg('Please enter a valid transfer amount.');
      return;
    }
    if (!method) {
      setErrorMsg('Please select a transfer method.');
      return;
    }

    setIsSubmitting(true);

    try {
      const ok = await createSendRequest(
        cleanMobile,
        numAmt,
        method as TransferMethod,
        comment.trim()
      );

      if (ok) {
        // Build rich WhatsApp notification message
        const waMsg = formatSendMoneyMessage(
          {
            amount: numAmt,
            method: method as TransferMethod,
            recipientMobile: cleanMobile,
            comment: comment.trim(),
            status: 'pending',
            createdAt: new Date().toISOString()
          },
          currentUser?.name || 'Customer',
          currentUser?.mobile
        );

        setLastWhatsAppNotice(waMsg);

        // Auto copy notice to clipboard for WhatsApp without opening another window
        await triggerWhatsAppAutoSend({
          message: waMsg,
          groupLink: whatsAppGroupLink,
          phoneNumber: whatsAppNumber,
          autoOpen: false
        });

        setSuccessMsg(`Send request of ৳${numAmt.toLocaleString('en-BD')} (${inWords}) to ${cleanMobile} submitted successfully.`);
        setShowWhatsAppModal(true);

        setMobileNumber('');
        setAmount('');
        setMethod('');
        setComment('');
      } else {
        setErrorMsg('Failed to process request. Please check balance or try again.');
      }
    } catch (err) {
      console.error('Send request error:', err);
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
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

          {/* Success Alert & WhatsApp Direct Actions */}
          {successMsg && (
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="font-bold">Request Submitted!</strong>
                  <p className="mt-0.5">{successMsg}</p>
                </div>
              </div>

              {/* Instant WhatsApp Quick Actions Card */}
              {lastWhatsAppNotice && (
                <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp Group & Admin Notice</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyNoticeInline}
                      className="text-[11px] font-bold text-emerald-700 bg-white border border-emerald-300 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
                    >
                      {copiedInline ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedInline ? 'Copied!' : 'Copy Notice'}</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {whatsAppGroupLink ? (
                      <a
                        href={getWhatsAppGroupUrl(whatsAppGroupLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-between shadow-xs transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Post Notice to WhatsApp Group
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-100" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowWhatsAppModal(true)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-between shadow-xs transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5" />
                          View WhatsApp Notice
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-100" />
                      </button>
                    )}

                    {whatsAppNumber && (
                      <a
                        href={getWhatsAppNumberUrl(whatsAppNumber, lastWhatsAppNotice)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-between shadow-xs transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <SendIcon className="w-3.5 h-3.5" />
                          Chat with Admin on WhatsApp
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-teal-100" />
                      </a>
                    )}
                  </div>
                </div>
              )}
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Mobile Number
                </label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                  mobileNumber.length === 11
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : mobileNumber.length > 0
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {mobileNumber.length === 11 ? '✓ 11 Digits Valid' : `${mobileNumber.length} / 11 Digits`}
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{11}"
                  maxLength={11}
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  placeholder="01XXXXXXXXX (11 digits)"
                  required
                  className={`w-full bg-white border rounded-xl py-3 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all font-mono font-bold tracking-wider ${
                    mobileNumber.length === 11
                      ? 'border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
                      : mobileNumber.length > 0
                      ? 'border-amber-400 focus:border-blue-900'
                      : 'border-slate-300 focus:border-blue-900'
                  }`}
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {mobileNumber.length === 11 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : mobileNumber.length > 0 ? (
                    <span className="text-[10px] font-bold text-amber-600">{11 - mobileNumber.length} left</span>
                  ) : null}
                </div>
              </div>
              <p className="text-[11px] mt-1 text-slate-500 font-medium">
                {mobileNumber.length === 11 ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Exact 11-digit mobile number entered
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Must be exactly 11 digits (e.g. 017XXXXXXXX)
                  </span>
                )}
              </p>
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
                  inputMode="decimal"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-3 pl-9 pr-4 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all font-mono"
                />
              </div>

              {/* Dynamic Amount in Words Display */}
              {inWords && (
                <div className="mt-2 p-2.5 bg-blue-50/90 border border-blue-200/80 rounded-xl flex items-start gap-2 shadow-2xs">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100/90 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                    In Words:
                  </span>
                  <span className="text-xs font-bold text-blue-950 leading-snug">
                    {inWords}
                  </span>
                </div>
              )}
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

      {/* WhatsApp Notice Modal */}
      <WhatsAppNoticeModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title="Send Money Request Notice"
        subTitle="Notice formatted and copied for WhatsApp"
        formattedMessage={lastWhatsAppNotice}
        whatsAppGroupLink={whatsAppGroupLink}
        whatsAppNumber={whatsAppNumber}
        autoCopied={true}
      />
    </div>
  );
};
