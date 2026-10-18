'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ArrowUpRight, Trash2 } from 'lucide-react';
import { useFlowState } from '@/context/FlowStateContext';

export default function ScratchpadDrawer() {
  const {
    scratchpad,
    setScratchpad,
    isScratchpadOpen,
    setIsScratchpadOpen,
    promoteScratchpadToNote,
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
            className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-slate-100">Quick Scratchpad</h3>
              </div>
              <button
                onClick={() => setIsScratchpadOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={scratchpad}
              onChange={(e) => setScratchpad(e.target.value)}
              placeholder="Dump raw ideas, URLs, or quick reminders here... Auto-saved locally."
              className="flex-1 w-full bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 my-4 text-sm font-mono text-slate-200 resize-none outline-none focus:border-sky-400"
            />

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setScratchpad('')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              <button
                onClick={promoteScratchpadToNote}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 transition-all"
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