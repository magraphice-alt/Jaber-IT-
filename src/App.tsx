import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './components/Login';
import { UserDashboard } from './components/UserDashboard';
import { SendMoneyView } from './components/SendMoneyView';
import { DepositRequestView } from './components/DepositRequestView';
import { StatementView } from './components/StatementView';
import { ProfileView } from './components/ProfileView';
import { UserNavbar, UserTab } from './components/UserNavbar';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationDrawer } from './components/NotificationDrawer';
import { HomeScreenInstallWidget } from './components/HomeScreenInstallWidget';
import { OperationSuccessAlert } from './components/OperationSuccessAlert';

const MainAppContent: React.FC = () => {
  const { currentUser, activeUserTab, setActiveUserTab } = useApp();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Automatically reset to Send Money interface whenever a normal user logs in
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') as UserTab;
        if (tabParam && ['balance', 'send', 'deposit', 'statement', 'profile'].includes(tabParam)) {
          setActiveUserTab(tabParam);
          return;
        }
      }
      setActiveUserTab('send');
    }
  }, [currentUser?.id, currentUser?.role]);

  // If not logged in, show Login
  if (!currentUser) {
    return (
      <>
        <Login />
        <HomeScreenInstallWidget />
        <OperationSuccessAlert />
      </>
    );
  }

  // If Admin logged in, show Admin Dashboard
  if (currentUser.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
        <AdminDashboard onOpenNotifications={() => setIsNotifOpen(true)} />
        <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        <HomeScreenInstallWidget />
        <OperationSuccessAlert />
      </div>
    );
  }

  // If Normal User logged in, render user view according to active tab (auto 'send' first)
  return (
    <div className="min-h-screen bg-slate-200 text-slate-900 font-sans">
      {activeUserTab === 'send' && (
        <SendMoneyView
          onBack={() => setActiveUserTab('balance')}
          onOpenNotifications={() => setIsNotifOpen(true)}
        />
      )}

      {activeUserTab === 'balance' && (
        <UserDashboard
          onTabChange={setActiveUserTab}
          onOpenNotifications={() => setIsNotifOpen(true)}
        />
      )}

      {activeUserTab === 'deposit' && (
        <DepositRequestView
          onBack={() => setActiveUserTab('balance')}
          onOpenNotifications={() => setIsNotifOpen(true)}
        />
      )}

      {activeUserTab === 'statement' && (
        <StatementView
          onOpenNotifications={() => setIsNotifOpen(true)}
        />
      )}

      {activeUserTab === 'profile' && (
        <ProfileView
          onBack={() => setActiveUserTab('balance')}
        />
      )}

      {/* User Mobile Bottom Navigation */}
      <UserNavbar
        activeTab={activeUserTab}
        onTabChange={tab => setActiveUserTab(tab)}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />

      {/* Mobile Home Screen Shortcut / Installation Widget */}
      <HomeScreenInstallWidget />

      {/* 1-Second Global Operation Success Display Message */}
      <OperationSuccessAlert />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
