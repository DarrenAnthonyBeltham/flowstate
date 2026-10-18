'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useFlowState } from '@/context/FlowStateContext';
import { RoutineItem, TimePeriod, Priority, RoutineCategory } from '@/types';
import { CustomSelect } from '@/components/ui/CustomControls';

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
    toggleRoutine,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    resetDay,
  } = useFlowState();

  const [selectedPeriod, setSelectedPeriod] = useState<'all' | TimePeriod>(
    'all'
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoutineItem | null>(null);

  const [title, setTitle] = useState('');
  const [timeSlot, setTimeSlot] = useState('08:00');
  const [period, setPeriod] = useState<TimePeriod>('morning');
  const [category, setCategory] = useState<RoutineCategory>('Deep Work');
  const [priority, setPriority] = useState<Priority>('medium');

  const filteredRoutines = useMemo(() => {
    if (selectedPeriod === 'all') return routines;
    return routines.filter((r) => r.period === selectedPeriod);
  }, [routines, selectedPeriod]);

  const completedCount = routines.filter((r) => r.completed).length;
  const progressPercent =
    routines.length > 0
      ? Math.round((completedCount / routines.length) * 100)
      : 0;

  const openAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setTimeSlot('09:00');
    setPeriod('morning');
    setCategory('Deep Work');
    setPriority('medium');
    setIsModalOpen(true);
  };

  const openEditModal = (item: RoutineItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setTimeSlot(item.timeSlot);
    setPeriod(item.period);
    setCategory(item.category);
    setPriority(item.priority);
    setIsModalOpen(true);
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
      });
    } else {
      addRoutine({
        title: title.trim(),
        timeSlot,
        period,
        category,
        priority,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <section className="flex flex-col h-full bg-[#0a0f1a]/90 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
      <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-950/50">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Daily Routine</h2>
            <p className="text-[11px] font-mono text-slate-400">
              {completedCount}/{routines.length} tasks ({progressPercent}%)
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={resetDay}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-sky-400" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-md shadow-sky-500/15 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-2" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="h-full bg-linear-to-r from-sky-400 via-blue-500 to-emerald-400 rounded-full"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {PERIOD_FILTERS.map((f) => {
            const active = selectedPeriod === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedPeriod(f.id)}
                className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-colors ${
                  active
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="routinePeriodFilter"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-sky-400 rounded-lg"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  {f.icon}
                  {f.label}
                </span>
              </button>
            );
          })}
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
              <p className="text-xs font-mono text-slate-400">
                No routines in this time slot.
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
            filteredRoutines.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className={`group flex items-center justify-between gap-2.5 p-3 rounded-xl border transition-all ${
                  item.completed
                    ? 'bg-slate-900/30 border-slate-800/50 opacity-60'
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
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
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
            ))
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
                  placeholder="e.g., Morning Coffee & Code Review"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-400 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none"
                />
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
      </AnimatePresence>
    </section>
  );
}