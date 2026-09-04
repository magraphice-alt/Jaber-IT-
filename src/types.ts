export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  address?: string;
  location?: string;
  whatsAppNumber?: string;
  whatsAppGroupLink?: string;
  role: UserRole;
  balance: number;
  commissionRate: number; // e.g. 2.5 for 2.5%
  avatarUrl?: string;
  totalSend: number;
  totalCommission: number;
  createdAt: string;
  status?: 'active' | 'suspended';
  password?: string;
}

export type TransactionType = 'send' | 'deposit' | 'charge';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';
export type TransferMethod = 'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash' | 'Admin Credit' | 'Admin Debit' | 'Admin Manual';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: TransactionType;
  recipientMobile?: string;
  amount: number;
  method: TransferMethod;
  comment?: string;
  attachmentUrl?: string; // proof file base64 or preview
  attachmentName?: string;
  status: TransactionStatus;
  commissionEarned: number; // Commission calculated on send or deposit
  amountInWords?: string;
  balanceAfter?: number;
  createdAt: string;
  approvedAt?: string;
  adminPin?: string;
  rejectionReason?: string;
  isResent?: boolean; // When true, receipt is locked from 2nd resend
  resentTxnId?: string; // New replacement Transaction ID
  resentAt?: string;
}

export type NotificationType =
  | 'welcome'
  | 'new_user'
  | 'deposit_submitted'
  | 'deposit_approved'
  | 'deposit_rejected'
  | 'money_sent'
  | 'money_received'
  | 'withdrawal_submitted'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'support_message'
  | 'security_alert'
  | 'system_announcement'
  | 'test'
  | 'info'
  | 'success'
  | 'warning'
  | 'alert';

export interface NotificationItem {
  id: string;
  userId: string; // 'all', 'admin', or specific user ID
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: NotificationType;
  txnId?: string;
  url?: string;
  referenceId?: string;
  eventId?: string;
}

export interface UserDevice {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  token: string;
  deviceType: 'android' | 'windows' | 'macos' | 'ios' | 'desktop' | 'mobile';
  browser: string;
  platform: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
  isActive: boolean;
}

export interface NotificationPreferences {
  accountAlerts: boolean;
  depositAlerts: boolean;
  transferAlerts: boolean;
  securityAlerts: boolean;
  announcements: boolean;
  browserPush: boolean;
  soundEnabled: boolean;
  soundStyle?: 'default' | 'crisp' | 'cash';
  volume?: 'high' | 'medium' | 'low';
  vibrationEnabled?: boolean;
}

export interface ResendDraftData {
  recipientMobile: string;
  amount: number;
  method?: TransferMethod;
  comment?: string;
  originalTxnId?: string;
  rejectionReason?: string;
}

export interface SystemSettings {
  defaultCommissionRate: number; // e.g., 2.5%
  companyName: string;
  supportPhone: string;
  supportEmail: string;
  currencySymbol: string; // '৳'
  whatsAppNumber?: string;
  whatsAppGroupLink?: string;
}
