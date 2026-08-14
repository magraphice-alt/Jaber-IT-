import { Transaction, User, SystemSettings } from '../types';

/**
 * Clean phone number for WhatsApp API (e.g., converts '01780000000' or '+880 1780 000000' to '8801780000000')
 */
export function cleanWhatsAppNumber(phone?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    digits = digits.substring(1);
  }
  // If Bangladesh local number starting with 01
  if (digits.startsWith('01') && digits.length === 11) {
    digits = '88' + digits;
  }
  return digits;
}

/**
 * Builds direct WhatsApp chat URL with pre-filled message
 */
export function getWhatsAppNumberUrl(phone: string, text: string): string {
  const cleaned = cleanWhatsAppNumber(phone);
  if (!cleaned) return '';
  return `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(text)}`;
}

/**
 * Builds WhatsApp group URL
 */
export function getWhatsAppGroupUrl(groupLink?: string): string {
  if (!groupLink) return '';
  const trimmed = groupLink.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('chat.whatsapp.com')) {
    return `https://${trimmed}`;
  }
  return `https://chat.whatsapp.com/${trimmed}`;
}

/**
 * Formats a clean, high-clarity WhatsApp receipt message for Send Money
 */
export function formatSendMoneyMessage(
  txn: Partial<Transaction>,
  userName: string,
  userMobile?: string
): string {
  const dateStr = txn.createdAt ? new Date(txn.createdAt).toLocaleString('en-BD') : new Date().toLocaleString('en-BD');
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
    `⏰ *Time:* ${dateStr}`,
    `────────────────────────`,
    `_Powered by Masud Telecom Central System_`
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
  const dateStr = txn.createdAt ? new Date(txn.createdAt).toLocaleString('en-BD') : new Date().toLocaleString('en-BD');
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
    `⏰ *Time:* ${dateStr}`,
    `────────────────────────`,
    `_Powered by Masud Telecom Central System_`
  ].filter(Boolean).join('\n');
}

/**
 * Formats a clean WhatsApp message for Approval by Admin
 */
export function formatApprovalMessage(
  txn: Transaction,
  adminName: string = 'System Admin'
): string {
  const dateStr = new Date().toLocaleString('en-BD');
  const amountStr = txn.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 });

  return [
    `*✅ MASUD TELECOM - TRANSACTION APPROVED ✅*`,
    `────────────────────────`,
    `🆔 *Txn ID:* ${txn.id}`,
    `👤 *User:* ${txn.userName}`,
    `💰 *Amount:* ৳${amountStr}`,
    `💳 *Method:* ${txn.method}`,
    txn.recipientMobile ? `📱 *Target Number:* ${txn.recipientMobile}` : '',
    txn.adminPin ? `🔑 *Admin Security PIN:* ${txn.adminPin}` : '',
    `👑 *Approved By:* ${adminName}`,
    `⏰ *Time:* ${dateStr}`,
    `────────────────────────`,
    `_Transaction successfully verified and executed._`
  ].filter(Boolean).join('\n');
}
