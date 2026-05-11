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

export function computeGoalScore(goal: Goal): number {
  const points = GOAL_POINTS[goal.type];
  if (goal.type === 'daily' || goal.type === 'weekly') {
    return goal.done ? points : -points;
  }
  return goal.done ? points : 0;
}
