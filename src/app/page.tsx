'use client';

import { useAppStore } from '@/lib/store/app-store';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AppShell } from '@/components/shell/AppShell';

export default function Home() {
  const user = useAppStore((s) => s.user);
  const loading = useAppStore((s) => s.loading);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border2)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--bg)', gap: 32, padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="font-display" style={{ fontSize: '4rem', letterSpacing: '.15em', color: 'var(--text)' }}>
            HER<span style={{ color: 'var(--green)' }}>O</span>
          </div>
          <div style={{ fontSize: '.88rem', color: 'var(--muted)', marginTop: 8 }}>
            Suis tes objectifs. Progresse chaque jour.
          </div>
        </div>
        <GoogleSignInButton />
        <div style={{ fontSize: '.65rem', color: 'var(--muted)', textAlign: 'center', maxWidth: 240, lineHeight: 1.6 }}>
          Tes données sont synchronisées et privées. Seul ton profil public est visible si tu l'actives.
        </div>
      </div>
    );
  }

  return <AppShell />;
}
