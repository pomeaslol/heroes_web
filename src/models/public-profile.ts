export interface PublicProfile {
  uid: string;
  displayName: string;
  language: 'en' | 'fr';
  enabled: boolean;
  discoverable: boolean;
  updatedAt: string;
}

export type MacroDomainId =
  | 'body' | 'mind' | 'career' | 'learning' | 'relationships'
  | 'money' | 'creativity' | 'home' | 'contribution' | 'spirituality' | 'other';

export interface MatchingProfile {
  uid: string;
  language: 'en' | 'fr';
  topMacro: MacroDomainId[];
  topFine: string[];
  macroDomainCount: number;
  fineDomainCount: number;
  hasSignal: boolean;
  indexedMacroIds: MacroDomainId[];
  updatedAt: string;
}
