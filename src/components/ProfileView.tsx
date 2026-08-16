import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Globe,
  Bell,
  HelpCircle,
  Mail,
  LogOut,
  ChevronRight,
  Shield,
  Edit3,
  X,
  Phone,
  MessageCircle,
  Save,
  Check,
  AlertCircle,
  KeyRound,
  Sliders,
  Search,
  Camera,
  Upload,
  Image as ImageIcon,
  MapPin,
  Users,
  ExternalLink
} from 'lucide-react';
import { getWhatsAppGroupUrl, getWhatsAppNumberUrl } from '../utils/whatsappHelper';

interface ProfileViewProps {
  onBack: () => void;
}

type ModalType = 'edit_profile' | 'security' | 'language' | 'notifications' | 'help' | 'contact' | 'change_avatar' | null;

export const ProfileView: React.FC<ProfileViewProps> = ({ onBack }) => {
  const { currentUser, updateUserProfile, changeUserPassword, logout, users, settings } = useApp();

  const adminUser = users.find(u => u.role === 'admin');
  const adminWhatsAppNumber = adminUser?.whatsAppNumber || settings.whatsAppNumber || '+880 1793-567814';
  const adminWhatsAppGroup = adminUser?.whatsAppGroupLink || settings.whatsAppGroupLink || '';

  // Active modal
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Language state stored in local storage
  const [currentLang, setCurrentLang] = useState<'English' | 'Bangla'>(() => {
    const saved = localStorage.getItem('masud_telecom_lang_v1');
    return (saved === 'Bangla' || saved === 'English') ? saved : 'English';
  });

  useEffect(() => {
    localStorage.setItem('masud_telecom_lang_v1', currentLang);
  }, [currentLang]);

  // Edit Personal Profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editMobile, setEditMobile] = useState(currentUser?.mobile || '');
  const [editAddress, setEditAddress] = useState(currentUser?.address || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditMobile(currentUser.mobile || '');
      setEditAddress(currentUser.address || '');
    }
  }, [currentUser]);

  // Security & Password State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [securityPin, setSecurityPin] = useState('1234');
  const [securityMsg, setSecurityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notification Preferences State
  const [notifSettings, setNotifSettings] = useState(() => {
    const saved = localStorage.getItem('masud_telecom_notif_prefs_v1');
    return saved
      ? JSON.parse(saved)
      : { smsAlerts: true, transactionAlerts: true, securityAlerts: true, adminNews: true };
  });
  const [notifSavedMsg, setNotifSavedMsg] = useState(false);

  const toggleNotif = (key: keyof typeof notifSettings) => {
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
    localStorage.setItem('masud_telecom_notif_prefs_v1', JSON.stringify(updated));
    setNotifSavedMsg(true);
    setTimeout(() => setNotifSavedMsg(false), 2000);
  };

  // Change Avatar State
  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
  ];
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatarUrl || PRESET_AVATARS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setAvatarMsg({ type: 'error', text: isBn ? 'ফাইলের আকার ৫MB এর কম হতে হবে।' : 'File size must be under 5MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (readerEvt) => {
        const img = new window.Image();
        img.onload = () => {
          // Compress using canvas to a 250x250 square
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
            setSelectedAvatar(compressedDataUrl);
            setAvatarMsg({ type: 'success', text: isBn ? 'ছবি নির্বাচন করা হয়েছে। Save করুন।' : 'Image selected! Click Save to apply.' });
          }
        };
        img.src = readerEvt.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = () => {
    if (!selectedAvatar) return;
    const res = updateUserProfile({ avatarUrl: selectedAvatar });
    if (res.success) {
      setAvatarMsg({ type: 'success', text: isBn ? 'প্রোফাইল ছবি আপডেট করা হয়েছে!' : 'Profile picture updated successfully!' });
      setTimeout(() => {
        setActiveModal(null);
        setAvatarMsg(null);
      }, 1000);
    } else {
      setAvatarMsg({ type: 'error', text: res.message });
    }
  };

  // Help Center Search
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const isBn = currentLang === 'Bangla';
  const t = {
    title: isBn ? 'প্রোফাইল' : 'Profile',
    personalInfo: isBn ? 'ব্যক্তিগত তথ্য' : 'Personal Information',
    fullName: isBn ? 'পূর্ণ নাম' : 'Full Name',
    mobileNumber: isBn ? 'মোবাইল নম্বর' : 'Mobile Number',
    address: isBn ? 'ঠিকানা (Address)' : 'Address',
    editProfile: isBn ? 'প্রোফাইল পরিবর্তন' : 'Edit Profile',
    saveChanges: isBn ? 'সংরক্ষণ করুন' : 'Save Changes',
    cancel: isBn ? 'বাতিল' : 'Cancel',
    accountSettings: isBn ? 'অ্যাকাউন্ট সেটিংস' : 'Account Settings',
    securityPassword: isBn ? 'সিকিউরিটি ও পাসওয়ার্ড' : 'Security & Password',
    language: isBn ? 'ভাষা (Language)' : 'Language',
    notificationPrefs: isBn ? 'নোটিফিকেশন বার্তা সেটিংস' : 'Notification Preferences',
    support: isBn ? 'হেল্প ও সাপোর্ট' : 'Support',
    helpCenter: isBn ? 'সাহায্য কেন্দ্র' : 'Help Center',
    contactUs: isBn ? 'যোগাযোগ করুন' : 'Contact Us',
    logout: isBn ? 'লগআউট' : 'Logout',
    activeAccount: isBn ? 'সক্রিয় অ্যাকাউন্ট' : 'Active Account',
  };

  // Handle Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    if (!editName.trim()) {
      setProfileMsg({ type: 'error', text: isBn ? 'অনুগ্রহ করে সঠিক নাম লিখুন।' : 'Please enter a valid name.' });
      return;
    }
    if (!editMobile.trim()) {
      setProfileMsg({ type: 'error', text: isBn ? 'অনুগ্রহ করে সঠিক মোবাইল নম্বর লিখুন।' : 'Please enter a valid mobile number.' });
      return;
    }

    const res = updateUserProfile({
      name: editName.trim(),
      mobile: editMobile.trim(),
      address: editAddress.trim()
    });
    if (res.success) {
      setProfileMsg({ type: 'success', text: isBn ? 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে!' : 'Profile updated successfully!' });
      setIsEditingProfile(false);
    } else {
      setProfileMsg({ type: 'error', text: res.message });
    }
  };

  // Handle Change Password
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg(null);

    if (!currentPass) {
      setSecurityMsg({ type: 'error', text: isBn ? 'বর্তমান পাসওয়ার্ড লিখুন।' : 'Enter your current password.' });
      return;
    }
    if (!newPass || newPass.length < 4) {
      setSecurityMsg({ type: 'error', text: isBn ? 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' : 'New password must be at least 4 characters long.' });
      return;
    }
    if (newPass !== confirmPass) {
      setSecurityMsg({ type: 'error', text: isBn ? 'নতুন পাসওয়ার্ড মিলছে না।' : 'New passwords do not match.' });
      return;
    }

    const res = changeUserPassword(currentPass, newPass);
    if (res.success) {
      setSecurityMsg({ type: 'success', text: isBn ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' : 'Password changed successfully!' });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      setSecurityMsg({ type: 'error', text: res.message });
    }
  };

  // FAQs List
  const faqs = [
    {
      q: isBn ? 'টাকা কিভাবে সেন্ড করবো?' : 'How do I send money?',
      a: isBn
        ? 'Send Money মেনুতে যান, গ্রহীতার মোবাইল নম্বর এবং টাকার পরিমাণ লিখুন। পদ্ধতি নির্বাচন করে রিকোয়েস্ট পাঠান।'
        : 'Go to the Send Money tab, enter the recipient mobile number, amount, select payment method, and submit.'
    },
    {
      q: isBn ? 'ট্রানজেকশন এডিট করার সময়সীমা কতক্ষণ?' : 'What is the 10-minute transaction edit window?',
      a: isBn
        ? 'পেন্ডিং সেন্ড রিকোয়েস্ট তৈরি করার পর প্রথম ১০ মিনিটের মধ্যে ব্যবহারকারী নিজে এডিট বা ক্যানসেল করতে পারবেন।'
        : 'Users can edit or cancel any pending send request within 10 minutes of creation directly from the dashboard.'
    },
    {
      q: isBn ? 'ডিপোজিট রিকোয়েস্ট কিভাবে কাজ করে?' : 'How do Deposit requests work?',
      a: isBn
        ? 'Deposit Request পেজে গিয়ে ব্যাংক বা মোবাইল ব্যাংকিং রিসিটের ছবি অথবা বিবরণ দিন। অ্যাডমিন এটি যাচাই করে ব্যালেন্স যোগ করবেন।'
        : 'Upload your bank receipt slip or enter details in the Deposit Request section. Admin verifies and approves your balance.'
    },
    {
      q: isBn ? 'কমিশন কিভাবে হিসাব হয়?' : 'How is Commission calculated?',
      a: isBn
        ? 'প্রতি ১০০০ টাকা সেন্ড করার জন্য ৭.৫০ টাকা কমিশন অর্জিত হয়।'
        : 'Commission is automatically calculated at ৳7.50 per ৳1000 total send volume.'
    }
  ];

  const filteredFaqs = faqs.filter(
    f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 max-w-md mx-auto shadow-xl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-blue-950">{t.title}</h1>
        </div>

        {/* Selected Language Indicator */}
        <button
          onClick={() => setActiveModal('language')}
          className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200 transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-blue-700" />
          <span>{currentLang}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-5">
        
        {/* User Hero Avatar & Name Badge */}
        <div className="flex flex-col items-center justify-center text-center pt-2 pb-2">
          <div
            onClick={() => {
              setSelectedAvatar(currentUser?.avatarUrl || PRESET_AVATARS[0]);
              setAvatarMsg(null);
              setActiveModal('change_avatar');
            }}
            className="relative mb-2 group cursor-pointer"
            title="Tap to change profile picture"
          >
            <img
              src={currentUser?.avatarUrl || PRESET_AVATARS[0]}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md group-hover:brightness-95 transition-all"
            />
            <div className="absolute bottom-0 right-0 bg-blue-900 text-white p-2 rounded-full border-2 border-white shadow-md hover:bg-blue-800 transition-colors">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedAvatar(currentUser?.avatarUrl || PRESET_AVATARS[0]);
              setAvatarMsg(null);
              setActiveModal('change_avatar');
            }}
            className="text-xs font-bold text-blue-900 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full border border-blue-200 transition-colors flex items-center gap-1.5 mb-2 cursor-pointer shadow-2xs"
          >
            <Camera className="w-3.5 h-3.5 text-blue-700" />
            <span>{isBn ? 'ছবি পরিবর্তন করুন' : 'Change Profile Picture'}</span>
          </button>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {currentUser?.name || 'User'}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5 font-semibold">
            ID: {currentUser?.id || '8492-4921-A'}
          </p>
        </div>

        {/* PERSONAL INFORMATION CARD (No Email displayed; Full Name & Mobile Editable) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {t.personalInfo}
            </h3>
            {!isEditingProfile && (
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(true);
                  setProfileMsg(null);
                }}
                className="flex items-center gap-1 text-xs font-bold text-blue-900 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t.editProfile}</span>
              </button>
            )}
          </div>

          {profileMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          {!isEditingProfile ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500 block font-medium">{t.fullName}</span>
                <span className="text-sm font-bold text-slate-900">
                  {currentUser?.name || 'User'}
                </span>
              </div>
              <hr className="border-slate-100" />
              <div>
                <span className="text-xs text-slate-500 block font-medium">{t.mobileNumber}</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {currentUser?.mobile || '+880 1700 000000'}
                </span>
              </div>
              <hr className="border-slate-100" />
              <div>
                <span className="text-xs text-slate-500 block font-medium">{t.address}</span>
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                  <span>{currentUser?.address || 'Dhaka, Bangladesh'}</span>
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-2.5 text-sm font-bold text-slate-900 outline-none transition-all"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.mobileNumber} *
                </label>
                <input
                  type="text"
                  value={editMobile}
                  onChange={e => setEditMobile(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-2.5 text-sm font-bold text-slate-900 font-mono outline-none transition-all"
                  placeholder="e.g. +880 1753 704086"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.address}
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-2.5 text-sm font-bold text-slate-900 outline-none transition-all"
                  placeholder="e.g. Dhaka, Bangladesh or Mirpur 10, Dhaka"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4 text-blue-300" />
                  <span>{t.saveChanges}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileMsg(null);
                  }}
                  className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ACCOUNT SETTINGS CARD (All Options Active) */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200/80 divide-y divide-slate-100">
          <div className="px-3 pt-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            {t.accountSettings}
          </div>

          {/* Security & Password */}
          <button
            onClick={() => {
              setActiveModal('security');
              setSecurityMsg(null);
            }}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block">{t.securityPassword}</span>
                <span className="text-[11px] text-slate-500">Change password & security PIN</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Language Selection */}
          <button
            onClick={() => setActiveModal('language')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-800">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block">{t.language}</span>
                <span className="text-[11px] text-slate-500">English / বাংলা</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              <span>{currentLang}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          {/* Notification Preferences */}
          <button
            onClick={() => setActiveModal('notifications')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-800">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block">{t.notificationPrefs}</span>
                <span className="text-[11px] text-slate-500">SMS & Push notifications</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* SUPPORT CARD */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200/80 divide-y divide-slate-100">
          <div className="px-3 pt-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            {t.support}
          </div>

          <button
            onClick={() => setActiveModal('help')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-800">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block">{t.helpCenter}</span>
                <span className="text-[11px] text-slate-500">FAQs & How-to guides</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveModal('contact')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-800">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block">{t.contactUs}</span>
                <span className="text-[11px] text-slate-500">WhatsApp & Direct Helpline</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold py-3.5 px-4 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <LogOut className="w-5 h-5" />
          <span>{t.logout}</span>
        </button>

      </div>

      {/* ================= MODALS ================= */}

      {/* 1. SECURITY & PASSWORD MODAL */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-900 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">{t.securityPassword}</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {securityMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  securityMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {securityMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{securityMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pt-1">
                <KeyRound className="w-3.5 h-3.5 text-blue-900" />
                Change Password
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-colors cursor-pointer mt-1"
              >
                Update Password
              </button>
            </form>

            <hr className="border-slate-100" />

            {/* Security PIN */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Transaction Security PIN
              </h4>

              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={4}
                  value={securityPin}
                  onChange={e => setSecurityPin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl p-2.5 text-xs font-mono font-bold tracking-widest text-slate-900 text-center outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSecurityMsg({ type: 'success', text: 'Transaction PIN saved!' });
                  }}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Save PIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LANGUAGE MODAL */}
      {activeModal === 'language' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-900" />
                <h3 className="font-bold text-base text-slate-900">{t.language}</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select your preferred application display language:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentLang('English');
                  setActiveModal(null);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  currentLang === 'English'
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-black shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="text-sm block font-bold">English</span>
                  <span className="text-[11px] text-slate-500">Default System Language</span>
                </div>
                {currentLang === 'English' && <Check className="w-5 h-5 text-blue-900" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentLang('Bangla');
                  setActiveModal(null);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  currentLang === 'Bangla'
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-black shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="text-sm block font-bold">বাংলা (Bangla)</span>
                  <span className="text-[11px] text-slate-500">বাংলা ভাষা সংস্করণ</span>
                </div>
                {currentLang === 'Bangla' && <Check className="w-5 h-5 text-blue-900" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. NOTIFICATION PREFERENCES MODAL */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">{t.notificationPrefs}</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {notifSavedMsg && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Notification preferences saved!</span>
              </div>
            )}

            <div className="space-y-3 divide-y divide-slate-100">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">SMS Notifications</span>
                  <span className="text-[10px] text-slate-500">Receive instant SMS on balance changes</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifSettings.smsAlerts}
                  onChange={() => toggleNotif('smsAlerts')}
                  className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Transaction Push Alerts</span>
                  <span className="text-[10px] text-slate-500">In-app notifications for transfers</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifSettings.transactionAlerts}
                  onChange={() => toggleNotif('transactionAlerts')}
                  className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Security Alerts</span>
                  <span className="text-[10px] text-slate-500">Notify on login or password change</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifSettings.securityAlerts}
                  onChange={() => toggleNotif('securityAlerts')}
                  className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Admin Announcements</span>
                  <span className="text-[10px] text-slate-500">System updates & rate changes</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifSettings.adminNews}
                  onChange={() => toggleNotif('adminNews')}
                  className="w-5 h-5 rounded text-blue-900 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full mt-2 bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. HELP CENTER MODAL */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">{t.helpCenter}</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search FAQ */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search help topics..."
                value={faqSearch}
                onChange={e => setFaqSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-left text-xs font-bold text-slate-900 flex items-center justify-between cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="p-3 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. CONTACT US MODAL */}
      {activeModal === 'contact' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">{t.contactUs}</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Need immediate support with your account or transfers? Contact our customer service hotline directly.
            </p>

            <div className="space-y-2.5">
              {adminWhatsAppGroup && (
                <a
                  href={getWhatsAppGroupUrl(adminWhatsAppGroup)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold p-3 rounded-2xl flex items-center justify-center gap-2 text-xs transition-colors shadow-xs"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Official WhatsApp Group</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
                </a>
              )}

              {adminWhatsAppNumber && (
                <a
                  href={getWhatsAppNumberUrl(adminWhatsAppNumber, 'Hello Masud Telecom Support, I need assistance with my account.')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3 rounded-2xl flex items-center justify-center gap-2 text-xs transition-colors shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Live Chat ({adminWhatsAppNumber})</span>
                </a>
              )}

              <a
                href={`tel:${adminWhatsAppNumber ? adminWhatsAppNumber.replace(/\s+/g, '') : '+8801700000000'}`}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold p-3 rounded-2xl flex items-center justify-center gap-2 text-xs transition-colors shadow-xs"
              >
                <Phone className="w-4 h-4" />
                <span>Call Helpline: {adminWhatsAppNumber || '+880 1700 000000'}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 6. CHANGE PROFILE PICTURE MODAL */}
      {activeModal === 'change_avatar' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-900" />
                <h3 className="font-bold text-base text-slate-900">
                  {isBn ? 'প্রোফাইল ছবি পরিবর্তন' : 'Change Profile Picture'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setAvatarMsg(null);
                }}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {avatarMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  avatarMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {avatarMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{avatarMsg.text}</span>
              </div>
            )}

            {/* Current Selected Preview */}
            <div className="flex flex-col items-center justify-center pt-1 pb-2">
              <div className="relative mb-1">
                <img
                  src={selectedAvatar}
                  alt="Selected Avatar Preview"
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-900 shadow-md"
                />
                <div className="absolute bottom-0 right-0 bg-blue-900 text-white p-1.5 rounded-full border-2 border-white shadow-xs">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preview</span>
            </div>

            {/* Option 1: Upload Photo File from device */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                {isBn ? '১. নতুন ছবি আপলোড করুন (ডিভাইস থেকে)' : '1. Upload Photo from Device'}
              </label>
              <label className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 text-blue-900 font-bold p-3 rounded-2xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-blue-700" />
                <span>{isBn ? 'ছবি ব্রাউজ করুন / গ্যালারি' : 'Browse Gallery / Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Option 2: Choose from Sample Avatars */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                {isBn ? '২. প্রিসেট প্রোফাইল ছবি নির্বাচন করুন' : '2. Choose Preset Avatar'}
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(url);
                      setAvatarMsg(null);
                    }}
                    className={`relative rounded-full overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                      selectedAvatar === url
                        ? 'border-blue-900 ring-2 ring-blue-300 scale-105'
                        : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${idx + 1}`} className="w-12 h-12 rounded-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Option 3: Custom Web Image URL */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                {isBn ? '৩. ইমেজ লিঙ্ক (Image URL)' : '3. Paste Image Link (URL)'}
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={customAvatarUrl}
                  onChange={e => setCustomAvatarUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAvatarUrl.trim()) {
                      setSelectedAvatar(customAvatarUrl.trim());
                      setAvatarMsg({ type: 'success', text: isBn ? 'ইউআরএল সেট করা হয়েছে।' : 'Image URL applied.' });
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 rounded-xl cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAvatar}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-2xl shadow-sm text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4 text-blue-300" />
                <span>{isBn ? 'প্রোফাইল ছবি সংরক্ষণ করুন' : 'Save Profile Picture'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
