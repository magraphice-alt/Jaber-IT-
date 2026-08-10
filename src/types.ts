export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  balance: number;
  commissionRate: number; // e.g. 2.5 for 2.5%
  avatarUrl?: string;
  totalSend: number;
  totalCommission: number;
  createdAt: string;
  status?: 'active' | 'suspended';
}

export type TransactionType = 'send' | 'deposit' | 'charge';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';
export type TransferMethod = 'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash';

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
  createdAt: string;
  approvedAt?: string;
  adminPin?: string;
  rejectionReason?: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // 'all', 'admin', or specific user ID
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
  txnId?: string;
}

export interface SystemSettings {
  defaultCommissionRate: number; // e.g., 2.5%
  companyName: string;
  supportPhone: string;
  supportEmail: string;
  currencySymbol: string; // '৳'
}
