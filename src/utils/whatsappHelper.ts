import { Transaction, User, SystemSettings } from '../types';
import { formatBDDateTime } from './timeHelper';

/**
 * Clean phone number for WhatsApp API (e.g., converts '01793567814' or '+880 1793-567814' to '8801793567814')
 */
export function cleanWhatsAppNumber(phone?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    digits = digits.substring(1);
  }
  // If Bangladesh local number starting with 01 (11 digits)
  if (digits.startsWith('01') && digits.length === 11) {
    digits = '88' + digits;
  }
  return digits;
}

/**
 * Builds direct WhatsApp chat URL with pre-filled message
 */
export function getWhatsAppNumberUrl(phone: string, text?: string): string {
  const cleaned = cleanWhatsAppNumber(phone);
  if (!cleaned) return '';
  const textParam = text ? `&text=${encodeURIComponent(text)}` : '';
  return `https://api.whatsapp.com/send?phone=${cleaned}${textParam}`;
}

/**
 * Builds WhatsApp group URL from link or code
 */
export function getWhatsAppGroupUrl(groupLink?: string): string {
  if (!groupLink) return '';
  const trimmed = groupLink.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('chat.whatsapp.com/')) {
    return `https://${trimmed}`;
  }
  if (trimmed.startsWith('chat.whatsapp.com')) {
    return `https://${trimmed}`;
  }
  return `https://chat.whatsapp.com/${trimmed}`;
}

/**
 * Builds general WhatsApp share URL (pre-filled message ready to share to any chat/group)
 */
export function getWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Copies text safely to clipboard across all browser types (Desktop, iOS Safari, Android, Mobile Webviews)
 */
export async function copyToClipboardSafe(text: string): Promise<boolean> {
  if (!text) return false;
  let copied = false;

  // Method 1: DOM selection with iOS Safari & Android support
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = '100px';
    el.style.height = '100px';
    el.style.opacity = '0.01';
    el.style.zIndex = '99999';
    el.style.fontSize = '16px'; // Prevents iOS zooming on focus
    document.body.appendChild(el);

    if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      el.setSelectionRange(0, 999999);
    } else {
      el.focus();
      el.select();
    }

    copied = document.execCommand('copy');
    document.body.removeChild(el);
  } catch (err) {
    console.warn('execCommand copy fallback error:', err);
  }

  // Method 2: Modern navigator.clipboard API
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (err) {
    console.warn('navigator.clipboard error:', err);
  }

  return copied;
}

/**
 * Formats a clean, high-clarity WhatsApp receipt message for Send Money
 */
export function formatSendMoneyMessage(
  txn: Partial<Transaction>,
  userName: string,
  userMobile?: string
): string {
  const dateStr = formatBDDateTime(txn.createdAt || new Date());
  const amountStr = (txn.amount || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });

  return [
    `*⚡ MASUD TELECOM - SEND MONEY NOTICE ⚡*`,
    `────────────────────────`,
    `📌 *Type:* Send Money Request`,
    `🆔 *Txn ID:* ${txn.id || 'N/A'}`,
    `👤 *User:* ${userName} ${userMobile ? `(${userMobile})` : ''}`,
    `💰 *Amount:* ৳${amountStr}`,
    `💳 *Method:* ${txn.method || 'bKash'}`,
    `📱 *Target Number:* ${txn.recipientMobile || 'N/A'}`,
    txn.comment ? `📝 *Note:* ${txn.comment}` : '',
    `📊 *Status:* ${txn.status ? txn.status.toUpperCase() : 'PENDING'}`,
    `⏰ *Time (BST):* ${dateStr}`,
    `────────────────────────`,
    `_Masud Telecom Automated Central System_`
  ].filter(Boolean).join('\n');
}

/**
 * Formats a clean WhatsApp message for Deposit Request
 */
