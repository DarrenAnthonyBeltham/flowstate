'use client';

import React from 'react';
import { FlowStateProvider, useFlowState } from '@/context/FlowStateContext';
import Header from '@/components/Header';
import RoutinePanel from '@/components/RoutinePanel';
import NotepadPanel from '@/components/NotepadPanel';
import CalendarGoalsPanel from '@/components/CalendarGoalsPanel';
import ScratchpadDrawer from '@/components/ScratchpadDrawer';
import MobileNav from '@/components/MobileNav';

function WorkspaceContent() {
  const { isHydrated, viewMode, mobileTab } = useFlowState();

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#060911] flex flex-col items-center justify-center gap-3 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400">
          hydrating workspace from supabase...
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
                <CalendarGoalsPanel/>
              </div>
              <div className="col-span-4 h-full min-h-0">
                <RoutinePanel/>
              </div>
              <div className="col-span-5 h-full min-h-0">
                <NotepadPanel/>
              </div>
            </>
          )}

          {viewMode === 'calendar' && (
            <div className="col-span-12 h-full min-h-0">
              <CalendarGoalsPanel/>
            </div>
          )}

          {viewMode === 'routine' && (
            <div className="col-span-12 h-full min-h-0">
              <RoutinePanel/>
            </div>
          )}

          {viewMode === 'notes' && (
            <div className="col-span-12 h-full min-h-0">
              <NotepadPanel/>
            </div>
          )}
        </div>

        <div className="flex lg:hidden flex-col flex-1 min-h-0">
          {mobileTab === 'routine' && <RoutinePanel/>}
          {mobileTab === 'calendar' && <CalendarGoalsPanel/>}
          {mobileTab === 'notes' && <NotepadPanel/>}
        </div>
      </main>

      <ScratchpadDrawer/>
      <MobileNav/>
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