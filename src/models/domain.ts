import { Goal, computeGoalScore } from './goal';

export interface Domain {
  id: string;
  name: string;
  emoji: string;
  goals: Goal[];
  createdAt: string;
  isPublic?: boolean;
}

export function computeDomainScore(domain: Domain): number {
  return domain.goals.reduce((sum, goal) => sum + computeGoalScore(goal), 0);
}
