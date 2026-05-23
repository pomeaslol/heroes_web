'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { DayLog, BlockLog, SetLog } from '@/models/day-log';
import { ProgramCategory, CATEGORY_META } from '@/models/program';

interface LiveSet {
  id: string;
  w: string;
  r: string;
  rpe: string;
  done: boolean;
}

interface LiveExercise {
  id: string;
  name: string;
  sets: LiveSet[];
}

const SESSION_ICONS = ['💪', '🏃', '🚴', '🏊', '🥊', '🧘', '⚽', '🎾', '🏋️', '🤸', '🧗', '🏄'];
const SESSION_COLORS = ['#C8102E', '#4aaeff', '#22c55e', '#ff8c2a', '#a855f7', '#f472b6'];

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function SetRow({ set, idx, onUpdate, onDelete, isNewPR }: {
  set: LiveSet; idx: number;
  onUpdate: (field: 'w' | 'r' | 'rpe' | 'done', value: string | boolean) => void;
  onDelete: () => void;
  isNewPR?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)', opacity: set.done ? 1 : 0.72 }}>
      <div style={{ fontSize: '.62rem', color: 'var(--muted)', width: 18, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</div>
      {isNewPR && <span style={{ fontSize: '.5rem', color: '#fbbf24', fontWeight: 800, letterSpacing: '.04em', flexShrink: 0 }}>PR</span>}
      <input
        type="number" inputMode="decimal"
        value={set.w}
        onChange={e => onUpdate('w', e.target.value)}
        placeholder="kg"
        style={{ flex: 1, minWidth: 0, background: 'var(--s2)', border: 'none', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: '.78rem', textAlign: 'center' }}
      />
      <input
        type="number" inputMode="numeric"
        value={set.r}
        onChange={e => onUpdate('r', e.target.value)}
        placeholder="reps"
        style={{ flex: 1, minWidth: 0, background: 'var(--s2)', border: 'none', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: '.78rem', textAlign: 'center' }}
      />
      <input
        type="number" inputMode="numeric"
        value={set.rpe}
        onChange={e => onUpdate('rpe', e.target.value)}
        placeholder="RPE"
        style={{ width: 44, background: 'var(--s2)', border: 'none', borderRadius: 6, padding: '6px 6px', color: 'var(--text)', fontSize: '.78rem', textAlign: 'center' }}
      />
      <button
        onClick={() => onUpdate('done', !set.done)}
        style={{ width: 28, height: 28, borderRadius: '50%', border: set.done ? 'none' : '2px solid rgba(255,255,255,.2)', background: set.done ? 'var(--green)' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '.75rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {set.done ? '✓' : ''}
      </button>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 2px', flexShrink: 0 }}>×</button>
    </div>
  );
}

export function WorkoutView() {
  const appData = useAppStore(s => s.appData);
  const addLog  = useAppStore(s => s.addLog);
  const logs    = appData?.logs ?? [];

  const [inSession,       setInSession]       = useState(false);
  const [sessionName,     setSessionName]      = useState('Ma séance');
  const [sessionIcon,     setSessionIcon]      = useState('💪');
  const [sessionColor,    setSessionColor]     = useState('#C8102E');
  const [sessionCat,      setSessionCat]       = useState<ProgramCategory>('sport');
  const [exercises,       setExercises]        = useState<LiveExercise[]>([]);
  const [elapsed,         setElapsed]          = useState(0);
  const [showExoModal,    setShowExoModal]     = useState(false);
  const [newExoName,      setNewExoName]       = useState('');
  const [showFinish,      setShowFinish]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    if (inSession) {
      startRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inSession]);

  const recentTemplates = useMemo(() => {
    const seen = new Set<string>();
    return [...logs]
      .sort((a, b) => (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date))
      .filter(l => { if (seen.has(l.programName)) return false; seen.add(l.programName); return true; })
      .slice(0, 6);
  }, [logs]);

  const prMap = useMemo(() => {
    const map: Record<string, { w: number; r: number }> = {};
    logs.forEach(log => log.blocks.forEach(b => b.items.forEach(item => {
      if (!item.name || !item.sets) return;
      const key = item.name.toLowerCase();
      item.sets.filter(s => s.done).forEach(s => {
        const cur = map[key];
        if (!cur || (s.w ?? 0) > cur.w || ((s.w ?? 0) === cur.w && (s.r ?? 0) > cur.r)) {
          map[key] = { w: s.w ?? 0, r: s.r ?? 0 };
        }
      });
    })));
    return map;
  }, [logs]);

  const recentExoNames = useMemo(() => Array.from(new Set(
    logs.flatMap(l => l.blocks.flatMap(b => b.items.map(i => i.name).filter(Boolean)))
  )) as string[], [logs]);

  function getLastSetsFor(name: string): SetLog[] {
    for (let i = logs.length - 1; i >= 0; i--) {
      for (const b of logs[i].blocks) {
        for (const item of b.items) {
          if (item.name?.toLowerCase() === name.toLowerCase() && item.sets?.length) return item.sets;
        }
      }
    }
    return [];
  }

  function startBlank() {
    setExercises([]); setElapsed(0); setInSession(true);
  }

  function startFromTemplate(log: DayLog) {
    setSessionName(log.programName);
    setSessionIcon(log.programIcon);
    setSessionColor(log.programColor);
    setSessionCat((log.programCategory as ProgramCategory) ?? 'sport');
    setExercises(log.blocks.flatMap(b =>
      b.items.filter(i => i.name).map(item => ({
        id: crypto.randomUUID(),
        name: item.name!,
        sets: (item.sets ?? []).map(s => ({ id: crypto.randomUUID(), w: String(s.w ?? ''), r: String(s.r ?? ''), rpe: String(s.rpe ?? ''), done: false })) || [{ id: crypto.randomUUID(), w: '', r: '', rpe: '', done: false }],
      }))
    ));
    setElapsed(0); setInSession(true);
  }

  function addExercise() {
    if (!newExoName.trim()) return;
    const name = newExoName.trim();
    const last  = getLastSetsFor(name);
    setExercises(ex => [...ex, {
      id: crypto.randomUUID(), name,
      sets: last.length > 0
        ? last.map(s => ({ id: crypto.randomUUID(), w: String(s.w ?? ''), r: String(s.r ?? ''), rpe: String(s.rpe ?? ''), done: false }))
        : [{ id: crypto.randomUUID(), w: '', r: '', rpe: '', done: false }],
    }]);
    setNewExoName(''); setShowExoModal(false);
  }

  function addSet(exoId: string) {
    setExercises(exs => exs.map(ex => {
      if (ex.id !== exoId) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { id: crypto.randomUUID(), w: last?.w ?? '', r: last?.r ?? '', rpe: last?.rpe ?? '', done: false }] };
    }));
  }

  function updateSet(exoId: string, setId: string, field: 'w' | 'r' | 'rpe' | 'done', val: string | boolean) {
    setExercises(exs => exs.map(ex =>
      ex.id !== exoId ? ex : { ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: val } : s) }
    ));
  }

  function deleteSet(exoId: string, setId: string) {
    setExercises(exs => exs.map(ex =>
      ex.id !== exoId ? ex : { ...ex, sets: ex.sets.filter(s => s.id !== setId) }
    ));
  }

  function finishSession() {
    const today = new Date().toISOString().split('T')[0];
    const blocks: BlockLog[] = exercises.map(ex => ({
      blockId: ex.id,
      title: ex.name,
      items: [{
        itemId: ex.id,
        name: ex.name,
        done: ex.sets.some(s => s.done),
        sets: ex.sets.map(s => ({
          w: s.w !== '' ? parseFloat(s.w) : undefined,
          r: s.r !== '' ? parseInt(s.r) : undefined,
          rpe: s.rpe !== '' ? parseFloat(s.rpe) : undefined,
          done: s.done,
        })),
      }],
    }));
    addLog({ id: crypto.randomUUID(), date: today, programId: crypto.randomUUID(), programName: sessionName, programIcon: sessionIcon, programColor: sessionColor, programCategory: sessionCat, blocks, completedAt: new Date().toISOString(), isPublic: true });
    setInSession(false); setExercises([]); setElapsed(0); setShowFinish(false);
  }

  // ── IDLE ──────────────────────────────────────────────────────────────────────
  if (!inSession) {
    return (
      <div style={{ paddingBottom: 24 }}>
        <div style={{ padding: '12px 14px 10px' }}>
          <div className="font-display" style={{ fontSize: '1.3rem', letterSpacing: '.1em' }}>Workout</div>
        </div>

        <div style={{ margin: '0 12px 16px', background: 'var(--s1)', border: '1px solid rgba(200,16,46,.2)', borderRadius: 14, borderLeft: '3px solid var(--primary)', padding: '16px' }}>
          <input className="field" placeholder="Nom de la séance..." value={sessionName} onChange={e => setSessionName(e.target.value)} style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {SESSION_ICONS.map(ic => (
              <button key={ic} onClick={() => setSessionIcon(ic)} style={{ fontSize: '1.15rem', padding: '4px 6px', borderRadius: 8, border: sessionIcon === ic ? '2px solid var(--primary)' : '2px solid transparent', background: sessionIcon === ic ? 'rgba(200,16,46,.1)' : 'none', cursor: 'pointer' }}>{ic}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
            {SESSION_COLORS.map(c => (
              <button key={c} onClick={() => setSessionColor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: sessionColor === c ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {(Object.keys(CATEGORY_META) as ProgramCategory[]).map(cat => {
              const m = CATEGORY_META[cat]; const active = sessionCat === cat;
              return (
                <button key={cat} onClick={() => setSessionCat(cat)} style={{ padding: '5px 10px', borderRadius: 8, border: active ? `1.5px solid ${m.color}` : '1px solid var(--border)', background: active ? `${m.color}15` : 'var(--s2)', color: active ? m.color : 'var(--muted)', fontSize: '.62rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {m.icon} {m.label}
                </button>
              );
            })}
          </div>
          <button className="btn-primary" onClick={startBlank} style={{ width: '100%' }}>⚡ Nouvelle séance vierge</button>
        </div>

        {recentTemplates.length > 0 && (
          <>
            <div style={{ padding: '2px 16px 8px' }}>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Reprendre une séance récente</div>
            </div>
            {recentTemplates.map(log => {
              const names = log.blocks.flatMap(b => b.items).filter(i => i.name).map(i => i.name!);
              return (
                <div key={log.id} className="card" style={{ margin: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${log.programColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{log.programIcon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.88rem', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>{log.programName}</div>
                    <div style={{ fontSize: '.62rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{names.slice(0, 4).join(' · ')}{names.length > 4 ? ' …' : ''}</div>
                  </div>
                  <button onClick={() => startFromTemplate(log)} style={{ padding: '7px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '.72rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0 }}>▶</button>
                </div>
              );
            })}
          </>
        )}

        {logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏋️</div>
            <div style={{ fontWeight: 700, fontSize: '.95rem', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Prêt à s'entraîner ?</div>
            <div style={{ fontSize: '.8rem' }}>Lance ta première séance !</div>
          </div>
        )}
      </div>
    );
  }

  // ── SESSION ───────────────────────────────────────────────────────────────────
  const doneCount = exercises.reduce((n, ex) => n + ex.sets.filter(s => s.done).length, 0);
  const totalSets = exercises.reduce((n, ex) => n + ex.sets.length, 0);

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: '1.1rem' }}>{sessionIcon}</span>
            <div className="font-display" style={{ fontSize: '1.05rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>{sessionName}</div>
          </div>
          <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 1 }}>⏱ {formatElapsed(elapsed)} · {doneCount}/{totalSets} séries</div>
        </div>
        <button onClick={() => setInSession(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--muted)', cursor: 'pointer', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Annuler</button>
        <button onClick={() => setShowFinish(true)} style={{ padding: '8px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: '.72rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em' }}>Terminer</button>
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px 4px', alignItems: 'center' }}>
        <div style={{ width: 18 }} />
        <div style={{ flex: 1, fontSize: '.55rem', color: 'var(--muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.06em' }}>kg</div>
        <div style={{ flex: 1, fontSize: '.55rem', color: 'var(--muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.06em' }}>reps</div>
        <div style={{ width: 44, fontSize: '.55rem', color: 'var(--muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.06em' }}>RPE</div>
        <div style={{ width: 28 }} />
        <div style={{ width: 22 }} />
      </div>

      {exercises.map(ex => {
        const pr = prMap[ex.name.toLowerCase()];
        return (
          <div key={ex.id} className="card" style={{ margin: '0 12px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 6px' }}>
              <div style={{ flex: 1, fontWeight: 700, fontSize: '.88rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>{ex.name}</div>
              {pr && <div style={{ fontSize: '.58rem', color: '#fbbf24', fontWeight: 700 }}>PR : {pr.w}kg×{pr.r}</div>}
              <button onClick={() => setExercises(exs => exs.filter(e => e.id !== ex.id))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '.9rem' }}>×</button>
            </div>
            <div style={{ padding: '0 14px' }}>
              {ex.sets.map((s, si) => {
                const isNewPR = s.done && !!pr &&
                  ((parseFloat(s.w) || 0) > pr.w || ((parseFloat(s.w) || 0) === pr.w && (parseInt(s.r) || 0) > pr.r));
                return (
                  <SetRow key={s.id} set={s} idx={si} isNewPR={isNewPR}
                    onUpdate={(f, v) => updateSet(ex.id, s.id, f, v)}
                    onDelete={() => deleteSet(ex.id, s.id)}
                  />
                );
              })}
            </div>
            <button onClick={() => addSet(ex.id)} style={{ width: '100%', padding: '9px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              + Série
            </button>
          </div>
        );
      })}

      <div style={{ margin: '0 12px' }}>
        <button onClick={() => setShowExoModal(true)} style={{ width: '100%', padding: '14px', background: 'var(--s1)', border: '1px dashed rgba(255,255,255,.15)', borderRadius: 12, color: 'var(--primary)', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          + Ajouter un exercice
        </button>
      </div>

      {exercises.length === 0 && (
        <div style={{ textAlign: 'center', padding: '28px 24px', color: 'var(--muted)', fontSize: '.82rem' }}>Ajoute ton premier exercice !</div>
      )}

      {/* Add exercise modal */}
      {showExoModal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowExoModal(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.5rem', marginBottom: 12 }}>Exercice</div>
            <input
              className="field"
              placeholder="Ex: Squat, Développé couché..."
              value={newExoName}
              onChange={e => setNewExoName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExercise()}
              autoFocus
              style={{ marginBottom: 10 }}
            />
            {(() => {
              const filtered = recentExoNames.filter(n => !newExoName || n.toLowerCase().includes(newExoName.toLowerCase())).slice(0, 8);
              return filtered.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {filtered.map(n => (
                    <button key={n} onClick={() => setNewExoName(n)} style={{ padding: '5px 10px', borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '.72rem', cursor: 'pointer' }}>{n}</button>
                  ))}
                </div>
              ) : null;
            })()}
            <button className="btn-primary" onClick={addExercise} disabled={!newExoName.trim()}>Ajouter</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowExoModal(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Finish modal */}
      {showFinish && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowFinish(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.6rem', marginBottom: 10 }}>Terminer la séance ?</div>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 18, lineHeight: 1.7 }}>
              Durée : <strong style={{ color: 'var(--text)' }}>{formatElapsed(elapsed)}</strong><br />
              Exercices : <strong style={{ color: 'var(--text)' }}>{exercises.length}</strong><br />
              Séries complétées : <strong style={{ color: 'var(--text)' }}>{doneCount}/{totalSets}</strong>
            </div>
            <button className="btn-primary" onClick={finishSession}>Enregistrer</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowFinish(false)}>Continuer la séance</button>
          </div>
        </div>
      )}
    </div>
  );
}
