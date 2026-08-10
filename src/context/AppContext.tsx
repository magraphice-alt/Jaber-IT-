import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Transaction, NotificationItem, SystemSettings, TransferMethod } from '../types';
import { INITIAL_USERS, INITIAL_TRANSACTIONS, INITIAL_NOTIFICATIONS, INITIAL_SETTINGS, PASSWORD_STORE } from '../data/mockData';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

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
  updateCommissionRate: (rate: number) => void;
  createUserAccount: (userData: Partial<User>, passwordStr: string) => { success: boolean; message?: string };
  chargeUserBalance: (userId: string, chargeAmount: number, reason?: string) => { success: boolean; message: string };
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
            setDoc(doc(db, 'users', u.id), u).catch(() => {});
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
            setDoc(doc(db, 'transactions', t.id), t).catch(() => {});
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
            setDoc(doc(db, 'notifications', n.id), n).catch(() => {});
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

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_TXNS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_NOTIFS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_PASSWORDS, JSON.stringify(passwords));
  }, [passwords]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(LOCAL_STORAGE_KEY_AUTH, JSON.stringify(currentUser));
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

    const newTxn: Transaction = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      type: 'send',
      recipientMobile,
      amount,
      method,
      comment: comment || `Transfer to ${recipientMobile}`,
      status: 'pending',
      commissionEarned: commission,
      createdAt: new Date().toISOString()
    };

    setTransactions(prev => [newTxn, ...prev]);
    setDoc(doc(db, 'transactions', newTxn.id), newTxn).catch(() => {});

    // Notify Admin
    const adminNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: 'admin',
      title: 'New Send Request',
      message: `${currentUser.name} requested a Send transfer of ৳${amount.toLocaleString('en-BD')} to ${recipientMobile}.`,
      timestamp: 'Just now',
      read: false,
      type: 'alert'
    };
    setNotifications(prev => [adminNotif, ...prev]);
    setDoc(doc(db, 'notifications', adminNotif.id), adminNotif).catch(() => {});

    return true;
  };

  const createDepositRequest = async (
    amount: number,
    method: TransferMethod,
    comment?: string,
    attachmentUrl?: string,
    attachmentName?: string
  ): Promise<boolean> => {
    if (!currentUser) return false;
    if (amount <= 0) return false;

    const commission = 0;

    const newTxn: Transaction = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      type: 'deposit',
      amount,
      method,
      comment: comment || 'Deposit Request',
      attachmentUrl,
      attachmentName,
      status: 'pending',
      commissionEarned: commission,
      createdAt: new Date().toISOString()
    };

    setTransactions(prev => [newTxn, ...prev]);
    setDoc(doc(db, 'transactions', newTxn.id), newTxn).catch(() => {});

    // Notify Admin
    const adminNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: 'admin',
      title: 'New Deposit Request',
      message: `${currentUser.name} submitted a Deposit Request of ৳${amount.toLocaleString('en-BD')} via ${method}.`,
      timestamp: 'Just now',
      read: false,
      type: 'alert'
    };
    setNotifications(prev => [adminNotif, ...prev]);
    setDoc(doc(db, 'notifications', adminNotif.id), adminNotif).catch(() => {});

    return true;
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
    setDoc(doc(db, 'transactions', txnId), updatedTxn).catch(() => {});

    // Update user balance & stats
    setUsers(prev =>
      prev.map(u => {
        if (u.id === txn.userId) {
          const isDeposit = txn.type === 'deposit';
          const isSend = txn.type === 'send';

          const newBalance = isDeposit ? u.balance + txn.amount : u.balance - txn.amount;
          const newTotalSend = isSend ? u.totalSend + txn.amount : u.totalSend;
          const newTotalComm = (newTotalSend / 1000) * 7.5;

          const updatedUser = {
            ...u,
            balance: newBalance,
            totalSend: newTotalSend,
            totalCommission: newTotalComm
          };
          setDoc(doc(db, 'users', u.id), updatedUser).catch(() => {});
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
    setDoc(doc(db, 'notifications', userNotif.id), userNotif).catch(() => {});
  };

  const chargeUserBalance = (userId: string, chargeAmount: number, reason?: string) => {
    if (chargeAmount <= 0) {
      return { success: false, message: 'Charge amount must be greater than 0.' };
    }
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    // Subtract charge from user available balance & user commission
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const grossComm = ((u.totalSend || 0) / 1000) * 7.5;
          const currentComm = u.totalCommission !== undefined ? u.totalCommission : grossComm;
          const updatedUser = {
            ...u,
            balance: Math.max(0, u.balance - chargeAmount),
            totalCommission: Math.max(0, currentComm - chargeAmount)
          };
          setDoc(doc(db, 'users', u.id), updatedUser).catch(() => {});
          return updatedUser;
        }
        return u;
      })
    );

    // Record charge transaction
    const chargeTxn: Transaction = {
      id: `CHG-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      type: 'charge',
      amount: chargeAmount,
      method: 'Cash',
      comment: reason || 'Service Charge / Admin Deduction',
      status: 'approved',
      commissionEarned: 0,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString()
    };
    setTransactions(prev => [chargeTxn, ...prev]);
    setDoc(doc(db, 'transactions', chargeTxn.id), chargeTxn).catch(() => {});

    // Send notification
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: targetUser.id,
      title: 'Commission Charge & Balance Deduction',
      message: `A charge of ৳${chargeAmount.toLocaleString('en-BD')} was deducted from your available balance and earned commission. Reason: ${reason || 'Admin Commission Charge'}`,
      timestamp: 'Just now',
      read: false,
      type: 'warning',
      txnId: chargeTxn.id
    };
    setNotifications(prev => [notif, ...prev]);
    setDoc(doc(db, 'notifications', notif.id), notif).catch(() => {});

    return {
      success: true,
      message: `Successfully charged ৳${chargeAmount.toLocaleString('en-BD')} from ${targetUser.name}'s balance.`
    };
  };

  const rejectTransaction = (txnId: string, reason?: string) => {
    const txn = transactions.find(t => t.id === txnId);
    if (!txn || txn.status !== 'pending') return;

    const updatedTxn = { ...txn, status: 'rejected' as const, rejectionReason: reason || 'Declined by admin' };

    setTransactions(prev =>
      prev.map(t => (t.id === txnId ? updatedTxn : t))
    );
    setDoc(doc(db, 'transactions', txnId), updatedTxn).catch(() => {});

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
    setDoc(doc(db, 'notifications', userNotif.id), userNotif).catch(() => {});
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
        updateCommissionRate,
        createUserAccount,
        chargeUserBalance,
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

