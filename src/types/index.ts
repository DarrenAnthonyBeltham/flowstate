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
}

export type NoteTag = 'Work' | 'Ideas' | 'Personal' | 'Journal' | 'DevLog';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tag: NoteTag;
  pinned: boolean;
  targetDate?: string;
  updatedAt: string;
}

export type GoalCategory = 'Sprint' | 'System' | 'Fitness' | 'Personal';

export interface GoalItem {
  id: string;
  title: string;
  category: GoalCategory;
  deadline?: string;
  completed: boolean;
}

export type ViewMode = 'split' | 'calendar' | 'routine' | 'notes';
export type MobileTab = 'routine' | 'calendar' | 'notes' | 'scratchpad';