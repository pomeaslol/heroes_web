import { Domain } from './domain';
import { Program } from './program';
import { DayLog } from './day-log';
import { Note } from './note';
import { createDefaultPrograms } from '@/data/default-programs';
import { createDefaultDomains, createDefaultNotes } from '@/data/default-profile';

export interface SocialSettings {
  enabled: boolean;
  discoverable: boolean;
  displayName: string;
  bio?: string;
  location?: string;
}

export interface AppData {
  userId: string;
  anonymousId: string;
  domains: Domain[];
  programs: Program[];
  logs: DayLog[];
  notes: Note[];
  onboardingDone: boolean;
  language: 'en' | 'fr';
  lastSyncedAt?: string;
  syncError?: string;
  social?: SocialSettings;
}

export function createDefaultAppData(userId: string): AppData {
  return {
    userId,
    anonymousId: crypto.randomUUID(),
    domains: createDefaultDomains(),
    programs: createDefaultPrograms(),
    logs: [],
    notes: createDefaultNotes(),
    onboardingDone: false,
    language: 'fr',
  };
}
