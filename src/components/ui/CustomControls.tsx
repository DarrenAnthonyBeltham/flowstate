'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Check,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  dotColor?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  className = '',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-mono rounded-xl px-3 py-1.5 transition-all outline-none focus:border-sky-400"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.dotColor && (
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`}
            />
          )}
          <span className="truncate">{selectedOption?.label}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-sky-400' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 mt-1.5 min-w-36 w-full z-50 bg-[#0b101d] border border-slate-800 rounded-xl shadow-2xl shadow-black/80 p-1 backdrop-blur-xl"
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono text-left transition-colors ${
                    active
                      ? 'bg-sky-500/15 text-sky-400 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.dotColor && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`}
                      />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CustomDatePickerProps {
  value?: string;
  fallbackDate: string;
  onChange: (date?: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
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

export function CustomDatePicker({
  value,
  fallbackDate,
  onChange,
  placeholder = 'Link date',
  allowClear = true,
}: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const baseIso = value || fallbackDate || '2026-10-18';
  const [viewYear, setViewYear] = useState(() => Number(baseIso.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(
    () => Number(baseIso.slice(5, 7)) - 1
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysGrid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthTotal = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { iso: string; day: number; current: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthTotal - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        current: false,
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      cells.push({
        iso: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
          d
        ).padStart(2, '0')}`,
        day: d,
        current: true,
      });
    }

    const rem = 42 - cells.length;
    for (let d = 1; d <= rem; d++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({
        iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        current: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <div className="flex items-center bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl px-2.5 py-1.5 transition-all">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-xs font-mono text-slate-200 outline-none"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>{value || placeholder}</span>
        </button>
        {allowClear && value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            className="ml-1.5 text-slate-500 hover:text-rose-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 z-50 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl shadow-black/90 p-3.5 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-semibold text-slate-100">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAYS.map((d) => (
                <span
                  key={d}
                  className="text-[10px] font-mono text-slate-500 py-0.5"
                >
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {daysGrid.map((c) => {
                const isSelected = c.iso === value;
                const isToday = c.iso === fallbackDate;
                return (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => {
                      onChange(c.iso);
                      setOpen(false);
                    }}
                    className={`h-7 rounded-lg text-[11px] font-mono flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-sky-400 text-slate-950 font-bold shadow-sm shadow-sky-400/30'
                        : isToday
                        ? 'bg-slate-800 text-sky-400 border border-sky-500/40 font-semibold'
                        : c.current
                        ? 'text-slate-300 hover:bg-slate-800/80'
                        : 'text-slate-600 hover:bg-slate-900'
                    }`}
                  >
                    {c.day}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="text-[11px] font-mono text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(fallbackDate);
                  setOpen(false);
                }}
                className="text-[11px] font-mono text-sky-400 hover:text-sky-300 font-semibold transition-colors"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}