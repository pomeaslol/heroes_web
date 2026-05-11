export type GoalType = 'daily' | 'weekly' | 'immediate' | 'short' | 'medium' | 'long' | 'life';

export interface GoalHistoryEntry {
  date: string; // ISO date
  done: boolean;
}

export interface Goal {
  id: string;
  label: string;
  type: GoalType;
  done: boolean;
  history: GoalHistoryEntry[];
  createdAt: string;
  note?: string;
  isPublic?: boolean;
}

export const GOAL_POINTS: Record<GoalType, number> = {
  daily: 1,
  weekly: 5,
  immediate: 2,
  short: 3,
  medium: 10,
  long: 30,
  life: 1000,
};

function getCurrentMondayKey(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return monday.toISOString().split('T')[0];
}

export function computeCurrentDone(goal: Goal): boolean {
  const today = new Date().toISOString().split('T')[0];
  if (goal.type === 'daily') {
    return goal.history.some((h) => h.date === today && h.done);
  }
  if (goal.type === 'weekly') {
    const weekStart = getCurrentMondayKey();
    return goal.history.some((h) => h.date >= weekStart && h.done);
  }
  return goal.done;
}

export function computeGoalScore(goal: Goal): number {
  const points = GOAL_POINTS[goal.type];
  const done = computeCurrentDone(goal);
  if (goal.type === 'daily' || goal.type === 'weekly') {
    return done ? points : -points;
  }
  return done ? points : 0;
}
