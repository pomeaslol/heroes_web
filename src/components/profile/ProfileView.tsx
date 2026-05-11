'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { RadarChart } from './RadarChart';
import { Domain } from '@/models/domain';
import { Goal, GoalType, GOAL_POINTS } from '@/models/goal';
import { computeDomainScore } from '@/models/domain';
import { DayLog } from '@/models/day-log';

// Points approximated as 5 pts per completed session
const PTS_PER_SESSION = 5;

function ActivityChart({ logs }: { logs: DayLog[] }) {
  const DAYS = 90;
  const data = useMemo(() => {
    const byDate: Record<string, number> = {};
    logs.forEach((l) => {
      byDate[l.date] = (byDate[l.date] ?? 0) + 1;
    });
    const today = new Date();
    let cumulative = 0;
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (DAYS - 1 - i));
      const key = d.toISOString().split('T')[0];
      cumulative += (byDate[key] ?? 0) * PTS_PER_SESSION;
      return { cumulative, date: key };
    });
  }, [logs]);

  const maxVal = Math.max(...data.map((d) => d.cumulative), 1);
  const W = 300;
  const H = 64;
  const PAD = 4;

  const pts = data.map((d, i) => {
    const x = PAD + (i / (DAYS - 1)) * (W - PAD * 2);
    const y = H - PAD - (d.cumulative / maxVal) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ');
  const areaPath = `${linePath} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`;

  // Month labels — show when month changes
  const labels: { x: number; label: string }[] = [];
  data.forEach((d, i) => {
    if (i === 0 || d.date.slice(8, 10) === '01') {
      const x = PAD + (i / (DAYS - 1)) * (W - PAD * 2);
      const [, month] = d.date.split('-');
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      labels.push({ x, label: months[parseInt(month, 10) - 1] });
    }
  });

  const currentPts = data[data.length - 1]?.cumulative ?? 0;

  return (
    <div style={{ padding: '12px 14px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: '.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Progression (90 jours)
        </div>
        <div style={{ fontSize: '.78rem', color: 'var(--green)', fontWeight: 700 }}>
          +{currentPts} pts
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4f53c" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#d4f53c" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid line */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="0.5" />
        {/* Area fill */}
        <path d={areaPath} fill="url(#actGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#d4f53c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        {pts.length > 0 && (
          <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="3" fill="#d4f53c" />
        )}
        {/* Month labels */}
        {labels.map((l) => (
          <text key={l.x} x={l.x} y={H + 2} fontSize="7" fill="var(--muted)" textAnchor="middle" dominantBaseline="hanging">
            {l.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

const EMOJIS = ['💪', '🧠', '💼', '📚', '❤️', '💰', '🎨', '🏠', '🌱', '🙏', '🎯', '✈️', '🎵', '⚽', '🏃'];
const GOAL_TYPE_META: Record<GoalType, { label: string; desc: string }> = {
  daily:     { label: 'Quotidien',    desc: '±1 pt' },
  weekly:    { label: 'Hebdomadaire', desc: '±5 pts' },
  immediate: { label: 'Immédiat',     desc: '+2 pts' },
  short:     { label: 'Court terme',  desc: '+3 pts' },
  medium:    { label: 'Moyen terme',  desc: '+10 pts' },
  long:      { label: 'Long terme',   desc: '+30 pts' },
  life:      { label: 'Vie',          desc: '+1000 pts' },
};

export function ProfileView() {
  const appData = useAppStore((s) => s.appData);
  const setDomains = useAppStore((s) => s.setDomains);
  const toggleDomainPublic = useAppStore((s) => s.toggleDomainPublic);
  const toggleGoalPublic = useAppStore((s) => s.toggleGoalPublic);
  const syncError = useAppStore((s) => s.syncError);

  const socialEnabled = !!appData?.social?.enabled;

  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainEmoji, setNewDomainEmoji] = useState('🎯');
  const [addingGoalTo, setAddingGoalTo] = useState<string | null>(null);
  const [newGoalLabel, setNewGoalLabel] = useState('');
  const [newGoalType, setNewGoalType] = useState<GoalType>('daily');

  const domains = appData?.domains ?? [];

  // Stats
  const totalPoints = domains.flatMap((d) => d.goals).reduce((sum, g) => {
    if (g.done) return sum + GOAL_POINTS[g.type];
    if (g.type === 'daily' || g.type === 'weekly') return sum - GOAL_POINTS[g.type];
    return sum;
  }, 0);
  const doneTodayCount = domains.flatMap((d) => d.goals).filter((g) => g.done).length;
  const totalGoals = domains.flatMap((d) => d.goals).length;
  const logs = appData?.logs ?? [];
  const streak = (() => {
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (logs.some((l) => l.date === key)) s++;
      else if (i > 0) break;
    }
    return s;
  })();

  function addDomain() {
    if (!newDomainName.trim()) return;
    const d: Domain = {
      id: crypto.randomUUID(),
      name: newDomainName.trim(),
      emoji: newDomainEmoji,
      goals: [],
      createdAt: new Date().toISOString(),
    };
    setDomains([...domains, d]);
    setNewDomainName('');
    setShowAddDomain(false);
  }

  function addGoal(domainId: string) {
    if (!newGoalLabel.trim()) return;
    const goal: Goal = {
      id: crypto.randomUUID(),
      label: newGoalLabel.trim(),
      type: newGoalType,
      done: false,
      history: [],
      createdAt: new Date().toISOString(),
    };
    setDomains(domains.map((d) => d.id === domainId ? { ...d, goals: [...d.goals, goal] } : d));
    setNewGoalLabel('');
    setAddingGoalTo(null);
  }

  function toggleGoal(domainId: string, goalId: string) {
    const today = new Date().toISOString().split('T')[0];
    setDomains(domains.map((d) => {
      if (d.id !== domainId) return d;
      return {
        ...d, goals: d.goals.map((g) => {
          if (g.id !== goalId) return g;
          const done = !g.done;
          const history = g.history.filter((h) => h.date !== today);
          return { ...g, done, history: [...history, { date: today, done }] };
        }),
      };
    }));
  }

  function deleteGoal(domainId: string, goalId: string) {
    setDomains(domains.map((d) => d.id === domainId ? { ...d, goals: d.goals.filter((g) => g.id !== goalId) } : d));
  }

  function deleteDomain(domainId: string) {
    setDomains(domains.filter((d) => d.id !== domainId));
  }

  const addingGoalDomain = domains.find((d) => d.id === addingGoalTo);

  return (
    <div style={{ paddingBottom: 24 }}>
      {syncError && (
        <div style={{ margin: '8px 12px', padding: '10px 14px', background: 'rgba(255,63,94,.1)', border: '1px solid rgba(255,63,94,.3)', borderRadius: 12, fontSize: '.74rem', color: 'var(--red)' }}>
          Sync : {syncError}
        </div>
      )}

      {/* Streak bar */}
      <div style={{ display: 'flex', margin: '12px 12px 0', background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {[
          { val: streak, label: 'Streak', color: 'var(--green)' },
          { val: totalPoints, label: 'Points', color: 'var(--teal)' },
          { val: doneTodayCount, label: 'Faits', color: 'var(--orange)' },
          { val: totalGoals, label: 'Total', color: 'var(--purple)' },
        ].map(({ val, label, color }) => (
          <div key={label} style={{ flex: 1, padding: '13px 8px', textAlign: 'center', borderRight: '1px solid var(--border)' }}
            className="last:border-r-0">
            <div className="font-display" style={{ fontSize: '2rem', lineHeight: 1, color }}>{val}</div>
            <div style={{ fontSize: '.57rem', color: 'var(--muted)', letterSpacing: '.07em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Activity chart */}
      <div style={{ margin: '10px 12px 0', background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'visible', maxWidth: 560 }}>
        <ActivityChart logs={logs} />
      </div>

      {/* Radar */}
      <div style={{ margin: '10px 12px 0', background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '13px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="font-display" style={{ fontSize: '1.2rem' }}>Profil</div>
          <button onClick={() => setShowAddDomain(true)} style={{ fontSize: '.68rem', color: 'var(--green)', cursor: 'pointer', background: 'none', border: '1px solid rgba(212,245,60,.3)', fontWeight: 700, padding: '5px 10px', borderRadius: 20 }}>
            + Domaine
          </button>
        </div>
        <RadarChart domains={domains} />
      </div>

      {/* Goals by domain */}
      {domains.length > 0 && (
        <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="font-display" style={{ fontSize: '1.4rem' }}>Objectifs</div>
        </div>
      )}

      {domains.map((domain) => (
        <div key={domain.id} className="card" style={{ margin: '0 12px 9px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px' }}>
            <span style={{ fontSize: '1.4rem' }}>{domain.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{domain.name}</div>
              <div style={{ fontSize: '.67rem', color: 'var(--muted)', marginTop: 1 }}>{domain.goals.length} objectifs</div>
            </div>
            <div className="font-display" style={{ fontSize: '1.3rem', color: 'var(--green)' }}>{computeDomainScore(domain)}</div>
            {socialEnabled && (
              <button
                onClick={() => toggleDomainPublic(domain.id)}
                title={domain.isPublic ? 'Public — cliquer pour rendre privé' : 'Privé — cliquer pour rendre public'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '.75rem', padding: '2px 5px',
                  color: domain.isPublic ? 'var(--green)' : 'var(--muted)',
                }}
              >
                {domain.isPublic ? '🌐' : '🔒'}
              </button>
            )}
            <button onClick={() => deleteDomain(domain.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 6px' }}>×</button>
          </div>

          {domain.goals.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {domain.goals.map((goal) => (
                <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <button
                    className={`check-btn ${goal.done ? 'done' : ''}`}
                    onClick={() => toggleGoal(domain.id, goal.id)}
                  >
                    {goal.done ? '✓' : ''}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.85rem', fontWeight: 600, textDecoration: goal.done ? 'line-through' : 'none', color: goal.done ? 'var(--muted)' : 'var(--text)' }}>{goal.label}</div>
                  </div>
                  <span className="pill pill-dim" style={{ textTransform: 'capitalize' }}>{GOAL_TYPE_META[goal.type].desc}</span>
                  {socialEnabled && (
                    <button
                      onClick={() => toggleGoalPublic(domain.id, goal.id)}
                      title={goal.isPublic ? 'Public' : 'Privé'}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '.7rem', padding: '0 2px',
                        color: goal.isPublic ? 'var(--teal)' : 'var(--muted)',
                        opacity: 0.75,
                      }}
                    >
                      {goal.isPublic ? '👁' : '🔒'}
                    </button>
                  )}
                  <button onClick={() => deleteGoal(domain.id, goal.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '.9rem' }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '10px 14px' }}>
            <button onClick={() => setAddingGoalTo(domain.id)} style={{ fontSize: '.78rem', color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              + Ajouter un objectif
            </button>
          </div>
        </div>
      ))}

      {domains.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>Aucun domaine</div>
          <div style={{ fontSize: '.8rem' }}>Crée ton premier domaine pour commencer</div>
        </div>
      )}

      {/* Sheet: Add Domain */}
      {showAddDomain && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddDomain(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.7rem', marginBottom: 4 }}>Nouveau domaine</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setNewDomainEmoji(e)} style={{ fontSize: '1.4rem', padding: 6, borderRadius: 10, border: newDomainEmoji === e ? '2px solid var(--green)' : '2px solid transparent', background: newDomainEmoji === e ? 'rgba(212,245,60,.1)' : 'none', cursor: 'pointer' }}>
                  {e}
                </button>
              ))}
            </div>
            <input className="field" placeholder="Nom du domaine..." value={newDomainName} onChange={(e) => setNewDomainName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDomain()} autoFocus style={{ marginBottom: 10 }} />
            <button className="btn-primary" onClick={addDomain}>Créer</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowAddDomain(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Sheet: Add Goal */}
      {addingGoalDomain && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setAddingGoalTo(null); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.7rem', marginBottom: 2 }}>Nouvel objectif</div>
            <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 14 }}>dans {addingGoalDomain.emoji} {addingGoalDomain.name}</div>
            <input className="field" placeholder="Ex: Courir 30 min..." value={newGoalLabel} onChange={(e) => setNewGoalLabel(e.target.value)} autoFocus style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              {(Object.entries(GOAL_TYPE_META) as [GoalType, typeof GOAL_TYPE_META[GoalType]][]).map(([type, meta]) => (
                <button key={type} onClick={() => setNewGoalType(type)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 12, border: newGoalType === type ? '2px solid var(--green)' : '1px solid var(--border)',
                  background: newGoalType === type ? 'rgba(212,245,60,.06)' : 'var(--s2)', cursor: 'pointer', color: 'var(--text)',
                }}>
                  <span style={{ fontSize: '.85rem', fontWeight: 600 }}>{meta.label}</span>
                  <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{meta.desc}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => addGoal(addingGoalDomain.id)}>Ajouter</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setAddingGoalTo(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
