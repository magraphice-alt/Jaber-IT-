import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Bell,
  Upload,
  CheckCircle,
  FileText,
  X,
  Loader2,
  MessageCircle,
  Users,
  ExternalLink,
  Copy,
  Check,
  Send as SendIcon
} from 'lucide-react';
import { TransferMethod } from '../types';
import { amountToWords } from '../utils/numberToWords';
import {
  formatDepositMessage,
  getWhatsAppGroupUrl,
  getWhatsAppNumberUrl,
  triggerWhatsAppAutoSend,
  copyToClipboardSafe
} from '../utils/whatsappHelper';
import { WhatsAppNoticeModal } from './WhatsAppNoticeModal';

interface DepositRequestViewProps {
  onBack: () => void;
  onOpenNotifications: () => void;
}

const compressImage = (dataUrl: string, maxWidth = 500, quality = 0.5): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      if (dataUrl && dataUrl.length > 250000) {
        resolve(dataUrl.substring(0, 250000));
      } else {
        resolve(dataUrl || '');
      }
      return;
    }
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const DepositRequestView: React.FC<DepositRequestViewProps> = ({ onBack, onOpenNotifications }) => {
  const { createDepositRequest, notifications, currentUser, users, settings } = useApp();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<TransferMethod | ''>('');
  const [comment, setComment] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
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

  const handleCopyNoticeInline = async () => {
    if (!lastWhatsAppNotice) return;
    const ok = await copyToClipboardSafe(lastWhatsAppNotice);
    if (ok) {
      setCopiedInline(true);
      setTimeout(() => setCopiedInline(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('File size must be under 10MB.');
        return;
      }
      setErrorMsg(null);
      setFileName(file.name);
      setIsCompressing(true);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawResult = reader.result as string;
        try {
          const compressed = await compressImage(rawResult);
          setFilePreview(compressed);
        } catch {
          setFilePreview(rawResult.length > 250000 ? rawResult.substring(0, 250000) : rawResult);
        } finally {
          setIsCompressing(false);
        }
      };
      reader.onerror = () => {
        setIsCompressing(false);
        setErrorMsg('Failed to read file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg('Please enter a valid deposit amount.');
      return;
    }
    if (!method) {
      setErrorMsg('Please select a transfer method.');
      return;
    }

    setIsSubmitting(true);

    try {
      const ok = await createDepositRequest(
        numAmt,
        method as TransferMethod,
        comment.trim(),
        filePreview || undefined,
        fileName || undefined
      );

      if (ok) {
        // Build rich WhatsApp deposit notification message
        const waMsg = formatDepositMessage(
          {
            amount: numAmt,
            method: method as TransferMethod,
            comment: comment.trim(),
            attachmentName: fileName || undefined,
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

        setSuccessMsg(`Deposit request of ৳${numAmt.toLocaleString('en-BD')} submitted successfully.`);
        setShowWhatsAppModal(true);

        setAmount('');
        setMethod('');
        setComment('');
        setFilePreview(null);
        setFileName(null);
      } else {
        setErrorMsg('Failed to process deposit request. Please try again.');
      }
    } catch (err) {
      console.error('Deposit submit error:', err);
      setErrorMsg('An unexpected error occurred. Please check your network and try again.');
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
          <h1 className="text-xl font-bold text-blue-950">Deposit Request</h1>
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
                          Post Deposit Notice to WhatsApp Group
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
                          Notify Admin on WhatsApp
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
            {/* Amount (BDT) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl py-3 pl-9 pr-4 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all font-mono"
                />
              </div>

              {/* Dynamic Amount in Words */}
              {amountToWords(amount) && (
                <div className="mt-2 p-2.5 bg-blue-50/90 border border-blue-200/80 rounded-xl flex items-start gap-2 shadow-2xs">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100/90 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                    In Words:
                  </span>
                  <span className="text-xs font-bold text-blue-950 leading-snug">
                    {amountToWords(amount)}
                  </span>
                </div>
              )}
            </div>

            {/* Transfer Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Transfer Method
              </label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as TransferMethod)}
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl py-3 px-3.5 text-sm text-slate-900 outline-none transition-all cursor-pointer"
              >
                <option value="" disabled>
                  Select a method
                </option>
                <option value="bKash">bKash Cash In / Merchant</option>
                <option value="Nagad">Nagad Deposit</option>
                <option value="Rocket">Rocket Deposit</option>
                <option value="Bank">Bank Receipt Deposit</option>
                <option value="Cash">Direct Cash Deposit</option>
              </select>
            </div>

            {/* Upload Documents (Receipt/Proof) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Upload Documents (Receipt/Proof)
              </label>
              {isCompressing ? (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                  <span>Processing attachment...</span>
                </div>
              ) : filePreview ? (
                <div className="relative border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center gap-3">
                  {filePreview.startsWith('data:image') ? (
                    <img src={filePreview} alt="Receipt Preview" className="w-14 h-14 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{fileName}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold">Ready to upload</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFilePreview(null); setFileName(null); }}
                    className="p-1 rounded-full hover:bg-slate-200 text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-800 rounded-2xl p-6 bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer transition-all">
                  <Upload className="w-8 h-8 text-blue-900 mb-2" />
                  <span className="text-sm font-bold text-blue-950">Attach Receipt / Document</span>
                  <span className="text-xs text-slate-600 mt-1">JPG, PNG or PDF</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Comment (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Comment / Reference (Optional)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add Transaction ID or deposit details..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all resize-none"
              />
            </div>

            {/* Submit Request Button */}
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="w-full mt-3 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 cursor-pointer text-sm"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Submit Request &rarr;</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* WhatsApp Notice Modal */}
      <WhatsAppNoticeModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title="Deposit Request Notice"
        subTitle="Notice formatted and copied for WhatsApp"
        formattedMessage={lastWhatsAppNotice}
        whatsAppGroupLink={whatsAppGroupLink}
        whatsAppNumber={whatsAppNumber}
        autoCopied={true}
      />
    </div>
  );
};
