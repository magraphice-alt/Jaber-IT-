import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const OperationSuccessAlert: React.FC = () => {
  const { operationSuccessAlert } = useApp();

  if (!operationSuccessAlert || !operationSuccessAlert.visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-slate-950/80 backdrop-blur-md fixed inset-0 transition-opacity" />

      <div className="relative bg-slate-900 border-2 border-emerald-500 text-white rounded-3xl p-6 shadow-2xl max-w-xs w-full text-center flex flex-col items-center gap-3.5 z-10 scale-100 animate-in zoom-in-90 duration-200">
        {/* Animated Icon Ring */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 stroke-[2.5]" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Completed</span>
          </div>

          <h3 className="text-base font-black text-white tracking-tight leading-snug">
            {operationSuccessAlert.message || 'Your operation successful!'}
          </h3>

          {operationSuccessAlert.subMessage && (
            <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
              {operationSuccessAlert.subMessage}
            </p>
          )}
        </div>

        {/* 1-second visual progress bar indicator */}
        <div className="w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
          <div className="bg-emerald-400 h-full w-full rounded-full animate-[shrink_1s_linear_forwards]" />
        </div>
      </div>
    </div>
  );
};
