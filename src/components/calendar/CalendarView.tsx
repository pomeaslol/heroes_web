'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { DayLog, SetLog } from '@/models/day-log';

const DAYS   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function dk(d: Date)    { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

// ─── Session recap expandable card ───────────────────────────────────────────
function SessionCard({ log, onDelete, onNoteChange }: {
  log: DayLog;
  onDelete: () => void;
  onNoteChange: (note: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note,     setNote]     = useState(log.note ?? '');

  function handleNoteBlur() {
    if (note !== (log.note ?? '')) onNoteChange(note);
  }

  const totalSets = log.blocks.flatMap(b => b.items).filter(i => i.sets?.length).reduce((n, i) => n + (i.sets?.filter(s => s.done).length ?? 0), 0);
  const totalKg   = log.blocks.flatMap(b => b.items).flatMap(i => i.sets ?? []).filter(s => s.done && s.w).reduce((n, s) => n + (s.w ?? 0) * (s.r ?? 1), 0);

  return (
    <div style={{ marginBottom: 10, background: 'var(--s2)', borderRadius: 10, overflow: 'hidden', border: `1px solid ${log.programColor}30` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${log.programColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{log.programIcon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '.85rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>{log.programName}</div>
          <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 1 }}>
            {log.completedAt ? new Date(log.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
            {totalSets > 0 && ` · ${totalSets} séries`}
            {totalKg > 0 && ` · ${Math.round(totalKg)} kg`}
          </div>
        </div>
        <span style={{ fontSize: '.9rem', color: 'var(--muted)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '10px 12px 12px' }}>
          {log.blocks.map((block, bi) => (
            <div key={bi} style={{ marginBottom: 12 }}>
              {block.title && (
                <div style={{ fontSize: '.68rem', fontWeight: 700, color: log.programColor, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{block.title}</div>
              )}
              {block.items.map((item, ii) => {
                const doneSets = item.sets?.filter(s => s.done) ?? [];
                const isDone   = item.done;
                return (
                  <div key={ii} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      {!item.sets && (
                        <div style={{ width: 14, height: 14, borderRadius: 4, border: '1.5px solid var(--border2)', background: isDone ? 'var(--green)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', color: '#fff', flexShrink: 0 }}>{isDone ? '✓' : ''}</div>
                      )}
                      <div style={{ fontSize: '.82rem', fontWeight: 600 }}>{item.name ?? item.itemId}</div>
                    </div>

                    {/* Sets table */}
                    {item.sets && item.sets.length > 0 && (
                      <div style={{ background: 'var(--s3)', borderRadius: 7, padding: '5px 8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr 1fr 1fr', gap: 4, marginBottom: 3 }}>
                          {['', 'KG', 'REPS', 'RPE'].map((h, i) => (
                            <div key={i} style={{ fontSize: '.52rem', color: 'var(--muted)', textAlign: 'center', letterSpacing: '.05em' }}>{h}</div>
                          ))}
                        </div>
                        {item.sets.map((s, si) => {
                          const hasPR = s.w !== undefined;
                          return (
                            <div key={si} style={{ display: 'grid', gridTemplateColumns: '18px 1fr 1fr 1fr', gap: 4, alignItems: 'center', marginBottom: 2, opacity: s.done ? 1 : 0.4 }}>
                              <div style={{ fontSize: '.72rem', color: 'var(--muted)', textAlign: 'right', fontWeight: 700 }}>{si + 1}</div>
                              <div style={{ fontSize: '.78rem', textAlign: 'center', fontWeight: 600, color: s.done ? 'var(--text)' : 'var(--muted)' }}>{s.w ?? '—'}</div>
                              <div style={{ fontSize: '.78rem', textAlign: 'center', fontWeight: 600, color: s.done ? 'var(--text)' : 'var(--muted)' }}>{s.r ?? '—'}</div>
                              <div style={{ fontSize: '.78rem', textAlign: 'center', color: 'var(--muted)' }}>{s.rpe ?? '—'}</div>
                            </div>
                          );
                        })}
                        {doneSets.length > 0 && doneSets[0].w && (
                          <div style={{ fontSize: '.62rem', color: 'var(--muted)', marginTop: 3, textAlign: 'right' }}>
                            Best: {Math.max(...doneSets.filter(s => s.w).map(s => s.w!))} kg
                          </div>
                        )}
                      </div>
                    )}

                    {/* Duration */}
                    {item.duration !== undefined && (
                      <div style={{ fontSize: '.75rem', color: 'var(--teal)', fontWeight: 600 }}>⏱ {item.duration} min</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Session note */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Note de séance</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleNoteBlur}
              placeholder="Sensations, douleurs, progression..."
              rows={3}
              style={{ width: '100%', background: 'var(--s3)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: '.82rem', padding: '8px 10px', resize: 'none', fontFamily: 'inherit' }}
            />
          </div>

          <button onClick={onDelete} style={{ fontSize: '.7rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 0', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 700 }}>Supprimer</button>
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function CalendarView() {
  const logs      = useAppStore((s) => s.appData?.logs ?? []);
  const deleteLog = useAppStore((s) => s.deleteLog);
  const updateLog = useAppStore((s) => s.updateLog);

  const today = new Date();
  const [month,       setMonth]       = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const logsMap = logs.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {} as Record<string, DayLog[]>);

  function changeMonth(delta: number) {
    setMonth((prev) => {
      let m = prev.m + delta, y = prev.y;
      if (m > 11) { m = 0; y++; }
      if (m < 0)  { m = 11; y--; }
      return { y, m };
    });
  }

  const firstDay  = new Date(month.y, month.m, 1);
  const lastDay   = new Date(month.y, month.m + 1, 0);
  const offset    = (firstDay.getDay() + 6) % 7;
  const monthKey  = `${month.y}-${pad(month.m + 1)}`;
  const monthStats = Object.entries(logsMap).filter(([k]) => k.startsWith(monthKey));

  // Heatmap
  const heatmapDays: { key: string; count: number }[] = [];
  const heatEnd   = new Date(today); heatEnd.setHours(0, 0, 0, 0);
  const heatStart = new Date(heatEnd); heatStart.setDate(heatEnd.getDate() - 181);
  while ((heatStart.getDay() + 6) % 7 !== 0) heatStart.setDate(heatStart.getDate() - 1);
  const cur = new Date(heatStart);
  while (cur <= heatEnd) {
    const key = dk(cur);
    heatmapDays.push({ key, count: logsMap[key]?.length ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }

  const selectedLogs = selectedDay ? (logsMap[selectedDay] ?? []) : [];

  function heatColor(count: number) {
    if (count === 0) return 'var(--s3)';
    if (count === 1) return 'rgba(200,16,46,.3)';
    if (count === 2) return 'rgba(200,16,46,.55)';
    return 'var(--primary)';
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Month nav */}
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="font-display" style={{ fontSize: '1.4rem', letterSpacing: '.1em' }}>{MONTHS[month.m]} {month.y}</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[[-1, '‹'], [1, '›']].map(([d, label]) => (
            <button key={d} onClick={() => changeMonth(d as number)} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '4px 11px', cursor: 'pointer', fontSize: '.9rem' }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, padding: '4px 10px' }}>
        {DAYS.map((d) => (
          <div key={d} style={{ fontSize: '.55rem', fontWeight: 700, color: 'var(--muted)', textAlign: 'center', padding: '3px 0', letterSpacing: '.06em', textTransform: 'uppercase' }}>{d}</div>
        ))}
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: lastDay.getDate() }).map((_, i) => {
          const day = i + 1;
          const key = `${month.y}-${pad(month.m + 1)}-${pad(day)}`;
          const dayLogs  = logsMap[key] ?? [];
          const isToday  = key === dk(today);
          const hasLogs  = dayLogs.length > 0;
          const firstColor = dayLogs[0]?.programColor ?? 'var(--primary)';
          return (
            <div key={key} onClick={() => setSelectedDay(key)} style={{
              aspectRatio: '1', borderRadius: 8,
              border: isToday ? '1.5px solid var(--primary)' : `1.5px solid ${hasLogs ? firstColor + '60' : 'var(--border)'}`,
              background: hasLogs ? `${firstColor}18` : isToday ? 'rgba(200,16,46,.05)' : 'var(--s2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <div style={{ fontWeight: 700, fontSize: '.72rem', color: isToday ? 'var(--primary)' : 'var(--text)' }}>{day}</div>
              <div style={{ fontSize: '.65rem', lineHeight: 1 }}>{dayLogs[0]?.programIcon ?? ''}</div>
            </div>
          );
        })}
      </div>

      {/* Month stats */}
      <div style={{ padding: '14px 16px 8px' }}>
        <div className="font-display" style={{ fontSize: '1.2rem', letterSpacing: '.08em' }}>Ce mois · {monthStats.length} jours</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, padding: '0 12px 12px' }}>
        {[
          { label: 'Séances', val: monthStats.length, color: 'var(--primary)' },
          { label: 'Différents', val: new Set(monthStats.flatMap(([, ls]) => ls.map((l) => l.programId))).size, color: '#4aaeff' },
          { label: 'Streak', val: (() => { let s = 0; const d = new Date(today); while (logsMap[dk(d)]?.length) { s++; d.setDate(d.getDate() - 1); } return s; })(), color: '#ff8c2a' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 8px', textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: '1.9rem', lineHeight: 1, color }}>{val}</div>
            <div style={{ fontSize: '.55rem', color: 'var(--muted)', letterSpacing: '.07em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div style={{ padding: '0 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="font-display" style={{ fontSize: '1.2rem', letterSpacing: '.08em' }}>Activité</div>
        <div style={{ fontSize: '.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>6 mois</div>
      </div>
      <div style={{ padding: '4px 10px' }}>
        <div style={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(26, 1fr)' }}>
          {heatmapDays.map(({ key, count }) => (
            <div key={key} onClick={() => setSelectedDay(key)} style={{ aspectRatio: '1', borderRadius: 2, background: heatColor(count), cursor: 'pointer', outline: key === dk(today) ? `1.5px solid var(--primary)` : 'none' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '6px 0 2px', alignItems: 'center' }}>
          <span style={{ fontSize: '.58rem', color: 'var(--muted)' }}>Moins</span>
          {[0, 1, 2, 3].map((c) => <div key={c} style={{ width: 9, height: 9, borderRadius: 2, background: heatColor(c) }} />)}
          <span style={{ fontSize: '.58rem', color: 'var(--muted)' }}>Plus</span>
        </div>
      </div>

      {/* Day detail sheet */}
      {selectedDay && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedDay(null); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.5rem', marginBottom: 4, letterSpacing: '.08em' }}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {selectedLogs.length === 0 ? 'Aucune séance' : `${selectedLogs.length} séance${selectedLogs.length > 1 ? 's' : ''}`}
            </div>

            {selectedLogs.length === 0 ? (
              <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 16 }}>Repos bien mérité 💤</div>
            ) : (
              selectedLogs.map((log) => (
                <SessionCard
                  key={log.id}
                  log={log}
                  onDelete={() => {
                    deleteLog(log.id);
                    if (selectedLogs.length <= 1) setSelectedDay(null);
                  }}
                  onNoteChange={(note) => updateLog(log.id, { note })}
                />
              ))
            )}
            <button className="btn-secondary" onClick={() => setSelectedDay(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
