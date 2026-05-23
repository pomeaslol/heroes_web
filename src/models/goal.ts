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

export const GOAL_XP: Record<GoalType, number> = {
  daily: 25,
  weekly: 150,
  immediate: 75,
  short: 300,
  medium: 1000,
  long: 3000,
  life: 15000,
};

const LEVEL_THRESHOLDS = [
  { level: 1, title: 'Novice',       xp: 0 },
  { level: 2, title: 'Apprenti',     xp: 500 },
  { level: 3, title: 'Initié',       xp: 1500 },
  { level: 4, title: 'Confirmé',     xp: 4000 },
  { level: 5, title: 'Expert',       xp: 10000 },
  { level: 6, title: 'Maître',       xp: 25000 },
  { level: 7, title: 'Grand Maître', xp: 60000 },
  { level: 8, title: 'Légende',      xp: 150000 },
];

export interface LevelInfo {
  level: number;
  title: string;
  xpRequired: number;
  xpNext: number;
  progress: number; // 0-1
}

export function computeLevelInfo(totalXP: number): LevelInfo {
  let currentIdx = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i].xp) {
      currentIdx = i;
      break;
    }
  }
  const current = LEVEL_THRESHOLDS[currentIdx];
  const next = LEVEL_THRESHOLDS[currentIdx + 1];
  const progress = next
    ? (totalXP - current.xp) / (next.xp - current.xp)
    : 1;
  return {
    level: current.level,
    title: current.title,
    xpRequired: current.xp,
    xpNext: next?.xp ?? current.xp,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

export function computeTotalXP(goals: Goal[]): number {
  return goals.reduce((xp, goal) => {
    const completions = goal.history.filter(h => h.done).length;
    return xp + completions * GOAL_XP[goal.type];
  }, 0);
}

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
