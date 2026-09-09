export type Objective = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type TemporalGoal = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

export type Day = {
  id: string;
  date: string;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  date: string;
  content: string;
  created_at: string;
};

export type Learning = {
  id: string;
  date: string;
  content: string;
  created_at: string;
};

export type Reminder = {
  id: string;
  date: string;
  content: string;
  created_at: string;
  completed_at?: string | null;
};

export type DayMark = {
  complete: boolean;
  note: boolean;
  learn: boolean;
  reminder: boolean;
};

export type CompletionMode = "off" | "count" | "percent";

export type Settings = {
  id: number;
  completion_mode: CompletionMode;
  threshold: number;
  updated_at: string;
};

export type ChecklistStatus = "none" | "partial" | "done";

export type DailyObjective = {
  id: string;
  day_id: string;
  objective_id: string;
  status: ChecklistStatus;
};

export type ChecklistItem = {
  objectiveId: string;
  title: string;
  description: string | null;
  status: ChecklistStatus;
};

export type DayStatsPoint = {
  date: string;
  percent: number;
  hasData: boolean;
};