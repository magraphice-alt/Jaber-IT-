import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Transaction, NotificationItem, SystemSettings, TransferMethod } from '../types';
import { INITIAL_USERS, INITIAL_TRANSACTIONS, INITIAL_NOTIFICATIONS, INITIAL_SETTINGS, PASSWORD_STORE } from '../data/mockData';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { amountToWords } from '../utils/numberToWords';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  transactions: Transaction[];
  notifications: NotificationItem[];
  settings: SystemSettings;
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
  updateUserProfile: (data: { name?: string; mobile?: string; address?: string; avatarUrl?: string }, targetUserId?: string) => { success: boolean; message: string };
  changeUserPassword: (oldPass: string, newPass: string) => { success: boolean; message: string };
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
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
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PASSWORDS);
    return saved ? JSON.parse(saved) : PASSWORD_STORE;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_AUTH);
    return saved ? JSON.parse(saved) : null;
  });

  // Firestore Real-time Listeners & Initial Seeding
  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;
    let unsubscribeTxns: (() => void) | undefined;
    let unsubscribeNotifs: (() => void) | undefined;

    try {
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

      // 3. Notifications sync
      const notifsColRef = collection(db, 'notifications');
      unsubscribeNotifs = onSnapshot(notifsColRef, snapshot => {
        if (!snapshot.empty) {
          const fsNotifs: NotificationItem[] = snapshot.docs.map(docSnap => docSnap.data() as NotificationItem);
          setNotifications(fsNotifs);
        } else {
          INITIAL_NOTIFICATIONS.forEach(n => {
            setDoc(doc(db, 'notifications', n.id), cleanForFirestore(n)).catch(() => {});
          });
        }
      }, err => {
        console.warn('Firestore notifications listener error:', err);
      });
    } catch (e) {
      console.warn('Firestore setup error:', e);
    }

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeTxns) unsubscribeTxns();
      if (unsubscribeNotifs) unsubscribeNotifs();
    };
  }, []);

  // Sync state to local storage safely
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
    safeSaveLocal(LOCAL_STORAGE_KEY_PASSWORDS, passwords);
  }, [passwords]);

  useEffect(() => {
    if (currentUser) {
      safeSaveLocal(LOCAL_STORAGE_KEY_AUTH, currentUser);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_AUTH);
    }
  }, [currentUser]);

  // Keep active user updated when users list changes
  useEffect(() => {
    if (currentUser) {
      const match = users.find(u => u.id === currentUser.id);
      if (match) {
        setCurrentUser(match);
      }
    }
  }, [users]);

  const login = (email: string, pass: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const match = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!match) {
      return { success: false, message: 'Invalid Email address or User ID not found.' };
    }

    const storedPass = passwords[trimmedEmail];
    if (storedPass && storedPass !== pass) {
      return { success: false, message: 'Incorrect Password. Please check your credentials.' };
    }

    if (match.status === 'suspended') {
      return { success: false, message: 'Your account is currently suspended. Contact Admin.' };
    }

    setCurrentUser(match);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const createSendRequest = async (
    recipientMobile: string,
    amount: number,
    method: TransferMethod,
    comment?: string
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

    setTransactions(prev => [newTxn, ...prev]);
    setDoc(doc(db, 'transactions', newTxn.id), cleanForFirestore(newTxn)).catch(() => {});

    // Notify Admin
    const adminNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: 'admin',
      title: 'New Send Request',
      message: `${currentUser.name} requested a Send transfer of ৳${amount.toLocaleString('en-BD')} (${inWords}) to ${recipientMobile}.`,
      timestamp: 'Just now',
      read: false,
      type: 'alert'
    };
    setNotifications(prev => [adminNotif, ...prev]);
    setDoc(doc(db, 'notifications', adminNotif.id), cleanForFirestore(adminNotif)).catch(() => {});

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
      setDoc(doc(db, 'notifications', adminNotif.id), cleanForFirestore(adminNotif)).catch(err => {
        console.warn('Firestore notification error:', err);
      });

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
    setDoc(doc(db, 'notifications', userNotif.id), cleanForFirestore(userNotif)).catch(() => {});
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
    setDoc(doc(db, 'notifications', notif.id), cleanForFirestore(notif)).catch(() => {});

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
      id: `${isCredit ? 'CRD' : 'DBT'}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      type: isCredit ? 'deposit' : 'charge',
      amount: amount,
      method: isCredit ? 'Admin Credit' : 'Admin Debit',
      comment: commentText,
      status: 'approved',
      commissionEarned: 0,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    };

    setTransactions(prev => [adjustTxn, ...prev]);
    setDoc(doc(db, 'transactions', adjustTxn.id), cleanForFirestore(adjustTxn)).catch(() => {});

    // Send notification to user
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: targetUser.id,
      title: isCredit ? 'Account Credited (+ Balance)' : 'Account Debited (- Balance)',
      message: isCredit
        ? `৳${amount.toLocaleString('en-BD')} was manually credited to your balance by Admin. ${note ? `Note: ${note}` : ''}`
        : `৳${amount.toLocaleString('en-BD')} was manually debited from your balance by Admin. ${note ? `Note: ${note}` : ''}`,
      timestamp: 'Just now',
      read: false,
      type: isCredit ? 'success' : 'warning',
      txnId: adjustTxn.id
    };

    setNotifications(prev => [notif, ...prev]);
    setDoc(doc(db, 'notifications', notif.id), cleanForFirestore(notif)).catch(() => {});

    return {
      success: true,
      message: `Successfully ${isCredit ? 'credited (+)' : 'debited (-)'} ৳${amount.toLocaleString('en-BD')} for ${targetUser.name}.`
    };
  };

  const updateUserProfile = (
    data: { name?: string; mobile?: string; address?: string; avatarUrl?: string },
    targetUserId?: string
  ): { success: boolean; message: string } => {
    const userIdToUpdate = targetUserId || currentUser?.id;
    if (!userIdToUpdate) return { success: false, message: 'No user specified.' };

    const targetUser = users.find(u => u.id === userIdToUpdate) || (currentUser?.id === userIdToUpdate ? currentUser : null);
    if (!targetUser) return { success: false, message: 'User not found.' };

    const newName = data.name !== undefined ? data.name.trim() : targetUser.name;
    const newMobile = data.mobile !== undefined ? data.mobile.trim() : targetUser.mobile;
    const newAddress = data.address !== undefined ? data.address.trim() : targetUser.address;
    const newAvatar = data.avatarUrl !== undefined ? data.avatarUrl : targetUser.avatarUrl;

    if (!newName) {
      return { success: false, message: 'Full Name cannot be empty.' };
    }

    const updatedUser: User = {
      ...targetUser,
      name: newName,
      mobile: newMobile,
      address: newAddress,
      avatarUrl: newAvatar
    };

    setUsers(prev => prev.map(u => (u.id === userIdToUpdate ? updatedUser : u)));
    if (currentUser && currentUser.id === userIdToUpdate) {
      setCurrentUser(updatedUser);
    }
    setDoc(doc(db, 'users', userIdToUpdate), cleanForFirestore(updatedUser)).catch(() => {});

    return { success: true, message: 'Profile updated successfully!' };
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
    setDoc(doc(db, 'notifications', userNotif.id), cleanForFirestore(userNotif)).catch(() => {});
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

    return { success: true, message: 'Send request cancelled successfully.' };
  };

  const updateCommissionRate = (rate: number) => {
    setSettings(prev => ({ ...prev, defaultCommissionRate: rate }));
    setUsers(prev => prev.map(u => {
      const updated = { ...u, commissionRate: rate };
      setDoc(doc(db, 'users', u.id), updated).catch(() => {});
      return updated;
    }));
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

  const clearNotifications = () => {
    notifications.forEach(n => {
      deleteDoc(doc(db, 'notifications', n.id)).catch(() => {});
    });
    setNotifications([]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        transactions,
        notifications,
        settings,
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
        changeUserPassword,
        markNotificationRead,
        clearNotifications
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

