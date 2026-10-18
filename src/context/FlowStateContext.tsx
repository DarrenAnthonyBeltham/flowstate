'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  RoutineItem,
  NoteItem,
  GoalItem,
  ViewMode,
  MobileTab,
  TimePeriod,
  RoutineCategory,
  Priority,
  NoteTag,
  GoalCategory,
} from '@/types';
import { supabase } from '@/lib/supabase';

interface FlowStateContextType {
  isHydrated: boolean;
  routines: RoutineItem[];
  notes: NoteItem[];
  goals: GoalItem[];
  scratchpad: string;
  streak: number;
  activityDates: string[];
  todayIso: string;
  selectedDate: string;
  activeNoteId: string | null;
  viewMode: ViewMode;
  mobileTab: MobileTab;
  isScratchpadOpen: boolean;
  setSelectedDate: (date: string) => void;
  setActiveNoteId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setMobileTab: (tab: MobileTab) => void;
  setIsScratchpadOpen: (open: boolean) => void;
  setScratchpad: (text: string) => void;
  toggleRoutine: (id: string) => void;
  addRoutine: (item: Omit<RoutineItem, 'id' | 'completed'>) => void;
  updateRoutine: (item: RoutineItem) => void;
  deleteRoutine: (id: string) => void;
  resetDay: () => void;
  addNote: (partial?: Partial<NoteItem>) => string;
  updateNote: (id: string, updates: Partial<NoteItem>) => void;
  deleteNote: (id: string) => void;
  addGoal: (item: Omit<GoalItem, 'id' | 'completed'>) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  logTodayStreak: () => void;
  promoteScratchpadToNote: () => string | null;
  exportWorkspace: () => void;
  importWorkspace: (jsonString: string) => boolean;
}

interface DbRoutineRow {
  id: string;
  title: string;
  time_slot: string;
  period: TimePeriod;
  category: RoutineCategory;
  priority: Priority;
  completed: boolean;
}

interface DbNoteRow {
  id: string;
  title: string;
  content: string;
  tag: NoteTag;
  pinned: boolean;
  target_date: string | null;
  updated_at: string;
}

interface DbGoalRow {
  id: string;
  title: string;
  category: GoalCategory;
  deadline: string | null;
  completed: boolean;
}

const FALLBACK_DATE = '2026-10-18';

const computeClientIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DEFAULT_SCRATCHPAD =
  'git checkout -b feat/calendar-sync\nQuick terminal thoughts, snippets, or daily scratchpad...';

const DEFAULT_ROUTINES: RoutineItem[] = [
  {
    id: 'r-1',
    title: 'Brew Arabica Coffee & Morning Hydration',
    timeSlot: '07:30',
    period: 'morning',
    category: 'Health',
    priority: 'medium',
    completed: true,
  },
  {
    id: 'r-2',
    title: 'Deep Work: Next.js Architecture & UI Engineering',
    timeSlot: '09:00',
    period: 'morning',
    category: 'Deep Work',
    priority: 'high',
    completed: false,
  },
  {
    id: 'r-3',
    title: 'Mid-Day Market Flow & Portfolio Check',
    timeSlot: '13:30',
    period: 'afternoon',
    category: 'Personal',
    priority: 'low',
    completed: false,
  },
  {
    id: 'r-4',
    title: 'Evening 7.5km Run / Post-Dinner Walk',
    timeSlot: '18:30',
    period: 'evening',
    category: 'Health',
    priority: 'high',
    completed: false,
  },
  {
    id: 'r-5',
    title: 'Daily Commit Log & Plan Tomorrow’s Top 3 Tasks',
    timeSlot: '21:30',
    period: 'evening',
    category: 'Mindfulness',
    priority: 'medium',
    completed: false,
  },
];

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: 'n-1',
    title: 'feat(workspace): Architecture & Release Backlog',
    tag: 'DevLog',
    pinned: true,
    targetDate: FALLBACK_DATE,
    updatedAt: '2026-10-18T08:00:00.000Z',
    content: `# Sprint Backlog\n\nBuilding a developer-focused daily driver with **Supabase** persistence.\n\n\`\`\`bash\nnpm run build && npx vercel --prod\n\`\`\`\n\n- [x] Setup Supabase client & schema\n- [x] Add interactive Calendar & Goal deadlines\n- [ ] Ship production build to Vercel\n- [ ] Optimize mobile navigation ergonomics`,
  },
  {
    id: 'n-2',
    title: 'Weekly Fitness & Meal Log',
    tag: 'Personal',
    pinned: false,
    targetDate: FALLBACK_DATE,
    updatedAt: '2026-10-18T07:00:00.000Z',
    content: `# Training Schedule\n\nKeeping momentum consistent throughout the week:\n\n- **Tuesday / Thursday:** 7.5km evening run session\n- **Friday:** Heavy badminton session\n- **Daily:** 45-min post-dinner walk (3.5km - 5km)`,
  },
];

