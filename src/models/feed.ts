import type { DayLog } from './day-log';

export interface FeedComment {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorUid: string;
  authorName: string;
  type: 'session' | 'goal';
  // session
  log?: DayLog;
  // goal
  goalLabel?: string;
  goalEmoji?: string;
  domainName?: string;
  note?: string;
  // engagement
  likes: string[];
  commentCount: number;
  createdAt: string;
}
