export interface SetLog {
  w?: number;
  r?: number;
  rpe?: number;
  done: boolean;
}

export interface ItemLog {
  itemId: string;
  name?: string;       // populated when saving so logs are self-contained
  done: boolean;
  sets?: SetLog[];
  duration?: number;   // minutes
  note?: string;
  isPublic?: boolean;  // false = excluded from public feed
}

export interface BlockLog {
  blockId: string;
  title?: string;      // populated when saving
  items: ItemLog[];
}

export interface DayLog {
  id: string;
  date: string;        // YYYY-MM-DD
  programId: string;
  programName: string;
  programIcon: string;
  programColor: string;
  programCategory?: string;
  blocks: BlockLog[];
  completedAt?: string;
  note?: string;
  isPublic?: boolean;
  feedPostId?: string; // Firestore feed_posts doc ID if published
}
