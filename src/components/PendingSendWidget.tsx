import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { Clock, Lock, Edit3 } from 'lucide-react';

interface PendingSendWidgetProps {
  transaction: Transaction;
  onOpenEdit: () => void;
}

export const PendingSendWidget: React.FC<PendingSendWidgetProps> = ({ transaction, onOpenEdit }) => {
  const TEN_MINS_MS = 10 * 60 * 1000;
  const createdMs = new Date(transaction.createdAt).getTime();
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (transaction.status !== 'pending') return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [transaction.status]);

  if (transaction.status !== 'pending') return null;

  const elapsedMs = Math.max(0, nowMs - createdMs);
  const remainingMs = Math.max(0, TEN_MINS_MS - elapsedMs);
  const isExpired = remainingMs <= 0;

  const totalSecondsLeft = Math.floor(remainingMs / 1000);
  const minutesLeft = Math.floor(totalSecondsLeft / 60);
  const secondsLeft = totalSecondsLeft % 60;
  const formattedTime = `${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`;
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / TEN_MINS_MS) * 100));

  return (
    <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
          {!isExpired ? (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Pending &bull; {formattedTime} edit time left</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600">Pending &bull; 10m limit passed</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenEdit();
          }}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
            !isExpired
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
          }`}
        >
          {!isExpired ? <Edit3 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          <span>{!isExpired ? 'Edit / Cancel' : 'Edit (Locked)'}</span>
        </button>
      </div>

      {/* 10-Minute Progress Time Bar */}
      {!isExpired ? (
        <div className="w-full bg-amber-200/80 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-amber-600 h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      ) : (
        <p className="text-[10px] text-slate-600 leading-tight">
          10 minutes limit reached. Contact Admin to edit or cancel this transaction.
        </p>
      )}
    </div>
  );
};
