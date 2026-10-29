'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Check,
  Clock,
  RotateCcw,
  Trash2,
  Edit3,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  X,
  Target,
  CalendarDays,
  Sparkle,
} from 'lucide-react';
import { useFlowState } from '@/context/FlowStateContext';
import { RoutineItem, TimePeriod, Priority, RoutineCategory } from '@/types';
import { CustomSelect } from '@/components/ui/CustomControls';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PERIOD_FILTERS: {
  id: 'all' | TimePeriod;
  label: string;
  icon?: React.ReactNode;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'morning', label: 'Morning', icon: <Sun className="w-3 h-3" /> },
  { id: 'afternoon', label: 'Afternoon', icon: <Sunset className="w-3 h-3" /> },
  { id: 'evening', label: 'Evening', icon: <Moon className="w-3 h-3" /> },
  { id: 'anytime', label: 'Anytime', icon: <Sparkles className="w-3 h-3" /> },
];

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  medium: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  low: 'bg-slate-800 text-slate-400 border-slate-700',
};

const PERIOD_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'anytime', label: 'Anytime' },
];

const CATEGORY_OPTIONS = [
  { value: 'Deep Work', label: 'Deep Work', dotColor: 'bg-sky-400' },
  { value: 'Health', label: 'Health', dotColor: 'bg-emerald-400' },
  { value: 'Personal', label: 'Personal', dotColor: 'bg-amber-400' },
  { value: 'Mindfulness', label: 'Mindfulness', dotColor: 'bg-violet-400' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High Priority', dotColor: 'bg-rose-400' },
  { value: 'medium', label: 'Medium Priority', dotColor: 'bg-sky-400' },
  { value: 'low', label: 'Low Priority', dotColor: 'bg-slate-400' },
];

export default function RoutinePanel() {
  const {
    routines,
    todayIso,
    toggleRoutine,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    focusedRoutineId,
    setFocusedRoutineId,
    wrapUpDay,
    activityMap,
  } = useFlowState();

  const [scheduleView, setScheduleView] = useState<'today' | 'all'>('today');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | TimePeriod>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWrapUpOpen, setIsWrapUpOpen] = useState(false);
  const [rolloverTasks, setRolloverTasks] = useState(true);
  const [editingItem, setEditingItem] = useState<RoutineItem | null>(null);

  const [title, setTitle] = useState('');
  const [timeSlot, setTimeSlot] = useState('08:00');
  const [period, setPeriod] = useState<TimePeriod>('morning');
  const [category, setCategory] = useState<RoutineCategory>('Deep Work');
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedDays, setSelectedDays] = useState<string[]>(ALL_DAYS);

  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setCurrentTimeStr(`${hh}:${mm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentDayOfWeek = useMemo(() => {
    const [y, m, d] = todayIso.split('-').map(Number);
    return DAYS_OF_WEEK[new Date(y, m - 1, d).getDay()];
  }, [todayIso]);

  const filteredRoutines = useMemo(() => {
    let list = routines;
    if (scheduleView === 'today') {
      list = list.filter(
        (r) => !r.daysOfWeek || r.daysOfWeek.includes(currentDayOfWeek)
      );
    }
    if (selectedPeriod !== 'all') {
      list = list.filter((r) => r.period === selectedPeriod);
    }
    return [...list].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [routines, scheduleView, selectedPeriod, currentDayOfWeek]);

  const completedCount = routines.filter((r) => r.completed).length;
  const progressPercent =
    routines.length > 0 ? Math.round((completedCount / routines.length) * 100) : 0;

  const totalPomodorosToday = useMemo(() => {
    return activityMap[todayIso] || 0;
  }, [activityMap, todayIso]);

  const activeIndex = useMemo(() => {
    if (!currentTimeStr || filteredRoutines.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < filteredRoutines.length; i++) {
      if (filteredRoutines[i].timeSlot <= currentTimeStr) {
        idx = i;
      }
    }
    return idx;
  }, [filteredRoutines, currentTimeStr]);

  const nowDividerIndex = useMemo(() => {
    if (!currentTimeStr || filteredRoutines.length === 0) return -1;
    return filteredRoutines.findIndex((r) => r.timeSlot > currentTimeStr);
  }, [filteredRoutines, currentTimeStr]);

  const openAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setTimeSlot('09:00');
    setPeriod('morning');
    setCategory('Deep Work');
    setPriority('medium');
    setSelectedDays(ALL_DAYS);
    setIsModalOpen(true);
  };

  const openEditModal = (item: RoutineItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setTimeSlot(item.timeSlot);
    setPeriod(item.period);
    setCategory(item.category);
    setPriority(item.priority);
    setSelectedDays(item.daysOfWeek && item.daysOfWeek.length > 0 ? item.daysOfWeek : ALL_DAYS);
    setIsModalOpen(true);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (editingItem) {
      updateRoutine({
        ...editingItem,
        title: title.trim(),
        timeSlot,
        period,
        category,
        priority,
        daysOfWeek: selectedDays,
      });
    } else {
      addRoutine({
        title: title.trim(),
        timeSlot,
        period,
        category,
        priority,
        daysOfWeek: selectedDays,
      });
    }
    setIsModalOpen(false);
  };

  const handleConfirmWrapUp = () => {
    wrapUpDay(rolloverTasks);
    setIsWrapUpOpen(false);
  };

  return (
    <section className="flex flex-col h-full bg-[#0a0f1a]/90 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
      <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-950/50">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Daily Routine</span>
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-sky-400">
                {currentDayOfWeek}
              </span>
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              {completedCount}/{routines.length} completed ({progressPercent}%)
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsWrapUpOpen(true)}
              title="Daily Wrap-Up & Reset"
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-mono font-semibold text-xs shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-3" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800/80 w-44">
            <button
              type="button"
              onClick={() => setScheduleView('today')}
              className={`py-1 rounded-lg text-[11px] font-mono transition-colors ${
                scheduleView === 'today'
                  ? 'bg-sky-400 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setScheduleView('all')}
              className={`py-1 rounded-lg text-[11px] font-mono transition-colors ${
                scheduleView === 'all'
                  ? 'bg-sky-400 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Days
            </button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {PERIOD_FILTERS.map((f) => {
              const active = selectedPeriod === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedPeriod(f.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-medium transition-colors whitespace-nowrap border ${
                    active
                      ? 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredRoutines.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center justify-center py-14 text-center"
            >
              <CalendarDays className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-mono text-slate-400">
                No routine blocks for this schedule view.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-2.5 text-xs font-mono font-medium text-sky-400 hover:underline"
              >
                + Create routine block
              </button>
            </motion.div>
          ) : (
            filteredRoutines.map((item, index) => {
              const isActiveTimeBlock = index === activeIndex;
              const isFocused = focusedRoutineId === item.id;
              const showNowDivider = index === nowDividerIndex;

              return (
                <React.Fragment key={item.id}>
                  {showNowDivider && currentTimeStr && (
                    <div className="flex items-center gap-2 py-1.5">
                      <span className="h-px flex-1 bg-linear-to-r from-transparent via-sky-400/60 to-transparent" />
                      <span className="text-[10px] font-mono text-sky-400 font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 shrink-0">
                        NOW — {currentTimeStr}
                      </span>
                      <span className="h-px flex-1 bg-linear-to-r from-transparent via-sky-400/60 to-transparent" />
                    </div>
                  )}

                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className={`group flex items-center justify-between gap-2.5 p-3 rounded-xl border transition-all ${
                      item.completed
                        ? 'bg-slate-900/30 border-slate-800/50 opacity-60'
                        : isActiveTimeBlock
                        ? 'bg-slate-900/90 border-sky-400/80 shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-sky-400/50'
                        : isFocused
                        ? 'bg-slate-900/90 border-amber-400/70 ring-1 ring-amber-400/40'
                        : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleRoutine(item.id)}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                          item.completed
                            ? 'bg-sky-400 border-sky-400 text-slate-950'
                            : 'border-slate-600 hover:border-sky-400 bg-slate-950/60'
                        }`}
                      >
                        {item.completed && <Check className="w-3.5 h-3.5 stroke-3" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            onClick={() => toggleRoutine(item.id)}
                            className={`text-xs sm:text-sm font-medium cursor-pointer truncate transition-all ${
                              item.completed
                                ? 'line-through text-slate-500'
                                : 'text-slate-100'
                            }`}
                          >
                            {item.title}
                          </p>
                          {isActiveTimeBlock && !item.completed && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-sky-400 text-slate-950">
                              active
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                            <Clock className="w-2.5 h-2.5 text-sky-400" />
                            {item.timeSlot}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300">
                            {item.category}
                          </span>
                          <span
                            className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md border ${
                              PRIORITY_STYLES[item.priority]
                            }`}
                          >
                            {item.priority}
                          </span>
                          {typeof item.pomodorosCompleted === 'number' &&
                            item.pomodorosCompleted > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                                <Sparkle className="w-2.5 h-2.5" />
                                {item.pomodorosCompleted} focus
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setFocusedRoutineId(isFocused ? null : item.id)
                        }
                        className={`p-1.5 rounded-lg border transition-all ${
                          isFocused
                            ? 'bg-sky-400 border-sky-300 text-slate-950 font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800 border-slate-800'
                        }`}
                        title={
                          isFocused
                            ? 'Linked to Pomodoro (Active)'
                            : 'Focus routine with Pomodoro'
                        }
                      >
                        <Target className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRoutine(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4">
            <motion.form
              onSubmit={handleSave}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="w-full sm:max-w-md bg-[#0b101d] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono font-bold text-slate-100">
                  {editingItem ? 'Edit Routine Block' : 'New Routine Block'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Morning Coffee & Architecture Review"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Recurrence Days ({selectedDays.length}/7)
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {ALL_DAYS.map((d) => {
                    const active = selectedDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`py-1.5 rounded-lg text-xs font-mono transition-colors border ${
                          active
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Time Slot
                  </label>
                  <input
                    type="time"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-400 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Period
                  </label>
                  <CustomSelect
                    value={period}
                    onChange={(val) => setPeriod(val as TimePeriod)}
                    options={PERIOD_OPTIONS}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Category
                  </label>
                  <CustomSelect
                    value={category}
                    onChange={(val) => setCategory(val as RoutineCategory)}
                    options={CATEGORY_OPTIONS}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Priority
                  </label>
                  <CustomSelect
                    value={priority}
                    onChange={(val) => setPriority(val as Priority)}
                    options={PRIORITY_OPTIONS}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-mono font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950"
                >
                  {editingItem ? 'Save Changes' : 'Add Routine'}
                </button>
              </div>
            </motion.form>
          </div>
        )}

        {isWrapUpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0c1222] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl font-mono"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      Daily Wrap-Up & Review
                    </h3>
                    <p className="text-[11px] text-slate-400">@{todayIso}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWrapUpOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Routines Finished
                  </span>
                  <div className="text-lg font-bold text-sky-400">
                    {completedCount} / {routines.length}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {progressPercent}% execution rate
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Focus Sessions
                  </span>
                  <div className="text-lg font-bold text-emerald-400">
                    {totalPomodorosToday} logged
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Pomodoro intensity score
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/50 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolloverTasks}
                  onChange={(e) => setRolloverTasks(e.target.checked)}
                  className="mt-0.5 accent-sky-400 rounded cursor-pointer"
                />
                <span className="text-xs text-slate-300 select-none">
                  Roll over unfinished high-priority tasks into tomorrow’s DevLog note.
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-1 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsWrapUpOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmWrapUp}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition-colors"
                >
                  Complete Day & Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
