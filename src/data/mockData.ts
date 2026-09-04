import { User, Transaction, NotificationItem, SystemSettings } from '../types';

export const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  name: 'Jabir Ahmed',
  email: 'jabir.ahmed10@gmail.com',
  mobile: '+880 1780 000000',
  location: '',
  whatsAppNumber: '+880 1780 000000',
  whatsAppGroupLink: '',
  role: 'admin',
  balance: 500000,
  commissionRate: 3.5,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  totalSend: 450000,
  totalCommission: 15750,
  createdAt: '2026-01-01T00:00:00Z',
  status: 'active'
};

export const DEFAULT_USER: User = {
  id: '8492-4921-A',
  name: 'Sarah Jenkins',
  email: 'jabir0753704086@gmail.com',
  mobile: '+880 1753 704086',
  role: 'user',
  balance: 25430,
  commissionRate: 2.5,
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
  totalSend: 1200,
  totalCommission: 450,
  createdAt: '2026-02-15T00:00:00Z',
  status: 'active'
};

export const INITIAL_USERS: User[] = [
  DEFAULT_ADMIN,
  DEFAULT_USER,
  {
    id: 'user-002',
    name: 'Rafiq Islam',
    email: 'rafiq@masudtelecom.com',
    mobile: '+880 1812 345678',
    role: 'user',
    balance: 18250,
    commissionRate: 2.5,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    totalSend: 34000,
    totalCommission: 850,
    createdAt: '2026-03-01T00:00:00Z',
    status: 'active'
  },
  {
    id: 'user-003',
    name: 'Tania Akter',
    email: 'tania@masudtelecom.com',
    mobile: '+880 1911 987654',
    role: 'user',
    balance: 31200,
    commissionRate: 2.5,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    totalSend: 52000,
    totalCommission: 1300,
    createdAt: '2026-03-10T00:00:00Z',
    status: 'active'
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TXN-8901',
    userId: '8492-4921-A',
    userName: 'Sarah Jenkins',
    userEmail: 'jabir0753704086@gmail.com',
    type: 'send',
    recipientMobile: '+880 1711 223344',
    amount: 850,
    method: 'bKash',
    comment: 'Transfer to Sarah',
    status: 'approved',
    commissionEarned: 21.25,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    approvedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: 'TXN-8900',
    userId: '8492-4921-A',
    userName: 'Sarah Jenkins',
    userEmail: 'jabir0753704086@gmail.com',
    type: 'deposit',
    amount: 15000,
    method: 'Bank',
    comment: 'Salary Deposit',
    status: 'approved',
    commissionEarned: 375,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
    approvedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString()
  },
  {
    id: 'TXN-8899',
    userId: '8492-4921-A',
    userName: 'Sarah Jenkins',
    userEmail: 'jabir0753704086@gmail.com',
    type: 'send',
    recipientMobile: '+880 1819 887766',
    amount: 3200,
    method: 'Nagad',
    comment: 'Groceries Market',
    status: 'approved',
    commissionEarned: 80,
    createdAt: '2026-08-05T18:30:00Z',
    approvedAt: '2026-08-05T18:35:00Z'
  },
  {
    id: 'TXN-8902',
    userId: '8492-4921-A',
    userName: 'Sarah Jenkins',
    userEmail: 'jabir0753704086@gmail.com',
    type: 'send',
    recipientMobile: '+880 1712 345678',
    amount: 1200,
    method: 'bKash',
    comment: 'Agent Wallet Recharge',
    status: 'pending',
    commissionEarned: 30,
    createdAt: new Date().toISOString()
  },
  {
    id: 'TXN-8903',
    userId: '8492-4921-A',
    userName: 'Sarah Jenkins',
    userEmail: 'jabir0753704086@gmail.com',
    type: 'deposit',
    amount: 10000,
    method: 'bKash',
    comment: 'Monthly working capital deposit',
    attachmentName: 'bkash_receipt_8903.png',
    status: 'pending',
    commissionEarned: 250,
    createdAt: new Date().toISOString()
  },
  {
    id: 'TXN-8895',
    userId: 'user-002',
    userName: 'Rafiq Islam',
    userEmail: 'rafiq@masudtelecom.com',
    type: 'send',
    recipientMobile: '+880 1912 001122',
    amount: 5000,
    method: 'Rocket',
    comment: 'Vendor payment',
    status: 'approved',
    commissionEarned: 125,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    approvedAt: new Date(Date.now() - 1000 * 60 * 100).toISOString()
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    userId: '8492-4921-A',
    title: 'Deposit Approved',
    message: 'Your deposit of ৳15,000.00 via Bank has been approved by Admin.',
    timestamp: 'Yesterday, 09:00 AM',
    read: false,
    type: 'success'
  },
  {
    id: 'notif-2',
    userId: '8492-4921-A',
    title: 'Commission Credited',
    message: 'Commission of ৳375.00 added to your balance.',
    timestamp: 'Yesterday, 09:01 AM',
    read: true,
    type: 'info'
  },
  {
    id: 'notif-3',
    userId: 'admin-001',
    title: 'New Pending Requests',
    message: 'You have 2 pending transaction approval requests from employees.',
    timestamp: 'Just now',
    read: false,
    type: 'alert'
  }
];

export const INITIAL_SETTINGS: SystemSettings = {
  defaultCommissionRate: 2.5,
  companyName: 'Masud Telecom',
  supportPhone: '+880 1780 000000',
  supportEmail: 'support@masudtelecom.com',
  currencySymbol: '৳',
  whatsAppNumber: '+880 1780 000000',
  whatsAppGroupLink: ''
};

// Password lookup dictionary for authentication
export const PASSWORD_STORE: Record<string, string> = {
  'jabir.ahmed10@gmail.com': 'Masud@1780',
  'jabir0753704086@gmail.com': 'Masud@1780',
  'rafiq@masudtelecom.com': 'Rafiq@123',
  'tania@masudtelecom.com': 'Tania@123'
};