export function formatDepositMessage(
  txn: Partial<Transaction>,
  userName: string,
  userMobile?: string
): string {
  const dateStr = formatBDDateTime(txn.createdAt || new Date());
  const amountStr = (txn.amount || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });

  return [
    `*💰 MASUD TELECOM - DEPOSIT NOTICE 💰*`,
    `────────────────────────`,
    `📌 *Type:* Deposit Request`,
    `🆔 *Txn ID:* ${txn.id || 'N/A'}`,
    `👤 *User:* ${userName} ${userMobile ? `(${userMobile})` : ''}`,
    `💰 *Amount:* ৳${amountStr}`,
    `💳 *Method:* ${txn.method || 'bKash'}`,
    txn.comment ? `📝 *Note:* ${txn.comment}` : '',
    txn.attachmentName ? `📎 *Proof File:* ${txn.attachmentName}` : '',
    `📊 *Status:* ${txn.status ? txn.status.toUpperCase() : 'PENDING'}`,
    `⏰ *Time (BST):* ${dateStr}`,
    `────────────────────────`,
    `_Masud Telecom Automated Central System_`
  ].filter(Boolean).join('\n');
}

/**
 * Formats a clean WhatsApp message for Approval by Admin
 */
export function formatApprovalMessage(
  txn: Transaction,
  adminName: string = 'System Admin'
): string {
  const dateStr = formatBDDateTime(new Date());
  const amountStr = txn.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 });

  return [
    `*✅ MASUD TELECOM - TRANSACTION APPROVED ✅*`,
    `────────────────────────`,
    `🆔 *Txn ID:* ${txn.id}`,
    `📌 *Type:* ${txn.type === 'deposit' ? 'DEPOSIT' : 'SEND MONEY'} APPROVED`,
    `👤 *User:* ${txn.userName}`,
    `💰 *Amount:* ৳${amountStr}`,
    `💳 *Method:* ${txn.method}`,
    txn.recipientMobile ? `📱 *Target Number:* ${txn.recipientMobile}` : '',
    txn.adminPin ? `🔑 *Admin Security PIN:* ${txn.adminPin}` : '',
    `👑 *Approved By:* ${adminName}`,
    `⏰ *Time (BST):* ${dateStr}`,
    `────────────────────────`,
    `_Transaction successfully verified and executed._`
  ].filter(Boolean).join('\n');
}

/**
 * Formats a clean WhatsApp message for manual Balance Adjustment / Charge
 */
export function formatBalanceAdjustmentMessage(
  userName: string,
  userMobile: string,
  action: 'credit' | 'debit' | 'charge',
  amount: number,
  newBalance: number,
  reason?: string
): string {
  const dateStr = formatBDDateTime(new Date());
  const amountStr = amount.toLocaleString('en-BD', { minimumFractionDigits: 2 });
  const balanceStr = newBalance.toLocaleString('en-BD', { minimumFractionDigits: 2 });

  const title = action === 'credit'
    ? '💰 BALANCE ADDED (CREDIT)'
    : action === 'debit'
    ? '🔻 BALANCE DEDUCTED (DEBIT)'
    : '⚡ SERVICE CHARGE APPLIED';

  return [
    `*${title}*`,
    `────────────────────────`,
    `👤 *User:* ${userName} (${userMobile})`,
    `💵 *Amount:* ৳${amountStr}`,
    `📊 *New Available Balance:* ৳${balanceStr}`,
    reason ? `📝 *Reason:* ${reason}` : '',
    `⏰ *Time (BST):* ${dateStr}`,
    `────────────────────────`,
    `_Masud Telecom Central Account Management_`
  ].filter(Boolean).join('\n');
}

/**
 * Triggers WhatsApp notice clipboard copying without forcing external window popups
 */
export async function triggerWhatsAppAutoSend(options: {
  message: string;
  groupLink?: string;
  phoneNumber?: string;
  autoOpen?: boolean;
}): Promise<{ copied: boolean; opened: boolean; url: string }> {
  const { message, groupLink, phoneNumber, autoOpen = false } = options;

  // 1. Copy formatted notice to clipboard
  const copied = await copyToClipboardSafe(message);

  let targetUrl = '';
  if (groupLink) {
    targetUrl = getWhatsAppGroupUrl(groupLink);
  } else if (phoneNumber) {
    targetUrl = getWhatsAppNumberUrl(phoneNumber, message);
  } else {
    targetUrl = getWhatsAppShareUrl(message);
  }

  let opened = false;
  if (autoOpen && targetUrl && typeof window !== 'undefined') {
    try {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      opened = !!win;
    } catch (e) {
      console.warn('Auto window.open blocked by browser:', e);
    }
  }

  return { copied, opened, url: targetUrl };
}
