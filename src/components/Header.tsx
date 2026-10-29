'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  LogOut,
  WifiOff,
  RefreshCw,
  Headphones,
  Volume2,
  VolumeX,
  Target,
  X,
} from 'lucide-react';
import { useFlowState } from '@/context/FlowStateContext';
import { ViewMode } from '@/types';

type SoundMode = 'off' | 'brown' | 'rain' | 'drone';

export default function Header() {
  const {
    user,
    syncStatus,
    streak,
    activityDates,
    todayIso,
    logTodayStreak,
    selectedDate,
    viewMode,
    setViewMode,
    setIsScratchpadOpen,
    exportWorkspace,
    importWorkspace,
    signOut,
    focusedRoutineId,
    setFocusedRoutineId,
    routines,
    incrementRoutinePomodoro,
  } = useFlowState();

  const isTodayLogged = activityDates.includes(todayIso);

  const focusedRoutine = routines.find((r) => r.id === focusedRoutineId);

  const handleStreakClick = () => {
    logTodayStreak();
    if (viewMode !== 'calendar' && isTodayLogged) {
      setViewMode('calendar');
    }
  };

  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [soundMode, setSoundMode] = useState<SoundMode>('off');
  const [soundVolume, setSoundVolume] = useState(0.4);
  const [isSoundMenuOpen, setIsSoundMenuOpen] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<AudioNode[]>([]);
  const soundMenuContainerRef = useRef<HTMLDivElement>(null);

  const stopActiveSounds = useCallback(() => {
    activeSourcesRef.current.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {}
    });
    activeSourcesRef.current = [];
  }, []);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(soundVolume, ctx.currentTime);
        gainNode.connect(ctx.destination);
        audioContextRef.current = ctx;
        gainNodeRef.current = gainNode;
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [soundVolume]);

  const startSound = useCallback(
    (mode: SoundMode) => {
      stopActiveSounds();
      if (mode === 'off') return;

      initAudio();
      const ctx = audioContextRef.current;
      const masterGain = gainNodeRef.current;
      if (!ctx || !masterGain) return;

      if (mode === 'brown') {
        const bufferSize = ctx.sampleRate * 4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.5;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();
        activeSourcesRef.current = [noise, filter];
      } else if (mode === 'rain') {
        const bufferSize = ctx.sampleRate * 4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, ctx.currentTime);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();
        activeSourcesRef.current = [noise, filter];
      } else if (mode === 'drone') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(108, ctx.currentTime);
        osc2.frequency.setValueAtTime(112, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, ctx.currentTime);

        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.5, ctx.currentTime);

        osc1.connect(subGain);
        osc2.connect(subGain);
        subGain.connect(filter);
        filter.connect(masterGain);

        osc1.start();
        osc2.start();
        activeSourcesRef.current = [osc1, osc2, subGain, filter];
      }
    },
    [initAudio, stopActiveSounds]
  );

  const handleSelectSoundMode = (mode: SoundMode) => {
    setSoundMode(mode);
    startSound(mode);
  };

  const handleVolumeChange = (vol: number) => {
    setSoundVolume(vol);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(vol, audioContextRef.current.currentTime);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        soundMenuContainerRef.current &&
        !soundMenuContainerRef.current.contains(e.target as Node)
      ) {
        setIsSoundMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    return () => {
      stopActiveSounds();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stopActiveSounds]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          const nextBreak = !isBreak;
          setIsBreak(nextBreak);

          if (!isBreak && focusedRoutineId) {
            incrementRoutinePomodoro(focusedRoutineId);
          }

          return nextBreak ? 5 * 60 : 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isBreak, focusedRoutineId, incrementRoutinePomodoro]);

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

  const viewOptions: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
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

  const renderSyncBadge = () => {
    if (syncStatus === 'syncing') {
      return (
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          syncing...
        </span>
      );
    }
    if (syncStatus === 'offline') {
      return (
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <WifiOff className="w-2.5 h-2.5" />
          offline::cached
        </span>
      );
    }
    if (syncStatus === 'error') {
      return (
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
          sync::error
        </span>
      );
    }
    return (
      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        rls::synced
      </span>
    );
  };

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
              {renderSyncBadge()}
            </div>
            <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
              {user?.email?.split('@')[0] || 'dev'} · target: {selectedDate}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800/90">
          {viewOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
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
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                  {formatTimer(secondsLeft)}
                </span>
                {isBreak && (
                  <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/15 text-emerald-400">
                    break
                  </span>
                )}
              </div>
              {focusedRoutine && (
                <span className="text-[9px] font-mono text-sky-400 max-w-[110px] truncate flex items-center gap-1">
                  <Target className="w-2.5 h-2.5 shrink-0 text-sky-400" />
                  {focusedRoutine.title}
                </span>
              )}
            </div>

            <button
              type="button"
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
              type="button"
              onClick={() => {
                setIsRunning(false);
                setIsBreak(false);
                setSecondsLeft(25 * 60);
              }}
              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {focusedRoutine && (
              <button
                type="button"
                onClick={() => setFocusedRoutineId(null)}
                className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-rose-400 transition-colors"
                title="Unlink routine"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div ref={soundMenuContainerRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSoundMenuOpen((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs font-mono transition-colors ${
                soundMode !== 'off'
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Ambient Soundscape Mixer"
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>

            <AnimatePresence>
              {isSoundMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  className="absolute right-0 mt-2 w-56 p-3 rounded-2xl bg-[#0c1222] border border-slate-800 shadow-2xl backdrop-blur-xl z-50 space-y-3 font-mono"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-sky-400" />
                      Soundscapes
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      Procedural
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'off', label: 'Off' },
                        { id: 'brown', label: 'Brown Noise' },
                        { id: 'rain', label: 'Soft Rain' },
                        { id: 'drone', label: 'Deep Drone' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSoundMode(item.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] text-left transition-colors border ${
                          soundMode === item.id
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-semibold'
                            : 'bg-slate-900/80 border-slate-800/80 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        {soundVolume > 0 ? (
                          <Volume2 className="w-3 h-3 text-sky-400" />
                        ) : (
                          <VolumeX className="w-3 h-3 text-slate-500" />
                        )}
                        Volume
                      </span>
                      <span>{Math.round(soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={soundVolume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={handleStreakClick}
            className={`flex items-center gap-1.5 border px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
              isTodayLogged
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10'
                : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse'
            }`}
            title={
              isTodayLogged
                ? `${streak}-day streak active for today! Click to view calendar.`
                : 'Click to log today’s streak!'
            }
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                isTodayLogged
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-amber-300 text-amber-300'
              }`}
            />
            <span>{streak}d</span>
            {!isTodayLogged && (
              <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1 rounded-sm">
                +1
              </span>
            )}
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
              title="Export Backup JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-colors"
              title="Import Backup JSON"
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

          <button
            type="button"
            onClick={signOut}
            className="p-2 bg-slate-900 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
