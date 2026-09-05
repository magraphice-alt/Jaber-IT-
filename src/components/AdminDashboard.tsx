import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Users,
  UserPlus,
  HelpCircle,
  User as UserIcon,
  Bell,
  Search,
  Eye,
  LogOut,
  Edit2,
  Save,
  FileText,
  DollarSign,
  Send,
  PlusCircle,
  TrendingUp,
  X,
  ArrowLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Clock,
  Copy,
  Check,
  Lock,
  Percent,
  Trash2,
  Plus,
  AlertTriangle,
  AlertCircle,
  EyeOff,
  MinusCircle,
  Download,
  RotateCcw,
  MapPin,
  MessageSquare,
  Link as LinkIcon,
  ExternalLink,
  Camera,
  Megaphone,
  UploadCloud,
  Share2,
  Image as ImageIcon
} from 'lucide-react';
import { TransferMethod, Transaction, User } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { ChargeModal } from './ChargeModal';
import { ProofPreviewModal, ProofModalData } from './ProofPreviewModal';
import { generateStatementPDF } from '../utils/pdfGenerator';
import { amountToWords } from '../utils/numberToWords';
import { cleanWhatsAppNumber, getWhatsAppNumberUrl, getWhatsAppGroupUrl, formatApprovalMessage, triggerWhatsAppAutoSend, copyToClipboardSafe } from '../utils/whatsappHelper';
import { WhatsAppNoticeModal } from './WhatsAppNoticeModal';
import { isBDToday, formatBDDateTime, getLiveBDClock, matchesBDDateFilter } from '../utils/timeHelper';
import { AdminBroadcastSection } from './AdminBroadcastSection';

interface AdminDashboardProps {
  onOpenNotifications: () => void;
}

