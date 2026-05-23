'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { RadarChart, RadarOverlay } from './RadarChart';
import { Domain } from '@/models/domain';
import { Goal, GoalType, GOAL_XP, computeCurrentDone, computeTotalXP, computeLevelInfo } from '@/models/goal';
import { DayLog } from '@/models/day-log';
import { deleteFeedPost, updateFeedPost, publishFeedPost } from '@/lib/firebase/feed';
import { getFriends } from '@/lib/firebase/social';

// ─── Activity History sub-tab ─────────────────────────────────────────────────
function formatLogDate(log: DayLog): string {
  const d = new Date(log.completedAt ?? log.date);
  const diffMs = Date.now() - d.getTime();
  const diffH  = Math.floor(diffMs / 3600000);
  const diffD  = Math.floor(diffMs / 86400000);
  if (diffH < 1)   return 'Il y a moins d\'1h';
  if (diffH < 24)  return `Il y a ${diffH}h`;
  if (diffD === 1) return 'Hier';
  if (diffD < 7)   return `Il y a ${diffD} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function ActivityHistory({ uid }: { uid: string | undefined }) {
  const logs      = useAppStore(s => s.appData?.logs ?? []);
  const updateLog = useAppStore(s => s.updateLog);
  const deleteLog = useAppStore(s => s.deleteLog);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null);
  const [editingLog,  setEditingLog]  = useState<DayLog | null>(null);
  const [editPublic,  setEditPublic]  = useState(true);
  const [editExcluded, setEditExcluded] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => [...logs].sort((a, b) => (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date)), [logs]);

  function openEdit(log: DayLog) {
    setEditingLog(log);
    setEditPublic(log.isPublic !== false);
    setEditExcluded(new Set(
      log.blocks.flatMap(b => b.items).filter(i => i.isPublic === false).map(i => i.itemId)
    ));
  }

  async function saveEdit() {
    if (!editingLog) return;
    const updatedBlocks = editingLog.blocks.map(b => ({
      ...b,
      items: b.items.map(i => ({ ...i, isPublic: !editExcluded.has(i.itemId) })),
    }));
    const updatedLog: DayLog = { ...editingLog, blocks: updatedBlocks, isPublic: editPublic };
    updateLog(editingLog.id, { isPublic: editPublic, blocks: updatedBlocks });
    if (editingLog.feedPostId) {
      updateFeedPost(editingLog.feedPostId, { log: updatedLog }).catch(console.error);
    }
    setEditingLog(null);
  }

  async function handleDelete(log: DayLog) {
    deleteLog(log.id);
    if (log.feedPostId) {
      deleteFeedPost(log.feedPostId).catch(console.error);
    }
    setConfirmDel(null);
  }

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏃</div>
        <div style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Aucune séance</div>
        <div style={{ fontSize: '.78rem' }}>Lance ta première séance depuis l'onglet Séances</div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {sorted.map(log => {
        const expanded  = expandedId === log.id;
        const isPublic  = log.isPublic !== false;
        const allItems  = log.blocks.flatMap(b => b.items);
        const doneSets  = allItems.flatMap(i => i.sets ?? []).filter(s => s.done);
        const totalKg   = doneSets.reduce((n, s) => n + (s.w ?? 0) * (s.r ?? 1), 0);
        const exoNames  = allItems.filter(i => i.name && i.sets && i.sets.length > 0).map(i => i.name!);
        const checkboxItems = allItems.filter(i => i.name && (!i.sets || i.sets.length === 0) && i.done);

        return (
          <div key={log.id} className="card" style={{ margin: '0 12px 10px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px 8px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${log.programColor}20`, border: `1px solid ${log.programColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{log.programIcon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '.85rem', textTransform: 'uppercase', letterSpacing: '.03em' }}>{log.programName}</div>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 1 }}>{formatLogDate(log)}</div>
              </div>
              {/* Visibility toggle */}
              <button
                onClick={() => openEdit(log)}
                title={isPublic ? 'Publié · Modifier la visibilité' : 'Privé · Rendre public'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem', padding: '3px 5px', color: isPublic ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}
              >
                {isPublic ? '🌐' : '🔒'}
              </button>
              {/* Delete */}
              <button
                onClick={() => setConfirmDel(log.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', padding: '3px 5px', color: 'rgba(255,255,255,.2)', flexShrink: 0 }}
              >
                🗑
              </button>
              {/* Expand */}
              <button onClick={() => setExpandedId(expanded ? null : log.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '.9rem', padding: '0 4px', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>›</button>
            </div>

            {/* Exercise chips */}
            {exoNames.length > 0 && (
              <div style={{ padding: '0 14px 8px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {exoNames.map((name, i) => (
                  <span key={i} style={{ fontSize: '.62rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px', color: 'var(--muted2)', fontWeight: 600 }}>{name}</span>
                ))}
                {doneSets.length > 0 && (
                  <span style={{ fontSize: '.62rem', background: 'rgba(200,16,46,.08)', border: '1px solid rgba(200,16,46,.2)', borderRadius: 5, padding: '2px 7px', color: 'var(--primary)', fontWeight: 700 }}>
                    {doneSets.length} séries{totalKg > 0 ? ` · ${Math.round(totalKg)} kg` : ''}
                  </span>
                )}
              </div>
            )}
            {checkboxItems.length > 0 && exoNames.length === 0 && (
              <div style={{ padding: '0 14px 8px', fontSize: '.62rem', color: 'var(--muted)' }}>
                {checkboxItems.map(i => i.name).join(' · ')}
              </div>
            )}

            {/* Expanded detail */}
            {expanded && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {log.blocks.map(block => (
                  <div key={block.blockId} style={{ padding: '10px 14px 6px' }}>
                    {block.title && block.title !== 'Exercices' && (
                      <div style={{ fontWeight: 700, fontSize: '.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{block.title}</div>
                    )}
                    {block.items.map(item => (
                      <div key={item.itemId} style={{ marginBottom: 10 }}>
                        {item.name && (
                          <div style={{ fontSize: '.78rem', fontWeight: 700, marginBottom: 5, color: item.isPublic === false ? 'var(--muted)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {item.name}
                            {item.isPublic === false && <span style={{ fontSize: '.55rem', background: 'var(--s2)', borderRadius: 4, padding: '1px 5px', color: 'var(--muted)' }}>Privé</span>}
                          </div>
                        )}
                        {item.sets && item.sets.length > 0 && (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.72rem' }}>
                            <thead>
                              <tr>
                                {['#', 'kg', 'reps', 'RPE'].map(h => (
                                  <th key={h} style={{ color: 'var(--muted)', fontWeight: 600, textAlign: 'center', padding: '2px 4px', fontSize: '.58rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {item.sets.map((s, si) => (
                                <tr key={si} style={{ opacity: s.done ? 1 : 0.3 }}>
                                  <td style={{ textAlign: 'center', padding: '3px 4px', color: 'var(--muted)' }}>{si + 1}</td>
                                  <td style={{ textAlign: 'center', padding: '3px 4px', fontWeight: 700 }}>{s.w ?? '—'}</td>
                                  <td style={{ textAlign: 'center', padding: '3px 4px', fontWeight: 700 }}>{s.r ?? '—'}</td>
                                  <td style={{ textAlign: 'center', padding: '3px 4px', color: 'var(--muted)' }}>{s.rpe ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {item.done && (!item.sets || item.sets.length === 0) && (
                          <div style={{ fontSize: '.72rem', color: 'var(--green)', fontWeight: 700 }}>✓ Fait</div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {log.note && (
                  <div style={{ padding: '8px 14px 12px', fontSize: '.76rem', color: 'var(--muted2)', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,.04)', lineHeight: 1.5 }}>
                    📝 {log.note}
                  </div>
                )}
              </div>
            )}

            {/* Delete confirm bar */}
            {confirmDel === log.id && (
              <div style={{ borderTop: '1px solid rgba(200,16,46,.3)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(200,16,46,.06)' }}>
                <div style={{ flex: 1, fontSize: '.76rem', color: 'var(--muted)' }}>Supprimer cette séance ?{log.feedPostId ? ' (retirera du feed)' : ''}</div>
                <button onClick={() => handleDelete(log)} style={{ padding: '5px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: '.72rem', fontWeight: 700, cursor: 'pointer' }}>Oui</button>
                <button onClick={() => setConfirmDel(null)} style={{ padding: '5px 10px', background: 'var(--s2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 7, fontSize: '.72rem', cursor: 'pointer' }}>Non</button>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Edit visibility modal ──────────────────────────────── */}
      {editingLog && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setEditingLog(null); }}>
          <div className="sheet" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${editingLog.programColor}20`, border: `1px solid ${editingLog.programColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{editingLog.programIcon}</div>
              <div>
                <div className="font-display" style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{editingLog.programName}</div>
                <div style={{ fontSize: '.62rem', color: 'var(--muted)' }}>{formatLogDate(editingLog)}</div>
              </div>
            </div>

            {/* Public toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--s2)', borderRadius: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.84rem' }}>Publié dans le feed</div>
                <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 2 }}>Visible par tes amis</div>
              </div>
              <button onClick={() => setEditPublic(v => !v)} style={{ width: 46, height: 26, borderRadius: 13, background: editPublic ? 'var(--green)' : 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', cursor: 'pointer', position: 'relative', flexShrink: 0, padding: 0, transition: 'background .2s' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: editPublic ? 22 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
              </button>
            </div>

            {/* Exercise visibility */}
            {editPublic && (() => {
              const allItems = editingLog.blocks.flatMap(b => b.items).filter(i => i.name);
              if (allItems.length === 0) return null;
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Exercices visibles</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {allItems.map(item => {
                      const included = !editExcluded.has(item.itemId);
                      return (
                        <button key={item.itemId} onClick={() => {
                          const ns = new Set(editExcluded);
                          if (ns.has(item.itemId)) ns.delete(item.itemId); else ns.add(item.itemId);
                          setEditExcluded(ns);
                        }} style={{ padding: '6px 11px', borderRadius: 8, border: included ? '1.5px solid var(--green)' : '1px solid var(--border)', background: included ? 'rgba(34,197,94,.08)' : 'var(--s2)', color: included ? 'var(--green)' : 'var(--muted)', fontSize: '.74rem', fontWeight: 600, cursor: 'pointer' }}>
                          {included ? '✓ ' : ''}{item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <button className="btn-primary" onClick={saveEdit}>Enregistrer</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setEditingLog(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

const EMOJIS = ['💪', '🧠', '💼', '📚', '❤️', '💰', '🎨', '🏠', '🌱', '🙏', '🎯', '✈️', '🎵', '⚽', '🏃', '🧘', '🥊', '🚴', '🏊', '🥗'];

type GoalSection = 'daily' | 'weekly' | 'objective';

interface GoalTypeMeta { label: string; section: GoalSection; color: string }
const GOAL_TYPE_META: Record<GoalType, GoalTypeMeta> = {
  daily:     { label: 'Quotidien',   section: 'daily',     color: '#ff8c2a' },
  weekly:    { label: 'Hebdo',       section: 'weekly',    color: '#a855f7' },
  immediate: { label: 'Immédiat',    section: 'objective', color: '#3fffc0' },
  short:     { label: 'Court terme', section: 'objective', color: '#4aaeff' },
  medium:    { label: 'Moyen terme', section: 'objective', color: '#ff8c2a' },
  long:      { label: 'Long terme',  section: 'objective', color: '#a855f7' },
  life:      { label: 'Vie',         section: 'objective', color: '#f472b6' },
};
const OBJECTIVE_TYPES: GoalType[] = ['immediate', 'short', 'medium', 'long', 'life'];

const LEVEL_COLORS = ['', '#606068', '#4aaeff', '#22c55e', '#3fffc0', '#ff8c2a', '#a855f7', '#f472b6', '#fbbf24'];

function computeHistoricalDomainLevel(domain: Domain, daysAgo: number): number {
  const target = new Date();
  target.setDate(target.getDate() - daysAgo);
  const targetKey = target.toISOString().split('T')[0];
  const histXP = domain.goals.reduce((xp, goal) => {
    const completions = goal.history.filter(h => h.date <= targetKey && h.done).length;
    return xp + completions * GOAL_XP[goal.type];
  }, 0);
  return computeLevelInfo(histXP).level;
}

function ActivitySparkline({ logs }: { logs: DayLog[] }) {
  const DAYS = 90;
  const data = useMemo(() => {
    const byDate: Record<string, number> = {};
    logs.forEach((l) => { byDate[l.date] = (byDate[l.date] ?? 0) + 1; });
    const today = new Date();
    let cum = 0;
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (DAYS - 1 - i));
      const key = d.toISOString().split('T')[0];
      cum += (byDate[key] ?? 0) * 5;
      return { cum, date: key };
    });
  }, [logs]);

  const maxVal = Math.max(...data.map(d => d.cum), 1);
  const W = 300, H = 36, PAD = 2;
  const pts = data.map((d, i) => {
    const x = PAD + (i / (DAYS - 1)) * (W - PAD * 2);
    const y = H - PAD - (d.cum / maxVal) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ');
  const area = `${line} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
      <div style={{ fontSize: '.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0 }}>90j</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ flex: 1, maxWidth: 220, display: 'block' }}>
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark)" />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ fontSize: '.72rem', color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>+{data[data.length - 1]?.cum ?? 0}</div>
    </div>
  );
}

