import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Users,
  Send,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import {
  getWhatsAppGroupUrl,
  getWhatsAppNumberUrl,
  getWhatsAppShareUrl,
  copyToClipboardSafe
} from '../utils/whatsappHelper';

export interface WhatsAppNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subTitle?: string;
  formattedMessage: string;
  whatsAppGroupLink?: string;
  whatsAppNumber?: string;
  autoCopied?: boolean;
}

export const WhatsAppNoticeModal: React.FC<WhatsAppNoticeModalProps> = ({
  isOpen,
  onClose,
  title,
  subTitle = 'Operation details formatted for WhatsApp',
  formattedMessage,
  whatsAppGroupLink,
  whatsAppNumber,
  autoCopied = true
}) => {
  const [copied, setCopied] = useState(autoCopied);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await copyToClipboardSafe(formattedMessage);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const groupUrl = whatsAppGroupLink ? getWhatsAppGroupUrl(whatsAppGroupLink) : '';
  const adminChatUrl = whatsAppNumber ? getWhatsAppNumberUrl(whatsAppNumber, formattedMessage) : '';
  const generalShareUrl = getWhatsAppShareUrl(formattedMessage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs shadow-inner">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">{title}</h3>
              <p className="text-xs text-emerald-100 mt-0.5">{subTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-slate-800">
          {/* Automatic Copy Alert Banner */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {copied ? 'Notice copied to clipboard!' : 'Ready to share on WhatsApp'}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Formatted Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                WhatsApp Notice Preview:
              </span>
            </div>
            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-inner max-h-48 overflow-y-auto border border-slate-800 selection:bg-emerald-600">
              {formattedMessage}
            </div>
          </div>

          {/* WhatsApp Destination Buttons */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Send or Post To:
            </span>

            {/* Primary Action: Send to WhatsApp Group Button */}
            {groupUrl ? (
              <a
                href={groupUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCopy}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-between shadow-md active:scale-[0.98] transition-all group cursor-pointer border border-emerald-500"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight font-extrabold text-sm">Send to WhatsApp Group</div>
                    <div className="text-[10px] text-emerald-100 font-medium">
                      Admin Profile WhatsApp Group &bull; Tap to Send
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-lg text-xs">
                  <span>Open</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            ) : (
              <a
                href={adminChatUrl || generalShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCopy}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-between shadow-md active:scale-[0.98] transition-all group cursor-pointer border border-emerald-500"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight font-extrabold text-sm">Send to WhatsApp Group / Admin</div>
                    <div className="text-[10px] text-emerald-100 font-medium">
                      Tap to open WhatsApp &bull; Ready to Post
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-lg text-xs">
                  <span>Open</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            )}

            {/* Additional Options */}
            {adminChatUrl && groupUrl && (
              <a
                href={adminChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCopy}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-between shadow-xs active:scale-98 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span>Send Directly to Admin WhatsApp Chat ({whatsAppNumber})</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-teal-200" />
              </a>
            )}

            {/* 3. General Share Button */}
            <a
              href={generalShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-between active:scale-98 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Share to Any WhatsApp Contact / Other Group</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-500 italic">
            Compatible with Android, iPhone, iPad & Web
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
