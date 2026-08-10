import React, { useState } from 'react';
import { Transaction } from '../types';
import {
  X,
  Printer,
  Mail,
  CheckCircle2,
  ShieldCheck,
  Share2,
  Copy,
  Check,
  FileText,
  MessageCircle
} from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  const [copiedText, setCopiedText] = useState(false);

  if (!transaction) return null;

  const isApproved = transaction.status === 'approved';
  const receiptDate = new Date(transaction.approvedAt || transaction.createdAt).toLocaleString('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const formattedMessage = `
📄 *MASUD TELECOM - OFFICIAL MONEY RECEIPT*
───────────────────────────────
*Txn ID:* ${transaction.id}
*Date:* ${receiptDate}
*Status:* ${transaction.status.toUpperCase()}
*Transfer Type:* ${transaction.type.toUpperCase()}
*Method:* ${transaction.method}
${transaction.recipientMobile ? `*Target Number:* ${transaction.recipientMobile}\n` : ''}${
    transaction.adminPin ? `*Admin Security PIN:* ${transaction.adminPin}\n` : ''
}*Amount:* ৳${transaction.amount.toLocaleString('en-BD')}
───────────────────────────────
Thank you
  `.trim();

  const handleWhatsAppShare = () => {
    const encodedText = encodeURIComponent(formattedMessage);
    const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
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
              <div className="inline-flex items-center gap-1.5 bg-blue-900 text-white px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                MASUD TELECOM
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Official Digital Money Receipt
              </p>
              <p className="text-[10px] text-slate-400">Dhaka, Bangladesh &bull; Helpline: +880 1700-000000</p>
            </div>

            {/* Approved Stamp Badge */}
            {isApproved && (
              <div className="absolute top-4 right-4 rotate-[12deg] pointer-events-none opacity-85">
                <div className="border-2 border-emerald-600 text-emerald-700 px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-widest shadow-2xs">
                  APPROVED
                </div>
              </div>
            )}

            {/* Txn ID & Date Banner */}
            <div className="bg-slate-100 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Receipt No / Txn ID</span>
                <strong className="text-slate-900 font-extrabold">{transaction.id}</strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Date & Time</span>
                <strong className="text-slate-700 font-bold text-[11px]">{receiptDate}</strong>
              </div>
            </div>

            {/* Main Table Details */}
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Transfer Type:</span>
                <span className="font-bold uppercase text-blue-900 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                  {transaction.type}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Method / Gateway:</span>
                <strong className="text-slate-900 font-bold">{transaction.method}</strong>
              </div>

              {transaction.recipientMobile && (
                <div className="flex justify-between items-center py-2 bg-amber-50/70 -mx-2 px-2 rounded-lg border border-amber-200/80">
                  <span className="text-amber-900 font-bold text-xs">Target Number:</span>
                  <span className="font-mono font-black text-sm text-slate-900 bg-white px-2.5 py-0.5 rounded border border-amber-300">
                    {transaction.recipientMobile}
                  </span>
                </div>
              )}

              {transaction.adminPin && (
                <div className="flex justify-between items-center py-2 bg-emerald-50/70 -mx-2 px-2 rounded-lg border border-emerald-200/80">
                  <span className="text-emerald-900 font-bold text-xs flex items-center gap-1">
                    🔑 Admin Security PIN:
                  </span>
                  <span className="font-mono font-black text-sm text-emerald-900 bg-white px-2.5 py-0.5 rounded border border-emerald-300">
                    {transaction.adminPin}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 text-sm border-t-2 border-slate-800 font-extrabold">
                <span className="text-slate-900">Total Amount:</span>
                <span className="font-mono text-base text-blue-950">৳{transaction.amount.toLocaleString('en-BD')}</span>
              </div>

              <div className="flex justify-between py-1 text-xs">
                <span className="text-slate-500 font-medium">Status:</span>
                <span
                  className={`font-bold capitalize flex items-center gap-1 ${
                    transaction.status === 'approved'
                      ? 'text-emerald-700'
                      : transaction.status === 'pending'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {transaction.status}
                </span>
              </div>
            </div>

            {/* Thank you note */}
            <div className="pt-2 text-center">
              <span className="text-xs font-bold text-slate-700 font-sans tracking-wide">
                Thank you
              </span>
            </div>

            {/* Mock Barcode Footer */}
            <div className="pt-3 border-t border-dashed border-slate-300 text-center space-y-1">
              <div className="font-mono text-[10px] tracking-widest text-slate-400 font-bold">
                ||| ||||| ||| |||| |||||| ||| |||||
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">
                Computer-generated official money receipt. Verified by Masud Telecom Admin System.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS (WhatsApp, Email, Print PDF) */}
        <div className="bg-white p-4 border-t border-slate-200 space-y-2 no-print">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center">
            Send Receipt via PDF / Paper / Messaging:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            {/* Email Share Button */}
            <button
              type="button"
              onClick={handleEmailShare}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Print / PDF</span>
            </button>

            {/* Copy Text Summary */}
            <button
              type="button"
              onClick={handleCopyReceipt}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