export type AdminTab = 'dashboard' | 'users' | 'create' | 'help' | 'profile' | 'broadcast';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenNotifications }) => {
  const [selectedReceiptTxn, setSelectedReceiptTxn] = useState<Transaction | null>(null);
  const [chargeModalUser, setChargeModalUser] = useState<User | null>(null);
  const [chargeModalMode, setChargeModalMode] = useState<'credit' | 'debit'>('credit');
  const {
    currentUser,
    users,
    transactions,
    settings,
    notifications,
    approveTransaction,
    rejectTransaction,
    updateCommissionRate,
    createUserAccount,
    deleteUserAccount,
    manualAdjustUserBalance,
    updateUserProfile,
    logout
  } = useApp();

  const [editingUserProfileId, setEditingUserProfileId] = useState<string | null>(null);
  const [adminEditName, setAdminEditName] = useState('');
  const [adminEditMobile, setAdminEditMobile] = useState('');
  const [adminEditAddress, setAdminEditAddress] = useState('');
  const [adminProfileMsg, setAdminProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin Self Profile Editing State
  const [isEditingSelfProfile, setIsEditingSelfProfile] = useState(false);
  const [selfName, setSelfName] = useState(currentUser?.name || 'Jabir Ahmed');
  const [selfMobile, setSelfMobile] = useState(currentUser?.mobile || '+880 1780 000000');
  const [selfLocation, setSelfLocation] = useState(currentUser?.location || '');
  const [selfWhatsAppNumber, setSelfWhatsAppNumber] = useState(currentUser?.whatsAppNumber || settings.whatsAppNumber || '+880 1780 000000');
  const [selfWhatsAppGroupLink, setSelfWhatsAppGroupLink] = useState(currentUser?.whatsAppGroupLink || settings.whatsAppGroupLink || '');
  const [selfAvatarUrl, setSelfAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [selfProfileMsg, setSelfProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Sync self profile state when currentUser updates
  React.useEffect(() => {
    if (currentUser) {
      setSelfName(currentUser.name || '');
      setSelfMobile(currentUser.mobile || '');
      setSelfLocation(currentUser.location || '');
      setSelfWhatsAppNumber(currentUser.whatsAppNumber || settings.whatsAppNumber || '+880 1780 000000');
      setSelfWhatsAppGroupLink(currentUser.whatsAppGroupLink || settings.whatsAppGroupLink || '');
      setSelfAvatarUrl(currentUser.avatarUrl || '');
    }
  }, [currentUser, settings.whatsAppNumber, settings.whatsAppGroupLink]);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (under 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSelfProfileMsg({ type: 'error', text: 'Image file is too large. Max 5MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvt) => {
      const img = new window.Image();
      img.onload = () => {
        // Compress using canvas to ~200x200
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        canvas.width = 250;
        canvas.height = 250;
        if (ctx) {
          ctx.drawImage(img, startX, startY, size, size, 0, 0, 250, 250);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelfAvatarUrl(compressedDataUrl);
        }
      };
      img.src = readerEvt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSelfProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selfName.trim()) {
      setSelfProfileMsg({ type: 'error', text: 'Admin full name cannot be empty.' });
      return;
    }
    const res = updateUserProfile({
      name: selfName.trim(),
      mobile: selfMobile.trim(),
      location: selfLocation.trim(),
      whatsAppNumber: selfWhatsAppNumber.trim(),
      whatsAppGroupLink: selfWhatsAppGroupLink.trim(),
      avatarUrl: selfAvatarUrl
    });
    if (res.success) {
      setSelfProfileMsg({ type: 'success', text: 'Admin profile updated successfully!' });
      setIsEditingSelfProfile(false);
      setShowAvatarPicker(false);
      setTimeout(() => setSelfProfileMsg(null), 3000);
    } else {
      setSelfProfileMsg({ type: 'error', text: res.message });
    }
  };

  const getAdminInitials = (name?: string) => {
    if (!name) return 'JA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const [inlineAdjustAmount, setInlineAdjustAmount] = useState('');
  const [inlineAdjustNote, setInlineAdjustNote] = useState('');
  const [inlineAdjustMsg, setInlineAdjustMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [historyTab, setHistoryTab] = useState<'pending' | 'approved_send' | 'approved_deposit' | 'charges'>('pending');
  const [userActivityFilter, setUserActivityFilter] = useState<'all' | 'send' | 'deposit' | 'charge'>('all');

  // Directory selected user statement filter state
  const [adminSelectType, setAdminSelectType] = useState<'' | 'all' | 'send' | 'deposit' | 'commission' | 'only_number'>('');
  const [adminSingleDate, setAdminSingleDate] = useState('');
  const [adminFromDate, setAdminFromDate] = useState('');
  const [adminToDate, setAdminToDate] = useState('');
  const [adminSearchMobile, setAdminSearchMobile] = useState('');
  const [adminActiveFilter, setAdminActiveFilter] = useState<{
    selectType?: '' | 'all' | 'send' | 'deposit' | 'commission' | 'only_number';
    singleDate?: string;
    fromDate?: string;
    toDate?: string;
    mobile?: string;
  }>({});

  // Commission Rate Editing State
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(settings.defaultCommissionRate.toString());

  // Rejection Modal State
  const [rejectingTxnId, setRejectingTxnId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Approval PIN Modal State
  const [approvingTxnId, setApprovingTxnId] = useState<string | null>(null);
  const [adminPin, setAdminPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Copy Number State
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  // Helper Copy Function
  const handleCopyNumber = (num: string) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  // Admin WhatsApp Auto-Notice State
  const [showAdminWhatsAppModal, setShowAdminWhatsAppModal] = useState(false);
  const [adminWhatsAppNotice, setAdminWhatsAppNotice] = useState<string>('');
  const [adminWhatsAppNoticeTitle, setAdminWhatsAppNoticeTitle] = useState<string>('Transaction Approved Notice');

  const openApproveModal = (txnId: string) => {
    setApprovingTxnId(txnId);
    setAdminPin('');
    setPinError(null);
  };

  const handleConfirmApproveWithPin = async (txnId: string) => {
    if (!adminPin || adminPin.trim().length !== 4) {
      setPinError('Please enter a valid 4-digit PIN');
      return;
    }
    const cleanPin = adminPin.trim();
    const txnToApprove = transactions.find(t => t.id === txnId);

    approveTransaction(txnId, cleanPin);
    setApprovingTxnId(null);
    setAdminPin('');
    setPinError(null);

    if (txnToApprove) {
      const approvedTxn: Transaction = {
        ...txnToApprove,
        adminPin: cleanPin,
        status: 'approved',
        approvedAt: new Date().toISOString()
      };

      const waNotice = formatApprovalMessage(approvedTxn, currentUser?.name || 'Admin');
      setAdminWhatsAppNotice(waNotice);
      setAdminWhatsAppNoticeTitle(`${txnToApprove.type.toUpperCase()} Approval Notice`);

      const groupLink = currentUser?.whatsAppGroupLink || settings.whatsAppGroupLink;
      const waNumber = currentUser?.whatsAppNumber || settings.whatsAppNumber;

      // Auto copy to clipboard without opening another window
      await triggerWhatsAppAutoSend({
        message: waNotice,
        groupLink: groupLink,
        phoneNumber: waNumber,
        autoOpen: false
      });

      setShowAdminWhatsAppModal(false);
    }
  };

  // Proof Modal
  const [previewProof, setPreviewProof] = useState<ProofModalData | null>(null);

  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserBalance, setNewUserBalance] = useState('');
  const [newUserCommRate, setNewUserCommRate] = useState(settings.defaultCommissionRate.toString());
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);
  const [createErrorMsg, setCreateErrorMsg] = useState<string | null>(null);

  // User Selection & Activity State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const unreadCount = notifications.filter(
    n => !n.read && (n.userId === 'admin' || n.userId === 'all')
  ).length;

  // Live Bangladesh Clock (BST)
  const [bdClock, setBdClock] = useState(getLiveBDClock());

  // Metric Figures Erase/Restore State (Checkpoint Timestamp & Security Verification)
  const [eraseCheckpointTime, setEraseCheckpointTime] = useState<string | null>(() => {
    return localStorage.getItem('admin_metrics_erased_at');
  });
  const [securityModalAction, setSecurityModalAction] = useState<'erase' | 'restore' | null>(null);
  const [erasePassword, setErasePassword] = useState<string>('');
  const [eraseError, setEraseError] = useState<string | null>(null);
  const [showErasePasswordText, setShowErasePasswordText] = useState<boolean>(false);

  const handleSecurityActionSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (erasePassword === 'Masud@1780' || erasePassword === 'Jaber@1780') {
      if (securityModalAction === 'erase') {
        const nowIso = new Date().toISOString();
        setEraseCheckpointTime(nowIso);
        localStorage.setItem('admin_metrics_erased_at', nowIso);
      } else if (securityModalAction === 'restore') {
        setEraseCheckpointTime(null);
        localStorage.removeItem('admin_metrics_erased_at');
      }
      setSecurityModalAction(null);
      setErasePassword('');
      setEraseError(null);
    } else {
      setEraseError('Incorrect password! Access denied.');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setBdClock(getLiveBDClock());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-Time Calculations
  const approvedTxns = transactions.filter(t => t.status === 'approved');
  const pendingTxns = transactions.filter(t => t.status === 'pending');

  // Filter approved transactions based on erase checkpoint (counting all new transactions after erase)
  const metricApprovedTxns = eraseCheckpointTime
    ? approvedTxns.filter(t => {
        const txnTime = new Date(t.approvedAt || t.createdAt).getTime();
        const eraseTime = new Date(eraseCheckpointTime).getTime();
        return txnTime >= eraseTime;
      })
    : approvedTxns;

  const totalSendAmount = metricApprovedTxns
    .filter(t => t.type === 'send')
    .reduce((acc, t) => acc + t.amount, 0);

  // Today's send strictly starting from Bangladesh Time 6:00 AM (and after erase timestamp if set)
  const todaySendAmount = metricApprovedTxns
    .filter(t => t.type === 'send' && isBDToday(t.createdAt))
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCommissionAmount = (totalSendAmount / 1000) * 7.5;

  const approvedTkAmount = totalSendAmount; // Approved Send total after erase
  const approvedDepositAmount = metricApprovedTxns
    .filter(t => t.type === 'deposit')
    .reduce((acc, t) => acc + t.amount, 0);

  const handleSaveRate = () => {
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val >= 0) {
      updateCommissionRate(val);
      setIsEditingRate(false);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSuccessMsg(null);
    setCreateErrorMsg(null);

    const initBal = parseFloat(newUserBalance) || 0;
    const commRate = parseFloat(newUserCommRate) || settings.defaultCommissionRate;

    const res = createUserAccount(
      {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        mobile: newUserMobile.trim(),
        role: 'user',
        balance: initBal,
        commissionRate: commRate
      },
      newUserPassword
    );

    if (res.success) {
      setCreateSuccessMsg(res.message || `User account for ${newUserName} created successfully. User ID: ${newUserEmail.trim().toLowerCase()} is active and prepared for instant login.`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserMobile('');
      setNewUserPassword('');
      setNewUserBalance('');
    } else {
      setCreateErrorMsg(res.message || 'Failed to create user account.');
    }
  };

  const handleDeleteUserConfirmed = () => {
    if (!userToDelete) return;
    setDeleteErrorMsg(null);

    // Auto-generate and download full user Statement PDF before deleting user profile
    const userTxns = transactions.filter(t => t.userId === userToDelete.id);
    try {
      generateStatementPDF({
        user: {
          name: userToDelete.name,
          mobile: userToDelete.mobile,
          email: userToDelete.email,
          address: userToDelete.address,
          balance: userToDelete.balance,
          totalCommission: userToDelete.totalCommission,
          commissionRate: userToDelete.commissionRate
        },
        transactions: userTxns,
        filterInfo: {
          type: 'ALL'
        }
      });
    } catch (err) {
      console.warn('Auto PDF statement generation on delete failed:', err);
    }

    const res = deleteUserAccount(userToDelete.id);
    if (res.success) {
      if (selectedUserId === userToDelete.id) {
        setSelectedUserId(null);
      }
      setUserToDelete(null);
    } else {
      setDeleteErrorMsg(res.message || 'Failed to delete user account.');
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.mobile.includes(userSearchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-28 max-w-lg mx-auto shadow-2xl flex flex-col font-sans">
      {/* Black Top Header matching Wireframe */}
      <div className="bg-black text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-extrabold tracking-tight text-white uppercase">
            Admin Dashboard
          </h1>
        </div>
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="w-5 h-5 text-slate-200" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-black shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Top Quick Navigation Sub-Bar for Overview vs User List */}
      <div className="bg-slate-900 text-white px-3 py-1.5 border-b border-slate-800 flex gap-2 text-xs font-bold sticky top-[57px] z-30">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'dashboard'
              ? 'bg-blue-900 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          <span>Financial Overview</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('users');
            setSelectedUserId(null);
          }}
          className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-blue-900 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('broadcast');
            setSelectedUserId(null);
          }}
          className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'broadcast'
              ? 'bg-blue-900 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 text-blue-400" />
          <span>Push Broadcast</span>
        </button>
      </div>

      {/* VIEW CONTENT BY TAB */}
      <div className="flex-1 p-4 space-y-4">
        {activeTab === 'broadcast' && <AdminBroadcastSection />}

        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Bangladesh Standard Time (BST) & 6:00 AM Cycle Status Indicator */}
            <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center justify-between border border-slate-800 shadow-xs max-w-xl mx-auto">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-1 text-[8px] font-bold">
                    <span>🇧🇩 Bangladesh Time (BST):</span>
                    <span className="font-mono text-emerald-300">{bdClock.time12}</span>
                  </div>
                  <p className="text-[8px] text-slate-400 font-medium">Daily transaction cycle starts at 6:00 AM BST</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[8px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-semibold border border-slate-700 block">
                  {bdClock.dateMedium}
                </span>
              </div>
            </div>

            {/* Real-time Metric Grid Table (Compact Size with Erase Button on Side) */}
            <div className="max-w-md mx-auto space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Metrics</span>
                <div className="flex items-center gap-1.5">
                  {eraseCheckpointTime && (
                    <button
                      type="button"
                      onClick={() => {
                        setErasePassword('');
                        setEraseError(null);
                        setSecurityModalAction('restore');
                      }}
                      title="Restore full all-time calculation"
                      className="text-[8px] font-bold text-blue-800 hover:text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Restore All-Time</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setErasePassword('');
                      setEraseError(null);
                      setSecurityModalAction('erase');
                    }}
                    className="text-[8px] font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded cursor-pointer transition-all shadow-2xs flex items-center gap-1"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span>Erase</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg border-2 border-slate-800 overflow-hidden shadow-xs">
                <div className="divide-y-2 divide-slate-800 text-[8px]">
                  {/* Total Send */}
                  <div className="grid grid-cols-2 bg-slate-200/90 divide-x-2 divide-slate-800 items-center">
                    <div className="px-2 py-1 text-[8px] font-extrabold text-slate-900 flex items-center justify-between">
                      <span>Total Send</span>
                      {eraseCheckpointTime && <span className="text-[7px] text-amber-700 font-bold bg-amber-100 px-1 rounded">New</span>}
                    </div>
                    <div className="px-2 py-1 bg-white text-[8px] font-black text-slate-900 font-mono">
                      ৳{totalSendAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Today Send */}
                  <div className="grid grid-cols-2 bg-slate-200/90 divide-x-2 divide-slate-800 items-center">
                    <div className="px-2 py-1 text-[8px] font-extrabold text-slate-900 flex items-center justify-between">
                      <span>Today Send</span>
                      {eraseCheckpointTime && <span className="text-[7px] text-amber-700 font-bold bg-amber-100 px-1 rounded">New</span>}
                    </div>
                    <div className="px-2 py-1 bg-white text-[8px] font-black text-blue-900 font-mono">
                      ৳{todaySendAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Commission Rate Row */}
                  <div className="grid grid-cols-2 bg-slate-300 divide-x-2 divide-slate-800 items-center">
                    <div className="px-2 py-1 text-[8px] font-extrabold text-slate-900 border-r border-slate-800">
                      Commission Rate
                    </div>
                    <div className="px-2 py-1 bg-white flex items-center justify-between gap-1">
                      {isEditingRate ? (
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="number"
                            step="0.1"
                            value={rateInput}
                            onChange={e => setRateInput(e.target.value)}
                            className="w-12 bg-slate-100 border border-slate-400 rounded px-1 py-0.5 text-[8px] font-bold text-slate-900"
                          />
                          <span className="text-[8px] font-bold">%</span>
                          <button
                            onClick={handleSaveRate}
                            className="bg-emerald-600 text-white p-0.5 rounded hover:bg-emerald-700 cursor-pointer"
                          >
                            <Save className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-[8px] font-black text-blue-950 font-mono">
                            {settings.defaultCommissionRate}%
                          </span>
                          <button
                            onClick={() => setIsEditingRate(true)}
                            className="text-[8px] text-blue-900 font-semibold underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Edit2 className="w-2 h-2" /> Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Approved Tk & Approved Diposit Header */}
                  <div className="grid grid-cols-2 bg-slate-300 divide-x-2 divide-slate-800 text-center text-[8px] font-extrabold text-slate-900">
                    <div className="px-2 py-1 bg-slate-300">Approved Tk</div>
                    <div className="px-2 py-1 bg-slate-300">Approved Diposit</div>
                  </div>

                  {/* Approved Values Row */}
                  <div className="grid grid-cols-2 divide-x-2 divide-slate-800 bg-white font-mono font-bold text-[8px] text-center">
                    <div className="px-2 py-1 text-slate-900">
                      ৳{approvedTkAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="px-2 py-1 text-emerald-800">
                      ৳{approvedDepositAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wireframe Caption Label */}
            <div className="text-center text-[8px] font-semibold text-slate-600 italic">
              there is Approved Tk and Approved Diposit history
            </div>

            {/* History & Approvals Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3 max-w-xl mx-auto">
              {/* Filter Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-lg text-[8px] font-bold gap-1">
                <button
                  onClick={() => setHistoryTab('pending')}
                  className={`flex-1 py-1.5 px-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${
                    historyTab === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({pendingTxns.length})
                </button>

                <button
                  onClick={() => setHistoryTab('approved_send')}
                  className={`flex-1 py-1.5 px-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${
                    historyTab === 'approved_send'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Send History
                </button>

                <button
                  onClick={() => setHistoryTab('approved_deposit')}
                  className={`flex-1 py-1.5 px-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${
                    historyTab === 'approved_deposit'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Deposit History
                </button>

                <button
                  onClick={() => setHistoryTab('charges')}
                  className={`flex-1 py-1.5 px-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${
                    historyTab === 'charges'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Charge History ({transactions.filter(t => t.type === 'charge').length})
                </button>
              </div>

              {/* LIST BY SELECTED HISTORY TAB */}
              <div className="space-y-3 pt-1">
                {/* 1. Pending Approvals Queue */}
                {historyTab === 'pending' && (
                  <div>
                    {pendingTxns.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-[8px]">
                        <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-60" />
                        No pending transaction requests right now.
                      </div>
                    ) : (
                      pendingTxns.map(t => (
                        <div
                          key={t.id}
                          className="p-3.5 border border-amber-200 bg-amber-50/50 rounded-xl space-y-2 mb-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">
                                {t.userName} ({t.userEmail})
                              </span>
                              <span className="text-[11px] font-semibold text-slate-600">
                                Type: <strong className="uppercase">{t.type}</strong> via {t.method}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-extrabold text-blue-950 font-mono block text-right">
                                ৳{t.amount.toLocaleString('en-BD')}
                              </span>
                              <span className="text-[10px] font-semibold text-blue-900/80 block text-right">
                                {t.amountInWords || amountToWords(t.amount)}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600">
                            {(t.recipientMobile || t.adminPin) && (
                              <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 mt-1 mb-1.5 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
                                {/* Target Number */}
                                {t.recipientMobile && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Target Number:</span>
                                    <span className="text-xs font-mono font-black text-slate-900 tracking-wide">{t.recipientMobile}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyNumber(t.recipientMobile!)}
                                      title="Copy Target Number"
                                      className="text-slate-400 hover:text-blue-900 p-0.5 rounded transition-colors cursor-pointer"
                                    >
                                      {copiedNumber === t.recipientMobile ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}

                                {/* Approved PIN */}
                                {t.adminPin && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Approved PIN:</span>
                                    <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      🔑 {t.adminPin}
                                    </span>
                                  </div>
                                )}

                                {/* Receipt Button */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceiptTxn(t)}
                                  className="bg-blue-900 hover:bg-blue-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0 ml-auto"
                                >
                                  <FileText className="w-3 h-3 text-blue-300" />
                                  <span>Receipt</span>
                                </button>
                              </div>
                            )}
                            {t.comment && <div className="text-slate-700">Note: {t.comment}</div>}
                            <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                              Calculated Commission: +৳{t.commissionEarned.toFixed(2)}
                            </div>
                          </div>

                          {t.attachmentUrl && (
                            <button
                              onClick={() =>
                                setPreviewProof({
                                  url: t.attachmentUrl!,
                                  name: t.attachmentName || 'Receipt_Proof.pdf',
                                  userName: t.userName,
                                  amount: t.amount,
                                  method: t.method,
                                  date: t.createdAt
                                })
                              }
                              className="text-xs text-blue-800 hover:text-blue-950 font-bold underline flex items-center gap-1.5 bg-blue-50/90 hover:bg-blue-100/90 px-2.5 py-1.5 rounded-lg border border-blue-200 cursor-pointer transition-colors shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-700" />
                              <span>View Proof Receipt ({t.attachmentName || 'Document'})</span>
                            </button>
                          )}

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => openApproveModal(t.id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            >
                              <CheckCircle className="w-4 h-4" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectingTxnId(t.id);
                                setRejectionReason('');
                              }}
                              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 2. Approved Send History */}
                {historyTab === 'approved_send' && (
                  <div className="space-y-2">
                    {approvedTxns.filter(t => t.type === 'send').length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No approved send transactions recorded yet.
                      </div>
                    ) : (
                      approvedTxns
                        .filter(t => t.type === 'send')
                        .map(t => (
                          <div
                            key={t.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{t.userName}</div>
                              <div className="text-slate-500">To: {t.recipientMobile || 'N/A'} ({t.method})</div>
                              <div className="text-[10px] text-slate-400">{formatBDDateTime(t.createdAt, false)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-extrabold text-blue-900">৳{t.amount.toLocaleString('en-BD')}</div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {/* 3. Approved Deposit History */}
                {historyTab === 'approved_deposit' && (
                  <div className="space-y-2">
                    {approvedTxns.filter(t => t.type === 'deposit').length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No approved deposit transactions recorded yet.
                      </div>
                    ) : (
                      approvedTxns
                        .filter(t => t.type === 'deposit')
                        .map(t => (
                          <div
                            key={t.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">{t.userName}</div>
                              <div className="text-slate-500">Method: {t.method}</div>
                              <div className="text-[10px] text-slate-400">{formatBDDateTime(t.createdAt, false)}</div>
                              {t.attachmentUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewProof({
                                      url: t.attachmentUrl!,
                                      name: t.attachmentName || 'Receipt_Proof.pdf',
                                      userName: t.userName,
                                      amount: t.amount,
                                      method: t.method,
                                      date: t.createdAt
                                    })
                                  }
                                  className="mt-1 text-[10px] font-bold text-blue-900 hover:text-blue-700 underline flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3 text-blue-700" />
                                  <span>View Proof ({t.attachmentName || 'Document'})</span>
                                </button>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-extrabold text-emerald-700">+৳{t.amount.toLocaleString('en-BD')}</div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {/* 4. Charge History */}
                {historyTab === 'charges' && (
                  <div className="space-y-2">
                    {transactions.filter(t => t.type === 'charge').length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No commission charges recorded yet.
                      </div>
                    ) : (
                      transactions
                        .filter(t => t.type === 'charge')
                        .map(t => (
                          <div
                            key={t.id}
                            className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{t.userName} ({t.userEmail})</div>
                              <div className="text-slate-700 font-medium">{t.comment || 'Commission Charge / Deduction'}</div>
                              <div className="text-[10px] text-slate-400">{formatBDDateTime(t.createdAt, false)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-black text-rose-600 text-sm">-৳{t.amount.toLocaleString('en-BD')}</div>
                              <span className="text-[9px] font-bold uppercase text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                                Deducted
                              </span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER DIRECTORY & USER ACTIVITIES */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {!selectedUserId ? (
              /* ALL USER LIST VIEW */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-900" />
                    Employee User Directory
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateSuccessMsg(null);
                        setCreateErrorMsg(null);
                        setShowCreateUserModal(true);
                      }}
                      className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-200" />
                      <span>+ New A/C</span>
                    </button>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                      {users.length} Total
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    placeholder="Search user by name, email, mobile..."
                    className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-9 pr-4 text-xs outline-none focus:border-blue-900"
                  />
                </div>

                <p className="text-[11px] text-slate-500 font-semibold">
                  Select any user below to view their detailed activity history & financial logs:
                </p>

                <div className="space-y-2.5">
                  {filteredUsers.length === 0 ? (
                    <div className="bg-white rounded-xl p-6 text-center text-xs text-slate-400 border border-slate-200">
                      No matching user found.
                    </div>
                  ) : (
                    filteredUsers.map(u => (
                      <div
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-2 hover:border-blue-800 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover border"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-900 transition-colors">
                                {u.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                    u.role === 'admin'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {u.role}
                                </span>
                                {u.id !== currentUser?.id && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteErrorMsg(null);
                                      setUserToDelete(u);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Delete User Account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-slate-500 block truncate">{u.email}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-900 transition-colors" />
                        </div>

                        {u.role !== 'admin' && (
                          <div className="space-y-2 pt-2 border-t border-slate-100 font-mono text-xs">
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-slate-50 p-1.5 rounded">
                                <span className="text-[10px] text-slate-600 block">Balance</span>
                                <strong className={u.balance < 0 ? "text-rose-600 font-extrabold" : "text-slate-900"}>
                                  {u.balance < 0 ? `-৳${Math.abs(u.balance).toLocaleString('en-BD', { minimumFractionDigits: 2 })}` : `৳${u.balance.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`}
                                </strong>
                              </div>
                              <div className="bg-slate-50 p-1.5 rounded">
                                <span className="text-[10px] text-slate-600 block">Total Send</span>
                                <strong className="text-blue-900">৳{(u.totalSend || 0).toLocaleString('en-BD')}</strong>
                              </div>
                              <div
                                onClick={e => {
                                  e.stopPropagation();
                                  setChargeModalMode('debit');
                                  setChargeModalUser(u);
                                }}
                                className="bg-emerald-50/90 p-1.5 rounded border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors"
                                title="Tap to open Charge / Comm Box"
                              >
                                <span className="text-[10px] text-emerald-800 font-bold block">Commission</span>
                                <strong className="text-emerald-700">
                                  ৳{(u.totalCommission !== undefined 
                                    ? u.totalCommission 
                                    : Math.max(0, (((u.totalSend || 0) / 1000) * 7.5) - transactions.filter(t => t.userId === u.id && t.type === 'charge').reduce((acc, t) => acc + t.amount, 0))
                                  ).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </strong>
                              </div>
                            </div>

                            {/* Admin Quick Credit / Debit Controls */}
                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setChargeModalMode('credit');
                                  setChargeModalUser(u);
                                }}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-emerald-200" />
                                <span>+ Credit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setChargeModalMode('debit');
                                  setChargeModalUser(u);
                                }}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <MinusCircle className="w-3.5 h-3.5 text-rose-200" />
                                <span>- Debit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setChargeModalMode('credit');
                                  setChargeModalUser(u);
                                }}
                                className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Open Credit & Debit Control Box"
                              >
                                <Percent className="w-3.5 h-3.5 text-blue-300" />
                                <span>Box</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] font-bold text-blue-900 text-right flex items-center justify-end gap-1 pt-1 group-hover:underline">
                          <span>Tap to view user activities</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* SELECTED USER ACTIVITIES DETAIL VIEW */
              {...(() => {
                const selectedUser = users.find(u => u.id === selectedUserId);
                if (!selectedUser) return null;

                const userTxns = transactions.filter(t => t.userId === selectedUser.id);
                const filteredUserTxns = userTxns.filter(t => {
                  const currentSelectType = adminActiveFilter.selectType || 'all';
                  if (currentSelectType === 'send' && t.type !== 'send') return false;
                  if (currentSelectType === 'deposit' && t.type !== 'deposit') return false;
                  if (currentSelectType === 'commission' && t.type !== 'charge') return false;

                  if (adminActiveFilter.mobile) {
                    const q = adminActiveFilter.mobile.toLowerCase();
                    const matchMobile = t.recipientMobile?.toLowerCase().includes(q);
                    const matchComment = t.comment?.toLowerCase().includes(q);
                    if (!matchMobile && !matchComment) return false;
                  }

                  if (currentSelectType !== 'only_number') {
                    if (!matchesBDDateFilter(t.createdAt, {
                      singleDate: adminActiveFilter.singleDate,
                      fromDate: adminActiveFilter.fromDate,
                      toDate: adminActiveFilter.toDate
                    })) {
                      return false;
                    }
                  }

                  return true;
                });

                const userApprovedSend = userTxns
                  .filter(t => t.type === 'send' && t.status === 'approved')
                  .reduce((acc, t) => acc + t.amount, 0);

                const userApprovedDeposit = userTxns
                  .filter(t => t.type === 'deposit' && t.status === 'approved')
                  .reduce((acc, t) => acc + t.amount, 0);

                const userChargesTotal = userTxns
                  .filter(t => t.type === 'charge')
                  .reduce((acc, t) => acc + t.amount, 0);

                const userTotalSendAmount = selectedUser.totalSend !== undefined ? selectedUser.totalSend : userApprovedSend;
                const userGrossComm = (userTotalSendAmount / 1000) * 7.5;
                const userTotalComm = selectedUser.totalCommission !== undefined ? selectedUser.totalCommission : Math.max(0, userGrossComm - userChargesTotal);

                return (
                  <div className="space-y-4">
                    {/* Top Navigation Back Button */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedUserId(null)}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-xl border border-blue-200 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to All Users</span>
                      </button>
                      <div className="flex items-center gap-2">
                        {selectedUser.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteErrorMsg(null);
                              setUserToDelete(selectedUser);
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete A/C</span>
                          </button>
                        )}
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                          User Activity Log
                        </span>
                      </div>
                    </div>

                    {/* Selected User Hero Summary Card */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-start gap-3">
                        <img
                          src={selectedUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                          alt={selectedUser.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-blue-900 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900 truncate">{selectedUser.name}</h2>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                                {selectedUser.role}
                              </span>
                              {editingUserProfileId !== selectedUser.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUserProfileId(selectedUser.id);
                                    setAdminEditName(selectedUser.name);
                                    setAdminEditMobile(selectedUser.mobile || '');
                                    setAdminEditAddress(selectedUser.address || '');
                                    setAdminProfileMsg(null);
                                  }}
                                  className="p-1 rounded-lg text-blue-900 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                                  title="Edit User Profile"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Edit Profile</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{selectedUser.email}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedUser.mobile || 'No mobile'}</p>
                        </div>
                      </div>

                      {/* Admin Profile Edit Inline Form */}
                      {editingUserProfileId === selectedUser.id && (
                        <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 space-y-3 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                              Admin: Edit User Profile
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingUserProfileId(null)}
                              className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {adminProfileMsg && (
                            <div
                              className={`p-2 rounded-lg text-xs font-semibold ${
                                adminProfileMsg.type === 'success'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}
                            >
                              {adminProfileMsg.text}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Full Name *</label>
                              <input
                                type="text"
                                value={adminEditName}
                                onChange={e => setAdminEditName(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-900"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Mobile Number *</label>
                              <input
                                type="text"
                                value={adminEditMobile}
                                onChange={e => setAdminEditMobile(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-900"
                                required
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Address</label>
                              <input
                                type="text"
                                value={adminEditAddress}
                                onChange={e => setAdminEditAddress(e.target.value)}
                                placeholder="e.g. Dhaka, Bangladesh"
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-900"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const res = updateUserProfile(
                                  { name: adminEditName.trim(), mobile: adminEditMobile.trim(), address: adminEditAddress.trim() },
                                  selectedUser.id
                                );
                                if (res.success) {
                                  setAdminProfileMsg({ type: 'success', text: 'User profile updated!' });
                                  setTimeout(() => setEditingUserProfileId(null), 1000);
                                } else {
                                  setAdminProfileMsg({ type: 'error', text: res.message });
                                }
                              }}
                              className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Profile</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUserProfileId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* User Stats Grid */}
                      {selectedUser.role !== 'admin' && (
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 font-mono text-xs">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Current Balance</span>
                            <strong className={`text-sm font-extrabold ${selectedUser.balance < 0 ? "text-rose-600" : "text-slate-900"}`}>
                              {selectedUser.balance < 0 ? `-৳${Math.abs(selectedUser.balance).toLocaleString('en-BD', { minimumFractionDigits: 2 })}` : `৳${selectedUser.balance.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`}
                            </strong>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Comm Rate</span>
                            <strong className="text-sm font-extrabold text-blue-900">{selectedUser.commissionRate}%</strong>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Approved Send</span>
                            <strong className="text-sm font-extrabold text-blue-900">৳{userTotalSendAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div
                            onClick={() => setChargeModalUser(selectedUser)}
                            className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-all group"
                            title="Tap to open Charge Box"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-emerald-800 uppercase font-bold block">Commission</span>
                              <span className="text-[9px] font-bold uppercase bg-emerald-200/80 text-emerald-900 px-1 py-0.5 rounded">Charge Box</span>
                            </div>
                            <strong className="text-sm font-black text-emerald-700">৳{userTotalComm.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Admin Manual Credit & Debit Action Panel */}
                    {selectedUser.role !== 'admin' && (
                      <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 shadow-md border border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                              Admin Manual Credit & Debit Control
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setChargeModalMode('credit');
                              setChargeModalUser(selectedUser);
                            }}
                            className="text-[10px] font-bold text-blue-300 hover:text-blue-100 underline cursor-pointer"
                          >
                            Open Control Box
                          </button>
                        </div>

                        {inlineAdjustMsg && (
                          <div
                            className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                              inlineAdjustMsg.type === 'success'
                                ? 'bg-emerald-950 text-emerald-200 border border-emerald-800'
                                : 'bg-rose-950 text-rose-200 border border-rose-800'
                            }`}
                          >
                            {inlineAdjustMsg.type === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                            <span>{inlineAdjustMsg.text}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                              Adjustment Amount (৳) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="e.g. 1000"
                              value={inlineAdjustAmount}
                              onChange={e => setInlineAdjustAmount(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-400 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                              Reason / Reference Note
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Cash deposit / Adjustment"
                              value={inlineAdjustNote}
                              onChange={e => setInlineAdjustNote(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-emerald-400"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const amt = parseFloat(inlineAdjustAmount);
                              if (!amt || isNaN(amt) || amt <= 0) {
                                setInlineAdjustMsg({ type: 'error', text: 'Please enter a valid amount greater than 0.' });
                                return;
                              }
                              const res = manualAdjustUserBalance(selectedUser.id, 'credit', amt, inlineAdjustNote.trim());
                              if (res.success) {
                                setInlineAdjustMsg({ type: 'success', text: res.message });
                                setInlineAdjustAmount('');
                                setInlineAdjustNote('');
                              } else {
                                setInlineAdjustMsg({ type: 'error', text: res.message });
                              }
                            }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-emerald-200" />
                            <span>+ Credit (+৳{inlineAdjustAmount || '0'})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const amt = parseFloat(inlineAdjustAmount);
                              if (!amt || isNaN(amt) || amt <= 0) {
                                setInlineAdjustMsg({ type: 'error', text: 'Please enter a valid amount greater than 0.' });
                                return;
                              }
                              const res = manualAdjustUserBalance(selectedUser.id, 'debit', amt, inlineAdjustNote.trim());
                              if (res.success) {
                                setInlineAdjustMsg({ type: 'success', text: res.message });
                                setInlineAdjustAmount('');
                                setInlineAdjustNote('');
                              } else {
                                setInlineAdjustMsg({ type: 'error', text: res.message });
                              }
                            }}
                            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <MinusCircle className="w-3.5 h-3.5 text-rose-200" />
                            <span>- Debit (-৳{inlineAdjustAmount || '0'})</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Filter Card for Selected User Statement */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                          <Filter className="w-4 h-4 text-blue-900" />
                          <span>User Statement Filtering ({filteredUserTxns.length})</span>
                        </h3>
                      </div>

                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          setAdminActiveFilter({
                            selectType: adminSelectType,
                            singleDate: adminSelectType !== 'only_number' ? (adminSingleDate || undefined) : undefined,
                            fromDate: adminSelectType !== 'only_number' ? (adminFromDate || undefined) : undefined,
                            toDate: adminSelectType !== 'only_number' ? (adminToDate || undefined) : undefined,
                            mobile: adminSearchMobile.trim() || undefined
                          });
                        }}
                        className="space-y-3"
                      >
                        {/* 1. Select Dropdown */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Select Filter Category
                          </label>
                          <select
                            value={adminSelectType}
                            onChange={e => {
                              const val = e.target.value as '' | 'all' | 'send' | 'deposit' | 'commission' | 'only_number';
                              setAdminSelectType(val);
                            }}
                            className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-lg p-2 text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer"
                          >
                            <option value="">-- Select Filter Category --</option>
                            <option value="all">All</option>
                            <option value="send">Send</option>
                            <option value="deposit">Deposit</option>
                            <option value="commission">Commission</option>
                            <option value="only_number">Only Number</option>
                          </select>
                        </div>

                        {/* 2. Conditional Fields */}
                        {adminSelectType === '' ? null : adminSelectType === 'only_number' ? (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Mobile Number
                            </label>
                            <input
                              type="text"
                              value={adminSearchMobile}
                              onChange={e => setAdminSearchMobile(e.target.value)}
                              placeholder="Enter mobile number"
                              className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-lg p-2 text-xs text-slate-900 font-medium placeholder-slate-400 outline-none"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2.5 pt-1">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Single Date
                              </label>
                              <input
                                type="date"
                                value={adminSingleDate}
                                onChange={e => setAdminSingleDate(e.target.value)}
                                className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-lg p-2 text-xs text-slate-800 outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-900 mb-1">Date Range</label>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="block text-[10px] text-slate-500 font-medium mb-0.5">From Date</span>
                                  <input
                                    type="date"
                                    value={adminFromDate}
                                    onChange={e => setAdminFromDate(e.target.value)}
                                    className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-lg p-1.5 text-xs text-slate-800 outline-none"
                                  />
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-500 font-medium mb-0.5">To Date</span>
                                  <input
                                    type="date"
                                    value={adminToDate}
                                    onChange={e => setAdminToDate(e.target.value)}
                                    className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-lg p-1.5 text-xs text-slate-800 outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Mobile Number (Optional)
                              </label>
                              <input
                                type="text"
                                value={adminSearchMobile}
                                onChange={e => setAdminSearchMobile(e.target.value)}
                                placeholder="Enter mobile number"
                                className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="submit"
                            className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>Search</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              generateStatementPDF({
                                user: {
                                  name: selectedUser.name,
                                  mobile: selectedUser.mobile,
                                  email: selectedUser.email,
                                  address: selectedUser.address,
                                  balance: selectedUser.balance,
                                  totalCommission: selectedUser.totalCommission,
                                  commissionRate: selectedUser.commissionRate
                                },
                                transactions: filteredUserTxns,
                                filterInfo: {
                                  type: adminSelectType,
                                  singleDate: adminActiveFilter.singleDate,
                                  fromDate: adminActiveFilter.fromDate,
                                  toDate: adminActiveFilter.toDate,
                                  mobile: adminActiveFilter.mobile
                                }
                              });
                            }}
                            className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Download PDF</span>
                          </button>

                          {(Boolean(adminSelectType) || adminActiveFilter.singleDate || adminActiveFilter.fromDate || adminActiveFilter.toDate || adminActiveFilter.mobile) && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdminSelectType('');
                                setAdminSingleDate('');
                                setAdminFromDate('');
                                setAdminToDate('');
                                setAdminSearchMobile('');
                                setAdminActiveFilter({});
                              }}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Activity List */}
                    <div className="space-y-2.5">
                      {filteredUserTxns.length === 0 ? (
                        <div className="bg-white rounded-xl p-6 text-center border border-slate-200 text-xs text-slate-400">
                          No transaction activities found for this user.
                        </div>
                      ) : (
                        filteredUserTxns.map(t => {
                          const isCharge = t.type === 'charge';
                          const isSend = t.type === 'send';

                          return (
                            <div
                              key={t.id}
                              className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`p-2 rounded-lg ${
                                      isCharge
                                        ? 'bg-rose-100 text-rose-800'
                                        : isSend
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'bg-emerald-100 text-emerald-900'
                                    }`}
                                  >
                                    {isCharge ? (
                                      <Percent className="w-4 h-4 text-rose-700" />
                                    ) : isSend ? (
                                      <Send className="w-4 h-4" />
                                    ) : (
                                      <PlusCircle className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-900">
                                      {t.comment || (isCharge ? 'Commission Charge / Service Fee' : isSend ? 'Send Money Request' : 'Deposit Request')}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      Method: <span className="font-semibold text-slate-800">{t.method}</span>
                                      {t.recipientMobile && (
                                        <span> &bull; To: <span className="font-mono text-slate-900 font-bold">{t.recipientMobile}</span></span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right font-mono">
                                  <div className={`text-sm font-extrabold ${isCharge || isSend ? 'text-rose-600' : 'text-emerald-700'}`}>
                                    {isCharge || isSend ? '-' : '+'}৳{t.amount.toLocaleString('en-BD')}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      isCharge
                                        ? 'bg-rose-100 text-rose-800'
                                        : t.status === 'approved'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : t.status === 'pending'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {isCharge ? 'Deducted' : t.status}
                                  </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatBDDateTime(t.createdAt, false)}
                                </span>
                              </div>

                              {t.attachmentUrl && (
                                <button
                                  onClick={() =>
                                    setPreviewProof({
                                      url: t.attachmentUrl!,
                                      name: t.attachmentName || 'Receipt_Proof.pdf',
                                      userName: t.userName,
                                      amount: t.amount,
                                      method: t.method,
                                      date: t.createdAt
                                    })
                                  }
                                  className="text-[10px] font-bold text-blue-900 hover:text-blue-700 underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-blue-700" />
                                  <span>View Proof ({t.attachmentName || 'File'})</span>
                                </button>
                              )}
                            </div>

                            {(t.recipientMobile || t.adminPin) && (
                              <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 mt-1 mb-1 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
                                {/* Target Number */}
                                {t.recipientMobile && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Target Number:</span>
                                    <span className="text-xs font-mono font-black text-slate-900 tracking-wide">{t.recipientMobile}</span>
                                  </div>
                                )}

                                {/* Approved PIN */}
                                {t.adminPin && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Approved PIN:</span>
                                    <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      🔑 {t.adminPin}
                                    </span>
                                  </div>
                                )}

                                {/* Receipt Button */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceiptTxn(t)}
                                  className="bg-blue-900 hover:bg-blue-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0 ml-auto"
                                >
                                  <FileText className="w-3 h-3 text-blue-300" />
                                  <span>Receipt</span>
                                </button>
                              </div>
                            )}

                            {t.comment && (
                              <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="font-semibold text-slate-700">Note:</span> {t.comment}
                              </div>
                            )}

                            {t.rejectionReason && (
                              <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-100">
                                <span className="font-semibold">Reason:</span> {t.rejectionReason}
                              </div>
                            )}

                            {t.status === 'pending' && (
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => openApproveModal(t.id)}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingTxnId(t.id);
                                    setRejectionReason('');
                                  }}
                                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    </div>
                  </div>
                );
              })()}
            )}
          </div>
        )}

        {/* TAB 3: CREATE ACCOUNT */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-900" />
              Create Employee Account
            </h2>

            {createSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
                {createSuccessMsg}
              </div>
            )}

            {createErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
                {createErrorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Jabir User / Tanvir Ahmed"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="e.g. employee@masudtelecom.com"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={newUserMobile}
                  onChange={e => setNewUserMobile(e.target.value)}
                  placeholder="+880 17XX XXXXXX"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="Set account password"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Balance (৳)</label>
                  <input
                    type="number"
                    value={newUserBalance}
                    onChange={e => setNewUserBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newUserCommRate}
                    onChange={e => setNewUserCommRate(e.target.value)}
                    placeholder="2.5"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl text-xs mt-2 transition-all cursor-pointer"
              >
                Create Account &rarr;
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: HELP & REPORTS */}
        {activeTab === 'help' && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-900" />
              Commission & Revenue Reports
            </h2>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-900 text-sm">System Performance Overview</div>
              <p className="text-slate-600">
                Masud Telecom financial engine applies a configurable commission multiplier on all approved transfers.
              </p>
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Active Users</span>
                  <strong className="text-slate-900">{users.length}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Approvals</span>
                  <strong className="text-emerald-700">{approvedTxns.length}</strong>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-900">Admin Support Line</div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-mono">
                Email: {currentUser?.email} &bull; Hotline: +880 1780 000000
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-4">
            {selfProfileMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  selfProfileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {selfProfileMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{selfProfileMsg.text}</span>
              </div>
            )}

            {!isEditingSelfProfile ? (
              <>
                <div className="text-center">
                  <div className="relative inline-block mx-auto mb-2">
                    {currentUser?.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-full object-cover border-2 border-blue-900 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-blue-900 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-inner">
                        {getAdminInitials(currentUser?.name)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelfName(currentUser?.name || '');
                        setSelfMobile(currentUser?.mobile || '');
                        setSelfLocation(currentUser?.location || '');
                        setSelfWhatsAppNumber(currentUser?.whatsAppNumber || settings.whatsAppNumber || '+880 1780 000000');
                        setSelfWhatsAppGroupLink(currentUser?.whatsAppGroupLink || settings.whatsAppGroupLink || '');
                        setSelfAvatarUrl(currentUser?.avatarUrl || '');
                        setShowAvatarPicker(true);
                        setIsEditingSelfProfile(true);
                      }}
                      className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md border-2 border-white cursor-pointer transition-transform active:scale-95"
                      title="Change Photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{currentUser?.name || 'Jabir Ahmed'}</h2>
                  <span className="text-xs font-semibold text-blue-800 uppercase bg-blue-100 px-2.5 py-0.5 rounded inline-block mt-1">
                    System Administrator
                  </span>
                </div>

                <div className="text-xs space-y-2.5 border-t pt-3 border-slate-100">
                  {/* Email - Non-Editable / Locked */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-medium">Email</span>
                    <span className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                      {currentUser?.email}
                      <span title="Email is fixed" className="text-[10px] text-slate-400 font-sans font-normal bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Fixed
                      </span>
                    </span>
                  </div>

                  {/* Mobile - One Line */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-medium">Mobile</span>
                    <span className="font-bold text-slate-900 font-mono">{currentUser?.mobile || ''}</span>
                  </div>

                  {/* Location - One Line, Blank if empty */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-medium">Location</span>
                    <span className="font-bold text-slate-900">{currentUser?.location || ''}</span>
                  </div>

                  {/* WhatsApp Number */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      WhatsApp Number
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">
                        {currentUser?.whatsAppNumber || settings.whatsAppNumber || 'Not configured'}
                      </span>
                      {(currentUser?.whatsAppNumber || settings.whatsAppNumber) && (
                        <a
                          href={getWhatsAppNumberUrl(currentUser?.whatsAppNumber || settings.whatsAppNumber || '', 'Hello Admin, testing WhatsApp integration.')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold rounded text-[10px] flex items-center gap-1 transition-colors"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          Chat
                        </a>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp Group Link */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <LinkIcon className="w-3 h-3 text-emerald-600" />
                      WhatsApp Group Link
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 max-w-[170px] truncate text-[11px]">
                        {currentUser?.whatsAppGroupLink || settings.whatsAppGroupLink || 'Not configured'}
                      </span>
                      {(currentUser?.whatsAppGroupLink || settings.whatsAppGroupLink) && (
                        <a
                          href={getWhatsAppGroupUrl(currentUser?.whatsAppGroupLink || settings.whatsAppGroupLink || '')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold rounded text-[10px] flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          Open
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelfName(currentUser?.name || '');
                      setSelfMobile(currentUser?.mobile || '');
                      setSelfLocation(currentUser?.location || '');
                      setSelfWhatsAppNumber(currentUser?.whatsAppNumber || settings.whatsAppNumber || '+880 1780 000000');
                      setSelfWhatsAppGroupLink(currentUser?.whatsAppGroupLink || settings.whatsAppGroupLink || '');
                      setSelfAvatarUrl(currentUser?.avatarUrl || '');
                      setIsEditingSelfProfile(true);
                    }}
                    className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Profile & WhatsApp Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Admin Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSaveSelfProfile} className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs">
                      {getAdminInitials(selfName)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Edit Admin Profile</h3>
                      <p className="text-[10px] text-slate-500">Update Profile, Photo & WhatsApp Links</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingSelfProfile(false);
                      setShowAvatarPicker(false);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Photo / Avatar Change */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-800" />
                      Profile Picture
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="text-[11px] font-bold text-blue-800 hover:underline cursor-pointer"
                    >
                      {showAvatarPicker ? 'Hide Options' : 'Change Photo'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {selfAvatarUrl ? (
                      <img
                        src={selfAvatarUrl}
                        alt="Profile preview"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-900 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-900 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-inner">
                        {getAdminInitials(selfName)}
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors">
                        <UploadCloud className="w-3.5 h-3.5 text-blue-900" />
                        <span>Upload from device</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileUpload}
                          className="hidden"
                        />
                      </label>
                      {selfAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setSelfAvatarUrl('')}
                          className="block text-[10px] text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove custom photo (use initials)
                        </button>
                      )}
                    </div>
                  </div>

                  {showAvatarPicker && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Choose Preset Avatar</span>
                      <div className="flex gap-2 items-center overflow-x-auto pb-1">
                        {[
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
                          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
                          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
                          'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200'
                        ].map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelfAvatarUrl(url)}
                            className={`relative rounded-full shrink-0 border-2 transition-all p-0.5 ${
                              selfAvatarUrl === url ? 'border-blue-900 scale-105' : 'border-transparent hover:border-slate-300'
                            }`}
                          >
                            <img
                              src={url}
                              alt={`Preset ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Name Field - Editable */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={selfName}
                    onChange={e => setSelfName(e.target.value)}
                    placeholder="e.g. Jabir Ahmed"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                {/* Email Field - Strictly Non-Editable / Locked */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Email
                    </label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <Lock className="w-2.5 h-2.5 text-slate-400" /> Non-editable
                    </span>
                  </div>
                  <input
                    type="email"
                    disabled
                    readOnly
                    value={currentUser?.email || ''}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-not-allowed select-none"
                  />
                </div>

                {/* Mobile Field - Editable */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mobile
                  </label>
                  <input
                    type="text"
                    value={selfMobile}
                    onChange={e => setSelfMobile(e.target.value)}
                    placeholder="e.g. +880 1780 000000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                {/* Location Field - One Line, Editable */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={selfLocation}
                    onChange={e => setSelfLocation(e.target.value)}
                    placeholder="e.g. Dhaka, Bangladesh (or leave blank)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                {/* WhatsApp Number Field - Editable */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={selfWhatsAppNumber}
                    onChange={e => setSelfWhatsAppNumber(e.target.value)}
                    placeholder="e.g. +880 1780 000000 or 01780000000"
                    className="w-full p-2.5 bg-slate-50 border border-emerald-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Send & deposit operations automatically route to this WhatsApp number.
                  </p>
                </div>

                {/* WhatsApp Group Link Field - Editable */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                    <LinkIcon className="w-3 h-3 text-emerald-600" />
                    WhatsApp Group Link
                  </label>
                  <input
                    type="url"
                    value={selfWhatsAppGroupLink}
                    onChange={e => setSelfWhatsAppGroupLink(e.target.value)}
                    placeholder="e.g. https://chat.whatsapp.com/..."
                    className="w-full p-2.5 bg-slate-50 border border-emerald-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Send & deposit operations can also be sent directly to this WhatsApp group.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingSelfProfile(false);
                      setShowAvatarPicker(false);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Wireframe Bottom Navigation Bar matching Screenshot 1 footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black text-white border-t border-slate-800 z-50 max-w-lg mx-auto grid grid-cols-4 divide-x divide-slate-800 text-center font-bold text-sm">
        <button
          onClick={() => {
            setActiveTab('users');
            setSelectedUserId(null);
          }}
          className={`py-3.5 transition-colors ${
            activeTab === 'users' || activeTab === 'dashboard'
              ? 'bg-slate-800 text-white font-extrabold underline'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          User
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`py-3.5 transition-colors ${
            activeTab === 'create' ? 'bg-slate-800 text-white font-extrabold underline' : 'text-slate-300 hover:text-white'
          }`}
        >
          Create account
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className={`py-3.5 transition-colors ${
            activeTab === 'help' ? 'bg-slate-800 text-white font-extrabold underline' : 'text-slate-300 hover:text-white'
          }`}
        >
          Help
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3.5 transition-colors ${
            activeTab === 'profile' ? 'bg-slate-800 text-white font-extrabold underline' : 'text-slate-300 hover:text-white'
          }`}
        >
          Profile
        </button>
      </div>

      {/* Approval Confirmation PIN Modal */}
      {approvingTxnId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Confirm Approval</span>
              </div>
              <button
                onClick={() => setApprovingTxnId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const txnToApprove = transactions.find(t => t.id === approvingTxnId);
              if (!txnToApprove) return null;

              return (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="font-semibold text-slate-600">User:</span>
                      <strong className="font-bold text-slate-900">{txnToApprove.userName}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="font-semibold text-slate-600">Type:</span>
                      <strong className="uppercase font-bold text-blue-900">{txnToApprove.type} ({txnToApprove.method})</strong>
                    </div>
                    {txnToApprove.recipientMobile && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span className="font-semibold text-slate-600">Target Mobile:</span>
                        <strong className="font-mono text-slate-900 font-bold">{txnToApprove.recipientMobile}</strong>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200 text-slate-900 font-extrabold">
                      <span>Amount:</span>
                      <div className="text-right">
                        <span className="text-base font-mono text-emerald-800 block">৳{txnToApprove.amount.toLocaleString('en-BD')}</span>
                        <span className="text-[10px] font-semibold text-emerald-700 block">
                          {txnToApprove.amountInWords || amountToWords(txnToApprove.amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-blue-900" />
                        Admin 4-Digit Security PIN
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">Required</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={adminPin}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setAdminPin(val);
                        if (pinError) setPinError(null);
                      }}
                      placeholder="Enter 4-digit PIN"
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-center text-2xl font-mono font-black tracking-widest outline-none focus:border-emerald-600 focus:bg-white text-emerald-900 shadow-inner"
                    />
                    {pinError && (
                      <p className="text-[11px] text-rose-600 font-bold mt-1 text-center">{pinError}</p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1.5 text-center font-medium">
                      Manually put 4-digit PIN to approve & send instant notification to user.
                    </p>
                  </div>

                  {/* Quick Keypad Helper */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {['1', '2', '3', '4'].map(digit => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => {
                          if (adminPin.length < 4) {
                            setAdminPin(prev => prev + digit);
                          }
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        {digit}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmApproveWithPin(txnToApprove.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Confirm Approval
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovingTxnId(null)}
                      className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Rejection Cause Modal */}
      {rejectingTxnId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Decline Request</span>
              </div>
              <button
                onClick={() => setRejectingTxnId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const txnToReject = transactions.find(t => t.id === rejectingTxnId);
              return (
                <div className="space-y-3">
                  {txnToReject && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs space-y-0.5">
                      <div className="text-slate-900 font-bold">{txnToReject.userName}</div>
                      <div className="text-slate-600 font-medium">
                        {txnToReject.type.toUpperCase()} ৳{txnToReject.amount.toLocaleString('en-BD')} via {txnToReject.method}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Reject Cause / Reason (Paragraph Box):
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Type the reject cause here (e.g. Wrong mobile number, invalid transaction ID, or insufficient user balance)..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:border-rose-600 focus:bg-white text-slate-900 font-medium leading-relaxed"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      This rejection cause will be sent directly in the notification to the user.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!rejectionReason.trim()) {
                          alert('Please enter a cause for rejection before confirming.');
                          return;
                        }
                        rejectTransaction(rejectingTxnId, rejectionReason);
                        setRejectingTxnId(null);
                        setRejectionReason('');
                      }}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Confirm Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingTxnId(null)}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Proof Receipt Inspection Modal */}
      <ProofPreviewModal
        data={previewProof}
        onClose={() => setPreviewProof(null)}
      />

      {/* Official Transaction Receipt Modal */}
      {selectedReceiptTxn && (
        <ReceiptModal
          transaction={selectedReceiptTxn}
          onClose={() => setSelectedReceiptTxn(null)}
        />
      )}

      {/* Charge Box Modal */}
      {chargeModalUser && (
        <ChargeModal
          user={users.find(u => u.id === chargeModalUser.id) || chargeModalUser}
          defaultMode={chargeModalMode}
          onClose={() => setChargeModalUser(null)}
        />
      )}

      {/* WhatsApp Notice Modal for Admin */}
      <WhatsAppNoticeModal
        isOpen={showAdminWhatsAppModal}
        onClose={() => setShowAdminWhatsAppModal(false)}
        title={adminWhatsAppNoticeTitle}
        subTitle="Notice formatted and auto-copied for WhatsApp"
        formattedMessage={adminWhatsAppNotice}
        whatsAppGroupLink={currentUser?.whatsAppGroupLink || settings.whatsAppGroupLink}
        whatsAppNumber={currentUser?.whatsAppNumber || settings.whatsAppNumber}
        autoCopied={true}
      />

      {/* New Account Creation Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2 text-blue-900 font-extrabold text-base">
                <UserPlus className="w-5 h-5 text-blue-900" />
                <span>Create New User A/C</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{createSuccessMsg}</span>
              </div>
            )}

            {createErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createErrorMsg}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                handleCreateUser(e);
              }}
              className="space-y-3 text-left"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-blue-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address / User ID *
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="e.g. tanvir@masudtelecom.com"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-blue-900 focus:bg-white"
                />
                <p className="text-[10px] text-blue-900 mt-0.5 font-medium">User's email will directly serve as their User ID.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={newUserMobile}
                  onChange={e => setNewUserMobile(e.target.value)}
                  placeholder="e.g. +880 1712 345678"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-blue-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Balance (৳)</label>
                <input
                  type="number"
                  value={newUserBalance}
                  onChange={e => setNewUserBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-blue-900 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Login Password (Auto Active) *
                </label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="e.g. User@123"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-blue-900 focus:bg-white font-mono"
                />
                <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">Auto-activated immediately so the user can log in right away.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4 text-blue-200" /> Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Delete User Account</span>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{deleteErrorMsg}</span>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 text-xs">
              <div className="font-extrabold text-slate-900">{userToDelete.name}</div>
              <div className="text-slate-500 font-medium">{userToDelete.email}</div>
              <div className="text-slate-500 font-mono text-[11px]">{userToDelete.mobile}</div>
              <div className="pt-2 flex justify-between font-mono text-[11px] border-t border-slate-200 mt-2">
                <span className="text-slate-500 font-bold">Available Balance:</span>
                <span className="font-bold text-slate-900">৳{userToDelete.balance.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 space-y-1">
              <p className="text-xs text-rose-800 font-semibold">
                ⚠️ Warning: Deleting this account will permanently remove this user profile.
              </p>
              <p className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>An official PDF Statement will be auto-downloaded upon deletion for record-keeping.</span>
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleDeleteUserConfirmed}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Yes, Delete User
              </button>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Erase / Restore Metrics Figures Security Password Modal */}
      {securityModalAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xs w-full p-4 space-y-3.5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
              <div className={`flex items-center gap-1.5 font-extrabold text-sm ${securityModalAction === 'erase' ? 'text-rose-600' : 'text-blue-900'}`}>
                {securityModalAction === 'erase' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-blue-900 shrink-0" />
                )}
                <span>{securityModalAction === 'erase' ? 'Erase Verification' : 'Restore Verification'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSecurityModalAction(null);
                  setErasePassword('');
                  setEraseError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {securityModalAction === 'erase'
                ? 'Enter Admin Password to erase money figures and start new counting from this checkpoint:'
                : 'Enter Admin Password to restore all-time money figures and transaction history:'}
            </p>

            <form onSubmit={handleSecurityActionSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Demand Password
                </label>
                <div className="relative">
                  <input
                    type={showErasePasswordText ? 'text' : 'password'}
                    value={erasePassword}
                    onChange={e => {
                      setErasePassword(e.target.value);
                      setEraseError(null);
                    }}
                    placeholder="Enter Security Password"
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:bg-white pr-9 ${
                      securityModalAction === 'erase'
                        ? 'border-slate-300 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-blue-600'
                    }`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowErasePasswordText(!showErasePasswordText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    title={showErasePasswordText ? 'Hide Password' : 'Show Password'}
                  >
                    {showErasePasswordText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {eraseError && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{eraseError}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className={`flex-1 text-white font-extrabold py-2 rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                    securityModalAction === 'erase'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-900 hover:bg-blue-800'
                  }`}
                >
                  {securityModalAction === 'erase' ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Erase</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Confirm Restore</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecurityModalAction(null);
                    setErasePassword('');
                    setEraseError(null);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Document Preview Modal */}
      {previewProof && (
        <ProofPreviewModal
          data={previewProof}
          onClose={() => setPreviewProof(null)}
        />
      )}
    </div>
  );
};
