'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import type { User } from '@supabase/supabase-js';
import {
  RoutineItem,
  NoteItem,
  NoteVersion,
  GoalItem,
  GoalSubtask,
  ViewMode,
  MobileTab,
  TimePeriod,
  RoutineCategory,
  Priority,
  NoteTag,
  GoalCategory,
  SyncStatus,
  ToastItem,
} from '@/types';
import { supabase } from '@/lib/supabase';

interface FlowStateContextType {
  user: User | null;
  authLoading: boolean;
  isHydrated: boolean;
  syncStatus: SyncStatus;
  toasts: ToastItem[];
  routines: RoutineItem[];
  notes: NoteItem[];
  goals: GoalItem[];
  scratchpad: string;
  streak: number;
  activityDates: string[];
  activityMap: Record<string, number>;
  streakFreezes: number;
  todayIso: string;
  selectedDate: string;
  activeNoteId: string | null;
  viewMode: ViewMode;
  mobileTab: MobileTab;
  isScratchpadOpen: boolean;
  focusedRoutineId: string | null;
  setSelectedDate: (date: string) => void;
  setActiveNoteId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setMobileTab: (tab: MobileTab) => void;
  setIsScratchpadOpen: (open: boolean) => void;
  setFocusedRoutineId: (id: string | null) => void;
  setScratchpad: (text: string) => void;
  toggleRoutine: (id: string) => void;
  addRoutine: (item: Omit<RoutineItem, 'id' | 'completed'>) => void;
  updateRoutine: (item: RoutineItem) => void;
  deleteRoutine: (id: string) => void;
  resetDay: () => void;
  addNote: (partial?: Partial<NoteItem>) => string;
  updateNote: (id: string, updates: Partial<NoteItem>) => void;
  deleteNote: (id: string) => void;
  saveNoteSnapshot: (noteId: string) => void;
  restoreNoteSnapshot: (noteId: string, versionId: string) => void;
  addGoal: (item: Omit<GoalItem, 'id' | 'completed'>) => void;
  updateGoal: (goal: GoalItem) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  addSubtask: (goalId: string, title: string) => void;
  toggleSubtask: (goalId: string, subtaskId: string) => void;
  deleteSubtask: (goalId: string, subtaskId: string) => void;
  updateGoalProgress: (goalId: string, currentCount: number) => void;
  logTodayStreak: () => void;
  consumeStreakFreeze: () => void;
  incrementRoutinePomodoro: (routineId: string) => void;
  generateDailyStandup: () => string;
  wrapUpDay: (rolloverTasks: boolean) => void;
  promoteScratchpadToNote: () => string | null;
  exportWorkspace: () => void;
  importWorkspace: (jsonString: string) => boolean;
  signOut: () => Promise<void>;
  dismissToast: (id: string) => void;
  pushToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

interface DbRoutineRow {
  id: string;
  user_id?: string;
  title: string;
  time_slot: string;
  period: TimePeriod;
  category: RoutineCategory;
  priority: Priority;
  completed: boolean;
  days_of_week?: string[];
  pomodoros_completed?: number;
}

interface DbNoteRow {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  tag: NoteTag;
  pinned: boolean;
  target_date: string | null;
  versions?: NoteVersion[];
  updated_at: string;
}

interface DbGoalRow {
  id: string;
  user_id?: string;
  title: string;
  category: GoalCategory;
  deadline: string | null;
  completed: boolean;
  subtasks?: GoalSubtask[];
  target_count?: number;
  current_count?: number;
}

const FALLBACK_DATE = '2026-10-18';

const computeClientIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateStreak = (
  activityDates: string[],
  todayIso: string
): number => {
  if (!activityDates || activityDates.length === 0) return 0;
  const dateSet = new Set(activityDates);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [y, m, d] = todayIso.split('-').map(Number);
  const today = new Date(y, m - 1, d);

  const isTodayActive = dateSet.has(todayIso);

  const checkDate = new Date(today);
  if (!isTodayActive) {
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayIso = formatDate(checkDate);
    if (!dateSet.has(yesterdayIso)) {
      return 0;
    }
  }

  let count = 0;
  while (true) {
    const iso = formatDate(checkDate);
    if (dateSet.has(iso)) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return count;
};

const toDbRoutine = (r: RoutineItem, userId: string): DbRoutineRow => ({
  id: r.id,
  user_id: userId,
  title: r.title,
  time_slot: r.timeSlot,
  period: r.period,
  category: r.category,
  priority: r.priority,
  completed: r.completed,
  days_of_week: r.daysOfWeek || [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ],
  pomodoros_completed: r.pomodorosCompleted ?? 0,
});

const fromDbRoutine = (row: DbRoutineRow): RoutineItem => ({
  id: row.id,
  title: row.title,
  timeSlot: row.time_slot,
  period: row.period,
  category: row.category,
  priority: row.priority,
  completed: row.completed,
  daysOfWeek: Array.isArray(row.days_of_week)
    ? row.days_of_week
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  pomodorosCompleted:
    typeof row.pomodoros_completed === 'number' ? row.pomodoros_completed : 0,
});

const toDbNote = (n: NoteItem, userId: string): DbNoteRow => ({
  id: n.id,
  user_id: userId,
  title: n.title,
  content: n.content,
  tag: n.tag,
  pinned: n.pinned,
  target_date: n.targetDate || null,
  versions: n.versions || [],
  updated_at: n.updatedAt,
});

const fromDbNote = (row: DbNoteRow): NoteItem => ({
  id: row.id,
  title: row.title,
  content: row.content,
  tag: row.tag,
  pinned: row.pinned,
  targetDate: row.target_date || undefined,
  versions: Array.isArray(row.versions) ? row.versions : [],
  updatedAt: row.updated_at,
});

const toDbGoal = (g: GoalItem, userId: string): DbGoalRow => ({
  id: g.id,
  user_id: userId,
  title: g.title,
  category: g.category,
  deadline: g.deadline || null,
  completed: g.completed,
  subtasks: g.subtasks || [],
  target_count: g.targetCount ?? 0,
  current_count: g.currentCount ?? 0,
});

const fromDbGoal = (row: DbGoalRow): GoalItem => ({
  id: row.id,
  title: row.title,
  category: row.category,
  deadline: row.deadline || undefined,
  completed: row.completed,
  subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
  targetCount: typeof row.target_count === 'number' ? row.target_count : 0,
  currentCount: typeof row.current_count === 'number' ? row.current_count : 0,
});

const FlowStateContext = createContext<FlowStateContextType | undefined>(
  undefined
);

export function FlowStateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [todayIso, setTodayIso] = useState<string>(FALLBACK_DATE);
  const [selectedDate, setSelectedDate] = useState<string>(FALLBACK_DATE);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [scratchpad, setScratchpadState] = useState<string>('');
  const [activityDates, setActivityDates] = useState<string[]>([]);
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});
  const [streakFreezes, setStreakFreezes] = useState<number>(1);
  const [focusedRoutineId, setFocusedRoutineId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [mobileTab, setMobileTab] = useState<MobileTab>('routine');
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  const streak = useMemo(
    () => calculateStreak(activityDates, todayIso),
    [activityDates, todayIso]
  );

  const scratchpadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const activityDatesRef = useRef<string[]>(activityDates);
  const scratchpadRef = useRef<string>(scratchpad);
  const todayIsoRef = useRef<string>(todayIso);
  const activityMapRef = useRef<Record<string, number>>(activityMap);
  const streakFreezesRef = useRef<number>(streakFreezes);

  useEffect(() => {
    activityDatesRef.current = activityDates;
    scratchpadRef.current = scratchpad;
    todayIsoRef.current = todayIso;
    activityMapRef.current = activityMap;
    streakFreezesRef.current = streakFreezes;
  }, [activityDates, scratchpad, todayIso, activityMap, streakFreezes]);

  const pushToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'info') => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const clientToday = computeClientIsoDate();
      setTodayIso(clientToday);
      setSelectedDate(clientToday);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) {
        setIsHydrated(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const checkDateRollover = () => {
      const currentClientDate = computeClientIsoDate();
      setTodayIso((prev) => {
        if (prev !== currentClientDate) {
          setSelectedDate((sel) => (sel === prev ? currentClientDate : sel));
          return currentClientDate;
        }
        return prev;
      });
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkDateRollover();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    const interval = setInterval(checkDateRollover, 60000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const userId = user.id;
    const cacheKey = `fs_cache_${userId}`;

    const loadWorkspace = async () => {
      setSyncStatus('syncing');

      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached.routines)) setRoutines(cached.routines);
          if (Array.isArray(cached.notes)) setNotes(cached.notes);
          if (Array.isArray(cached.goals)) setGoals(cached.goals);
          if (typeof cached.scratchpad === 'string')
            setScratchpadState(cached.scratchpad);
          if (Array.isArray(cached.activityDates))
            setActivityDates(cached.activityDates);
          if (cached.activityMap && typeof cached.activityMap === 'object')
            setActivityMap(cached.activityMap);
          if (typeof cached.streakFreezes === 'number')
            setStreakFreezes(cached.streakFreezes);
        }
      } catch {}

      const [routinesRes, notesRes, goalsRes, metaRes] = await Promise.all([
        supabase
          .from('routines')
          .select('*')
          .eq('user_id', userId)
          .order('time_slot', { ascending: true }),
        supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('workspace_meta')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (!active) return;

      if (routinesRes.error || notesRes.error || goalsRes.error) {
        setSyncStatus(navigator.onLine ? 'error' : 'offline');
        setIsHydrated(true);
        return;
      }

      setRoutines((routinesRes.data as DbRoutineRow[]).map(fromDbRoutine));

      const loadedNotes = (notesRes.data as DbNoteRow[]).map(fromDbNote);
      setNotes(loadedNotes);
      setActiveNoteId(loadedNotes[0]?.id ?? null);

      setGoals((goalsRes.data as DbGoalRow[]).map(fromDbGoal));

      let loadedScratch = '';
      let loadedDates: string[] = [];
      let loadedMap: Record<string, number> = {};
      let loadedFreezes = 1;

      if (metaRes.data) {
        loadedScratch = metaRes.data.scratchpad ?? '';
        loadedDates = Array.isArray(metaRes.data.activity_dates)
          ? metaRes.data.activity_dates
          : [];
        loadedMap =
          metaRes.data.activity_map &&
          typeof metaRes.data.activity_map === 'object'
            ? metaRes.data.activity_map
            : {};
        loadedFreezes =
          typeof metaRes.data.streak_freezes === 'number'
            ? metaRes.data.streak_freezes
            : 1;
      } else if (!metaRes.error) {
        await supabase.from('workspace_meta').upsert(
          {
            user_id: userId,
            scratchpad: '',
            streak: 0,
            activity_dates: [],
            activity_map: {},
            streak_freezes: 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } else {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            if (typeof cached.scratchpad === 'string')
              loadedScratch = cached.scratchpad;
            if (Array.isArray(cached.activityDates))
              loadedDates = cached.activityDates;
            if (cached.activityMap && typeof cached.activityMap === 'object')
              loadedMap = cached.activityMap;
            if (typeof cached.streakFreezes === 'number')
              loadedFreezes = cached.streakFreezes;
          } catch {}
        }
      }

      const clientToday = computeClientIsoDate();
      let nextDates = loadedDates;
      if (!loadedDates.includes(clientToday)) {
        nextDates = [...loadedDates, clientToday];
        const nextStreak = calculateStreak(nextDates, clientToday);
        supabase
          .from('workspace_meta')
          .upsert(
            {
              user_id: userId,
              scratchpad: loadedScratch,
              streak: nextStreak,
              activity_dates: nextDates,
              activity_map: loadedMap,
              streak_freezes: loadedFreezes,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
          .then();
      }

      setScratchpadState(loadedScratch);
      setActivityDates(nextDates);
      setActivityMap(loadedMap);
      setStreakFreezes(loadedFreezes);
      setSyncStatus('synced');
      setIsHydrated(true);
    };

    loadWorkspace();

    const channel = supabase
      .channel(`workspace_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'routines',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          supabase
            .from('routines')
            .select('*')
            .eq('user_id', userId)
            .order('time_slot', { ascending: true })
            .then(({ data }) => {
              if (data) setRoutines((data as DbRoutineRow[]).map(fromDbRoutine));
            });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          supabase
            .from('goals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              if (data) setGoals((data as DbGoalRow[]).map(fromDbGoal));
            });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !isHydrated) return;
    const cacheKey = `fs_cache_${user.id}`;
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        routines,
        notes,
        goals,
        scratchpad,
        streak,
        activityDates,
        activityMap,
        streakFreezes,
      })
    );
  }, [
    user,
    isHydrated,
    routines,
    notes,
    goals,
    scratchpad,
    streak,
    activityDates,
    activityMap,
    streakFreezes,
  ]);

  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('synced');
      pushToast('Back online — synced with Supabase', 'success');
    };
    const handleOffline = () => {
      setSyncStatus('offline');
      pushToast('Offline mode — caching changes locally', 'info');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pushToast]);

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

  const syncMeta = useCallback(
    (
      nextScratch: string,
      nextDates: string[],
      nextMap?: Record<string, number>,
      nextFreezes?: number
    ) => {
      if (!user) return;
      const computedStreak = calculateStreak(nextDates, todayIsoRef.current);
      const mapToSync = nextMap || activityMapRef.current;
      const freezesToSync =
        typeof nextFreezes === 'number'
          ? nextFreezes
          : streakFreezesRef.current;

      setSyncStatus('syncing');
      supabase
        .from('workspace_meta')
        .upsert(
          {
            user_id: user.id,
            scratchpad: nextScratch,
            streak: computedStreak,
            activity_dates: nextDates,
            activity_map: mapToSync,
            streak_freezes: freezesToSync,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .then(({ error }) => {
          setSyncStatus(error ? 'error' : 'synced');
        });
    },
    [user]
  );

  const setScratchpad = (text: string) => {
    setScratchpadState(text);
    if (scratchpadTimerRef.current) {
      clearTimeout(scratchpadTimerRef.current);
    }
    scratchpadTimerRef.current = setTimeout(() => {
      syncMeta(text, activityDatesRef.current);
    }, 400);
  };

  const logTodayStreak = useCallback(() => {
    const currentToday = computeClientIsoDate();
    if (!activityDatesRef.current.includes(currentToday)) {
      const nextDates = [...activityDatesRef.current, currentToday];
      const nextIntensity = (activityMapRef.current[currentToday] || 0) + 1;
      const nextMap = { ...activityMapRef.current, [currentToday]: nextIntensity };
      setActivityDates(nextDates);
      setActivityMap(nextMap);
      syncMeta(scratchpadRef.current, nextDates, nextMap);
      const newStreak = calculateStreak(nextDates, currentToday);
      pushToast(`Streak extended to ${newStreak} days!`, 'success');
    } else {
      const currentStreak = calculateStreak(
        activityDatesRef.current,
        currentToday
      );
      pushToast(`${currentStreak}-day streak active for today!`, 'info');
    }
  }, [syncMeta, pushToast]);

  const consumeStreakFreeze = useCallback(() => {
    if (!user || streakFreezesRef.current <= 0) {
      pushToast('No streak freezes available.', 'error');
      return;
    }
    const currentToday = computeClientIsoDate();
    const [y, m, d] = currentToday.split('-').map(Number);
    const prevDate = new Date(y, m - 1, d);
    prevDate.setDate(prevDate.getDate() - 1);
    const py = prevDate.getFullYear();
    const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
    const pd = String(prevDate.getDate()).padStart(2, '0');
    const yesterdayIso = `${py}-${pm}-${pd}`;

    if (activityDatesRef.current.includes(yesterdayIso)) {
      pushToast('Yesterday is already recorded in your streak.', 'info');
      return;
    }

    const nextDates = [...activityDatesRef.current, yesterdayIso];
    const nextFreezes = streakFreezesRef.current - 1;
    setActivityDates(nextDates);
    setStreakFreezes(nextFreezes);
    syncMeta(
      scratchpadRef.current,
      nextDates,
      activityMapRef.current,
      nextFreezes
    );
    pushToast('Streak Shield consumed! Yesterday protected.', 'success');
  }, [user, syncMeta, pushToast]);

  const toggleRoutine = (id: string) => {
    if (!user) return;
    setRoutines((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, completed: !item.completed };
          setSyncStatus('syncing');
          supabase
            .from('routines')
            .update({ completed: updated.completed })
            .eq('id', id)
            .eq('user_id', user.id)
            .then(({ error }) => setSyncStatus(error ? 'error' : 'synced'));

          const currentToday = todayIsoRef.current;
          if (
            updated.completed &&
            !activityDatesRef.current.includes(currentToday)
          ) {
            const nextDates = [...activityDatesRef.current, currentToday];
            const nextIntensity =
              (activityMapRef.current[currentToday] || 0) + 1;
            const nextMap = {
              ...activityMapRef.current,
              [currentToday]: nextIntensity,
            };
            setActivityDates(nextDates);
            setActivityMap(nextMap);
            syncMeta(scratchpadRef.current, nextDates, nextMap);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const addRoutine = (item: Omit<RoutineItem, 'id' | 'completed'>) => {
    if (!user) return;
    const newItem: RoutineItem = {
      ...item,
      id: `r-${Date.now()}`,
      completed: false,
      daysOfWeek: item.daysOfWeek || [
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
        'Sun',
      ],
      pomodorosCompleted: item.pomodorosCompleted || 0,
    };
    setRoutines((prev) =>
      [...prev, newItem].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    );
    setSyncStatus('syncing');
    supabase
      .from('routines')
      .insert(toDbRoutine(newItem, user.id))
      .then(({ error }) => {
        setSyncStatus(error ? 'error' : 'synced');
        if (!error) pushToast('Routine block added', 'success');
      });
  };

  const updateRoutine = (updated: RoutineItem) => {
    if (!user) return;
    setRoutines((prev) =>
      prev
        .map((item) => (item.id === updated.id ? updated : item))
        .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    );
    setSyncStatus('syncing');
    supabase
      .from('routines')
      .upsert(toDbRoutine(updated, user.id))
      .then(({ error }) => setSyncStatus(error ? 'error' : 'synced'));
  };

  const deleteRoutine = (id: string) => {
    if (!user) return;
    setRoutines((prev) => prev.filter((item) => item.id !== id));
    if (focusedRoutineId === id) setFocusedRoutineId(null);
    supabase
      .from('routines')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .then(() => pushToast('Routine deleted', 'info'));
  };

  const resetDay = () => {
    if (!user) return;
    const completedCount = routines.filter((r) => r.completed).length;
    const currentToday = todayIsoRef.current;
    if (
      completedCount > 0 &&
      !activityDatesRef.current.includes(currentToday)
    ) {
      const nextDates = [...activityDatesRef.current, currentToday];
      const nextIntensity =
        (activityMapRef.current[currentToday] || 0) + completedCount;
      const nextMap = {
        ...activityMapRef.current,
        [currentToday]: nextIntensity,
      };
      setActivityDates(nextDates);
      setActivityMap(nextMap);
      syncMeta(scratchpadRef.current, nextDates, nextMap);
    }

    setRoutines((prev) => prev.map((item) => ({ ...item, completed: false })));
    supabase
      .from('routines')
      .update({ completed: false })
      .eq('user_id', user.id)
      .then(() => pushToast('Day reset for a fresh start', 'success'));
  };

  const addNote = useCallback(
    (partial?: Partial<NoteItem>) => {
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
        versions: [],
        updatedAt: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
      setActiveNoteId(id);
      if (user) {
        setSyncStatus('syncing');
        supabase
          .from('notes')
          .insert(toDbNote(newNote, user.id))
          .then(({ error }) => {
            setSyncStatus(error ? 'error' : 'synced');
            if (!error) pushToast('New note created', 'success');
          });
      }
      return id;
    },
    [user, selectedDate, pushToast]
  );

  const updateNote = useCallback(
    (id: string, updates: Partial<NoteItem>) => {
      if (!user) return;
      const now = new Date().toISOString();
      setNotes((prev) =>
        prev.map((note) => {
          if (note.id === id) {
            const updatedNote = { ...note, ...updates, updatedAt: now };
            if (noteTimersRef.current[id]) {
              clearTimeout(noteTimersRef.current[id]);
            }
            setSyncStatus('syncing');
            noteTimersRef.current[id] = setTimeout(() => {
              supabase
                .from('notes')
                .upsert(toDbNote(updatedNote, user.id))
                .then(({ error }) => setSyncStatus(error ? 'error' : 'synced'));
            }, 350);
            return updatedNote;
          }
          return note;
        })
      );
    },
    [user]
  );

  const saveNoteSnapshot = (noteId: string) => {
    if (!user) return;
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const snap: NoteVersion = {
      id: `v-${Date.now()}`,
      content: target.content,
      savedAt: new Date().toISOString(),
    };
    const nextVersions = [snap, ...(target.versions || [])].slice(0, 15);
    updateNote(noteId, { versions: nextVersions });
    pushToast('Snapshot saved to version history', 'success');
  };

  const restoreNoteSnapshot = (noteId: string, versionId: string) => {
    const target = notes.find((n) => n.id === noteId);
    const ver = target?.versions?.find((v) => v.id === versionId);
    if (!target || !ver) return;
    updateNote(noteId, { content: ver.content });
    pushToast('Note restored from snapshot', 'info');
  };

  const deleteNote = (id: string) => {
    if (!user) return;
    setNotes((prev) => {
      const remaining = prev.filter((note) => note.id !== id);
      if (activeNoteId === id) {
        setActiveNoteId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
    supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .then(() => pushToast('Note deleted', 'info'));
  };

  const addGoal = (item: Omit<GoalItem, 'id' | 'completed'>) => {
    if (!user) return;
    const newGoal: GoalItem = {
      id: `g-${Date.now()}`,
      title: item.title,
      category: item.category,
      deadline: item.deadline || undefined,
      completed: false,
      subtasks: item.subtasks || [],
      targetCount: item.targetCount || 0,
      currentCount: item.currentCount || 0,
    };
    setGoals((prev) => [newGoal, ...prev]);
    setSyncStatus('syncing');
    supabase
      .from('goals')
      .insert(toDbGoal(newGoal, user.id))
      .then(({ error }) => {
        setSyncStatus(error ? 'error' : 'synced');
        if (!error) pushToast('Goal added', 'success');
      });
  };

  const updateGoal = useCallback(
    (updated: GoalItem) => {
      if (!user) return;
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setSyncStatus('syncing');
      supabase
        .from('goals')
        .upsert(toDbGoal(updated, user.id))
        .then(({ error }) => setSyncStatus(error ? 'error' : 'synced'));
    },
    [user]
  );

  const toggleGoal = (id: string) => {
    const target = goals.find((g) => g.id === id);
    if (!target) return;
    updateGoal({ ...target, completed: !target.completed });
  };

  const deleteGoal = (id: string) => {
    if (!user) return;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .then(() => pushToast('Goal removed', 'info'));
  };

  const addSubtask = useCallback(
    (goalId: string, title: string) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target || !title.trim()) return;
      const newSubtask: GoalSubtask = {
        id: `st-${Date.now()}`,
        title: title.trim(),
        completed: false,
      };
      const updatedSubtasks = [...(target.subtasks || []), newSubtask];
      updateGoal({ ...target, subtasks: updatedSubtasks });
    },
    [goals, updateGoal]
  );

  const toggleSubtask = useCallback(
    (goalId: string, subtaskId: string) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target) return;
      const updatedSubtasks = (target.subtasks || []).map((st) =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      const allCompleted =
        updatedSubtasks.length > 0 &&
        updatedSubtasks.every((st) => st.completed);
      updateGoal({
        ...target,
        subtasks: updatedSubtasks,
        completed: allCompleted ? true : target.completed,
      });
    },
    [goals, updateGoal]
  );

  const deleteSubtask = useCallback(
    (goalId: string, subtaskId: string) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target) return;
      const updatedSubtasks = (target.subtasks || []).filter(
        (st) => st.id !== subtaskId
      );
      updateGoal({ ...target, subtasks: updatedSubtasks });
    },
    [goals, updateGoal]
  );

  const updateGoalProgress = useCallback(
    (goalId: string, currentCount: number) => {
      const target = goals.find((g) => g.id === goalId);
      if (!target) return;
      const safeCount = Math.max(0, currentCount);
      const targetCount = target.targetCount || 0;
      const isComplete = targetCount > 0 && safeCount >= targetCount;
      updateGoal({
        ...target,
        currentCount: safeCount,
        completed: isComplete ? true : target.completed,
      });
    },
    [goals, updateGoal]
  );

  const incrementRoutinePomodoro = useCallback(
    (routineId: string) => {
      if (!user) return;
      const target = routines.find((r) => r.id === routineId);
      if (!target) return;
      const currentToday = computeClientIsoDate();
      const updatedPomodoros = (target.pomodorosCompleted || 0) + 1;
      const updatedRoutine: RoutineItem = {
        ...target,
        pomodorosCompleted: updatedPomodoros,
      };
      setRoutines((prev) =>
        prev.map((r) => (r.id === routineId ? updatedRoutine : r))
      );
      supabase
        .from('routines')
        .update({ pomodoros_completed: updatedPomodoros })
        .eq('id', routineId)
        .eq('user_id', user.id)
        .then();

      const nextIntensity = (activityMapRef.current[currentToday] || 0) + 1;
      const nextMap = {
        ...activityMapRef.current,
        [currentToday]: nextIntensity,
      };
      setActivityMap(nextMap);

      const nextDates = activityDatesRef.current.includes(currentToday)
        ? activityDatesRef.current
        : [...activityDatesRef.current, currentToday];
      if (!activityDatesRef.current.includes(currentToday)) {
        setActivityDates(nextDates);
      }

      syncMeta(
        scratchpadRef.current,
        nextDates,
        nextMap,
        streakFreezesRef.current
      );

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const logLine = `- [x] Focus session: ${target.title} (${timeStr})`;
      const todayNote = notes.find((n) => n.targetDate === currentToday);
      if (todayNote) {
        updateNote(todayNote.id, {
          content: `${todayNote.content.trimEnd()}\n${logLine}`,
        });
      } else {
        addNote({
          title: `dev-log-${currentToday}`,
          targetDate: currentToday,
          tag: 'DevLog',
          content: `# Log: ${currentToday}\n\n## Focus Sessions\n${logLine}\n\n## Tasks\n- [ ] \n`,
        });
      }

      pushToast(`Pomodoro logged for ${target.title}!`, 'success');
    },
    [user, routines, notes, syncMeta, pushToast, updateNote, addNote]
  );

  const generateDailyStandup = useCallback(() => {
    const currentToday = computeClientIsoDate();
    const [y, m, d] = currentToday.split('-').map(Number);
    const prevDate = new Date(y, m - 1, d);
    prevDate.setDate(prevDate.getDate() - 1);
    const py = prevDate.getFullYear();
    const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
    const pd = String(prevDate.getDate()).padStart(2, '0');
    const yesterdayIso = `${py}-${pm}-${pd}`;

    const yesterdayNote = notes.find((n) => n.targetDate === yesterdayIso);
    const yesterdayTasksDone: string[] = [];
    const yesterdayTasksPending: string[] = [];

    if (yesterdayNote) {
      for (const line of yesterdayNote.content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- [x] ')) {
          yesterdayTasksDone.push(trimmed.slice(6));
        } else if (trimmed.startsWith('- [ ] ')) {
          yesterdayTasksPending.push(trimmed.slice(6));
        }
      }
    }

    const todayHighPriorityRoutines = routines
      .filter((r) => r.priority === 'high')
      .map((r) => r.title);

    const yesterdayCompletedRoutines = routines
      .filter((r) => r.completed)
      .map((r) => r.title);

    const completedItems = Array.from(
      new Set([...yesterdayCompletedRoutines, ...yesterdayTasksDone])
    );
    const priorityItems = Array.from(
      new Set([...todayHighPriorityRoutines, ...yesterdayTasksPending])
    );

    const standupMarkdown = [
      `# Daily Standup — ${currentToday}`,
      '',
      `## Yesterday's Completed`,
      completedItems.length > 0
        ? completedItems.map((item) => `- [x] ${item}`).join('\n')
        : '- [x] Maintained routine and development momentum',
      '',
      `## Today's Priorities`,
      priorityItems.length > 0
        ? priorityItems.map((item) => `- [ ] ${item}`).join('\n')
        : '- [ ] Complete scheduled daily routines',
      '',
      `## Blockers & Architecture Notes`,
      '- None currently blocking.',
      '',
    ].join('\n');

    const todayNote = notes.find(
      (n) => n.targetDate === currentToday && n.tag === 'DevLog'
    );
    let targetNoteId = '';

    if (todayNote) {
      targetNoteId = todayNote.id;
      updateNote(todayNote.id, {
        content: `${todayNote.content.trimEnd()}\n\n${standupMarkdown}`,
      });
      setActiveNoteId(todayNote.id);
    } else {
      targetNoteId = addNote({
        title: `standup-${currentToday}`,
        targetDate: currentToday,
        tag: 'DevLog',
        content: standupMarkdown,
      });
      setActiveNoteId(targetNoteId);
    }

    pushToast('Daily Standup generated in DevLog', 'success');
    return targetNoteId;
  }, [notes, routines, updateNote, addNote, pushToast]);

  const wrapUpDay = useCallback(
    (rolloverTasks: boolean) => {
      if (!user) return;
      const currentToday = computeClientIsoDate();
      const completedCount = routines.filter((r) => r.completed).length;

      const nextIntensity =
        (activityMapRef.current[currentToday] || 0) + completedCount;
      const nextMap = {
        ...activityMapRef.current,
        [currentToday]: nextIntensity,
      };
      setActivityMap(nextMap);

      const nextDates = activityDatesRef.current.includes(currentToday)
        ? activityDatesRef.current
        : [...activityDatesRef.current, currentToday];
      if (!activityDatesRef.current.includes(currentToday)) {
        setActivityDates(nextDates);
      }

      if (rolloverTasks) {
        const [y, m, d] = currentToday.split('-').map(Number);
        const tomDate = new Date(y, m - 1, d);
        tomDate.setDate(tomDate.getDate() + 1);
        const ty = tomDate.getFullYear();
        const tm = String(tomDate.getMonth() + 1).padStart(2, '0');
        const td = String(tomDate.getDate()).padStart(2, '0');
        const tomorrowIso = `${ty}-${tm}-${td}`;

        const uncompletedHighPriority = routines
          .filter((r) => !r.completed && r.priority === 'high')
          .map((r) => `- [ ] ${r.title}`);

        if (uncompletedHighPriority.length > 0) {
          const tomNote = notes.find(
            (n) => n.targetDate === tomorrowIso && n.tag === 'DevLog'
          );
          if (tomNote) {
            updateNote(tomNote.id, {
              content: `${tomNote.content.trimEnd()}\n\n## Rollover Tasks\n${uncompletedHighPriority.join(
                '\n'
              )}`,
            });
          } else {
            addNote({
              title: `dev-log-${tomorrowIso}`,
              targetDate: tomorrowIso,
              tag: 'DevLog',
              content: `# Log: ${tomorrowIso}\n\n## Rollover Tasks\n${uncompletedHighPriority.join(
                '\n'
              )}\n\n## Notes\n`,
            });
          }
        }
      }

      syncMeta(
        scratchpadRef.current,
        nextDates,
        nextMap,
        streakFreezesRef.current
      );

      setRoutines((prev) =>
        prev.map((item) => ({ ...item, completed: false }))
      );
      supabase
        .from('routines')
        .update({ completed: false })
        .eq('user_id', user.id)
        .then();

      pushToast('Day wrapped up and routines reset for tomorrow!', 'success');
    },
    [user, routines, notes, syncMeta, updateNote, addNote, pushToast]
  );

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
      activityMap,
      streakFreezes,
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
    pushToast('Workspace backup exported', 'success');
  };

  const importWorkspace = (jsonString: string): boolean => {
    if (!user) return false;
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.routines)) {
        setRoutines(data.routines);
        supabase
          .from('routines')
          .upsert(
            data.routines.map((r: RoutineItem) => toDbRoutine(r, user.id))
          )
          .then();
      }
      if (Array.isArray(data.notes)) {
        setNotes(data.notes);
        supabase
          .from('notes')
          .upsert(data.notes.map((n: NoteItem) => toDbNote(n, user.id)))
          .then();
      }
      if (Array.isArray(data.goals)) {
        setGoals(data.goals);
        supabase
          .from('goals')
          .upsert(data.goals.map((g: GoalItem) => toDbGoal(g, user.id)))
          .then();
      }
      const nextScratch =
        typeof data.scratchpad === 'string' ? data.scratchpad : scratchpad;
      const nextDates = Array.isArray(data.activityDates)
        ? data.activityDates
        : activityDates;
      const nextMap =
        data.activityMap && typeof data.activityMap === 'object'
          ? data.activityMap
          : activityMap;
      const nextFreezes =
        typeof data.streakFreezes === 'number'
          ? data.streakFreezes
          : streakFreezes;

      setScratchpadState(nextScratch);
      setActivityDates(nextDates);
      setActivityMap(nextMap);
      setStreakFreezes(nextFreezes);
      syncMeta(nextScratch, nextDates, nextMap, nextFreezes);
      pushToast('Backup imported & synced', 'success');
      return true;
    } catch {
      pushToast('Invalid backup JSON file', 'error');
      return false;
    }
  };

  const signOut = async () => {
    if (user) {
      localStorage.removeItem(`fs_cache_${user.id}`);
    }
    await supabase.auth.signOut();
    setUser(null);
    setRoutines([]);
    setNotes([]);
    setGoals([]);
    setScratchpadState('');
    setActivityDates([]);
    setActivityMap({});
    setStreakFreezes(1);
    setFocusedRoutineId(null);
    setActiveNoteId(null);
  };

  return (
    <FlowStateContext.Provider
      value={{
        user,
        authLoading,
        isHydrated,
        syncStatus,
        toasts,
        routines,
        notes,
        goals,
        scratchpad,
        streak,
        activityDates,
        activityMap,
        streakFreezes,
        todayIso,
        selectedDate,
        activeNoteId,
        viewMode,
        mobileTab,
        isScratchpadOpen,
        focusedRoutineId,
        setSelectedDate,
        setActiveNoteId,
        setViewMode,
        setMobileTab,
        setIsScratchpadOpen,
        setFocusedRoutineId,
        setScratchpad,
        toggleRoutine,
        addRoutine,
        updateRoutine,
        deleteRoutine,
        resetDay,
        addNote,
        updateNote,
        deleteNote,
        saveNoteSnapshot,
        restoreNoteSnapshot,
        addGoal,
        updateGoal,
        toggleGoal,
        deleteGoal,
        addSubtask,
        toggleSubtask,
        deleteSubtask,
        updateGoalProgress,
        logTodayStreak,
        consumeStreakFreeze,
        incrementRoutinePomodoro,
        generateDailyStandup,
        wrapUpDay,
        promoteScratchpadToNote,
        exportWorkspace,
        importWorkspace,
        signOut,
        dismissToast,
        pushToast,
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
