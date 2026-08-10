import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, CheckCircle2, Lock, Globe, Bell, HelpCircle, Mail, LogOut, ChevronRight, Shield } from 'lucide-react';

interface ProfileViewProps {
  onBack: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onBack }) => {
  const { currentUser, logout } = useApp();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 max-w-md mx-auto shadow-xl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-blue-950">Profile</h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-5">
        {/* User Hero Badge */}
        <div className="flex flex-col items-center justify-center text-center pt-2 pb-4">
          <div className="relative mb-3">
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
            />
            <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full border-2 border-white">
              <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {currentUser?.name || 'Sarah Jenkins'}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            ID: {currentUser?.id || '8492-4921-A'}
          </p>
        </div>

        {/* PERSONAL INFORMATION Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Personal Information
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-600 block">Full Name</span>
              <span className="text-sm font-semibold text-slate-900">
                {currentUser?.name || 'Sarah Jenkins'}
              </span>
            </div>
            <hr className="border-slate-100" />
            <div>
              <span className="text-xs text-slate-600 block">Email</span>
              <span className="text-sm font-semibold text-slate-900">
                {currentUser?.email || 'jabir0753704086@gmail.com'}
              </span>
            </div>
            <hr className="border-slate-100" />
            <div>
              <span className="text-xs text-slate-600 block">Mobile Number</span>
              <span className="text-sm font-semibold text-slate-900">
                {currentUser?.mobile || '+880 1753 704086'}
              </span>
            </div>
          </div>
        </div>

        {/* ACCOUNT SETTINGS Card */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200/80 divide-y divide-slate-100">
          <div className="px-3 pt-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            Account Settings
          </div>

          <button
            onClick={() => setActiveModal('Security & Password')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-900">Security & Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>

          <button
            onClick={() => setActiveModal('Language Settings')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-900">Language</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>English</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>
          </button>

          <button
            onClick={() => setActiveModal('Notification Preferences')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-900">Notification Preferences</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* SUPPORT Card */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200/80 divide-y divide-slate-100">
          <div className="px-3 pt-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            Support
          </div>

          <button
            onClick={() => setActiveModal('Help Center')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-900">Help Center</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>

          <button
            onClick={() => setActiveModal('Contact Us')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-900">Contact Us</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold py-3.5 px-4 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Info Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 space-y-3">
            <h3 className="font-bold text-lg text-slate-900">{activeModal}</h3>
            <p className="text-xs text-slate-600">
              Feature configured for Masud Telecom accounts. Support hotline: +880 1780 000000.
            </p>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full bg-slate-900 text-white font-semibold py-2 rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
