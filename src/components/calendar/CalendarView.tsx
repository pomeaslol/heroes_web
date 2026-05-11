'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { DayLog } from '@/models/day-log';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function dk(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export function CalendarView() {
  const logs = useAppStore((s) => s.appData?.logs ?? []);
  const deleteLog = useAppStore((s) => s.deleteLog);

  const today = new Date();
  const [month, setMonth] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const logsMap = logs.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {} as Record<string, DayLog[]>);

  function changeMonth(delta: number) {
    setMonth((prev) => {
      let m = prev.m + delta;
      let y = prev.y;
      if (m > 11) { m = 0; y++; }
      if (m < 0) { m = 11; y--; }
      return { y, m };
    });
  }

  const firstDay = new Date(month.y, month.m, 1);
  const lastDay = new Date(month.y, month.m + 1, 0);
  const offset = (firstDay.getDay() + 6) % 7;

  const monthStats = Object.entries(logsMap).filter(([k]) => k.startsWith(`${month.y}-${pad(month.m + 1)}`));

  // Heatmap: 26 weeks back
  const heatmapDays: { key: string; count: number; color: string }[] = [];
  const heatEnd = new Date(today);
  heatEnd.setHours(0, 0, 0, 0);
  const heatStart = new Date(heatEnd);
  heatStart.setDate(heatEnd.getDate() - 181);
  while ((heatStart.getDay() + 6) % 7 !== 0) heatStart.setDate(heatStart.getDate() - 1);
  const cur = new Date(heatStart);
  while (cur <= heatEnd) {
    const key = dk(cur);
    const dayLogs = logsMap[key] ?? [];
    const count = dayLogs.length;
    const color = count === 0 ? 'var(--s3)' : count === 1 ? 'rgba(63,255,192,.35)' : count === 2 ? 'rgba(63,255,192,.6)' : 'var(--teal)';
    heatmapDays.push({ key, count, color });
    cur.setDate(cur.getDate() + 1);
  }

  const selectedLogs = selectedDay ? (logsMap[selectedDay] ?? []) : [];

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Month nav */}
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="font-display" style={{ fontSize: '1.4rem' }}>{MONTHS[month.m]} {month.y}</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[[-1, '‹'], [1, '›']].map(([d, label]) => (
            <button key={d} onClick={() => changeMonth(d as number)} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '4px 11px', cursor: 'pointer', fontSize: '.9rem' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, padding: '4px 10px' }}>
        {DAYS.map((d) => (
          <div key={d} style={{ fontSize: '.56rem', fontWeight: 700, color: 'var(--muted)', textAlign: 'center', padding: '3px 0', letterSpacing: '.05em' }}>{d}</div>
        ))}
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: lastDay.getDate() }).map((_, i) => {
          const day = i + 1;
          const key = `${month.y}-${pad(month.m + 1)}-${pad(day)}`;
          const dayLogs = logsMap[key] ?? [];
          const isToday = key === dk(today);
          const hasLogs = dayLogs.length > 0;
          const firstColor = dayLogs[0]?.programColor ?? 'var(--teal)';
          return (
            <div key={key} onClick={() => setSelectedDay(key)} style={{
              aspectRatio: '1', borderRadius: 9, border: isToday ? '1.5px solid var(--teal)' : `1.5px solid ${hasLogs ? firstColor + '60' : 'var(--border)'}`,
              background: hasLogs ? `${firstColor}18` : isToday ? 'rgba(63,255,192,.05)' : 'var(--s2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <div style={{ fontWeight: 700, fontSize: '.72rem', color: isToday ? 'var(--teal)' : 'var(--text)' }}>{day}</div>
              <div style={{ fontSize: '.65rem', lineHeight: 1 }}>{dayLogs[0]?.programIcon ?? ''}</div>
            </div>
          );
        })}
      </div>

      {/* Month stats */}
      <div style={{ padding: '14px 16px 8px' }}>
        <div className="font-display" style={{ fontSize: '1.2rem' }}>Ce mois · {monthStats.length} jours</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, padding: '0 12px 12px' }}>
        {[
          { label: 'Séances', val: monthStats.length, color: 'var(--teal)' },
          { label: 'Différents', val: new Set(monthStats.flatMap(([, ls]) => ls.map((l) => l.programId))).size, color: 'var(--green)' },
          { label: 'Streak', val: (() => { let s = 0; const d = new Date(today); while (logsMap[dk(d)]?.length) { s++; d.setDate(d.getDate() - 1); } return s; })(), color: 'var(--orange)' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 8px', textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: '1.9rem', lineHeight: 1, color }}>{val}</div>
            <div style={{ fontSize: '.57rem', color: 'var(--muted)', letterSpacing: '.07em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div style={{ padding: '0 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="font-display" style={{ fontSize: '1.2rem' }}>Activité</div>
        <div style={{ fontSize: '.6rem', color: 'var(--muted)' }}>6 mois</div>
      </div>
      <div style={{ padding: '4px 10px' }}>
        <div style={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(26, 1fr)' }}>
          {heatmapDays.map(({ key, color }) => (
            <div key={key} onClick={() => setSelectedDay(key)} style={{ aspectRatio: '1', borderRadius: 2, background: color, cursor: 'pointer', outline: key === dk(today) ? '1.5px solid var(--teal)' : 'none' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '6px 0 2px', alignItems: 'center' }}>
          <span style={{ fontSize: '.6rem', color: 'var(--muted)' }}>Moins</span>
          {['var(--s3)', 'rgba(63,255,192,.25)', 'rgba(63,255,192,.5)', 'var(--teal)'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
          ))}
          <span style={{ fontSize: '.6rem', color: 'var(--muted)' }}>Plus</span>
        </div>
      </div>

      {/* Day detail sheet */}
      {selectedDay && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedDay(null); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.6rem', marginBottom: 12 }}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            {selectedLogs.length === 0 ? (
              <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 16 }}>Aucune séance ce jour.</div>
            ) : (
              selectedLogs.map((log) => (
                <div key={log.id} style={{ marginBottom: 12, background: 'var(--s2)', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${log.programColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>{log.programIcon}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{log.programName}</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--muted)' }}>{log.completedAt ? new Date(log.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    </div>
                  </div>
                  <button onClick={() => { deleteLog(log.id); if (selectedLogs.length <= 1) setSelectedDay(null); }} style={{ fontSize: '.72rem', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Supprimer</button>
                </div>
              ))
            )}
            <button className="btn-secondary" onClick={() => setSelectedDay(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
