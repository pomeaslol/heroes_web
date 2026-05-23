import { create } from 'zustand';
import { User } from 'firebase/auth';
import { AppData, SocialSettings, createDefaultAppData } from '@/models/app-data';
import { createDefaultPrograms } from '@/data/default-programs';
import { createDefaultDomains, createDefaultNotes } from '@/data/default-profile';
import { Program } from '@/models/program';
import { DayLog } from '@/models/day-log';
import { Note } from '@/models/note';
import { Domain, computeDomainScore } from '@/models/domain';
import { GOAL_POINTS } from '@/models/goal';
import { fetchAppData, saveAppData } from '@/lib/firebase/firestore';
import { upsertPublicProfile } from '@/lib/firebase/social';
import type { PublicProfileDoc } from '@/models/social';

type View = 'home' | 'workout' | 'profile';

interface AppStore {
  user: User | null;
  appData: AppData | null;
  loading: boolean;
  syncError: string | null;
  currentView: View;

  setUser: (user: User | null) => void;
  setView: (view: View) => void;
  syncFromCloud: () => Promise<void>;
  syncToCloud: () => Promise<void>;
  updateAppData: (partial: Partial<AppData>) => void;

  // Domains & Goals
  setDomains: (domains: Domain[]) => void;

  // Programs
  addProgram: (program: Program) => void;
  updateProgram: (program: Program) => void;
  deleteProgram: (id: string) => void;

  // Logs
  addLog: (log: DayLog) => void;
  updateLog: (id: string, partial: Partial<DayLog>) => void;
  deleteLog: (id: string) => void;

  // Notes
  addNote: (note: Note) => void;
  deleteNote: (id: string) => void;

  // Social
  updateSocialSettings: (settings: SocialSettings) => Promise<void>;
  toggleDomainPublic: (domainId: string) => void;
  toggleGoalPublic: (domainId: string, goalId: string) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  user: null,
  appData: null,
  loading: true,
  syncError: null,
  currentView: 'home',

  setUser: (user) => {
    set({ user });
    if (user) get().syncFromCloud();
    else set({ appData: null, loading: false });
  },

  setView: (view) => set({ currentView: view }),

  syncFromCloud: async () => {
    const { user } = get();
    if (!user) return;
    set({ loading: true, syncError: null });
    try {
      const cloud = await fetchAppData(user.uid);
      const data = cloud ?? createDefaultAppData(user.uid);
      const needsDefaults = !data.programs?.length || !data.domains?.length;
      const merged: AppData = {
        ...data,
        domains: data.domains?.length ? data.domains : createDefaultDomains(),
        programs: data.programs?.length ? data.programs : createDefaultPrograms(),
        logs: data.logs ?? [],
        notes: data.notes?.length ? data.notes : createDefaultNotes(),
      };
      set({ appData: merged, loading: false });
      // Persist defaults to Firestore so they survive next reload
      if (needsDefaults) {
        try { await saveAppData(user.uid, merged); } catch (_) {}
      }
    } catch (e) {
      set({ syncError: (e as Error).message, loading: false });
    }
  },

  syncToCloud: async () => {
    const { user, appData } = get();
    if (!user || !appData) return;
    try {
      await saveAppData(user.uid, appData);
    } catch (e) {
      set({ syncError: (e as Error).message });
    }
  },

  updateAppData: (partial) => {
    const { appData } = get();
    if (!appData) return;
    const updated = { ...appData, ...partial };
    set({ appData: updated });
    get().syncToCloud();
  },

  setDomains: (domains) => get().updateAppData({ domains }),

  addProgram: (program) => {
    const { appData } = get();
    if (!appData) return;
    get().updateAppData({ programs: [...appData.programs, program] });
  },

  updateProgram: (program) => {
    const { appData } = get();
    if (!appData) return;
    get().updateAppData({ programs: appData.programs.map((p) => (p.id === program.id ? program : p)) });
  },

  deleteProgram: (id) => {
    const { appData } = get();
    if (!appData) return;
    get().updateAppData({ programs: appData.programs.filter((p) => p.id !== id) });
  },

