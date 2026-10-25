'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type { User } from '@supabase/supabase-js';
import {
  RoutineItem,
  NoteItem,
  NoteVersion,
  GoalItem,
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
  saveNoteSnapshot: (noteId: string) => void;
  restoreNoteSnapshot: (noteId: string, versionId: string) => void;
  addGoal: (item: Omit<GoalItem, 'id' | 'completed'>) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  logTodayStreak: () => void;
  promoteScratchpadToNote: () => string | null;
  exportWorkspace: () => void;
  importWorkspace: (jsonString: string) => boolean;
  signOut: () => Promise<void>;
  dismissToast: (id: string) => void;
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
}

const FALLBACK_DATE = '2026-10-18';

const computeClientIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [streak, setStreak] = useState<number>(0);
  const [activityDates, setActivityDates] = useState<string[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [mobileTab, setMobileTab] = useState<MobileTab>('routine');
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  const scratchpadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );

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
          if (typeof cached.streak === 'number') setStreak(cached.streak);
          if (Array.isArray(cached.activityDates))
            setActivityDates(cached.activityDates);
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

      if (metaRes.data) {
        setScratchpadState(metaRes.data.scratchpad ?? '');
        setStreak(metaRes.data.streak ?? 0);
        setActivityDates(
          Array.isArray(metaRes.data.activity_dates)
            ? metaRes.data.activity_dates
            : []
        );
      } else {
        await supabase.from('workspace_meta').upsert(
          {
            user_id: userId,
            scratchpad: '',
            streak: 0,
            activity_dates: [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        setScratchpadState('');
        setStreak(0);
        setActivityDates([]);
      }

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

  const syncMeta = (
    nextScratch: string,
    nextStreak: number,
    nextDates: string[]
  ) => {
    if (!user) return;
    setSyncStatus('syncing');
    supabase
      .from('workspace_meta')
      .upsert(
        {
          user_id: user.id,
          scratchpad: nextScratch,
          streak: nextStreak,
          activity_dates: nextDates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .then(({ error }) => {
        setSyncStatus(error ? 'error' : 'synced');
      });
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
    pushToast(`Streak incremented to ${nextStreak} days!`, 'success');
  };

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
    if (!user) return;
    const newItem: RoutineItem = {
      ...item,
      id: `r-${Date.now()}`,
      completed: false,
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
    supabase
      .from('routines')
      .update({ completed: false })
      .eq('user_id', user.id)
      .then(() => pushToast('Day reset for a fresh start', 'success'));
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
  };

  const updateNote = (id: string, updates: Partial<NoteItem>) => {
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
  };

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

  const toggleGoal = (id: string) => {
    if (!user) return;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const updated = { ...g, completed: !g.completed };
          setSyncStatus('syncing');
          supabase
            .from('goals')
            .update({ completed: updated.completed })
            .eq('id', id)
            .eq('user_id', user.id)
            .then(({ error }) => setSyncStatus(error ? 'error' : 'synced'));
          return updated;
        }
        return g;
      })
    );
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
      const nextStreak =
        typeof data.streak === 'number' ? data.streak : streak;
      const nextDates = Array.isArray(data.activityDates)
        ? data.activityDates
        : activityDates;
      setScratchpadState(nextScratch);
      setStreak(nextStreak);
      setActivityDates(nextDates);
      syncMeta(nextScratch, nextStreak, nextDates);
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
    setStreak(0);
    setActivityDates([]);
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
        saveNoteSnapshot,
        restoreNoteSnapshot,
        addGoal,
        toggleGoal,
        deleteGoal,
        logTodayStreak,
        promoteScratchpadToNote,
        exportWorkspace,
        importWorkspace,
        signOut,
        dismissToast,
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