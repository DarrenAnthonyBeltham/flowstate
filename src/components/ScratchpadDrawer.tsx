'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ArrowUpRight, Trash2, Briefcase, Home } from 'lucide-react';
import { useFlowState } from '@/context/FlowStateContext';

export default function ScratchpadDrawer() {
  const {
    scratchpad,
    setScratchpad,
    isScratchpadOpen,
    setIsScratchpadOpen,
    promoteScratchpadToNote,
    workspace,
    theme,
  } = useFlowState();

  return (
    <AnimatePresence>
      {isScratchpadOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col p-5 shadow-2xl font-mono"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg ${theme.accentBgSubtle} border ${theme.accentBorder} flex items-center justify-center`}
                >
                  <Zap className={`w-4 h-4 ${theme.accentText}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                    <span>Quick Scratchpad</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${theme.badge}`}
                    >
                      {workspace === 'work' ? (
                        <Briefcase className="w-2.5 h-2.5" />
                      ) : (
                        <Home className="w-2.5 h-2.5" />
                      )}
                      <span>{workspace}</span>
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Auto-saved to {workspace} context
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScratchpadOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={scratchpad}
              onChange={(e) => setScratchpad(e.target.value)}
              placeholder={`Dump raw ${workspace} ideas, commands, or quick reminders here... Auto-saved to Supabase.`}
              className={`flex-1 w-full bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 my-4 text-sm font-mono text-slate-200 resize-none outline-none focus:${theme.accentBorder}`}
            />

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setScratchpad('')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={promoteScratchpadToNote}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold ${theme.accentBg} text-slate-950 transition-all`}
              >
                <span>Promote to Note</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
