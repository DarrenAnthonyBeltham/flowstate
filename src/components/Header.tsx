'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal,
  Flame,
  Play,
  Pause,
  RotateCcw,
  Columns,
  CheckSquare,
  FileCode2,
  Calendar,
  Zap,
  Download,
  Upload,
} from 'lucide-react';
import { useFlowState } from '@/context/FlowStateContext';
import { ViewMode } from '@/types';

export default function Header() {
  const {
    streak,
    selectedDate,
    viewMode,
    setViewMode,
    setIsScratchpadOpen,
    exportWorkspace,
    importWorkspace,
  } = useFlowState();

  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          const nextBreak = !isBreak;
          setIsBreak(nextBreak);
          return nextBreak ? 5 * 60 : 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isBreak]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        importWorkspace(event.target.result);
      }
    };
    reader.readAsText(file);
  };

  const viewOptions: { id: ViewMode; label: string; icon: React.ReactNode }[] =
    [
      {
        id: 'split',
        label: 'Command Center',
        icon: <Columns className="w-3.5 h-3.5" />,
      },
      {
        id: 'calendar',
        label: 'Calendar & Goals',
        icon: <Calendar className="w-3.5 h-3.5" />,
      },
      {
        id: 'routine',
        label: 'Routine',
        icon: <CheckSquare className="w-3.5 h-3.5" />,
      },
      {
        id: 'notes',
        label: 'Dev Notes',
        icon: <FileCode2 className="w-3.5 h-3.5" />,
      },
    ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070a12]/90 backdrop-blur-xl">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-sky-400 via-blue-500 to-emerald-400 p-px shadow-lg shadow-sky-500/15">
            <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
              <Terminal className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-slate-100 tracking-tight text-sm sm:text-base">
                flowstate<span className="text-sky-400">.dev</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                supabase::connected
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
              branch: main · target: {selectedDate}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800/90">
          {viewOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setViewMode(opt.id)}
              className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                viewMode === opt.id
                  ? 'text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {viewMode === opt.id && (
                <motion.div
                  layoutId="desktopViewTab"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute inset-0 bg-sky-400 rounded-lg"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {opt.icon}
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'
              }`}
            />
            <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
              {formatTimer(secondsLeft)}
            </span>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="p-1 hover:bg-slate-800 rounded-md text-slate-300 hover:text-sky-400 transition-colors"
            >
              {isRunning ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => {
                setIsRunning(false);
                setIsBreak(false);
                setSecondsLeft(25 * 60);
              }}
              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-colors"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{streak}d</span>
          </button>

          <button
            type="button"
            onClick={() => setIsScratchpadOpen(true)}
            className="hidden sm:flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden xl:inline">Scratchpad</span>
          </button>

          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={exportWorkspace}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-colors"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </header>
  );
}