const DEFAULT_GOALS: GoalItem[] = [
  {
    id: 'g-1',
    title: 'Deploy FlowState v2 with Supabase & Calendar to Vercel',
    category: 'Sprint',
    deadline: FALLBACK_DATE,
    completed: false,
  },
  {
    id: 'g-2',
    title: 'Complete 3x 7.5km Running Sessions + Friday Badminton',
    category: 'Fitness',
    deadline: undefined,
    completed: false,
  },
  {
    id: 'g-3',
    title: 'Refactor Microservice API & Client Portal UI',
    category: 'System',
    deadline: FALLBACK_DATE,
    completed: true,
  },
];

const toDbRoutine = (r: RoutineItem): DbRoutineRow => ({
  id: r.id,
  title: r.title,
  time_slot: r.timeSlot,
  period: r.period,
  category: r.category,
  priority: r.priority,
  completed: r.completed,
});

const fromDbRoutine = (row: DbRoutineRow): RoutineItem => ({
  id: row.id,
  title: row.title,
  timeSlot: row.time_slot,
  period: row.period,
  category: row.category,
  priority: row.priority,
  completed: row.completed,
});

const toDbNote = (n: NoteItem): DbNoteRow => ({
  id: n.id,
  title: n.title,
  content: n.content,
  tag: n.tag,
  pinned: n.pinned,
  target_date: n.targetDate || null,
  updated_at: n.updatedAt,
});

const fromDbNote = (row: DbNoteRow): NoteItem => ({
  id: row.id,
  title: row.title,
  content: row.content,
  tag: row.tag,
  pinned: row.pinned,
  targetDate: row.target_date || undefined,
  updatedAt: row.updated_at,
});

const toDbGoal = (g: GoalItem): DbGoalRow => ({
  id: g.id,
  title: g.title,
  category: g.category,
  deadline: g.deadline || null,
  completed: g.completed,
});

const fromDbGoal = (row: DbGoalRow): GoalItem => ({
  id: row.id,
  title: row.title,
  category: row.category,
  deadline: row.deadline || undefined,
  completed: row.completed,
});

const FlowStateContext = createContext<FlowStateContextType | undefined>(
  undefined
);

