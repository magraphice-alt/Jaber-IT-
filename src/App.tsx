import React, { useState } from 'react';
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

const MainAppContent: React.FC = () => {
  const { currentUser } = useApp();
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('balance');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // If not logged in, show Login
  if (!currentUser) {
    return (
      <>
        <Login />
        <HomeScreenInstallWidget />
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
      </div>
    );
  }

  // If Normal User logged in, render user view according to active tab
  return (
    <div className="min-h-screen bg-slate-200 text-slate-900 font-sans">
      {activeUserTab === 'balance' && (
        <UserDashboard
          onTabChange={setActiveUserTab}
          onOpenNotifications={() => setIsNotifOpen(true)}
        />
      )}

      {activeUserTab === 'send' && (
        <SendMoneyView
          onBack={() => setActiveUserTab('balance')}
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
