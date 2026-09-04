import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { toJpeg } from 'html-to-image';
import { Transaction } from '../types';
import { useApp } from '../context/AppContext';
import { amountToWords } from '../utils/numberToWords';
import { formatBDDateTime } from '../utils/timeHelper';
import {
  X,
  Printer,
  Mail,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Lock,
  ShieldCheck,
  Share2,
  Copy,
  Check,
  FileText,
  MessageCircle,
  MapPin,
  Barcode,
  ImageDown,
  Loader2
} from 'lucide-react';
import { ProofPreviewModal } from './ProofPreviewModal';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  const { users, currentUser, startResendTransaction } = useApp();
  const [copiedText, setCopiedText] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  // Resolve target user name & address for receipt header
  const userObj = users.find(u => u.id === transaction?.userId) || (currentUser?.id === transaction?.userId ? currentUser : null);
  const receiptUserName = transaction?.userName || userObj?.name || (currentUser?.id === transaction?.userId ? currentUser?.name : '') || 'Customer';
  const receiptUserAddress = userObj?.address || (currentUser?.id === transaction?.userId ? currentUser?.address : '') || 'Dhaka, Bangladesh';

  useEffect(() => {
    if (transaction?.id && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, transaction.id, {
          format: 'CODE128',
          width: 1.7,
          height: 48,
          displayValue: true,
          font: 'monospace',
          fontSize: 12,
          textMargin: 3,
          margin: 6,
          lineColor: '#0f172a',
          background: '#ffffff'
        });
      } catch (err) {
        console.error('Failed to generate Barcode:', err);
      }
    }
  }, [transaction?.id]);

  if (!transaction) return null;

  const receiptDate = formatBDDateTime(transaction.approvedAt || transaction.createdAt, true);

  const formattedMessage = `
📄 *OFFICIAL MONEY RECEIPT - ${receiptUserName.toUpperCase()}*
───────────────────────────────
*User Name:* ${receiptUserName}
*Address:* ${receiptUserAddress}
*Txn ID:* ${transaction.id}
*Date:* ${receiptDate}
*Status:* ${transaction.status.toUpperCase()}
${transaction.rejectionReason ? `*Reject Cause / Reason:* ${transaction.rejectionReason}\n` : ''}*Transfer Type:* ${transaction.type.toUpperCase()}
*Method:* ${transaction.method}
${transaction.recipientMobile ? `*Target Number:* ${transaction.recipientMobile}\n` : ''}${
    transaction.adminPin ? `*Admin Security PIN:* ${transaction.adminPin}\n` : ''
}*Amount:* ৳${transaction.amount.toLocaleString('en-BD')} (${transaction.amountInWords || amountToWords(transaction.amount)})
${transaction.comment ? `*Comment / Note:* ${transaction.comment}\n` : ''}───────────────────────────────
Thank you - Masud Telecom
  `.trim();

  const handleWhatsAppShare = async () => {
    const receiptElem = document.getElementById('printable-receipt');
    setSharingWhatsApp(true);

    try {
      if (receiptElem) {
        const dataUrl = await toJpeg(receiptElem, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          pixelRatio: 2.5,
          filter: (node) => !(node as HTMLElement)?.classList?.contains('no-print')
        });

        // Convert base64 to Blob & File
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `Receipt-${transaction.id}.jpg`, { type: 'image/jpeg' });

        // Check if Web Share API with files is supported (works natively on Mobile Android/iOS to WhatsApp)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Receipt #${transaction.id} - Masud Telecom`,
            text: `Money Transfer Receipt #${transaction.id}\nMasud Telecom\nAmount: ৳${transaction.amount.toLocaleString('en-BD')}`
          });
          setSharingWhatsApp(false);
          return;
        }

        // Desktop / unsupported fallback: Auto-download the photo & open WhatsApp with details
        const fileName = `Receipt-${transaction.id}.jpg`;
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      const encodedText = encodeURIComponent(formattedMessage);
      const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error sharing receipt photo to WhatsApp:', err);
      const encodedText = encodeURIComponent(formattedMessage);
      const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setSharingWhatsApp(false);
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Money Transfer Receipt #${transaction.id} - Masud Telecom`);
    const body = encodeURIComponent(formattedMessage);
    const recipient = encodeURIComponent(transaction.userEmail || '');
    
    // Try Gmail web draft first as it works in any browser, fallback to mailto
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;
    const mailtoUrl = `mailto:${transaction.userEmail || ''}?subject=${subject}&body=${body}`;

    const newWin = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      window.location.href = mailtoUrl;
    }
  };

  const handleCopyReceipt = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(formattedMessage);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = formattedMessage;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleSavePhoto = async () => {
    const receiptElem = document.getElementById('printable-receipt');
    if (!receiptElem) return;

    try {
      setSavingPhoto(true);
      const dataUrl = await toJpeg(receiptElem, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
        filter: (node) => {
          if ((node as HTMLElement)?.classList?.contains('no-print')) {
            return false;
          }
          return true;
        }
      });

      const fileName = `Receipt-${transaction.id}.jpg`;
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setPhotoSaved(true);
      setTimeout(() => setPhotoSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save receipt image:', err);
    } finally {
      setSavingPhoto(false);
    }
  };

  const handlePrint = () => {
    const receiptElem = document.getElementById('printable-receipt');
    if (!receiptElem) {
      window.print();
      return;
    }

    try {
      const printWindow = window.open('', '_blank', 'width=600,height=700');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt_${transaction.id}</title>
              <meta charset="utf-8" />
              <style>
                body {
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  margin: 0;
                  padding: 24px;
                  background: #fff;
                  color: #0f172a;
                }
                .receipt-container {
                  max-width: 420px;
                  margin: 0 auto;
                  border: 2px solid #cbd5e1;
                  border-radius: 16px;
                  padding: 20px;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .no-print { display: none !important; }
                @media print {
                  body { padding: 0; }
                  .receipt-container { border: 2px solid #000; box-shadow: none; border-radius: 0; }
                }
              </style>
              <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body>
              <div class="receipt-container">
                ${receiptElem.innerHTML}
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      {/* Styles for print media to print ONLY the receipt container */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-md w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header Actions */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between no-print border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-sm">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Digital Money Receipt</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINTABLE RECEIPT PAPER BODY */}
        <div className="p-5 overflow-y-auto space-y-4 bg-slate-50 flex-1">
          <div
            id="printable-receipt"
            className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4 text-slate-900 relative font-sans"
          >
            {/* Header / Brand */}
            <div className="text-center border-b pb-3 border-dashed border-slate-300">
              <div className="inline-flex items-center gap-1.5 bg-blue-900 text-white px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase mb-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                {receiptUserName}
              </div>
              <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 my-0.5">
                <MapPin className="w-3 h-3 text-blue-900 shrink-0" />
                <span>{receiptUserAddress}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                Official Digital Money Receipt
              </p>
              <p className="text-[10px] text-slate-400">Masud Telecom &bull; Helpline: +880 1700-000000</p>
            </div>

            {/* Txn ID & Date Banner */}
            <div className="bg-slate-100 p-2 rounded-xl flex items-center justify-between text-[8px] font-mono">
              <div>
                <span className="text-[8px] text-slate-500 block uppercase font-sans font-bold">Receipt No / Txn ID</span>
                <strong className="text-slate-900 font-extrabold text-[8px]">{transaction.id}</strong>
              </div>
              <div className="text-right">
                <span className="text-[8px] text-slate-500 block uppercase font-sans font-bold">Date & Time</span>
                <strong className="text-slate-700 font-bold text-[8px]">{receiptDate}</strong>
              </div>
            </div>

            {/* Main Table Details */}
            <div className="space-y-1.5 text-[8px] divide-y divide-slate-100">
              <div className="flex justify-between py-1 items-center">
                <span className="text-slate-500 font-medium text-[8px]">Transfer Type:</span>
                <span className="font-bold uppercase text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded text-[8px]">
                  {transaction.type}
                </span>
              </div>

              <div className="flex justify-between py-1 items-center">
                <span className="text-slate-500 font-medium text-[8px]">Method / Gateway:</span>
                <strong className="text-slate-900 font-bold text-[8px]">{transaction.method}</strong>
              </div>

              {transaction.recipientMobile && (
                <div className="flex justify-between items-center py-1.5 bg-amber-50/70 -mx-2 px-2 rounded-lg border border-amber-200/80">
                  <span className="text-amber-900 font-bold text-[10px]">Target Number:</span>
                  <span className="font-mono font-black text-[10px] text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                    {transaction.recipientMobile}
                  </span>
                </div>
              )}

              {transaction.adminPin && (
                <div className="flex justify-between items-center py-1 bg-emerald-50/70 -mx-2 px-2 rounded-lg border border-emerald-200/80">
                  <span className="text-emerald-900 font-bold text-[8px] flex items-center gap-1">
                    🔑 Admin Security PIN:
                  </span>
                  <span className="font-mono font-bold text-[8px] text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {transaction.adminPin}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5 text-[10px] border-t-2 border-slate-800 font-bold items-center">
                <span className="text-slate-900 font-bold text-[10px]">Total Amount:</span>
                <span className="font-mono text-[10px] text-blue-950 font-bold">৳{transaction.amount.toLocaleString('en-BD')}</span>
              </div>

              <div className="flex justify-between py-1 text-[8px] items-center bg-slate-50/80 -mx-1 px-1 rounded">
                <span className="text-slate-500 font-bold text-[8px]">In Words:</span>
                <span className="font-bold text-slate-800 text-[8px] text-right">
                  {transaction.amountInWords || amountToWords(transaction.amount)}
                </span>
              </div>

              <div className="flex justify-between py-1 text-[8px] items-center">
                <span className="text-slate-500 font-medium text-[8px]">Status:</span>
                <span
                  className={`font-bold capitalize flex items-center gap-1 text-[8px] ${
                    transaction.status === 'approved'
                      ? 'text-emerald-700'
                      : transaction.status === 'pending'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {transaction.status === 'rejected' ? (
                    <XCircle className="w-3 h-3 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  {transaction.status}
                </span>
              </div>

              {/* Reject Cause / Reason Field on Receipt */}
              {(transaction.status === 'rejected' || transaction.rejectionReason) && (
                <div className="pt-1.5 pb-1">
                  <div className="bg-rose-50 rounded-xl p-2.5 border-2 border-rose-300 text-left space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-[9px] uppercase tracking-wider">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Reject Cause / Reason:</span>
                    </div>
                    <p className="text-[10px] font-bold text-rose-950 break-words whitespace-pre-wrap leading-relaxed bg-white p-2 rounded-lg border border-rose-200 shadow-2xs">
                      {transaction.rejectionReason || 'Declined by Admin'}
                    </p>

                    {/* Button under the Reject Field: Resend & Correct Number (or Locked state) */}
                    {transaction.type === 'send' && (
                      <div className="pt-1 no-print">
                        {transaction.isResent ? (
                          <div className="w-full bg-slate-100 border border-slate-300 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="text-[10px] text-slate-800 font-extrabold truncate">
                                Receipt Locked — Resent {transaction.resentTxnId ? `(${transaction.resentTxnId})` : ''}
                              </span>
                            </div>
                            <span className="bg-slate-200 text-slate-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                              Locked (1x Used)
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              startResendTransaction(transaction);
                              onClose();
                            }}
                            className="w-full bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-95 text-white py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all border border-rose-400"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-white shrink-0" />
                            <span>Resend & Correct Number</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* User Note / Comment Box */}
              {transaction.comment && (
                <div className="pt-1.5 pb-1">
                  <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-left">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      Comment / Note:
                    </span>
                    <p className="text-[8px] font-semibold text-slate-800 break-words whitespace-pre-wrap">
                      {transaction.comment}
                    </p>
                  </div>
                </div>
              )}

              {/* Proof Attachment Badge & View Button */}
              {transaction.attachmentUrl && (
                <div className="pt-1 pb-1 no-print">
                  <div className="bg-blue-50/70 rounded-lg p-2 border border-blue-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span className="text-[9px] font-bold text-slate-800 truncate">
                        {transaction.attachmentName || 'Proof Document'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProofModal(true)}
                      className="text-[9px] font-extrabold text-blue-900 bg-white hover:bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-md cursor-pointer transition-colors shadow-2xs shrink-0"
                    >
                      View Proof
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Thank you note */}
            <div className="pt-2 text-center">
              <span className="text-xs font-bold text-slate-700 font-sans tracking-wide block">
                Thank you
              </span>
            </div>

            {/* Centered Barcode generated from Receipt No / Txn ID */}
            <div className="pt-1 flex flex-col items-center justify-center">
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs inline-flex flex-col items-center justify-center max-w-full">
                <svg ref={barcodeRef} className="max-w-full h-auto" />
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="pt-1 text-center space-y-1">
              <p className="text-[10px] text-slate-400 font-medium italic">
                Computer-generated official money receipt &bull; Masud Telecom
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS - Single line, 8px font size */}
        <div className="bg-white px-2 py-2 border-t border-slate-200 no-print">
          {/* Quick Resend & Correct Action in Footer */}
          {transaction.status === 'rejected' && transaction.type === 'send' && (
            <div className="mb-2">
              {transaction.isResent ? (
                <div className="w-full bg-slate-100 border border-slate-300 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-extrabold text-slate-800 truncate">
                      Receipt Locked (Already Resent {transaction.resentTxnId ? `as ${transaction.resentTxnId}` : ''})
                    </span>
                  </div>
                  <span className="bg-slate-200 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded uppercase shrink-0">
                    Locked
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    startResendTransaction(transaction);
                    onClose();
                  }}
                  className="w-full bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer border border-rose-400"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                  <span>Resend & Correct Number</span>
                </button>
              )}
            </div>
          )}

          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center mb-1.5">
            Send Receipt via Photo / PDF / Messaging:
          </p>

          <div className="grid grid-cols-5 gap-1">
            {/* Save Photo (JPG) */}
            <button
              type="button"
              onClick={handleSavePhoto}
              disabled={savingPhoto || sharingWhatsApp}
              title="Save JPG photo to mobile gallery"
              className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white py-1.5 px-0.5 rounded-lg text-[8px] font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {savingPhoto ? (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              ) : photoSaved ? (
                <Check className="w-3 h-3 text-white shrink-0" />
              ) : (
                <ImageDown className="w-3 h-3 shrink-0" />
              )}
              <span className="whitespace-nowrap leading-none">{photoSaved ? 'Saved!' : 'Save Photo'}</span>
            </button>

            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              disabled={sharingWhatsApp || savingPhoto}
              title="Share receipt as photo on WhatsApp"
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-1.5 px-0.5 rounded-lg text-[8px] font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {sharingWhatsApp ? (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              ) : (
                <MessageCircle className="w-3 h-3 shrink-0" />
              )}
              <span className="whitespace-nowrap leading-none">WhatsApp</span>
            </button>

            {/* Email */}
            <button
              type="button"
              onClick={handleEmailShare}
              title="Send via Email"
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-1.5 px-0.5 rounded-lg text-[8px] font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 transition-all shadow-xs cursor-pointer"
            >
              <Mail className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap leading-none">Email</span>
            </button>

            {/* Print / Save PDF */}
            <button
              type="button"
              onClick={handlePrint}
              title="Print or Save as PDF"
              className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white py-1.5 px-0.5 rounded-lg text-[8px] font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="whitespace-nowrap leading-none">Print / PDF</span>
            </button>

            {/* Copy Text */}
            <button
              type="button"
              onClick={handleCopyReceipt}
              title="Copy receipt text summary"
              className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border border-slate-300 py-1.5 px-0.5 rounded-lg text-[8px] font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 transition-all cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="whitespace-nowrap text-emerald-700 leading-none">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-600 shrink-0" />
                  <span className="whitespace-nowrap leading-none">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Proof Document Preview Modal */}
      {showProofModal && transaction.attachmentUrl && (
        <ProofPreviewModal
          data={{
            url: transaction.attachmentUrl,
            name: transaction.attachmentName,
            userName: receiptUserName,
            amount: transaction.amount,
            method: transaction.method,
            date: transaction.createdAt
          }}
          onClose={() => setShowProofModal(false)}
        />
      )}
    </div>
  );
};
