export interface SetLog {
  w?: number;
  r?: number;
  rpe?: number;
  done: boolean;
}

export interface ItemLog {
  itemId: string;
  done: boolean;
  sets?: SetLog[];
  duration?: number; // minutes
  note?: string;
}

export interface BlockLog {
  blockId: string;
  items: ItemLog[];
}

export interface DayLog {
  id: string;
  date: string; // YYYY-MM-DD
  programId: string;
  programName: string;
  programIcon: string;
  programColor: string;
  blocks: BlockLog[];
  completedAt?: string;
}
