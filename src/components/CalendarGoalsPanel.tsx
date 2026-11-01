'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  Plus,
  Check,
  Trash2,
  FileCode2,
  Sparkles,
  ArrowUpRight,
  Shield,
  Layers,
} from 'lucide-react';
import { useFlowState } from '@/context/FlowStateContext';
import { GoalCategory } from '@/types';
import { CustomSelect, CustomDatePicker } from '@/components/ui/CustomControls';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  Work: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Private: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Sprint: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  System: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  Fitness: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  Personal: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const GOAL_CATEGORY_OPTIONS = [
  { value: 'Work', label: 'Work', dotColor: 'bg-emerald-400' },
  { value: 'Private', label: 'Private', dotColor: 'bg-amber-400' },
  { value: 'Sprint', label: 'Sprint', dotColor: 'bg-sky-400' },
  { value: 'System', label: 'System', dotColor: 'bg-violet-400' },
  { value: 'Fitness', label: 'Fitness', dotColor: 'bg-teal-400' },
  { value: 'Personal', label: 'Personal', dotColor: 'bg-rose-400' },
];

export default function CalendarGoalsPanel() {
  const {
    notes,
    goals,
    streak,
    activityDates,
    activityMap,
    streakFreezes,
    todayIso,
    selectedDate,
    setSelectedDate,
    setActiveNoteId,
    addNote,
    addGoal,
    toggleGoal,
    deleteGoal,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateGoalProgress,
    logTodayStreak,
    consumeStreakFreeze,
    setMobileTab,
    theme,
    workspace,
  } = useFlowState();

  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'goals'>('calendar');
  const [heatmapRange, setHeatmapRange] = useState<'14d' | '90d'>('14d');
  const [viewYear, setViewYear] = useState(() => Number(selectedDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(selectedDate.slice(5, 7)) - 1);

  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<GoalCategory>(
    workspace === 'private' ? 'Private' : 'Work'
  );
  const [goalDeadline, setGoalDeadline] = useState<string | undefined>(undefined);
  const [goalTargetCount, setGoalTargetCount] = useState<string>('');
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { iso: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        iso: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayNum: day,
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        iso: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
          day
        ).padStart(2, '0')}`,
        dayNum: day,
        isCurrentMonth: true,
      });
    }

    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({
        iso: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayNum: day,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const heatmapDays = useMemo(() => {
    const [y, m, d] = todayIso.split('-').map(Number);
    const count = heatmapRange === '14d' ? 14 : 90;
    const list: { iso: string; label: string; score: number }[] = [];
    const shortDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = count - 1; i >= 0; i--) {
      const dt = new Date(y, m - 1, d - i);
      const yr = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const da = String(dt.getDate()).padStart(2, '0');
      const iso = `${yr}-${mo}-${da}`;
      const score = activityMap[iso] || (activityDates.includes(iso) ? 1 : 0);
      list.push({
        iso,
        label: shortDays[dt.getDay()],
        score,
      });
    }
    return list;
  }, [todayIso, heatmapRange, activityMap, activityDates]);

  const getHeatmapColor = (score: number) => {
    if (score === 0) return 'bg-slate-900 border-slate-800/80';
    if (score === 1) return 'bg-emerald-950/90 border-emerald-900/60';
    if (score <= 3) return 'bg-emerald-700/80 border-emerald-600/70';
    if (score <= 5) return 'bg-emerald-500/90 border-emerald-400/80';
    return 'bg-emerald-300 text-slate-950 border-emerald-200 font-bold';
  };

  const notesForSelectedDate = useMemo(
    () => notes.filter((n) => n.targetDate === selectedDate),
    [notes, selectedDate]
  );

  const goalsForSelectedDate = useMemo(
    () => goals.filter((g) => g.deadline === selectedDate),
    [goals, selectedDate]
  );

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    setSelectedDate(todayIso);
    setViewYear(Number(todayIso.slice(0, 4)));
    setViewMonth(Number(todayIso.slice(5, 7)) - 1);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    const parsedTarget = parseInt(goalTargetCount, 10);
    addGoal({
      title: goalTitle.trim(),
      category: goalCategory,
      deadline: goalDeadline,
      targetCount: !isNaN(parsedTarget) && parsedTarget > 0 ? parsedTarget : 0,
      currentCount: 0,
      subtasks: [],
    });
    setGoalTitle('');
    setGoalTargetCount('');
  };

  const handleOpenNote = (noteId: string) => {
    setActiveNoteId(noteId);
    setMobileTab('notes');
  };

  const handleCreateNoteForDate = () => {
    const id = addNote({
      title: `log(${selectedDate}): Daily Dev & Tasks`,
      targetDate: selectedDate,
      tag: 'DevLog',
      folder: 'General',
      content: `# Daily Log — ${selectedDate}\n\n## Priority Tasks\n- [ ] \n\n## Implementation & Notes\n\`\`\`ts\nconst status = "in_progress";\n\`\`\`\n`,
    });
    setActiveNoteId(id);
    setMobileTab('notes');
  };

  const handleAddSubtaskSubmit = (goalId: string) => {
    const val = (newSubtaskInputs[goalId] || '').trim();
    if (!val) return;
    addSubtask(goalId, val);
    setNewSubtaskInputs((prev) => ({ ...prev, [goalId]: '' }));
  };

  const getDeadlineBadge = (deadline?: string, completed?: boolean) => {
    if (!deadline) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60">
          flexible
        </span>
      );
    }
    if (completed) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          shipped ({deadline})
        </span>
      );
    }
    const [ty, tm, td] = todayIso.split('-').map(Number);
    const [dy, dm, dd] = deadline.split('-').map(Number);
    const diffMs =
      new Date(dy, dm - 1, dd).getTime() - new Date(ty, tm - 1, td).getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
          overdue ({Math.abs(diffDays)}d)
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
          due::today
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20">
        T-{diffDays}d · {deadline}
      </span>
    );
  };

  const completedGoalsCount = goals.filter((g) => g.completed).length;

  return (
    <section className="flex flex-col h-full bg-[#0a0f1a]/90 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
      <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-950/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl ${theme.accentBgSubtle} border ${theme.accentBorder} flex items-center justify-center ${theme.accentText} shrink-0`}
            >
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-100 truncate">
                Schedule & Milestones
              </h2>
              <p className={`text-[11px] font-mono ${theme.accentText} truncate`}>
                @{selectedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={logTodayStreak}
              className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-xl transition-colors"
              title="Click to manually log daily streak (+1)"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-300">
                {streak}d
              </span>
              {!activityDates.includes(todayIso) ? (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono font-bold text-[10px]">
                  +1
                </span>
              ) : (
                <span
                  className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-mono font-semibold text-[10px] border border-emerald-500/20"
                >
                  ✓
                </span>
              )}
            </button>

            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl">
              <Shield className={`w-3.5 h-3.5 ${theme.accentText}`} />
              <span className={`text-xs font-mono font-bold ${theme.accentText}`}>
                {streakFreezes}
              </span>
              <button
                type="button"
                onClick={consumeStreakFreeze}
                className={`ml-1 px-1.5 py-0.5 rounded-md ${theme.accentBgSubtle} ${theme.accentText} font-mono text-[10px] border ${theme.accentBorder} transition-colors`}
                title="Consume Shield to protect a missed day"
              >
                Shield
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('calendar')}
            className={`relative py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeSubTab === 'calendar'
                ? 'text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeSubTab === 'calendar' && (
              <motion.div
                layoutId="calGoalSwitch"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={`absolute inset-0 ${theme.accentBg} rounded-lg`}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('goals')}
            className={`relative py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeSubTab === 'goals'
                ? 'text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {activeSubTab === 'goals' && (
              <motion.div
                layoutId="calGoalSwitch"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className={`absolute inset-0 ${theme.accentBg} rounded-lg`}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>
                Goals ({completedGoalsCount}/{goals.length})
              </span>
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {activeSubTab === 'calendar' ? (
          <>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Activity & Focus Intensity
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setHeatmapRange('14d')}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono transition-colors ${
                      heatmapRange === '14d'
                        ? `${theme.accentBg} text-slate-950 font-bold`
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    14d
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeatmapRange('90d')}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono transition-colors ${
                      heatmapRange === '90d'
                        ? `${theme.accentBg} text-slate-950 font-bold`
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    90d
                  </button>
                </div>
              </div>

              {heatmapRange === '14d' ? (
                <div className="grid grid-cols-14 gap-1">
                  {heatmapDays.map((d) => (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => setSelectedDate(d.iso)}
                      title={`${d.iso}: ${d.score} intensity`}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div
                        className={`w-full aspect-square rounded-sm border transition-all ${getHeatmapColor(
                          d.score
                        )} ${selectedDate === d.iso ? `ring-1 ${theme.accentRing}` : ''}`}
                      />
                      <span className="text-[9px] font-mono text-slate-500">
                        {d.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-18 gap-1">
                  {heatmapDays.map((d) => (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => setSelectedDate(d.iso)}
                      title={`${d.iso}: ${d.score} intensity`}
                      className={`w-full aspect-square rounded-xs border transition-all ${getHeatmapColor(
                        d.score
                      )} ${selectedDate === d.iso ? `ring-1 ${theme.accentRing}` : ''}`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-900">
                <span>Low</span>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 border border-slate-800" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-950 border border-emerald-900" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-700 border border-emerald-600" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 border border-emerald-400" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-300 border border-emerald-200" />
                </div>
                <span>High</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-semibold text-slate-200">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleJumpToday}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono bg-slate-900 hover:bg-slate-800 ${theme.accentText} border border-slate-800`}
                  >
                    today
                  </button>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day}
                    className="text-[10px] font-mono uppercase text-slate-500 py-0.5"
                  >
                    {day}
                  </div>
                ))}

                {calendarDays.map((cell) => {
                  const isSelected = cell.iso === selectedDate;
                  const isToday = cell.iso === todayIso;
                  const hasNotes = notes.some((n) => n.targetDate === cell.iso);
                  const hasGoals = goals.some((g) => g.deadline === cell.iso);
                  const hasStreak = activityDates.includes(cell.iso);

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => setSelectedDate(cell.iso)}
                      className={`relative h-9 rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-all border ${
                        isSelected
                          ? `${theme.accentBgSubtle} ${theme.accentBorder} ${theme.accentText} font-bold shadow-sm`
                          : isToday
                          ? 'bg-slate-900 border-slate-700 text-slate-100 font-semibold'
                          : cell.isCurrentMonth
                          ? 'bg-slate-900/40 border-slate-800/50 text-slate-300 hover:border-slate-700'
                          : 'bg-transparent border-transparent text-slate-600'
                      }`}
                    >
                      <span>{cell.dayNum}</span>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {hasNotes && (
                          <span className="w-1 h-1 rounded-full bg-sky-400" />
                        )}
                        {hasGoals && (
                          <span className="w-1 h-1 rounded-full bg-amber-400" />
                        )}
                        {hasStreak && (
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-3 pt-1 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Note
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Goal
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Streak
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className={`text-xs font-mono font-semibold ${theme.accentText} truncate`}>
                    Inspector :: {selectedDate}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {notesForSelectedDate.length} note(s) ·{' '}
                    {goalsForSelectedDate.length} deadline(s)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateNoteForDate}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold ${theme.accentBg} text-slate-950 shrink-0 transition-all`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-2" />
                  <span>Log Date</span>
                </button>
              </div>

              {notesForSelectedDate.length > 0 ? (
                <div className="space-y-1.5">
                  {notesForSelectedDate.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleOpenNote(n.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCode2 className={`w-3.5 h-3.5 ${theme.accentText} shrink-0`} />
                        <span className="text-xs font-mono text-slate-200 truncate">
                          {n.title}
                        </span>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-500 py-1">
                  ~ No notes linked to {selectedDate} yet.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3.5">
            <form
              onSubmit={handleCreateGoal}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3"
            >
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="New target, sprint milestone, habit, or system objective..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <CustomSelect
                    value={goalCategory}
                    onChange={(val) => setGoalCategory(val as GoalCategory)}
                    options={GOAL_CATEGORY_OPTIONS}
                  />
                  <CustomDatePicker
                    value={goalDeadline}
                    fallbackDate={todayIso}
                    onChange={setGoalDeadline}
                    placeholder="Optional deadline"
                  />
                  <input
                    type="number"
                    min="0"
                    value={goalTargetCount}
                    onChange={(e) => setGoalTargetCount(e.target.value)}
                    placeholder="Target count"
                    className="w-24 bg-slate-900 border border-slate-800 focus:border-sky-400 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold ${theme.accentBg} text-slate-950 transition-colors`}
                >
                  + Add Goal
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {goals.map((goal) => {
                  const isExpanded = expandedGoalId === goal.id;
                  const totalSubtasks = (goal.subtasks || []).length;
                  const completedSubtasks = (goal.subtasks || []).filter(
                    (s) => s.completed
                  ).length;

                  let progressPercent = 0;
                  if (goal.targetCount && goal.targetCount > 0) {
                    progressPercent = Math.min(
                      100,
                      Math.round(
                        ((goal.currentCount || 0) / goal.targetCount) * 100
                      )
                    );
                  } else if (totalSubtasks > 0) {
                    progressPercent = Math.round(
                      (completedSubtasks / totalSubtasks) * 100
                    );
                  } else {
                    progressPercent = goal.completed ? 100 : 0;
                  }

                  return (
                    <motion.div
                      key={goal.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className={`p-3 rounded-xl border transition-all ${
                        goal.completed
                          ? 'bg-slate-900/30 border-slate-800/50 opacity-70'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleGoal(goal.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                              goal.completed
                                ? `${theme.accentBg} ${theme.accentBorder} text-slate-950`
                                : 'border-slate-600 hover:border-emerald-400 bg-slate-950'
                            }`}
                          >
                            {goal.completed && (
                              <Check className="w-3.5 h-3.5 stroke-3" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p
                              onClick={() => toggleGoal(goal.id)}
                              className={`text-xs font-medium cursor-pointer ${
                                goal.completed
                                  ? 'line-through text-slate-500'
                                  : 'text-slate-100'
                              }`}
                            >
                              {goal.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                                  CATEGORY_COLORS[goal.category] ||
                                  'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {goal.category}
                              </span>
                              {getDeadlineBadge(goal.deadline, goal.completed)}
                              {totalSubtasks > 0 && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-sky-300">
                                  {completedSubtasks}/{totalSubtasks} tasks
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedGoalId(isExpanded ? null : goal.id)
                            }
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isExpanded
                                ? `${theme.accentBgSubtle} ${theme.accentBorder} ${theme.accentText}`
                                : 'text-slate-400 hover:bg-slate-800 border-slate-800'
                            }`}
                            title="Sub-milestones"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGoal(goal.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800/80 mt-2.5">
                        <motion.div
                          initial={false}
                          animate={{ width: `${progressPercent}%` }}
                          className={`h-full bg-linear-to-r ${theme.gradient} rounded-full`}
                        />
                      </div>

                      {typeof goal.targetCount === 'number' &&
                        goal.targetCount > 0 && (
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60 text-[11px] font-mono">
                            <span className="text-slate-400">
                              Target progress:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-200 font-semibold">
                                {goal.currentCount || 0} / {goal.targetCount}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateGoalProgress(
                                    goal.id,
                                    (goal.currentCount || 0) - 1
                                  )
                                }
                                className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 text-slate-300 hover:bg-slate-700"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateGoalProgress(
                                    goal.id,
                                    (goal.currentCount || 0) + 1
                                  )
                                }
                                className={`w-5 h-5 rounded flex items-center justify-center ${theme.accentBg} text-slate-950 font-bold`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                      {isExpanded && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2 font-mono">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            Sub-tasks
                          </span>

                          <div className="space-y-1">
                            {(goal.subtasks || []).map((subtask) => (
                              <div
                                key={subtask.id}
                                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSubtask(goal.id, subtask.id)
                                  }
                                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                >
                                  <div
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                      subtask.completed
                                        ? `${theme.accentBg} ${theme.accentBorder} text-slate-950`
                                        : 'border-slate-600'
                                    }`}
                                  >
                                    {subtask.completed && (
                                      <Check className="w-2.5 h-2.5 stroke-3" />
                                    )}
                                  </div>
                                  <span
                                    className={`truncate ${
                                      subtask.completed
                                        ? 'line-through text-slate-500'
                                        : 'text-slate-200'
                                    }`}
                                  >
                                    {subtask.title}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteSubtask(goal.id, subtask.id)
                                  }
                                  className="text-slate-500 hover:text-rose-400 p-0.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={newSubtaskInputs[goal.id] || ''}
                              onChange={(e) =>
                                setNewSubtaskInputs((prev) => ({
                                  ...prev,
                                  [goal.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddSubtaskSubmit(goal.id);
                                }
                              }}
                              placeholder="Add sub-task..."
                              className="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-400 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddSubtaskSubmit(goal.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${theme.accentBg} text-slate-950`}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