export function FlowStateProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [todayIso, setTodayIso] = useState<string>(FALLBACK_DATE);
  const [selectedDate, setSelectedDate] = useState<string>(FALLBACK_DATE);
  const [routines, setRoutines] = useState<RoutineItem[]>(DEFAULT_ROUTINES);
  const [notes, setNotes] = useState<NoteItem[]>(DEFAULT_NOTES);
  const [goals, setGoals] = useState<GoalItem[]>(DEFAULT_GOALS);
  const [scratchpad, setScratchpadState] = useState<string>(DEFAULT_SCRATCHPAD);
  const [streak, setStreak] = useState<number>(5);
  const [activityDates, setActivityDates] = useState<string[]>([FALLBACK_DATE]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(
    DEFAULT_NOTES[0].id
  );
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [mobileTab, setMobileTab] = useState<MobileTab>('routine');
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  const scratchpadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );

  useEffect(() => {
    let active = true;

    const fetchWorkspace = async () => {
      const [routinesRes, notesRes, goalsRes, metaRes] = await Promise.all([
        supabase
          .from('routines')
          .select('*')
          .order('time_slot', { ascending: true }),
        supabase
          .from('notes')
          .select('*')
          .order('updated_at', { ascending: false }),
        supabase
          .from('goals')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('workspace_meta').select('*').eq('id', 1).maybeSingle(),
      ]);

      if (!active) return;

      const clientToday = computeClientIsoDate();
      setTodayIso(clientToday);
      setSelectedDate(clientToday);

      if (!routinesRes.error && routinesRes.data) {
        if (routinesRes.data.length > 0) {
          setRoutines((routinesRes.data as DbRoutineRow[]).map(fromDbRoutine));
        } else {
          await supabase
            .from('routines')
            .upsert(DEFAULT_ROUTINES.map(toDbRoutine));
          setRoutines(DEFAULT_ROUTINES);
        }
      }

      if (!notesRes.error && notesRes.data) {
        if (notesRes.data.length > 0) {
          const loadedNotes = (notesRes.data as DbNoteRow[]).map(fromDbNote);
          setNotes(loadedNotes);
          setActiveNoteId(loadedNotes[0].id);
        } else {
          await supabase.from('notes').upsert(DEFAULT_NOTES.map(toDbNote));
          setNotes(DEFAULT_NOTES);
        }
      }

      if (!goalsRes.error && goalsRes.data) {
        if (goalsRes.data.length > 0) {
          setGoals((goalsRes.data as DbGoalRow[]).map(fromDbGoal));
        } else {
          await supabase.from('goals').upsert(DEFAULT_GOALS.map(toDbGoal));
          setGoals(DEFAULT_GOALS);
        }
      }

      if (!metaRes.error) {
        if (metaRes.data) {
          setScratchpadState(metaRes.data.scratchpad ?? DEFAULT_SCRATCHPAD);
          setStreak(metaRes.data.streak ?? 5);
          if (Array.isArray(metaRes.data.activity_dates)) {
            setActivityDates(metaRes.data.activity_dates);
          }
        } else {
          await supabase.from('workspace_meta').upsert({
            id: 1,
            scratchpad: DEFAULT_SCRATCHPAD,
            streak: 5,
            activity_dates: [clientToday],
            updated_at: new Date().toISOString(),
          });
          setActivityDates([clientToday]);
        }
      }

      if (active) {
        setIsHydrated(true);
      }
    };

    fetchWorkspace();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsScratchpadOpen((prev) => !prev);
      }
      if (e.altKey && e.key === '1') setViewMode('split');
      if (e.altKey && e.key === '2') setViewMode('calendar');
      if (e.altKey && e.key === '3') setViewMode('routine');
      if (e.altKey && e.key === '4') setViewMode('notes');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const syncMeta = (
    nextScratch: string,
    nextStreak: number,
    nextDates: string[]
  ) => {
    supabase
      .from('workspace_meta')
      .upsert({
        id: 1,
        scratchpad: nextScratch,
        streak: nextStreak,
        activity_dates: nextDates,
        updated_at: new Date().toISOString(),
      })
      .then();
  };

  const setScratchpad = (text: string) => {
    setScratchpadState(text);
    if (scratchpadTimerRef.current) {
      clearTimeout(scratchpadTimerRef.current);
    }
    scratchpadTimerRef.current = setTimeout(() => {
      syncMeta(text, streak, activityDates);
    }, 400);
  };

  const logTodayStreak = () => {
    if (activityDates.includes(todayIso)) return;
    const nextDates = [...activityDates, todayIso];
    const nextStreak = streak + 1;
    setActivityDates(nextDates);
    setStreak(nextStreak);
    syncMeta(scratchpad, nextStreak, nextDates);
  };

  const toggleRoutine = (id: string) => {
    setRoutines((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, completed: !item.completed };
          supabase
            .from('routines')
            .update({ completed: updated.completed })
            .eq('id', id)
            .then();
          if (updated.completed && !activityDates.includes(todayIso)) {
            const nextDates = [...activityDates, todayIso];
            const nextStreak = streak + 1;
            setActivityDates(nextDates);
            setStreak(nextStreak);
            syncMeta(scratchpad, nextStreak, nextDates);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const addRoutine = (item: Omit<RoutineItem, 'id' | 'completed'>) => {
    const newItem: RoutineItem = {
      ...item,
      id: `r-${Date.now()}`,
      completed: false,
    };
    setRoutines((prev) =>
      [...prev, newItem].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    );
    supabase.from('routines').insert(toDbRoutine(newItem)).then();
  };

  const updateRoutine = (updated: RoutineItem) => {
    setRoutines((prev) =>
      prev
        .map((item) => (item.id === updated.id ? updated : item))
        .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    );
    supabase.from('routines').upsert(toDbRoutine(updated)).then();
  };

  const deleteRoutine = (id: string) => {
    setRoutines((prev) => prev.filter((item) => item.id !== id));
    supabase.from('routines').delete().eq('id', id).then();
  };

  const resetDay = () => {
    const completedCount = routines.filter((r) => r.completed).length;
    const nextDates = activityDates.includes(todayIso)
      ? activityDates
      : [...activityDates, todayIso];
    const nextStreak = completedCount > 0 ? streak + 1 : streak;

    if (completedCount > 0) {
      setStreak(nextStreak);
      setActivityDates(nextDates);
      syncMeta(scratchpad, nextStreak, nextDates);
    }

    setRoutines((prev) => prev.map((item) => ({ ...item, completed: false })));
    supabase.from('routines').update({ completed: false }).neq('id', '').then();
  };

  const addNote = (partial?: Partial<NoteItem>) => {
    const id = `n-${Date.now()}`;
    const newNote: NoteItem = {
      id,
      title: partial?.title || `dev-log-${selectedDate}`,
      content:
        partial?.content ??
        `# Log: ${selectedDate}\n\n## Tasks\n- [ ] \n\n## Notes\n`,
      tag: partial?.tag || 'DevLog',
      pinned: partial?.pinned || false,
      targetDate: partial?.targetDate ?? selectedDate,
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(id);
    supabase.from('notes').insert(toDbNote(newNote)).then();
    return id;
  };

  const updateNote = (id: string, updates: Partial<NoteItem>) => {
    const now = new Date().toISOString();
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id === id) {
          const updatedNote = { ...note, ...updates, updatedAt: now };
          if (noteTimersRef.current[id]) {
            clearTimeout(noteTimersRef.current[id]);
          }
          noteTimersRef.current[id] = setTimeout(() => {
            supabase.from('notes').upsert(toDbNote(updatedNote)).then();
          }, 300);
          return updatedNote;
        }
        return note;
      })
    );
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    supabase.from('notes').delete().eq('id', id).then();
  };

  const addGoal = (item: Omit<GoalItem, 'id' | 'completed'>) => {
    const newGoal: GoalItem = {
      id: `g-${Date.now()}`,
      title: item.title,
      category: item.category,
      deadline: item.deadline || undefined,
      completed: false,
    };
    setGoals((prev) => [newGoal, ...prev]);
    supabase.from('goals').insert(toDbGoal(newGoal)).then();
  };

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const updated = { ...g, completed: !g.completed };
          supabase
            .from('goals')
            .update({ completed: updated.completed })
            .eq('id', id)
            .then();
          return updated;
        }
        return g;
      })
    );
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    supabase.from('goals').delete().eq('id', id).then();
  };

  const promoteScratchpadToNote = () => {
    if (!scratchpad.trim()) return null;
    const firstLine = scratchpad
      .trim()
      .split('\n')[0]
      .replace(/^#+\s*/, '')
      .slice(0, 45);
    const id = addNote({
      title: firstLine || `snippet-${selectedDate}`,
      content: scratchpad,
      tag: 'DevLog',
      targetDate: selectedDate,
    });
    setScratchpad('');
    setIsScratchpadOpen(false);
    setMobileTab('notes');
    return id;
  };

  const exportWorkspace = () => {
    const payload = {
      routines,
      notes,
      goals,
      scratchpad,
      streak,
      activityDates,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowstate-backup-${todayIso}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importWorkspace = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.routines)) {
        setRoutines(data.routines);
        supabase.from('routines').upsert(data.routines.map(toDbRoutine)).then();
      }
      if (Array.isArray(data.notes)) {
        setNotes(data.notes);
        supabase.from('notes').upsert(data.notes.map(toDbNote)).then();
      }
      if (Array.isArray(data.goals)) {
        setGoals(data.goals);
        supabase.from('goals').upsert(data.goals.map(toDbGoal)).then();
      }
      const nextScratch =
        typeof data.scratchpad === 'string' ? data.scratchpad : scratchpad;
      const nextStreak = typeof data.streak === 'number' ? data.streak : streak;
      const nextDates = Array.isArray(data.activityDates)
        ? data.activityDates
        : activityDates;
      setScratchpadState(nextScratch);
      setStreak(nextStreak);
      setActivityDates(nextDates);
      syncMeta(nextScratch, nextStreak, nextDates);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <FlowStateContext.Provider
      value={{
        isHydrated,
        routines,
        notes,
        goals,
        scratchpad,
        streak,
        activityDates,
        todayIso,
        selectedDate,
        activeNoteId,
        viewMode,
        mobileTab,
        isScratchpadOpen,
        setSelectedDate,
        setActiveNoteId,
        setViewMode,
        setMobileTab,
        setIsScratchpadOpen,
        setScratchpad,
        toggleRoutine,
        addRoutine,
        updateRoutine,
        deleteRoutine,
        resetDay,
        addNote,
        updateNote,
        deleteNote,
        addGoal,
        toggleGoal,
        deleteGoal,
        logTodayStreak,
        promoteScratchpadToNote,
        exportWorkspace,
        importWorkspace,
      }}
    >
      {children}
    </FlowStateContext.Provider>
  );
}

export const useFlowState = () => {
  const context = useContext(FlowStateContext);
  if (!context)
    throw new Error('useFlowState must be used within FlowStateProvider');
  return context;
};