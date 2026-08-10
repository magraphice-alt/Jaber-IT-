import React from 'react';
import { Wallet, Send, PlusCircle, Receipt, User } from 'lucide-react';

export type UserTab = 'balance' | 'send' | 'deposit' | 'statement' | 'profile';

interface UserNavbarProps {
  activeTab: UserTab;
  onTabChange: (tab: UserTab) => void;
}

export const UserNavbar: React.FC<UserNavbarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'balance' as UserTab, label: 'Balance', icon: Wallet },
    { id: 'send' as UserTab, label: 'Send', icon: Send },
    { id: 'deposit' as UserTab, label: 'Deposit', icon: PlusCircle },
    { id: 'statement' as UserTab, label: 'Statement', icon: Receipt },
    { id: 'profile' as UserTab, label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-slate-800 px-2 py-2 z-40 shadow-2xl max-w-md mx-auto">
      <div className="flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-center">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-0.5 font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
