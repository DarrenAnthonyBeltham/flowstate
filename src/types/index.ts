export type WorkspaceType = 'work' | 'private';

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type Priority = 'low' | 'medium' | 'high';
export type RoutineCategory = 'Health' | 'Deep Work' | 'Personal' | 'Mindfulness';

export interface RoutineItem {
  id: string;
  title: string;
  timeSlot: string;
  period: TimePeriod;
  category: RoutineCategory;
  priority: Priority;
  completed: boolean;
  daysOfWeek?: string[];
  pomodorosCompleted?: number;
  workspace?: WorkspaceType;
}

export type NoteTag = 'Work' | 'Ideas' | 'Personal' | 'Journal' | 'DevLog';

export interface NoteVersion {
  id: string;
  content: string;
  savedAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tag: NoteTag;
  folder: string;
  pinned: boolean;
  targetDate?: string;
  updatedAt: string;
  versions?: NoteVersion[];
  workspace?: WorkspaceType;
}

export type GoalCategory =
  | 'Work'
  | 'Private'
  | 'Sprint'
  | 'System'
  | 'Fitness'
  | 'Personal';

export interface GoalSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface GoalItem {
  id: string;
  title: string;
  category: GoalCategory;
  deadline?: string;
  completed: boolean;
  subtasks?: GoalSubtask[];
  targetCount?: number;
  currentCount?: number;
  workspace?: WorkspaceType;
}

export type ViewMode = 'split' | 'calendar' | 'routine' | 'notes';
export type MobileTab = 'routine' | 'calendar' | 'notes' | 'scratchpad';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface WorkspaceTheme {
  name: WorkspaceType;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  accentBgSubtle: string;
  accentRing: string;
  badge: string;
  gradient: string;
  glow: string;
}
