import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Search, Calendar, Phone, ArrowUpRight, PlusCircle, CheckCircle, Clock, AlertCircle, FileText, MapPin, Download, Filter } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { PendingSendWidget } from './PendingSendWidget';
import { EditSendModal } from './EditSendModal';
import { Transaction } from '../types';
import { generateStatementPDF } from '../utils/pdfGenerator';
import { formatBDDateTime, matchesBDDateFilter } from '../utils/timeHelper';

interface StatementViewProps {
  onOpenNotifications: () => void;
}

export const StatementView: React.FC<StatementViewProps> = ({ onOpenNotifications }) => {
  const { transactions, currentUser, notifications } = useApp();
  const [selectedReceiptTxn, setSelectedReceiptTxn] = useState<Transaction | null>(null);
  const [selectedEditTxn, setSelectedEditTxn] = useState<Transaction | null>(null);

  const [visibleCount, setVisibleCount] = useState<number>(10);

  const [selectType, setSelectType] = useState<'' | 'all' | 'send' | 'deposit' | 'commission' | 'only_number'>('');
  const [singleDate, setSingleDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchMobile, setSearchMobile] = useState('');

  const [activeFilter, setActiveFilter] = useState<{
    selectType?: '' | 'all' | 'send' | 'deposit' | 'commission' | 'only_number';
    singleDate?: string;
    fromDate?: string;
    toDate?: string;
    mobile?: string;
  }>({});

  const unreadCount = notifications.filter(
    n => !n.read && (n.userId === currentUser?.id || n.userId === 'all')
  ).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setVisibleCount(10);
    setActiveFilter({
      selectType,
      singleDate: selectType !== 'only_number' ? (singleDate || undefined) : undefined,
      fromDate: selectType !== 'only_number' ? (fromDate || undefined) : undefined,
      toDate: selectType !== 'only_number' ? (toDate || undefined) : undefined,
      mobile: searchMobile.trim() || undefined
    });
  };

  const handleClearFilter = () => {
    setSelectType('');
    setSingleDate('');
    setFromDate('');
    setToDate('');
    setSearchMobile('');
    setActiveFilter({});
    setVisibleCount(10);
  };

  // Filter user's transactions based on active filter
  const userTxns = transactions.filter(t => {
    if (t.userId !== currentUser?.id) return false;

    // Type filter
    const currentSelectType = activeFilter.selectType;
    if (currentSelectType === 'send' && t.type !== 'send') return false;
    if (currentSelectType === 'deposit' && t.type !== 'deposit') return false;
    if (currentSelectType === 'commission' && t.type !== 'charge') return false;

    // Mobile filter
    if (activeFilter.mobile) {
      const q = activeFilter.mobile.toLowerCase();
      const matchMobile = t.recipientMobile?.toLowerCase().includes(q);
      const matchComment = t.comment?.toLowerCase().includes(q);
      if (!matchMobile && !matchComment) return false;
    }

    // Date filters (only when not only_number)
    if (currentSelectType !== 'only_number') {
      if (!matchesBDDateFilter(t.createdAt, {
        singleDate: activeFilter.singleDate,
        fromDate: activeFilter.fromDate,
        toDate: activeFilter.toDate
      })) {
        return false;
      }
    }

    return true;
  });

  const handleDownloadPDF = () => {
    if (!currentUser) return;
    generateStatementPDF({
      user: {
        name: currentUser.name,
        mobile: currentUser.mobile,
        email: currentUser.email,
        address: currentUser.address,
        balance: currentUser.balance,
        totalCommission: currentUser.totalCommission,
        commissionRate: currentUser.commissionRate
      },
      transactions: userTxns,
      filterInfo: {
        type: selectType,
        singleDate: activeFilter.singleDate,
        fromDate: activeFilter.fromDate,
        toDate: activeFilter.toDate,
        mobile: activeFilter.mobile
      }
    });
  };

  const isFilterActive =
    selectType !== 'all' ||
    Boolean(activeFilter.singleDate || activeFilter.fromDate || activeFilter.toDate || activeFilter.mobile);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 max-w-md mx-auto shadow-xl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img
            src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'}
            alt="User Avatar"
            className="w-10 h-10 rounded-full object-cover border border-slate-300 shrink-0"
          />
          <div>
            <h1 className="text-lg font-bold text-blue-950 leading-tight">Statement</h1>
            <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-0.5 leading-tight mt-0.5">
              <MapPin className="w-3 h-3 text-blue-900 shrink-0" />
              <span>{currentUser?.address || 'Dhaka, Bangladesh'}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Bell className="w-6 h-6 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4">
        {/* Filters Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* 1. Select Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-900" />
                <span>Select Filter Category</span>
              </label>
              <select
                value={selectType}
                onChange={e => {
                  const val = e.target.value as '' | 'all' | 'send' | 'deposit' | 'commission' | 'only_number';
                  setSelectType(val);
                }}
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-900 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
              >
                <option value="">-- Select Filter Category --</option>
                <option value="all">All</option>
                <option value="send">Send</option>
                <option value="deposit">Deposit</option>
                <option value="commission">Commission</option>
                <option value="only_number">Only Number</option>
              </select>
            </div>

            {selectType !== '' && <hr className="border-slate-100" />}

            {/* 2. Conditional Fields based on Select Dropdown */}
            {selectType === '' ? null : selectType === 'only_number' ? (
              /* Only Number Field */
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={searchMobile}
                  onChange={e => setSearchMobile(e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 font-medium placeholder-slate-400 outline-none transition-all"
                  autoFocus
                />
              </div>
            ) : (
              /* Date Fields Table */
              <div className="space-y-4">
                {/* Single Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Single Date
                  </label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={e => setSingleDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-800 outline-none transition-all"
                  />
                </div>

                <hr className="border-slate-100" />

                {/* Date Range */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2">Date Range</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-2.5 px-3 text-xs text-slate-800 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-2.5 px-3 text-xs text-slate-800 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Optional Mobile Search */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={searchMobile}
                    onChange={e => setSearchMobile(e.target.value)}
                    placeholder="Enter mobile number"
                    className="w-full bg-white border border-slate-300 focus:border-blue-900 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons in One Line with Font Size 8 */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="submit"
                className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-2 rounded-xl shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer text-[8px] whitespace-nowrap active:scale-98"
              >
                <Search className="w-3 h-3 shrink-0" />
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex-[1.4] bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-2 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer text-[8px] whitespace-nowrap active:scale-98"
              >
                <Download className="w-3 h-3 text-emerald-200 shrink-0" />
                <span>Download PDF Statement</span>
              </button>

              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleClearFilter}
                  className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[8px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Statement History List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-900">
              Transaction Records ({userTxns.length})
            </h2>
            {userTxns.length > 0 && (
              <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Showing {Math.min(visibleCount, userTxns.length)} of {userTxns.length}
              </span>
            )}
          </div>

          {userTxns.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">No transactions match your query</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting the date or mobile filters</p>
            </div>
          ) : (
            <>
              {userTxns.slice(0, visibleCount).map(t => {
                const isSend = t.type === 'send';
                const isCharge = t.type === 'charge';
                return (
                  <div
                    key={t.id}
                    className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200/80 space-y-2 text-[9px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`p-1.5 rounded-lg text-white ${
                            isCharge
                              ? 'bg-rose-600'
                              : isSend
                              ? 'bg-blue-900'
                              : 'bg-emerald-600'
                          }`}
                        >
                          {isCharge ? (
                            <ArrowUpRight className="w-3 h-3 rotate-90" />
                          ) : isSend ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <PlusCircle className="w-3 h-3" />
                          )}
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-900 block leading-tight">
                            {t.comment || (isCharge ? 'Commission Charge / Deduction' : isSend ? `Send to ${t.recipientMobile}` : 'Deposit')}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            Method: {t.method} &bull; ID: {t.id}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isCharge
                            ? 'bg-rose-100 text-rose-800'
                            : t.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {(isCharge || t.status === 'approved') && <CheckCircle className="w-2.5 h-2.5" />}
                        {t.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                        {t.status === 'rejected' && <AlertCircle className="w-2.5 h-2.5" />}
                        <span className="capitalize">{isCharge ? 'Deducted' : t.status}</span>
                      </span>
                    </div>

                    {/* Send Money Amount & Date Row */}
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 flex items-center justify-between my-1">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase block leading-none mb-0.5">Amount</span>
                        <div className={`text-sm font-black font-mono leading-tight ${isSend || isCharge ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isSend || isCharge ? '-' : '+'}৳{t.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block leading-none mb-0.5">Date & Time</span>
                        <span className="text-[9px] text-slate-600 font-medium">{formatBDDateTime(t.createdAt, false)}</span>
                      </div>
                    </div>

                    {/* Target Number & Admin Security PIN (Under the send money amount) */}
                    {(t.recipientMobile || t.adminPin) && (
                      <div className="bg-slate-50/70 rounded-xl p-2 border border-slate-200 text-[9px] space-y-1 my-1">
                        {t.recipientMobile && (
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Target Number:</span>
                            <span className="font-mono font-bold text-slate-900 text-[9px]">{t.recipientMobile}</span>
                          </div>
                        )}
                        {t.adminPin && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Admin Security PIN:</span>
                            <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[9px]">
                              🔑 {t.adminPin}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pending Send Widget with 10-Min Timer Bar */}
                    {t.status === 'pending' && (
                      <PendingSendWidget
                        transaction={t}
                        onOpenEdit={() => setSelectedEditTxn(t)}
                      />
                    )}

                    {/* Last: View Receipt Button */}
                    <div className="pt-1.5 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedReceiptTxn(t);
                        }}
                        className="bg-blue-900 hover:bg-blue-800 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                      >
                        <FileText className="w-3 h-3 text-blue-300" />
                        <span>View Receipt</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Show More Button */}
              {visibleCount < userTxns.length && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 text-blue-900 font-bold py-2.5 px-4 rounded-xl border border-blue-200/80 shadow-xs text-[9px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Show More ({Math.min(10, userTxns.length - visibleCount)} More Records)</span>
                    <span className="bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded-full font-black text-[9px]">
                      +{Math.min(10, userTxns.length - visibleCount)}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedReceiptTxn && (
        <ReceiptModal
          transaction={selectedReceiptTxn}
          onClose={() => setSelectedReceiptTxn(null)}
        />
      )}

      {selectedEditTxn && (
        <EditSendModal
          transaction={selectedEditTxn}
          onClose={() => setSelectedEditTxn(null)}
        />
      )}
    </div>
  );
};
