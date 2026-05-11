'use client';

import { useAppStore } from '@/lib/store/app-store';
import { signOutUser } from '@/lib/firebase/auth';
import { ProfileView } from '@/components/profile/ProfileView';
import { ProgramsView } from '@/components/programs/ProgramsView';
import { CalendarView } from '@/components/calendar/CalendarView';
import { NotesView } from '@/components/notes/NotesView';
import { SocialView } from '@/components/social/SocialView';

const TABS = [
  { id: 'profile'  as const, label: 'Profil',    icon: '◎' },
  { id: 'programs' as const, label: 'Séances',   icon: '⚡' },
  { id: 'calendar' as const, label: 'Calendrier',icon: '📅' },
  { id: 'notes'    as const, label: 'Carnet',    icon: '📓' },
  { id: 'social'   as const, label: 'Social',    icon: '👥' },
];

function TopBar() {
  const user = useAppStore((s) => s.user);
  const today = new Date();
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

  return (
    <div style={{
      padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 18px 12px',
      background: 'var(--s1)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div className="font-display" style={{ fontSize: '1.9rem', letterSpacing: '.12em' }}>
        HER<span style={{ color: 'var(--green)' }}>O</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '.65rem', color: 'var(--muted)', lineHeight: 1.5, letterSpacing: '.04em' }}>
          {days[today.getDay()]} {today.getDate()}<br />{months[today.getMonth()]} {today.getFullYear()}
        </div>
        <button onClick={signOutUser} style={{ fontSize: '.55rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0', letterSpacing: '.04em' }}>
          {user?.displayName?.split(' ')[0]}
        </button>
      </div>
    </div>
  );
}

function BottomNav() {
  const currentView = useAppStore((s) => s.currentView);
  const setView = useAppStore((s) => s.setView);

  return (
    <nav style={{
      display: 'flex',
      background: 'var(--s1)',
      borderTop: '1px solid var(--border)',
      flexShrink: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {TABS.map((tab) => {
        const active = currentView === tab.id;
        return (
          <button key={tab.id} onClick={() => setView(tab.id)} style={{
            flex: 1, padding: '9px 2px 7px', border: 'none', background: 'none',
            color: active ? 'var(--green)' : 'var(--muted)',
            fontSize: '.52rem', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            position: 'relative', transition: 'color .2s',
          }}>
            {active && (
              <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: 'var(--green)', borderRadius: '0 0 3px 3px' }} />
            )}
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const currentView = useAppStore((s) => s.currentView);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <TopBar />
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
        {currentView === 'profile'  && <ProfileView />}
        {currentView === 'programs' && <ProgramsView />}
        {currentView === 'calendar' && <CalendarView />}
        {currentView === 'notes'    && <NotesView />}
        {currentView === 'social'   && <SocialView />}
      </div>
      <BottomNav />
    </div>
  );
}