  addLog: (log) => {
    const { appData } = get();
    if (!appData) return;
    get().updateAppData({ logs: [...appData.logs, log] });
  },

  updateLog: (id, partial) => {
    const { appData } = get();
    if (!appData) return;
    get().updateAppData({ logs: appData.logs.map((l) => l.id === id ? { ...l, ...partial } : l) });
  },

  deleteLog: (id) => {
    const { appData } = get();
    if (!appData) return;
    get().updateAppData({ logs: appData.logs.filter((l) => l.id !== id) });
  },

  addNote: (note) => {
    const { appData } = get();
    if (!appData) return;
    get().updateAppData({ notes: [...appData.notes, note] });
  },

  deleteNote: (id) => {
    const { appData } = get();
    if (!appData) return;
    get().updateAppData({ notes: appData.notes.filter((n) => n.id !== id) });
  },

  updateSocialSettings: async (settings: SocialSettings) => {
    const { user, appData } = get();
    if (!appData) return;
    const updated = { ...appData, social: settings };
    set({ appData: updated });
    try {
      await saveAppData(user!.uid, updated);
    } catch (e) {
      set({ syncError: (e as Error).message });
    }

    // Publish public profile whenever social is enabled (discoverable controls search visibility)
    if (settings.enabled && user) {
      try {
        const currentData = get().appData!;
        const domains = currentData.domains ?? [];
        const logs = currentData.logs ?? [];

        // Compute streak
        const today = new Date();
        let streak = 0;
        for (let i = 0; i < 365; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().split('T')[0];
          if (logs.some((l) => l.date === key)) streak++;
          else if (i > 0) break;
        }

        // Compute totalPoints
        const totalPoints = domains
          .flatMap((d) => d.goals)
          .reduce((sum, g) => {
            if (g.done) return sum + GOAL_POINTS[g.type];
            if (g.type === 'daily' || g.type === 'weekly') return sum - GOAL_POINTS[g.type];
            return sum;
          }, 0);

        // Public domains = domains with isPublic flag
        const publicDomains = domains
          .filter((d) => d.isPublic)
          .map((d) => ({
            name: d.name,
            emoji: d.emoji,
            goalCount: d.goals.length,
            score: Math.max(0, computeDomainScore(d)),
          }));

        // Public goals = goals with isPublic flag inside public domains
        const publicGoals = domains
          .filter((d) => d.isPublic)
          .flatMap((d) =>
            d.goals
              .filter((g) => g.isPublic)
              .map((g) => ({ label: g.label, type: g.type, domainName: d.name }))
          );

        const profileDoc: PublicProfileDoc = {
          uid: user.uid,
          displayName: settings.displayName,
          language: currentData.language ?? 'fr',
          discoverable: settings.discoverable,
          bio: settings.bio,
          location: settings.location,
          publicDomains,
          publicGoals,
          streak,
          totalPoints,
          updatedAt: new Date().toISOString(),
        };
        await upsertPublicProfile(user.uid, profileDoc);
      } catch (e) {
        console.error('Failed to publish public profile:', e);
      }
    }
  },

  toggleDomainPublic: (domainId) => {
    const { appData } = get();
    if (!appData) return;
    const domains = appData.domains.map((d) =>
      d.id === domainId ? { ...d, isPublic: !d.isPublic } : d
    );
    get().updateAppData({ domains });
    if (appData.social?.enabled) {
      get().updateSocialSettings(appData.social);
    }
  },

  toggleGoalPublic: (domainId, goalId) => {
    const { appData } = get();
    if (!appData) return;
    const domains = appData.domains.map((d) => {
      if (d.id !== domainId) return d;
      return { ...d, goals: d.goals.map((g) => g.id === goalId ? { ...g, isPublic: !g.isPublic } : g) };
    });
    get().updateAppData({ domains });
    if (appData.social?.enabled) {
      get().updateSocialSettings(appData.social);
    }
  },
}));
