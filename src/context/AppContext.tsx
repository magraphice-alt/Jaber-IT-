import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Transaction, NotificationItem, NotificationType, SystemSettings, TransferMethod, ResendDraftData } from '../types';
import { DEFAULT_ADMIN, INITIAL_USERS, INITIAL_TRANSACTIONS, INITIAL_NOTIFICATIONS, INITIAL_SETTINGS, PASSWORD_STORE } from '../data/mockData';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { amountToWords } from '../utils/numberToWords';
import { formatBDDateTime } from '../utils/timeHelper';
import { sendPushNotificationRequest } from '../services/fcmService';
import {
  sendHomeScreenNotification,
  playNotificationSound,
  playSuccessChime,
  triggerQuickHaptic,
  updateAppBadge
} from '../utils/notificationSound';

export type UserTabType = 'balance' | 'send' | 'deposit' | 'statement' | 'profile';

export interface OperationAlertState {
  visible: boolean;
  message: string;
  subMessage?: string;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  transactions: Transaction[];
  notifications: NotificationItem[];
  settings: SystemSettings;
  operationSuccessAlert: OperationAlertState;
  activeUserTab: UserTabType;
  setActiveUserTab: (tab: UserTabType) => void;
  resendDraft: ResendDraftData | null;
  setResendDraft: (draft: ResendDraftData | null) => void;
  clearResendDraft: () => void;
  startResendTransaction: (txn: Transaction) => void;
  triggerOperationSuccess: (message?: string, subMessage?: string) => void;
  login: (email: string, pass: string) => { success: boolean; message?: string };
  logout: () => void;
  createSendRequest: (recipientMobile: string, amount: number, method: TransferMethod, comment?: string) => Promise<boolean>;
  createDepositRequest: (amount: number, method: TransferMethod, comment?: string, attachmentUrl?: string, attachmentName?: string) => Promise<boolean>;
  approveTransaction: (txnId: string, adminPin?: string) => void;
  rejectTransaction: (txnId: string, reason?: string) => void;
  editPendingSendRequest: (txnId: string, data: { recipientMobile?: string; amount?: number; method?: TransferMethod; comment?: string }) => { success: boolean; message: string };
  cancelPendingSendRequest: (txnId: string) => { success: boolean; message: string };
  updateCommissionRate: (rate: number) => void;
  createUserAccount: (userData: Partial<User>, passwordStr: string) => { success: boolean; message?: string };
  deleteUserAccount: (userId: string) => { success: boolean; message?: string };
  chargeUserBalance: (userId: string, chargeAmount: number, reason?: string) => { success: boolean; message: string };
  manualAdjustUserBalance: (userId: string, action: 'credit' | 'debit', amount: number, note?: string) => { success: boolean; message: string };
  updateUserProfile: (data: { name?: string; mobile?: string; address?: string; location?: string; whatsAppNumber?: string; whatsAppGroupLink?: string; avatarUrl?: string }, targetUserId?: string) => { success: boolean; message: string };
  updateSystemSettings: (newSettings: Partial<SystemSettings>) => void;
  changeUserPassword: (oldPass: string, newPass: string) => { success: boolean; message: string };
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  dispatchNotification: (notif: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    txnId?: string;
    url?: string;
    referenceId?: string;
    eventId?: string;
  }) => Promise<NotificationItem>;
  sendAdminBroadcast: (params: {
    title: string;
    message: string;
    target: 'all' | 'selected' | 'admins';
    selectedUserIds?: string[];
    type: NotificationType;
    url?: string;
  }) => Promise<{ success: boolean; count: number }>;
  sendTestNotification: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_USERS = 'masud_telecom_users_v1';
const LOCAL_STORAGE_KEY_TXNS = 'masud_telecom_txns_v1';
const LOCAL_STORAGE_KEY_NOTIFS = 'masud_telecom_notifs_v1';
const LOCAL_STORAGE_KEY_AUTH = 'masud_telecom_auth_user_v1';
const LOCAL_STORAGE_KEY_SETTINGS = 'masud_telecom_settings_v1';
const LOCAL_STORAGE_KEY_PASSWORDS = 'masud_telecom_passwords_v1';

// Helper to remove undefined properties before saving to Firestore
function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
}

const safeSaveLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`LocalStorage save error for ${key}:`, e);
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage or defaults
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_TXNS);
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_NOTIFS);
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [passwords, setPasswords] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PASSWORDS);
      const parsed = saved ? JSON.parse(saved) : {};
      const merged = { ...PASSWORD_STORE, ...parsed, 'jabir.ahmed10@gmail.com': 'Masud@1780' };
      localStorage.setItem(LOCAL_STORAGE_KEY_PASSWORDS, JSON.stringify(merged));
      return merged;
    } catch {
      return PASSWORD_STORE;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_AUTH);
    return saved ? JSON.parse(saved) : null;
  });

  // Active User Tab state shared across views
  const [activeUserTab, setActiveUserTab] = useState<UserTabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as UserTabType;
      if (tabParam && ['balance', 'send', 'deposit', 'statement', 'profile'].includes(tabParam)) {
        return tabParam;
      }
    }
    return 'send';
  });

  // Resend & Correct draft state for pre-filling send box after admin rejection
  const [resendDraft, setResendDraft] = useState<ResendDraftData | null>(null);

  const startResendTransaction = (txn: Transaction) => {
    if (txn.isResent) {
      triggerOperationSuccess('Receipt is Locked', `This receipt was already resent & corrected${txn.resentTxnId ? ` as ${txn.resentTxnId}` : ''}.`);
      return;
    }
    setResendDraft({
      recipientMobile: txn.recipientMobile || '',
      amount: txn.amount || 0,
      method: txn.method,
      comment: txn.comment || '',
      originalTxnId: txn.id,
      rejectionReason: txn.rejectionReason || 'Declined by Admin'
    });
    setActiveUserTab('send');
    playSuccessChime();
    triggerQuickHaptic();
  };

  const clearResendDraft = () => {
    setResendDraft(null);
  };

  // Global 1-second operation success display alert state
  const [operationSuccessAlert, setOperationSuccessAlert] = useState<OperationAlertState>({
    visible: false,
    message: 'Your operation successful!'
  });

  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerOperationSuccess = (message: string = 'Your operation successful!', subMessage?: string) => {
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }
    playSuccessChime();
    triggerQuickHaptic();
    setOperationSuccessAlert({
      visible: true,
      message,
      subMessage
    });
    // Hide precisely after 1 second (1000ms) as requested
    alertTimerRef.current = setTimeout(() => {
      setOperationSuccessAlert(prev => ({ ...prev, visible: false }));
    }, 1000);
  };

  // Reference to track already-notified notification IDs so we only alert for genuine real-time activities
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);
  const appMountTimestampRef = useRef<number>(Date.now());
  const currentUserRef = useRef<User | null>(currentUser);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Firestore Real-time Listeners & Initial Seeding
  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;
    let unsubscribeTxns: (() => void) | undefined;
    let unsubscribeNotifs: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;

    try {
      // 0. Settings sync
      const settingsDocRef = doc(db, 'settings', 'main');
      unsubscribeSettings = onSnapshot(settingsDocRef, docSnap => {
        if (docSnap.exists()) {
          const fsSettings = docSnap.data() as SystemSettings;
          setSettings(prev => ({ ...prev, ...fsSettings }));
        } else {
          setDoc(settingsDocRef, cleanForFirestore(INITIAL_SETTINGS)).catch(() => {});
        }
      }, err => {
        console.warn('Firestore settings listener error:', err);
      });

      // 1. Users sync
      const usersColRef = collection(db, 'users');
      unsubscribeUsers = onSnapshot(usersColRef, snapshot => {
        if (!snapshot.empty) {
          const fsUsers: User[] = snapshot.docs.map(docSnap => docSnap.data() as User);
          setUsers(fsUsers);
        } else {
          // Seed initial users into Firestore
          INITIAL_USERS.forEach(u => {
            setDoc(doc(db, 'users', u.id), cleanForFirestore(u)).catch(() => {});
          });
        }
      }, err => {
        console.warn('Firestore users listener error:', err);
      });

      // 2. Transactions sync
      const txnsColRef = collection(db, 'transactions');
      unsubscribeTxns = onSnapshot(txnsColRef, snapshot => {
        if (!snapshot.empty) {
          const fsTxns: Transaction[] = snapshot.docs.map(docSnap => docSnap.data() as Transaction);
          // sort descending by date
          fsTxns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setTransactions(fsTxns);
        } else {
          INITIAL_TRANSACTIONS.forEach(t => {
            setDoc(doc(db, 'transactions', t.id), cleanForFirestore(t)).catch(() => {});
          });
        }
      }, err => {
        console.warn('Firestore transactions listener error:', err);
      });

      // 3. Notifications sync with Real-time Sound Alert ONLY for incoming new events (never on open/close/reload)
      const notifsColRef = collection(db, 'notifications');
      unsubscribeNotifs = onSnapshot(notifsColRef, snapshot => {
        if (!snapshot.empty) {
          const fsNotifs: NotificationItem[] = snapshot.docs.map(docSnap => docSnap.data() as NotificationItem);
          fsNotifs.sort((a, b) => {
            const timeA = typeof a.timestamp === 'string' ? a.timestamp : '';
            const timeB = typeof b.timestamp === 'string' ? b.timestamp : '';
            return timeB.localeCompare(timeA);
          });
          setNotifications(fsNotifs);

          // Check if any incoming notification is genuinely new (created after app session started)
          if (initialLoadDoneRef.current && !snapshot.metadata.hasPendingWrites && !snapshot.metadata.fromCache) {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                const item = change.doc.data() as NotificationItem;
                if (item && !notifiedIdsRef.current.has(item.id)) {
                  notifiedIdsRef.current.add(item.id);

                  // Extract timestamp from notif ID (e.g. notif-1700000000000)
                  const parsedTime = Number(item.id.replace('notif-', ''));
                  const notifTime = !isNaN(parsedTime) && parsedTime > 1000000 ? parsedTime : Date.now();

                  // ONLY notify if created strictly after this app session loaded (with 3s buffer)
                  if (notifTime > appMountTimestampRef.current + 3000) {
                    const activeUser = currentUserRef.current;
                    const isRelevant = activeUser && (
                      item.userId === activeUser.id ||
                      (activeUser.role === 'admin' && (item.userId === 'admin' || item.userId === 'all'))
                    );
                    if (isRelevant) {
                      sendHomeScreenNotification(item.title, item.message);
                    }
                  }
                }
              }
            });
          } else {
            // Populate initial set of IDs on first load and mark session ready
            fsNotifs.forEach(n => notifiedIdsRef.current.add(n.id));
            initialLoadDoneRef.current = true;
          }
        } else {
          // When Firestore collection is empty (e.g. cleared by user), preserve empty state
          setNotifications([]);
          safeSaveLocal(LOCAL_STORAGE_KEY_NOTIFS, []);
          initialLoadDoneRef.current = true;
        }
      }, err => {
        console.warn('Firestore notifications listener error:', err);
      });
    } catch (err) {
      console.warn('Firebase connection listener failure, relying on local sync:', err);
    }

    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeTxns) unsubscribeTxns();
      if (unsubscribeNotifs) unsubscribeNotifs();
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    safeSaveLocal(LOCAL_STORAGE_KEY_USERS, users);
  }, [users]);

  useEffect(() => {
    safeSaveLocal(LOCAL_STORAGE_KEY_TXNS, transactions);
  }, [transactions]);

  useEffect(() => {
    safeSaveLocal(LOCAL_STORAGE_KEY_NOTIFS, notifications);
  }, [notifications]);

  useEffect(() => {
    safeSaveLocal(LOCAL_STORAGE_KEY_SETTINGS, settings);
  }, [settings]);

  useEffect(() => {
    if (currentUser) {
      safeSaveLocal(LOCAL_STORAGE_KEY_AUTH, currentUser);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_AUTH);
    }
  }, [currentUser]);

  // Keep currentUser state in sync with updated users list
  useEffect(() => {
    if (currentUser) {
      const refreshed = users.find(u => u.id === currentUser.id);
      if (refreshed && (refreshed.balance !== currentUser.balance || refreshed.totalSend !== currentUser.totalSend || refreshed.avatarUrl !== currentUser.avatarUrl || refreshed.name !== currentUser.name)) {
        setCurrentUser(refreshed);
      }
    }
  }, [users, currentUser]);

  // Update App Badge on Mobile Home Screen Icon & Browser Tab
  useEffect(() => {
    if (!currentUser) {
      updateAppBadge(0);
      return;
    }
    const unreadCount = notifications.filter(n => {
      if (currentUser.role === 'admin') {
        return !n.read && (n.userId === 'admin' || n.userId === 'all');
      }
      return !n.read && (n.userId === currentUser.id || n.userId === 'all');
    }).length;

    updateAppBadge(unreadCount);
  }, [notifications, currentUser]);

  const login = (email: string, pass: string): { success: boolean; message?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const isMainAdmin = cleanEmail === 'jabir.ahmed10@gmail.com';
    let targetUser = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!targetUser) {
      if (isMainAdmin) {
        targetUser = { ...DEFAULT_ADMIN };
      } else {
        return { success: false, message: 'Account not found with this email.' };
      }
    }

    if (isMainAdmin && targetUser.role !== 'admin') {
      targetUser = { ...targetUser, role: 'admin' };
    }

    const storedPass = passwords[cleanEmail] || PASSWORD_STORE[cleanEmail] || '123456';
    const isValidPass = storedPass === pass.trim() || (isMainAdmin && pass.trim() === 'Masud@1780');

    if (!isValidPass) {
      return { success: false, message: 'Invalid password. Please try again.' };
    }

    if (targetUser.status === 'blocked') {
      return { success: false, message: 'Your account is currently suspended. Please contact Admin.' };
    }

    setCurrentUser(targetUser);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const createSendRequest = async (
    recipientMobile: string,
    amount: number,
    method: TransferMethod,
    comment?: string,
    originalTxnId?: string
  ): Promise<boolean> => {
    if (!currentUser) return false;
    if (amount <= 0) return false;

    // Calculate commission based on formula: (amount / 1000) * 7.5
    const commission = (amount / 1000) * 7.5;
    const inWords = amountToWords(amount);

    const newTxn: Transaction = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      type: 'send',
      recipientMobile,
      amount,
      amountInWords: inWords,
      method,
      comment: comment || `Transfer to ${recipientMobile}`,
      status: 'pending',
      commissionEarned: commission,
      createdAt: new Date().toISOString()
    };

    // If this send request was created via Resend & Correct, lock the original rejected receipt
    const origIdToLock = originalTxnId || resendDraft?.originalTxnId;
    if (origIdToLock) {
      setTransactions(prev =>
        prev.map(t => {
          if (t.id === origIdToLock) {
            const lockedTxn: Transaction = {
              ...t,
              isResent: true,
              resentTxnId: newTxn.id,
              resentAt: new Date().toISOString()
            };
            setDoc(doc(db, 'transactions', origIdToLock), cleanForFirestore(lockedTxn)).catch(() => {});
            return lockedTxn;
          }
          return t;
        })
      );

      // Update associated notifications to show locked/resent status
      setNotifications(prev =>
        prev.map(n => {
          if (n.txnId === origIdToLock) {
            const updated = {
              ...n,
              message: n.message.includes('(Already Resent & Corrected)')
                ? n.message
                : `${n.message} (Already Resent & Corrected as ${newTxn.id})`
            };
            setDoc(doc(db, 'notifications', n.id), cleanForFirestore(updated)).catch(() => {});
            return updated;
          }
          return n;
        })
      );

      setResendDraft(null);
    }

    setTransactions(prev => [newTxn, ...prev]);
    setDoc(doc(db, 'transactions', newTxn.id), cleanForFirestore(newTxn)).catch(() => {});

    // Notify Admin
    const adminNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: 'admin',
      title: origIdToLock ? 'Resent Corrected Send Request' : 'New Send Request',
      message: `${currentUser.name} requested a ${origIdToLock ? `corrected (Resent from ${origIdToLock}) ` : ''}Send transfer of ৳${amount.toLocaleString('en-BD')} (${inWords}) to ${recipientMobile}.`,
      timestamp: 'Just now',
      read: false,
      type: 'alert'
    };
    setNotifications(prev => [adminNotif, ...prev]);
    notifiedIdsRef.current.add(adminNotif.id);
    setDoc(doc(db, 'notifications', adminNotif.id), cleanForFirestore(adminNotif)).catch(() => {});

    // Show 1-second success display
    triggerOperationSuccess('Your operation successful!', `Send Request of ৳${amount.toLocaleString('en-BD')} submitted to Admin.`);

    return true;
  };

  const createDepositRequest = async (
    amount: number,
    method: TransferMethod,
    comment?: string,
    attachmentUrl?: string,
    attachmentName?: string
  ): Promise<boolean> => {
    try {
      if (!currentUser) return false;
      if (isNaN(amount) || amount <= 0) return false;

      const commission = 0;
      const inWords = amountToWords(amount);

      const newTxn: Transaction = {
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        type: 'deposit',
        amount,
        amountInWords: inWords,
        method,
        comment: comment || 'Deposit Request',
        status: 'pending',
        commissionEarned: commission,
        createdAt: new Date().toISOString()
      };

      if (attachmentUrl) newTxn.attachmentUrl = attachmentUrl;
      if (attachmentName) newTxn.attachmentName = attachmentName;

      setTransactions(prev => [newTxn, ...prev]);
      setDoc(doc(db, 'transactions', newTxn.id), cleanForFirestore(newTxn)).catch(err => {
        console.warn('Firestore write error for deposit:', err);
      });

      // Notify Admin
      const adminNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        userId: 'admin',
        title: 'New Deposit Request',
        message: `${currentUser.name} submitted a Deposit Request of ৳${amount.toLocaleString('en-BD')} (${inWords}) via ${method}.`,
        timestamp: 'Just now',
        read: false,
        type: 'alert'
      };
      setNotifications(prev => [adminNotif, ...prev]);
      notifiedIdsRef.current.add(adminNotif.id);
      setDoc(doc(db, 'notifications', adminNotif.id), cleanForFirestore(adminNotif)).catch(err => {
        console.warn('Firestore notification error:', err);
      });

      // Show 1-second success display
      triggerOperationSuccess('Your operation successful!', `Deposit Request of ৳${amount.toLocaleString('en-BD')} submitted.`);

      return true;
    } catch (e) {
      console.error('Failed to create deposit request:', e);
      return false;
    }
  };

  const approveTransaction = (txnId: string, adminPin?: string) => {
    const txn = transactions.find(t => t.id === txnId);
    if (!txn || txn.status !== 'pending') return;

    const nowStr = new Date().toISOString();

    const updatedTxn = { ...txn, status: 'approved' as const, approvedAt: nowStr, ...(adminPin ? { adminPin } : {}) };

    // Update transaction
    setTransactions(prev =>
      prev.map(t => (t.id === txnId ? updatedTxn : t))
    );
    setDoc(doc(db, 'transactions', txnId), cleanForFirestore(updatedTxn)).catch(() => {});

    // Update user balance & stats
    setUsers(prev =>
      prev.map(u => {
        if (u.id === txn.userId) {
          const isDeposit = txn.type === 'deposit';
          const isSend = txn.type === 'send';

          const newBalance = isDeposit ? u.balance + txn.amount : u.balance - txn.amount;
          const newTotalSend = isSend ? u.totalSend + txn.amount : u.totalSend;

          // Calculate current commission balance (fallback to gross send formula if undefined)
          const currentComm = u.totalCommission !== undefined
            ? u.totalCommission
            : ((u.totalSend || 0) / 1000) * 7.5;

          // Add commission earned only for this new send transaction
          const addedComm = isSend ? (txn.commissionEarned || (txn.amount / 1000) * 7.5) : 0;
          const newTotalComm = currentComm + addedComm;

          const updatedUser = {
            ...u,
            balance: newBalance,
            totalSend: newTotalSend,
            totalCommission: newTotalComm
          };
          setDoc(doc(db, 'users', u.id), cleanForFirestore(updatedUser)).catch(() => {});
          return updatedUser;
        }
        return u;
      })
    );

    // Add user notification
    const pinNotice = adminPin ? ` [Admin PIN: ${adminPin}]` : '';
    const userNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: txn.userId,
      title: `${txn.type === 'deposit' ? 'Deposit' : 'Send'} Approved!`,
      message: `Your ${txn.type} of ৳${txn.amount.toLocaleString('en-BD')} via ${txn.method} was approved.${pinNotice} Commission earned: ৳${txn.commissionEarned.toFixed(2)}.`,
      timestamp: 'Just now',
      read: false,
      type: 'success',
      txnId: txn.id
    };
    setNotifications(prev => [userNotif, ...prev]);
    notifiedIdsRef.current.add(userNotif.id);
    setDoc(doc(db, 'notifications', userNotif.id), cleanForFirestore(userNotif)).catch(() => {});

    // Show 1-second success display
    triggerOperationSuccess('Your operation successful!', `Transaction ${txn.id} approved.`);
  };

  const chargeUserBalance = (userId: string, chargeAmount: number, reason?: string) => {
    if (chargeAmount <= 0) {
      return { success: false, message: 'Charge amount must be greater than 0.' };
    }
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    // Always deduct charge from user available balance & total commission (Debit)
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const grossComm = ((u.totalSend || 0) / 1000) * 7.5;
          const currentComm = u.totalCommission !== undefined ? u.totalCommission : grossComm;

          const newBalance = u.balance - chargeAmount;
          const newCommission = Math.max(0, currentComm - chargeAmount);

          const updatedUser = {
            ...u,
            balance: newBalance,
            totalCommission: newCommission
          };
          setDoc(doc(db, 'users', u.id), cleanForFirestore(updatedUser)).catch(() => {});
          return updatedUser;
        }
        return u;
      })
    );

    // Record charge transaction as Debit
    const chargeTxn: Transaction = {
      id: `CHG-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      type: 'charge',
      amount: chargeAmount,
      method: 'Cash',
      comment: reason || 'Service Charge / Commission Debit',
      status: 'approved',
      commissionEarned: 0,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    };
    setTransactions(prev => [chargeTxn, ...prev]);
    setDoc(doc(db, 'transactions', chargeTxn.id), cleanForFirestore(chargeTxn)).catch(() => {});

    // Send notification
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: targetUser.id,
      title: 'Commission Charge (Debit)',
      message: `A commission charge of ৳${chargeAmount.toLocaleString('en-BD')} was debited from your available balance. Reason: ${reason || 'Admin Commission Charge'}`,
      timestamp: 'Just now',
      read: false,
      type: 'warning',
      txnId: chargeTxn.id
    };
    setNotifications(prev => [notif, ...prev]);
    notifiedIdsRef.current.add(notif.id);
    setDoc(doc(db, 'notifications', notif.id), cleanForFirestore(notif)).catch(() => {});

    // Show 1-second success display
    triggerOperationSuccess('Your operation successful!', `Debited ৳${chargeAmount.toLocaleString('en-BD')} service charge.`);

    return {
      success: true,
      message: `Successfully debited ৳${chargeAmount.toLocaleString('en-BD')} from ${targetUser.name}'s balance.`
    };
  };

  const manualAdjustUserBalance = (
    userId: string,
    action: 'credit' | 'debit',
    amount: number,
    note?: string
  ): { success: boolean; message: string } => {
    if (amount <= 0) {
      return { success: false, message: 'Amount must be greater than 0.' };
    }
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    const isCredit = action === 'credit';
    const commentText = note
      ? `${isCredit ? 'Admin Manual Credit' : 'Admin Manual Debit'}: ${note}`
      : `${isCredit ? 'Admin Manual Credit' : 'Admin Manual Debit / Charge'}`;

    // Update user balance in state & Firestore
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const newBalance = isCredit ? u.balance + amount : u.balance - amount;
          const grossComm = ((u.totalSend || 0) / 1000) * 7.5;
          const currentComm = u.totalCommission !== undefined ? u.totalCommission : grossComm;
          const newCommission = isCredit ? currentComm : Math.max(0, currentComm - amount);

          const updatedUser = {
            ...u,
            balance: newBalance,
            totalCommission: newCommission
          };
          setDoc(doc(db, 'users', u.id), cleanForFirestore(updatedUser)).catch(() => {});
          return updatedUser;
        }
        return u;
      })
    );

    // Record adjustment transaction
    const adjustTxn: Transaction = {
      id: `ADJ-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      type: isCredit ? 'deposit' : 'charge',
      amount: amount,
      method: 'Cash',
      comment: commentText,
      status: 'approved',
      commissionEarned: 0,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    };
    setTransactions(prev => [adjustTxn, ...prev]);
    setDoc(doc(db, 'transactions', adjustTxn.id), cleanForFirestore(adjustTxn)).catch(() => {});

    // Send notification
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: targetUser.id,
      title: isCredit ? 'Balance Credited (Deposit)' : 'Balance Debited (Charge)',
      message: `An amount of ৳${amount.toLocaleString('en-BD')} was ${isCredit ? 'credited to' : 'debited from'} your balance. Note: ${note || 'Admin adjustment'}`,
      timestamp: 'Just now',
      read: false,
      type: isCredit ? 'success' : 'warning',
      txnId: adjustTxn.id
    };
    setNotifications(prev => [notif, ...prev]);
    notifiedIdsRef.current.add(notif.id);
    sendHomeScreenNotification(notif.title, notif.message);
    setDoc(doc(db, 'notifications', notif.id), cleanForFirestore(notif)).catch(() => {});

    // Show 1-second success display
    triggerOperationSuccess('Your operation successful!', `Balance adjusted by ৳${amount.toLocaleString('en-BD')}.`);

    return {
      success: true,
      message: `Successfully ${isCredit ? 'credited' : 'debited'} ৳${amount.toLocaleString('en-BD')} for ${targetUser.name}.`
    };
  };

  const updateUserProfile = (
    data: { name?: string; mobile?: string; address?: string; location?: string; whatsAppNumber?: string; whatsAppGroupLink?: string; avatarUrl?: string },
    targetUserId?: string
  ): { success: boolean; message: string } => {
    const userIdToUpdate = targetUserId || currentUser?.id;
    if (!userIdToUpdate) return { success: false, message: 'No user identified to update.' };

    const targetUser = users.find(u => u.id === userIdToUpdate);
    if (!targetUser) return { success: false, message: 'User record not found.' };

    const newName = data.name !== undefined ? data.name.trim() : targetUser.name;
    const newMobile = data.mobile !== undefined ? data.mobile.trim() : targetUser.mobile;
    const newAddress = data.address !== undefined ? data.address.trim() : targetUser.address;
    const newLocation = data.location !== undefined ? data.location.trim() : (targetUser.location || '');
    const newWhatsAppNumber = data.whatsAppNumber !== undefined ? data.whatsAppNumber.trim() : (targetUser.whatsAppNumber || '');
    const newWhatsAppGroupLink = data.whatsAppGroupLink !== undefined ? data.whatsAppGroupLink.trim() : (targetUser.whatsAppGroupLink || '');
    const newAvatar = data.avatarUrl !== undefined ? data.avatarUrl : targetUser.avatarUrl;

    const updatedUser: User = {
      ...targetUser,
      name: newName,
      mobile: newMobile,
      address: newAddress,
      location: newLocation,
      whatsAppNumber: newWhatsAppNumber,
      whatsAppGroupLink: newWhatsAppGroupLink,
      avatarUrl: newAvatar
    };

    setUsers(prev => prev.map(u => (u.id === userIdToUpdate ? updatedUser : u)));
    if (currentUser && currentUser.id === userIdToUpdate) {
      setCurrentUser(updatedUser);
    }
    setDoc(doc(db, 'users', userIdToUpdate), cleanForFirestore(updatedUser)).catch(() => {});

    // If updating Admin profile, also sync system settings for WhatsApp
    if (updatedUser.role === 'admin') {
      setSettings(prev => {
        const updated = {
          ...prev,
          whatsAppNumber: newWhatsAppNumber,
          whatsAppGroupLink: newWhatsAppGroupLink
        };
        setDoc(doc(db, 'settings', 'main'), cleanForFirestore(updated)).catch(() => {});
        return updated;
      });
    }

    // Show 1-second success display
    triggerOperationSuccess('Your operation successful!', 'Profile updated.');

    return { success: true, message: 'Profile updated successfully!' };
  };

  const updateSystemSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      setDoc(doc(db, 'settings', 'main'), cleanForFirestore(updated)).catch(() => {});
      return updated;
    });
    triggerOperationSuccess('Your operation successful!', 'System settings updated.');
  };

  const changeUserPassword = (oldPass: string, newPass: string): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: 'No user logged in.' };
    const userEmailKey = currentUser.email.toLowerCase();
    const storedPass = passwords[userEmailKey] || '123456';

    if (oldPass !== storedPass) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    if (!newPass || newPass.trim().length < 4) {
      return { success: false, message: 'New password must be at least 4 characters long.' };
    }

    const newPasswords = { ...passwords, [userEmailKey]: newPass.trim() };
    setPasswords(newPasswords);
    safeSaveLocal(LOCAL_STORAGE_KEY_PASSWORDS, newPasswords);

    // Show 1-second success display
    triggerOperationSuccess('Your operation successful!', 'Password changed.');

    return { success: true, message: 'Password changed successfully!' };
  };

  const rejectTransaction = (txnId: string, reason?: string) => {
    const txn = transactions.find(t => t.id === txnId);
    if (!txn || txn.status !== 'pending') return;

    const updatedTxn = { ...txn, status: 'rejected' as const, rejectionReason: reason || 'Declined by admin' };

    setTransactions(prev =>
      prev.map(t => (t.id === txnId ? updatedTxn : t))
    );
    setDoc(doc(db, 'transactions', txnId), cleanForFirestore(updatedTxn)).catch(() => {});

    const userNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: txn.userId,
      title: `${txn.type === 'deposit' ? 'Deposit' : 'Send'} Declined`,
      message: `Your ${txn.type} request of ৳${txn.amount.toLocaleString('en-BD')} was rejected. ${reason ? `Reason: ${reason}` : ''}`,
      timestamp: 'Just now',
      read: false,
      type: 'warning',
      txnId: txn.id
    };
    setNotifications(prev => [userNotif, ...prev]);
    notifiedIdsRef.current.add(userNotif.id);
    setDoc(doc(db, 'notifications', userNotif.id), cleanForFirestore(userNotif)).catch(() => {});

    // Show 1-second success display
    triggerOperationSuccess('Your operation successful!', `Transaction ${txn.id} rejected.`);
  };

  const editPendingSendRequest = (
    txnId: string,
    data: { recipientMobile?: string; amount?: number; method?: TransferMethod; comment?: string }
  ): { success: boolean; message: string } => {
    const txn = transactions.find(t => t.id === txnId);
    if (!txn) return { success: false, message: 'Transaction not found.' };
    if (txn.status !== 'pending') return { success: false, message: 'Only pending transactions can be edited.' };

    const createdTime = new Date(txn.createdAt).getTime();
    const now = Date.now();
    const diffMinutes = (now - createdTime) / (1000 * 60);

    if (diffMinutes > 10) {
      return {
        success: false,
        message: 'Time limit reached (10 mins). Contact Admin to edit or cancel this transaction.'
      };
    }

    const newAmount = data.amount !== undefined ? data.amount : txn.amount;
    const newCommission = (newAmount / 1000) * 7.5;
    const inWords = amountToWords(newAmount);

    const updatedTxn: Transaction = {
      ...txn,
      recipientMobile: data.recipientMobile !== undefined ? data.recipientMobile : txn.recipientMobile,
      amount: newAmount,
      amountInWords: inWords,
      method: data.method !== undefined ? data.method : txn.method,
      comment: data.comment !== undefined ? data.comment : txn.comment,
      commissionEarned: newCommission
    };

    setTransactions(prev => prev.map(t => (t.id === txnId ? updatedTxn : t)));
    setDoc(doc(db, 'transactions', txnId), cleanForFirestore(updatedTxn)).catch(() => {});

    // Notify Admin of edit
    const adminNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: 'admin',
      title: 'Send Request Edited',
      message: `${txn.userName} edited send request to ৳${newAmount.toLocaleString('en-BD')} (${inWords}) for ${updatedTxn.recipientMobile}.`,
      timestamp: 'Just now',
      read: false,
      type: 'alert'
    };
    setNotifications(prev => [adminNotif, ...prev]);
    notifiedIdsRef.current.add(adminNotif.id);
    setDoc(doc(db, 'notifications', adminNotif.id), cleanForFirestore(adminNotif)).catch(() => {});

    // Show 1-second success display
    triggerOperationSuccess('Your operation successful!', 'Send request updated.');

    return { success: true, message: 'Transaction updated successfully!' };
  };

  const cancelPendingSendRequest = (txnId: string): { success: boolean; message: string } => {
    const txn = transactions.find(t => t.id === txnId);
    if (!txn) return { success: false, message: 'Transaction not found.' };
    if (txn.status !== 'pending') return { success: false, message: 'Only pending transactions can be cancelled.' };

    const createdTime = new Date(txn.createdAt).getTime();
    const now = Date.now();
    const diffMinutes = (now - createdTime) / (1000 * 60);

    if (diffMinutes > 10) {
      return {
        success: false,
        message: 'Time limit reached (10 mins). Contact Admin to edit or cancel this transaction.'
      };
    }

    const updatedTxn: Transaction = {
      ...txn,
      status: 'rejected',
      rejectionReason: 'Cancelled by user within 10-minute window'
    };

    setTransactions(prev => prev.map(t => (t.id === txnId ? updatedTxn : t)));
    setDoc(doc(db, 'transactions', txnId), cleanForFirestore(updatedTxn)).catch(() => {});

    // Notify Admin of cancellation
    const cancelNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: 'admin',
      title: 'Send Request Cancelled',
      message: `${txn.userName} cancelled their pending send request of ৳${txn.amount.toLocaleString('en-BD')}.`,
      timestamp: 'Just now',
      read: false,
      type: 'warning'
    };
    setNotifications(prev => [cancelNotif, ...prev]);
    notifiedIdsRef.current.add(cancelNotif.id);
    setDoc(doc(db, 'notifications', cancelNotif.id), cleanForFirestore(cancelNotif)).catch(() => {});

    // Show 1-second success display
    triggerOperationSuccess('Your operation successful!', 'Send request cancelled.');

    return { success: true, message: 'Send request cancelled successfully.' };
  };

  const updateCommissionRate = (rate: number) => {
    setSettings(prev => ({ ...prev, defaultCommissionRate: rate }));
    setUsers(prev => prev.map(u => {
      const updated = { ...u, commissionRate: rate };
      setDoc(doc(db, 'users', u.id), updated).catch(() => {});
      return updated;
    }));
    triggerOperationSuccess('Your operation successful!', 'Commission rate updated.');
  };

  const createUserAccount = (userData: Partial<User>, passwordStr: string) => {
    if (!userData.email || !userData.name) {
      return { success: false, message: 'Name and Email are required.' };
    }

    const emailKey = userData.email.trim().toLowerCase();
    if (users.some(u => u.email.toLowerCase() === emailKey)) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const newUser: User = {
      id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: userData.name,
      email: emailKey,
      mobile: userData.mobile || '+880 1700 000000',
      role: userData.role || 'user',
      balance: userData.balance || 0,
      commissionRate: userData.commissionRate || settings.defaultCommissionRate,
      avatarUrl: userData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      totalSend: 0,
      totalCommission: 0,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    setUsers(prev => [...prev, newUser]);
    setPasswords(prev => ({ ...prev, [emailKey]: passwordStr || 'Masud@123' }));
    setDoc(doc(db, 'users', newUser.id), newUser).catch(() => {});

    triggerOperationSuccess('Your operation successful!', `User ${newUser.name} created.`);

    return { success: true };
  };

  const deleteUserAccount = (userId: string) => {
    if (currentUser?.id === userId) {
      return { success: false, message: 'You cannot delete your own active admin account.' };
    }
    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, message: 'User not found.' };
    }

    setUsers(prev => prev.filter(u => u.id !== userId));
    deleteDoc(doc(db, 'users', userId)).catch(() => {});

    triggerOperationSuccess('Your operation successful!', `Account for ${target.name} deleted.`);

    return { success: true, message: `Account for ${target.name} deleted successfully.` };
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => {
        if (n.id === id) {
          const updated = { ...n, read: true };
          setDoc(doc(db, 'notifications', id), updated).catch(() => {});
          return updated;
        }
        return n;
      })
    );
  };

  const markAllNotificationsRead = () => {
    const activeUser = currentUserRef.current;
    if (!activeUser) return;
    setNotifications(prev =>
      prev.map(n => {
        const isRelevant =
          n.userId === activeUser.id ||
          n.userId === 'all' ||
          (activeUser.role === 'admin' && (n.userId === 'admin' || n.userId === 'all'));
        if (isRelevant && !n.read) {
          const updated = { ...n, read: true };
          setDoc(doc(db, 'notifications', n.id), cleanForFirestore(updated)).catch(() => {});
          return updated;
        }
        return n;
      })
    );
  };

  const deleteNotification = (id: string) => {
    deleteDoc(doc(db, 'notifications', id)).catch(() => {});
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== id);
      safeSaveLocal(LOCAL_STORAGE_KEY_NOTIFS, filtered);
      return filtered;
    });
  };

  const clearNotifications = () => {
    const activeUser = currentUserRef.current;
    if (!activeUser) {
      notifications.forEach(n => {
        deleteDoc(doc(db, 'notifications', n.id)).catch(() => {});
      });
      setNotifications([]);
      safeSaveLocal(LOCAL_STORAGE_KEY_NOTIFS, []);
      return;
    }

    // Identify user-relevant notifications to clear
    const toClear = notifications.filter(
      n => n.userId === activeUser.id || n.userId === 'all' || (activeUser.role === 'admin' && (n.userId === 'admin' || n.userId === 'all'))
    );

    toClear.forEach(n => {
      deleteDoc(doc(db, 'notifications', n.id)).catch(() => {});
    });

    const remaining = notifications.filter(n => !toClear.some(tc => tc.id === n.id));
    setNotifications(remaining);
    safeSaveLocal(LOCAL_STORAGE_KEY_NOTIFS, remaining);
  };

  const dispatchNotification = async (notifData: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    txnId?: string;
    url?: string;
    referenceId?: string;
    eventId?: string;
  }): Promise<NotificationItem> => {
    const id = notifData.eventId || `notif-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const newNotif: NotificationItem = {
      id,
      userId: notifData.userId,
      title: notifData.title,
      message: notifData.message,
      timestamp: formatBDDateTime(new Date()),
      read: false,
      type: notifData.type,
      txnId: notifData.txnId,
      url: notifData.url || '/?tab=send',
      referenceId: notifData.referenceId || notifData.txnId,
      eventId: notifData.eventId
    };

    setNotifications(prev => {
      if (prev.some(n => n.id === id || (notifData.eventId && n.eventId === notifData.eventId))) {
        return prev;
      }
      return [newNotif, ...prev];
    });
    notifiedIdsRef.current.add(id);

    setDoc(doc(db, 'notifications', id), cleanForFirestore(newNotif)).catch(err => {
      console.warn('Firestore notification write error:', err);
    });

    const activeUser = currentUserRef.current;
    if (activeUser && (notifData.userId === activeUser.id || notifData.userId === 'all' || (activeUser.role === 'admin' && notifData.userId === 'admin'))) {
      sendHomeScreenNotification(notifData.title, notifData.message);
    }

    sendPushNotificationRequest({
      userId: notifData.userId,
      title: notifData.title,
      message: notifData.message,
      type: notifData.type,
      url: notifData.url,
      referenceId: notifData.referenceId || notifData.txnId
    }).catch(() => {});

    return newNotif;
  };

  const sendAdminBroadcast = async (params: {
    title: string;
    message: string;
    target: 'all' | 'selected' | 'admins';
    selectedUserIds?: string[];
    type: NotificationType;
    url?: string;
  }): Promise<{ success: boolean; count: number }> => {
    let count = 0;
    const url = params.url || '/?tab=send';

    if (params.target === 'all') {
      await dispatchNotification({
        userId: 'all',
        title: params.title,
        message: params.message,
        type: params.type || 'system_announcement',
        url
      });
      count = users.length;
    } else if (params.target === 'admins') {
      await dispatchNotification({
        userId: 'admin',
        title: params.title,
        message: params.message,
        type: params.type || 'system_announcement',
        url
      });
      count = users.filter(u => u.role === 'admin').length;
    } else if (params.target === 'selected' && params.selectedUserIds && params.selectedUserIds.length > 0) {
      for (const targetId of params.selectedUserIds) {
        await dispatchNotification({
          userId: targetId,
          title: params.title,
          message: params.message,
          type: params.type || 'system_announcement',
          url
        });
        count++;
      }
    }

    triggerOperationSuccess('Broadcast sent!', `Sent to ${count} recipient(s).`);
    return { success: true, count };
  };

  const sendTestNotification = async (): Promise<boolean> => {
    const activeUser = currentUserRef.current;
    if (!activeUser) return false;

    await dispatchNotification({
      userId: activeUser.id,
      title: '🔔 Test Notification',
      message: 'Your notification system is working correctly across mobile and desktop.',
      type: 'test',
      url: '/?tab=send'
    });

    triggerOperationSuccess('Test Alert Dispatched', 'Notification received and audio/vibration triggered.');
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        transactions,
        notifications,
        settings,
        operationSuccessAlert,
        activeUserTab,
        setActiveUserTab,
        resendDraft,
        setResendDraft,
        clearResendDraft,
        startResendTransaction,
        triggerOperationSuccess,
        login,
        logout,
        createSendRequest,
        createDepositRequest,
        approveTransaction,
        rejectTransaction,
        editPendingSendRequest,
        cancelPendingSendRequest,
        updateCommissionRate,
        createUserAccount,
        deleteUserAccount,
        chargeUserBalance,
        manualAdjustUserBalance,
        updateUserProfile,
        updateSystemSettings,
        changeUserPassword,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearNotifications,
        dispatchNotification,
        sendAdminBroadcast,
        sendTestNotification
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
