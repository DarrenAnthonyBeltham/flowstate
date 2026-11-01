'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Calendar, FileCode2, Zap } from 'lucide-react';
import { useFlowState } from '@/context/FlowStateContext';

export default function MobileNav() {
  const { mobileTab, setMobileTab, setIsScratchpadOpen, theme } = useFlowState();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-800/80 bg-[#070a12]/95 backdrop-blur-xl pb-safe">
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto px-2 font-mono">
        <button
          type="button"
          onClick={() => setMobileTab('routine')}
          className={`relative flex flex-col items-center justify-center gap-1 text-[11px] ${
            mobileTab === 'routine'
              ? `${theme.accentText} font-semibold`
              : 'text-slate-400'
          }`}
        >
          {mobileTab === 'routine' && (
            <motion.div
              layoutId="mobileNavIndicator"
              className={`absolute top-0 w-10 h-0.5 ${theme.accentBg} rounded-full`}
            />
          )}
          <CheckSquare className="w-4 h-4" />
          <span>Routine</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('calendar')}
          className={`relative flex flex-col items-center justify-center gap-1 text-[11px] ${
            mobileTab === 'calendar'
              ? `${theme.accentText} font-semibold`
              : 'text-slate-400'
          }`}
        >
          {mobileTab === 'calendar' && (
            <motion.div
              layoutId="mobileNavIndicator"
              className={`absolute top-0 w-10 h-0.5 ${theme.accentBg} rounded-full`}
            />
          )}
          <Calendar className="w-4 h-4" />
          <span>Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('notes')}
          className={`relative flex flex-col items-center justify-center gap-1 text-[11px] ${
            mobileTab === 'notes'
              ? `${theme.accentText} font-semibold`
              : 'text-slate-400'
          }`}
        >
          {mobileTab === 'notes' && (
            <motion.div
              layoutId="mobileNavIndicator"
              className={`absolute top-0 w-10 h-0.5 ${theme.accentBg} rounded-full`}
            />
          )}
          <FileCode2 className="w-4 h-4" />
          <span>Notes</span>
        </button>

        <button
          type="button"
          onClick={() => setIsScratchpadOpen(true)}
          className="flex flex-col items-center justify-center gap-1 text-[11px] text-slate-400 active:text-sky-400"
        >
          <Zap className={`w-4 h-4 ${theme.accentText}`} />
          <span>Scratch</span>
        </button>
      </div>
    </nav>
  );
}
