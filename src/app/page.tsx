'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { FlowStateProvider, useFlowState } from '@/context/FlowStateContext';
import Header from '@/components/Header';
import RoutinePanel from '@/components/RoutinePanel';
import NotepadPanel from '@/components/NotepadPanel';
import CalendarGoalsPanel from '@/components/CalendarGoalsPanel';
import ScratchpadDrawer from '@/components/ScratchpadDrawer';
import MobileNav from '@/components/MobileNav';
import AuthScreen from '@/components/AuthScreen';
import ErrorBoundary from '@/components/ErrorBoundary';

function WorkspaceContent() {
  const {
    user,
    authLoading,
    isHydrated,
    viewMode,
    mobileTab,
    toasts,
    dismissToast,
  } = useFlowState();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060911] flex flex-col items-center justify-center gap-3 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400">
          verifying supabase auth session...
        </span>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen/>;
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#060911] flex flex-col items-center justify-center gap-3 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400">
          decrypting & hydrating workspace...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#060911] text-slate-100 overflow-x-hidden">
      <Header/>

      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-4 pb-20 lg:pb-4 min-h-0 flex flex-col">
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 flex-1 min-h-0">
          {viewMode === 'split' && (
            <>
              <div className="col-span-3 h-full min-h-0">
                <ErrorBoundary fallbackTitle="Calendar Panel Error">
                  <CalendarGoalsPanel/>
                </ErrorBoundary>
              </div>
              <div className="col-span-4 h-full min-h-0">
                <ErrorBoundary fallbackTitle="Routine Panel Error">
                  <RoutinePanel/>
                </ErrorBoundary>
              </div>
              <div className="col-span-5 h-full min-h-0">
                <ErrorBoundary fallbackTitle="Notepad Panel Error">
                  <NotepadPanel/>
                </ErrorBoundary>
              </div>
            </>
          )}

          {viewMode === 'calendar' && (
            <div className="col-span-12 h-full min-h-0">
              <ErrorBoundary fallbackTitle="Calendar Panel Error">
                <CalendarGoalsPanel/>
              </ErrorBoundary>
            </div>
          )}

          {viewMode === 'routine' && (
            <div className="col-span-12 h-full min-h-0">
              <ErrorBoundary fallbackTitle="Routine Panel Error">
                <RoutinePanel/>
              </ErrorBoundary>
            </div>
          )}

          {viewMode === 'notes' && (
            <div className="col-span-12 h-full min-h-0">
              <ErrorBoundary fallbackTitle="Notepad Panel Error">
                <NotepadPanel/>
              </ErrorBoundary>
            </div>
          )}
        </div>

        <div className="flex lg:hidden flex-col flex-1 min-h-0">
          {mobileTab === 'routine' && (
            <ErrorBoundary fallbackTitle="Routine Panel Error">
              <RoutinePanel/>
            </ErrorBoundary>
          )}
          {mobileTab === 'calendar' && (
            <ErrorBoundary fallbackTitle="Calendar Panel Error">
              <CalendarGoalsPanel/>
            </ErrorBoundary>
          )}
          {mobileTab === 'notes' && (
            <ErrorBoundary fallbackTitle="Notepad Panel Error">
              <NotepadPanel/>
            </ErrorBoundary>
          )}
        </div>
      </main>

      <ScratchpadDrawer/>
      <MobileNav/>

      <div className="fixed bottom-20 lg:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="pointer-events-auto flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#0b101d]/95 border border-slate-800 shadow-2xl backdrop-blur-xl text-xs font-mono"
            >
              <div className="flex items-center gap-2 min-w-0">
                {t.type === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/>
                )}
                {t.type === 'info' && (
                  <Info className="w-4 h-4 text-sky-400 shrink-0"/>
                )}
                {t.type === 'error' && (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0"/>
                )}
                <span className="text-slate-200 truncate">{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-500 hover:text-slate-300 shrink-0"
              >
                <X className="w-3.5 h-3.5"/>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <FlowStateProvider>
      <WorkspaceContent/>
    </FlowStateProvider>
  );
}