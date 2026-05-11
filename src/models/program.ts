export type TrackingType = 'sets' | 'duration' | 'checkbox' | 'text';

export type ProgramCategory =
  | 'sport' | 'nutrition' | 'wellbeing' | 'philosophy' | 'creativity' | 'custom';

export const CATEGORY_META: Record<ProgramCategory, { label: string; icon: string; color: string }> = {
  sport:       { label: 'Sport',        icon: '💪', color: '#d4f53c' },
  nutrition:   { label: 'Nutrition',    icon: '🥗', color: '#4aaeff' },
  wellbeing:   { label: 'Bien-être',    icon: '🧘', color: '#3fffc0' },
  philosophy:  { label: 'Philosophie',  icon: '📚', color: '#a855f7' },
  creativity:  { label: 'Créativité',   icon: '🎨', color: '#f472b6' },
  custom:      { label: 'Personnalisé', icon: '✨', color: '#ff8c2a' },
};

export interface ProgramItem {
  id: string;
  name: string;
  description?: string;
  tip?: string;
  trackingType: TrackingType;
  defaultSets?: number;
  defaultDuration?: number; // minutes
}

export interface ProgramBlock {
  id: string;
  title: string;
  items: ProgramItem[];
}

export interface Program {
  id: string;
  name: string;
  icon: string;
  category: ProgramCategory;
  color: string;
  blocks: ProgramBlock[];
  createdAt: string;
}
