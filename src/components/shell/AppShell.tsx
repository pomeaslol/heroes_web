'use client';

import { useAppStore } from '@/lib/store/app-store';
import { signOutUser } from '@/lib/firebase/auth';
import { HomeView } from '@/components/home/HomeView';
import { ProgramsView } from '@/components/programs/ProgramsView';
import { ProfileView } from '@/components/profile/ProfileView';

const TABS = [
  { id: 'home'    as const, label: 'Home',    icon: '🏠' },
  { id: 'workout' as const, label: 'Séances', icon: '⚡' },
  { id: 'profile' as const, label: 'Profil',  icon: '◎' },
];

function TopBar() {
  const user  = useAppStore((s) => s.user);
  const today = new Date();
  const days   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

  return (
    <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 18px 10px', background: 'var(--bg)', borderBottom: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div className="font-display" style={{ fontSize: '2.2rem', letterSpacing: '.14em' }}>
        HER<span style={{ color: 'var(--primary)' }}>O</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '.62rem', color: 'var(--muted)', lineHeight: 1.5, letterSpacing: '.05em', textTransform: 'uppercase' }}>
          {days[today.getDay()]} {today.getDate()} {months[today.getMonth()]}
        </div>
        <button onClick={signOutUser} style={{ fontSize: '.55rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0', letterSpacing: '.05em', textTransform: 'uppercase' }}>
          {user?.displayName?.split(' ')[0]}
        </button>
      </div>
    </div>
  );
}

function BottomNav() {
  const currentView = useAppStore((s) => s.currentView);
  const setView     = useAppStore((s) => s.setView);

  return (
    <nav style={{ display: 'flex', background: 'var(--s1)', borderTop: '1px solid var(--border)', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {TABS.map((tab) => {
        const active = currentView === tab.id;
        return (
          <button key={tab.id} onClick={() => setView(tab.id)} style={{ flex: 1, padding: '9px 2px 7px', border: 'none', background: 'none', color: active ? 'var(--primary)' : 'var(--muted)', fontSize: '.5rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative', transition: 'color .15s' }}>
            {active && <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: 'var(--primary)', borderRadius: '0 0 2px 2px' }} />}
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
        {currentView === 'home'    && <HomeView />}
        {currentView === 'workout' && <ProgramsView />}
        {currentView === 'profile' && <ProfileView />}
      </div>
      <BottomNav />
    </div>
  );
}