function XpBar({ progress }: { progress: number }) {
  return (
    <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: 'var(--primary)', borderRadius: 99, transition: 'width .4s ease' }} />
    </div>
  );
}

function DomainLevelBadge({ goals }: { goals: Goal[] }) {
  const xp  = computeTotalXP(goals);
  const lvl = computeLevelInfo(xp);
  const color = LEVEL_COLORS[Math.min(lvl.level, LEVEL_COLORS.length - 1)];
  return (
    <div style={{ textAlign: 'center', flexShrink: 0 }}>
      <div className="font-display" style={{ fontSize: '1.3rem', color, lineHeight: 1 }}>Lvl {lvl.level}</div>
      <div style={{ fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{lvl.title}</div>
    </div>
  );
}

function CompactQuests({ dailyQuests, weeklyQuests, onToggle, onDelete, onAddDaily, onAddWeekly, socialEnabled, onPublicToggle }: {
  dailyQuests: { domain: Domain; goal: Goal; isDone: boolean }[];
  weeklyQuests: { domain: Domain; goal: Goal; isDone: boolean }[];
  onToggle: (domainId: string, goalId: string) => void;
  onDelete: (domainId: string, goalId: string) => void;
  onAddDaily: () => void; onAddWeekly: () => void;
  socialEnabled: boolean;
  onPublicToggle: (domainId: string, goalId: string) => void;
}) {
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const quests = tab === 'daily' ? dailyQuests : weeklyQuests;
  const dailyDone  = dailyQuests.filter(q => q.isDone).length;
  const weeklyDone = weeklyQuests.filter(q => q.isDone).length;
  const color = tab === 'daily' ? '#ff8c2a' : '#a855f7';

  return (
    <div className="card" style={{ margin: '8px 12px' }}>
      <div style={{ display: 'flex', padding: '10px 10px 0', gap: 4 }}>
        {([['daily', `⚡ Jour`, `${dailyDone}/${dailyQuests.length}`, '#ff8c2a'], ['weekly', `📅 Semaine`, `${weeklyDone}/${weeklyQuests.length}`, '#a855f7']] as const).map(([id, label, count, c]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: tab === id ? `1.5px solid ${c}` : '1.5px solid transparent', background: tab === id ? `${c}12` : 'none', color: tab === id ? c : 'var(--muted)', fontSize: '.68rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {label} <span style={{ opacity: 0.7, fontSize: '.6rem' }}>{count}</span>
          </button>
        ))}
      </div>
      <div style={{ padding: '6px 0' }}>
        {quests.length === 0 && (
          <div style={{ padding: '10px 14px', fontSize: '.76rem', color: 'var(--muted)' }}>Aucune quête — ajoute-en une !</div>
        )}
        {quests.map(({ domain, goal, isDone }) => (
          <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <button className={`check-btn ${isDone ? 'done' : ''}`} onClick={() => onToggle(domain.id, goal.id)} style={{ width: 22, height: 22, minWidth: 22, fontSize: '.7rem' }}>{isDone ? '✓' : ''}</button>
            <span style={{ fontSize: '.95rem', flexShrink: 0 }}>{domain.emoji}</span>
            <div style={{ flex: 1, minWidth: 0, fontSize: '.8rem', fontWeight: 600, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--muted)' : 'var(--text)' }}>{goal.label}</div>
            <span style={{ fontSize: '.58rem', fontWeight: 800, color: isDone ? 'var(--muted)' : color, flexShrink: 0 }}>+{GOAL_XP[goal.type]}</span>
            {socialEnabled && <button onClick={() => onPublicToggle(domain.id, goal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.7rem', padding: '0 2px', color: goal.isPublic ? 'var(--teal)' : 'var(--muted)', opacity: 0.6, flexShrink: 0 }}>{goal.isPublic ? '👁' : '🔒'}</button>}
            <button onClick={() => onDelete(domain.id, goal.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.2)', cursor: 'pointer', fontSize: '.9rem', padding: '0 1px', flexShrink: 0 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 14px' }}>
        <button onClick={tab === 'daily' ? onAddDaily : onAddWeekly} style={{ fontSize: '.76rem', color, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ Ajouter une quête</button>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function ProfileView() {
  const user             = useAppStore((s) => s.user);
  const appData          = useAppStore((s) => s.appData);
  const setDomains       = useAppStore((s) => s.setDomains);
  const toggleDomainPublic = useAppStore((s) => s.toggleDomainPublic);
  const toggleGoalPublic   = useAppStore((s) => s.toggleGoalPublic);
  const syncError        = useAppStore((s) => s.syncError);
  const socialEnabled    = !!appData?.social?.enabled;
  const [profileTab, setProfileTab] = useState<'quests' | 'history'>('quests');

  // Followers count
  const [friendCount, setFriendCount] = useState<number | null>(null);
  useEffect(() => {
    if (!user) return;
    getFriends(user.uid).then(f => setFriendCount(f.length)).catch(() => {});
  }, [user]);

  // Add domain modal
  const [showAddDomain,  setShowAddDomain]  = useState(false);
  const [newDomainName,  setNewDomainName]  = useState('');
  const [newDomainEmoji, setNewDomainEmoji] = useState('🎯');

  // Add goal modal
  const [showGoalModal,        setShowGoalModal]        = useState(false);
  const [addGoalPresetSection, setAddGoalPresetSection] = useState<GoalSection | null>(null);
  const [newGoalLabel,         setNewGoalLabel]         = useState('');
  const [newGoalType,          setNewGoalType]          = useState<GoalType>('daily');
  const [newGoalDomainId,      setNewGoalDomainId]      = useState('');

  // Goal publish modal
  const [publishGoal,    setPublishGoal]    = useState<{ goal: Goal; domain: Domain } | null>(null);
  const [goalPublishMsg, setGoalPublishMsg] = useState('');
  const [goalPublishing, setGoalPublishing] = useState(false);

  // Radar comparison mode
  const [radarMode, setRadarMode] = useState<'current' | '7d' | '30d'>('current');

  const domains      = appData?.domains ?? [];
  const logs         = appData?.logs ?? [];
  const allGoalsList = useMemo(() => domains.flatMap(d => d.goals), [domains]);
  const allGoals     = useMemo(() => domains.flatMap(d => d.goals.map(g => ({ domain: d, goal: g, isDone: computeCurrentDone(g) }))), [domains]);
  const dailyQuests  = useMemo(() => allGoals.filter(q => q.goal.type === 'daily'),  [allGoals]);
  const weeklyQuests = useMemo(() => allGoals.filter(q => q.goal.type === 'weekly'), [allGoals]);

  const totalXP   = useMemo(() => computeTotalXP(allGoalsList), [allGoalsList]);
  const levelInfo = useMemo(() => computeLevelInfo(totalXP), [totalXP]);
  const lvlColor  = LEVEL_COLORS[Math.min(levelInfo.level, LEVEL_COLORS.length - 1)];

  const streak = useMemo(() => {
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
  }, [logs]);

  const radarOverlay = useMemo((): RadarOverlay | undefined => {
    if (radarMode === 'current' || domains.length < 3) return undefined;
    const daysAgo = radarMode === '7d' ? 7 : 30;
    return { label: radarMode === '7d' ? 'Il y a 7j' : 'Il y a 30j', color: '#4aaeff', scores: domains.map(d => computeHistoricalDomainLevel(d, daysAgo)) };
  }, [radarMode, domains]);

  function toggleGoal(domainId: string, goalId: string) {
    const today = new Date().toISOString().split('T')[0];
    const domain = domains.find(d => d.id === domainId);
    const goal   = domain?.goals.find(g => g.id === goalId);

    // Check if non-recurring goal is about to become done → show publish modal
    if (goal && OBJECTIVE_TYPES.includes(goal.type)) {
      const wasDone = computeCurrentDone(goal);
      if (!wasDone) {
        // Will become done — queue publish modal after state updates
        setTimeout(() => setPublishGoal({ goal, domain: domain! }), 100);
      }
    }

    setDomains(domains.map((d) => {
      if (d.id !== domainId) return d;
      return {
        ...d, goals: d.goals.map((g) => {
          if (g.id !== goalId) return g;
          const currentDone = computeCurrentDone(g);
          const done = !currentDone;
          const history = g.history.filter((h) => h.date !== today);
          if (g.type === 'daily' || g.type === 'weekly') return { ...g, history: [...history, { date: today, done }] };
          return { ...g, done, history: [...history, { date: today, done }] };
        }),
      };
    }));
  }

  async function handlePublishGoal() {
    if (!publishGoal || !user) return;
    setGoalPublishing(true);
    const authorName = appData?.social?.displayName ?? user.displayName ?? 'Anonyme';
    await publishFeedPost({
      authorUid: user.uid,
      authorName,
      type: 'goal',
      goalLabel: publishGoal.goal.label,
      goalEmoji: publishGoal.domain.emoji,
      domainName: publishGoal.domain.name,
      likes: [],
      commentCount: 0,
      createdAt: new Date().toISOString(),
    }).catch(console.error);
    setGoalPublishing(false);
    setPublishGoal(null);
    setGoalPublishMsg('');
  }

  function deleteGoal(domainId: string, goalId: string) {
    setDomains(domains.map((d) => d.id === domainId ? { ...d, goals: d.goals.filter((g) => g.id !== goalId) } : d));
  }
  function deleteDomain(domainId: string) {
    setDomains(domains.filter((d) => d.id !== domainId));
  }
  function addDomain() {
    if (!newDomainName.trim()) return;
    const d: Domain = { id: crypto.randomUUID(), name: newDomainName.trim(), emoji: newDomainEmoji, goals: [], createdAt: new Date().toISOString() };
    setDomains([...domains, d]);
    setNewDomainName(''); setShowAddDomain(false);
  }
  function openAddGoal(section: GoalSection, domainId?: string) {
    setAddGoalPresetSection(section);
    setNewGoalType(section === 'daily' ? 'daily' : section === 'weekly' ? 'weekly' : 'short');
    setNewGoalDomainId(domainId ?? domains[0]?.id ?? '');
    setNewGoalLabel('');
    setShowGoalModal(true);
  }
  function addGoal() {
    if (!newGoalLabel.trim() || !newGoalDomainId) return;
    const goal: Goal = { id: crypto.randomUUID(), label: newGoalLabel.trim(), type: newGoalType, done: false, history: [], createdAt: new Date().toISOString() };
    setDomains(domains.map((d) => d.id === newGoalDomainId ? { ...d, goals: [...d.goals, goal] } : d));
    setNewGoalLabel(''); setShowGoalModal(false);
  }

  const availableObjectiveTypes: GoalType[] = addGoalPresetSection === 'daily' ? ['daily'] : addGoalPresetSection === 'weekly' ? ['weekly'] : OBJECTIVE_TYPES;

  return (
    <div style={{ paddingBottom: 24 }}>
      {syncError && (
        <div style={{ margin: '8px 12px', padding: '10px 14px', background: 'rgba(200,16,46,.1)', border: '1px solid rgba(200,16,46,.3)', borderRadius: 10, fontSize: '.74rem', color: 'var(--primary)' }}>Sync : {syncError}</div>
      )}

      {/* ── Sub-tab nav ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, margin: '8px 12px 4px', background: 'var(--s1)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
        {([['quests', '⚡ Quêtes'], ['history', '📅 Activités']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setProfileTab(id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 7, border: 'none', background: profileTab === id ? 'var(--primary)' : 'none', color: profileTab === id ? '#fff' : 'var(--muted)', fontWeight: 700, fontSize: '.68rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em', transition: 'background .15s, color .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {profileTab === 'history' && <ActivityHistory uid={user?.uid} />}
      {profileTab === 'quests' && (
      <>

      {/* ── Level banner ────────────────────────────────────── */}
      <div style={{ margin: '10px 12px 0', background: 'var(--s1)', border: `1px solid ${lvlColor}30`, borderRadius: 12, padding: '12px 14px', borderLeft: `3px solid ${lvlColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ background: `${lvlColor}18`, border: `1.5px solid ${lvlColor}50`, borderRadius: 8, padding: '4px 10px', flexShrink: 0 }}>
            <span className="font-display" style={{ fontSize: '1.5rem', color: lvlColor, lineHeight: 1 }}>{levelInfo.level}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span className="font-display" style={{ fontSize: '1.1rem', color: lvlColor, textTransform: 'uppercase' }}>{levelInfo.title}</span>
              {levelInfo.level < 8 && <span style={{ fontSize: '.6rem', color: 'var(--muted)' }}>→ {levelInfo.xpNext.toLocaleString()} XP</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <XpBar progress={levelInfo.progress} />
              <span style={{ fontSize: '.62rem', color: 'var(--muted)', flexShrink: 0 }}>{totalXP.toLocaleString()} XP</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 8 }}>
          {[
            { val: streak,                                          label: 'Streak',  suffix: 'j',                       color: '#ff8c2a' },
            { val: dailyQuests.filter(q => q.isDone).length,       label: 'Jour',    suffix: `/${dailyQuests.length}`,   color: '#ff8c2a' },
            { val: weeklyQuests.filter(q => q.isDone).length,      label: 'Semaine', suffix: `/${weeklyQuests.length}`,  color: '#a855f7' },
            { val: friendCount ?? '…',                             label: 'Amis',    suffix: '',                         color: 'var(--teal)' },
          ].map(({ val, label, suffix, color }, i) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
              <div className="font-display" style={{ fontSize: '1.4rem', lineHeight: 1, color }}>
                {val}<span style={{ fontSize: '.65rem', color: 'var(--muted)' }}>{suffix}</span>
              </div>
              <div style={{ fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
        <ActivitySparkline logs={logs} />
      </div>

      {/* ── Quêtes (compact) ────────────────────────────────── */}
      <CompactQuests
        dailyQuests={dailyQuests} weeklyQuests={weeklyQuests}
        onToggle={toggleGoal} onDelete={deleteGoal}
        onAddDaily={() => openAddGoal('daily')} onAddWeekly={() => openAddGoal('weekly')}
        socialEnabled={socialEnabled} onPublicToggle={toggleGoalPublic}
      />

      {/* ── Radar ───────────────────────────────────────────── */}
      <div style={{ margin: '4px 12px 8px', background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="font-display" style={{ fontSize: '1.1rem', flex: 1 }}>Profil</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['current', '7d', '30d'] as const).map(mode => (
              <button key={mode} onClick={() => setRadarMode(mode)} style={{ padding: '4px 8px', borderRadius: 6, border: radarMode === mode ? '1px solid var(--primary)' : '1px solid var(--border)', background: radarMode === mode ? 'rgba(200,16,46,.12)' : 'none', color: radarMode === mode ? 'var(--primary)' : 'var(--muted)', fontSize: '.6rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {mode === 'current' ? 'Actuel' : mode}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAddDomain(true)} style={{ fontSize: '.65rem', color: 'var(--primary)', cursor: 'pointer', background: 'none', border: '1px solid rgba(200,16,46,.3)', fontWeight: 700, padding: '4px 9px', borderRadius: 8 }}>+ Domaine</button>
        </div>
        <RadarChart domains={domains} overlay={radarOverlay} />
      </div>

      {/* ── Objectifs (par domaine) ──────────────────────────── */}
      {domains.some(d => d.goals.some(g => OBJECTIVE_TYPES.includes(g.type))) && (
        <div style={{ padding: '4px 16px 6px' }}>
          <div className="font-display" style={{ fontSize: '1.3rem', letterSpacing: '.1em' }}>Objectifs</div>
        </div>
      )}

      {domains.map((domain) => {
        const objectiveGoals = domain.goals.filter(g => OBJECTIVE_TYPES.includes(g.type));
        if (objectiveGoals.length === 0) return null;
        const doneCount = objectiveGoals.filter(g => computeCurrentDone(g)).length;
        return (
          <div key={domain.id} className="card" style={{ margin: '0 12px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
              <span style={{ fontSize: '1.2rem' }}>{domain.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.85rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>{domain.name}</div>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 1 }}>{doneCount}/{objectiveGoals.length} objectifs</div>
              </div>
              <DomainLevelBadge goals={domain.goals} />
              {socialEnabled && (
                <button onClick={() => toggleDomainPublic(domain.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', padding: '2px 5px', color: domain.isPublic ? 'var(--teal)' : 'var(--muted)' }}>{domain.isPublic ? '🌐' : '🔒'}</button>
              )}
              <button onClick={() => deleteDomain(domain.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 6px' }}>×</button>
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {objectiveGoals.map((goal) => {
                const isDone = computeCurrentDone(goal);
                const meta   = GOAL_TYPE_META[goal.type];
                return (
                  <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <button className={`check-btn ${isDone ? 'done' : ''}`} onClick={() => toggleGoal(domain.id, goal.id)}>{isDone ? '✓' : ''}</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.72rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>{meta.label}</div>
                      <div style={{ fontSize: '.85rem', textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--muted)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.label}</div>
                    </div>
                    <div style={{ fontSize: '.68rem', fontWeight: 700, color: isDone ? 'var(--muted)' : meta.color, flexShrink: 0 }}>+{GOAL_XP[goal.type]} XP</div>
                    {socialEnabled && (
                      <button onClick={() => toggleGoalPublic(domain.id, goal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.7rem', padding: '0 2px', color: goal.isPublic ? 'var(--teal)' : 'var(--muted)', opacity: 0.75 }}>{goal.isPublic ? '👁' : '🔒'}</button>
                    )}
                    <button onClick={() => deleteGoal(domain.id, goal.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '.9rem' }}>×</button>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '10px 14px' }}>
              <button onClick={() => openAddGoal('objective', domain.id)} style={{ fontSize: '.78rem', color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Ajouter un objectif</button>
            </div>
          </div>
        );
      })}

      {domains.filter(d => d.goals.every(g => !OBJECTIVE_TYPES.includes(g.type))).map(domain => (
        <div key={`obj-${domain.id}`} style={{ margin: '0 12px 4px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '.9rem' }}>{domain.emoji}</span>
          <span style={{ fontSize: '.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{domain.name}</span>
          <DomainLevelBadge goals={domain.goals} />
          <button onClick={() => openAddGoal('objective', domain.id)} style={{ fontSize: '.75rem', color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>+ Objectif</button>
          <button onClick={() => deleteDomain(domain.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.15)', cursor: 'pointer', fontSize: '.85rem' }}>×</button>
        </div>
      ))}

      {domains.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Aucun domaine</div>
          <div style={{ fontSize: '.8rem', marginBottom: 16 }}>Crée ton premier domaine pour commencer</div>
          <button className="btn-primary" onClick={() => setShowAddDomain(true)}>Créer un domaine</button>
        </div>
      )}
      </>
      )}

      {/* ── Goal publish modal ───────────────────────────────── */}
      {publishGoal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) { setPublishGoal(null); setGoalPublishMsg(''); } }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🏆</div>
              <div className="font-display" style={{ fontSize: '1.4rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>Objectif atteint !</div>
              <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 4 }}>
                {publishGoal.domain.emoji} {publishGoal.domain.name} · {GOAL_TYPE_META[publishGoal.goal.type].label}
              </div>
              <div style={{ fontSize: '.92rem', fontWeight: 700, marginTop: 6, color: 'var(--text)' }}>{publishGoal.goal.label}</div>
            </div>

            <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Message (optionnel)</div>
            <textarea
              className="field"
              placeholder="Partage ce moment, comment tu te sens..."
              value={goalPublishMsg}
              onChange={e => setGoalPublishMsg(e.target.value)}
              rows={3}
              style={{ marginBottom: 14, resize: 'none', fontFamily: 'inherit', fontSize: '.85rem' }}
            />

            <button className="btn-primary" onClick={handlePublishGoal} disabled={goalPublishing}>
              {goalPublishing ? 'Publication...' : '🌐 Partager dans le feed'}
            </button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => { setPublishGoal(null); setGoalPublishMsg(''); }}>
              Garder privé
            </button>
          </div>
        </div>
      )}

      {/* ── Sheet: Add Domain ──────────────────────────────────── */}
      {showAddDomain && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddDomain(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.7rem', marginBottom: 4 }}>Nouveau domaine</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setNewDomainEmoji(e)} style={{ fontSize: '1.4rem', padding: 6, borderRadius: 10, border: newDomainEmoji === e ? '2px solid var(--primary)' : '2px solid transparent', background: newDomainEmoji === e ? 'rgba(200,16,46,.1)' : 'none', cursor: 'pointer' }}>{e}</button>
              ))}
            </div>
            <input className="field" placeholder="Nom du domaine..." value={newDomainName} onChange={(e) => setNewDomainName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDomain()} autoFocus style={{ marginBottom: 10 }} />
            <button className="btn-primary" onClick={addDomain}>Créer</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowAddDomain(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* ── Sheet: Add Goal ──────────────────────────────────────── */}
      {showGoalModal && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowGoalModal(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.6rem', marginBottom: 12 }}>
              {addGoalPresetSection === 'daily' ? '⚡ Quête du Jour' : addGoalPresetSection === 'weekly' ? '📅 Quête Hebdo' : '🎯 Objectif'}
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Domaine</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {domains.map(d => (
                <button key={d.id} onClick={() => setNewGoalDomainId(d.id)} style={{ padding: '6px 12px', borderRadius: 8, border: newGoalDomainId === d.id ? '1.5px solid var(--primary)' : '1px solid var(--border)', background: newGoalDomainId === d.id ? 'rgba(200,16,46,.1)' : 'var(--s2)', color: 'var(--text)', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}>
                  {d.emoji} {d.name}
                </button>
              ))}
            </div>
            <input className="field" placeholder="Ex: Courir 30 min, Lire 20 pages..." value={newGoalLabel} onChange={(e) => setNewGoalLabel(e.target.value)} autoFocus style={{ marginBottom: 10 }} />
            {availableObjectiveTypes.length > 1 && (
              <>
                <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Type</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                  {availableObjectiveTypes.map((type) => {
                    const meta = GOAL_TYPE_META[type];
                    return (
                      <button key={type} onClick={() => setNewGoalType(type)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: newGoalType === type ? `2px solid ${meta.color}` : '1px solid var(--border)', background: newGoalType === type ? `${meta.color}12` : 'var(--s2)', cursor: 'pointer', color: 'var(--text)' }}>
                        <span style={{ fontSize: '.85rem', fontWeight: 700, color: newGoalType === type ? meta.color : 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{meta.label}</span>
                        <span style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 700 }}>+{GOAL_XP[type]} XP</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <button className="btn-primary" onClick={addGoal} disabled={!newGoalLabel.trim() || !newGoalDomainId}>Ajouter</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowGoalModal(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
