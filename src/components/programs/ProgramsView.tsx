'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { Program, ProgramCategory, ProgramBlock, ProgramItem, TrackingType, CATEGORY_META } from '@/models/program';
import { DayLog, BlockLog, ItemLog, SetLog } from '@/models/day-log';
import { publishFeedPost } from '@/lib/firebase/feed';
import type { FeedPost } from '@/models/feed';

const PALETTE = ['#C8102E', '#3fffc0', '#ff8c2a', '#4aaeff', '#a855f7', '#f472b6', '#fbbf24', '#22c55e'];
const ICONS = ['💪', '🥗', '🧘', '📚', '🎨', '⚡', '🏃', '🏋️', '🥊', '🧠', '✍️', '🎵', '🏊', '🚴', '🧗', '⚽'];

type Screen = 'list' | 'detail' | 'session' | 'free';

interface ItemStats { lastSets?: SetLog[]; pr?: number }
interface QuickItem { id: string; name: string }

const QUICK_BLOCK_ID = '_quick';

// ─── Publish modal ────────────────────────────────────────────────────────────
function PublishModal({ log, note, onNoteChange, isPublic, onPublicChange, excluded, onExcludedChange, onCancel, onSave }: {
  log: DayLog | null;
  note: string; onNoteChange: (v: string) => void;
  isPublic: boolean; onPublicChange: (v: boolean) => void;
  excluded: Set<string>; onExcludedChange: (v: Set<string>) => void;
  onCancel: () => void; onSave: () => void;
}) {
  if (!log) return null;
  const allItems = log.blocks.flatMap(b => b.items).filter(i => i.name);
  const doneSetsCount = log.blocks.flatMap(b => b.items).flatMap(i => i.sets ?? []).filter(s => s.done).length;

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="sheet" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="sheet-handle" />

        {/* Session header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${log.programColor}20`, border: `1px solid ${log.programColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{log.programIcon}</div>
          <div>
            <div className="font-display" style={{ fontSize: '1.2rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>{log.programName}</div>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 2 }}>
              {doneSetsCount > 0 ? `${doneSetsCount} séries · ` : ''}{allItems.length} exercice{allItems.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Message */}
        <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Message (optionnel)</div>
        <textarea
          className="field"
          placeholder="Partage un ressenti, une note, un record..."
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          rows={3}
          style={{ marginBottom: 14, resize: 'none', fontFamily: 'inherit', fontSize: '.85rem' }}
        />

        {/* Public toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--s2)', borderRadius: 10, marginBottom: allItems.length > 0 ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '.84rem' }}>Publier dans le feed</div>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 2 }}>Visible par tes amis</div>
          </div>
          <button onClick={() => onPublicChange(!isPublic)} style={{ width: 46, height: 26, borderRadius: 13, background: isPublic ? 'var(--green)' : 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', cursor: 'pointer', position: 'relative', flexShrink: 0, padding: 0, transition: 'background .2s' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: isPublic ? 22 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
          </button>
        </div>

        {/* Exercise selection */}
        {isPublic && allItems.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Exercices à partager</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allItems.map(item => {
                const included = !excluded.has(item.itemId);
                return (
                  <button key={item.itemId} onClick={() => {
                    const ns = new Set(excluded);
                    if (ns.has(item.itemId)) ns.delete(item.itemId); else ns.add(item.itemId);
                    onExcludedChange(ns);
                  }} style={{ padding: '6px 11px', borderRadius: 8, border: included ? '1.5px solid var(--green)' : '1px solid var(--border)', background: included ? 'rgba(34,197,94,.08)' : 'var(--s2)', color: included ? 'var(--green)' : 'var(--muted)', fontSize: '.74rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                    {included ? '✓ ' : ''}{item.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={onSave} style={{ marginTop: 4 }}>
          {isPublic ? '🌐 Publier la séance' : '💾 Enregistrer (privé)'}
        </button>
        <button className="btn-secondary" style={{ marginTop: 6 }} onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

export function ProgramsView() {
  const user          = useAppStore((s) => s.user);
  const appData       = useAppStore((s) => s.appData);
  const programs      = appData?.programs ?? [];
  const logs          = appData?.logs ?? [];
  const addProgram    = useAppStore((s) => s.addProgram);
  const updateProgram = useAppStore((s) => s.updateProgram);
  const deleteProgram = useAppStore((s) => s.deleteProgram);
  const addLog        = useAppStore((s) => s.addLog);
  const updateLog     = useAppStore((s) => s.updateLog);

  const [screen,          setScreen]          = useState<Screen>('list');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showCreate,      setShowCreate]      = useState(false);
  const [showAddBlock,    setShowAddBlock]     = useState(false);
  const [showAddItem,     setShowAddItem]      = useState<string | null>(null);

  // Session state
  const [activeSession,    setActiveSession]    = useState<Record<string, ItemLog>>({});
  const [sessionSetCounts, setSessionSetCounts] = useState<Record<string, number>>({});
  const [quickItems,       setQuickItems]       = useState<QuickItem[]>([]);
  const [showQuickAdd,     setShowQuickAdd]     = useState(false);
  const [quickItemName,    setQuickItemName]    = useState('');
  const [freeSessionName,  setFreeSessionName]  = useState('Séance libre');

  // Publish modal
  const [pendingLog,       setPendingLog]       = useState<DayLog | null>(null);
  const [pendingGoTo,      setPendingGoTo]      = useState<Screen>('list');
  const [finishNote,       setFinishNote]       = useState('');
  const [finishPublic,     setFinishPublic]     = useState(true);
  const [excludedItems,    setExcludedItems]    = useState<Set<string>>(new Set());

  // Create program
  const [newName,     setNewName]     = useState('');
  const [newIcon,     setNewIcon]     = useState('💪');
  const [newCategory, setNewCategory] = useState<ProgramCategory>('sport');
  const [newColor,    setNewColor]    = useState(PALETTE[0]);

  // Add block / item
  const [blockTitle,   setBlockTitle]   = useState('');
  const [itemName,     setItemName]     = useState('');
  const [itemDesc,     setItemDesc]     = useState('');
  const [itemTracking, setItemTracking] = useState<TrackingType>('checkbox');
  const [itemSets,     setItemSets]     = useState(3);

  const categoryCounts = Object.keys(CATEGORY_META).reduce((acc, cat) => {
    acc[cat as ProgramCategory] = programs.filter((p) => p.category === cat).length;
    return acc;
  }, {} as Record<ProgramCategory, number>);

  // Per-item stats: PR and last session data
  const itemStats: Record<string, ItemStats> = useMemo(() => {
    if (!selectedProgram) return {};
    const result: Record<string, ItemStats> = {};

    // PR: scan all logs
    for (const log of logs) {
      for (const block of log.blocks) {
        for (const item of block.items) {
          if (item.sets) {
            for (const s of item.sets) {
              if (s.w !== undefined && s.w > 0 && s.done) {
                if (!result[item.itemId]) result[item.itemId] = {};
                if (result[item.itemId].pr === undefined || s.w > result[item.itemId].pr!) {
                  result[item.itemId].pr = s.w;
                }
              }
            }
          }
        }
      }
    }

    // Last session sets for this program
    const progLogs = [...logs]
      .filter(l => l.programId === selectedProgram.id)
      .sort((a, b) => (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date));
    for (const log of progLogs) {
      for (const block of log.blocks) {
        for (const item of block.items) {
          if (item.sets && !result[item.itemId]?.lastSets) {
            if (!result[item.itemId]) result[item.itemId] = {};
            result[item.itemId].lastSets = item.sets;
          }
        }
      }
    }
    return result;
  }, [logs, selectedProgram]);

  function getSetCount(item: ProgramItem): number {
    return sessionSetCounts[item.id] ?? item.defaultSets ?? 3;
  }
  function getQuickSetCount(id: string): number {
    return sessionSetCounts[id] ?? 3;
  }

  function createProgram() {
    if (!newName.trim()) return;
    addProgram({ id: crypto.randomUUID(), name: newName.trim(), icon: newIcon, category: newCategory, color: newColor, blocks: [], createdAt: new Date().toISOString() });
    setNewName(''); setShowCreate(false);
  }

  function addBlock(program: Program) {
    if (!blockTitle.trim()) return;
    const block: ProgramBlock = { id: crypto.randomUUID(), title: blockTitle.trim(), items: [] };
    const updated = { ...program, blocks: [...program.blocks, block] };
    updateProgram(updated); setBlockTitle(''); setShowAddBlock(false); setSelectedProgram(updated);
  }

  function addItem(program: Program, blockId: string) {
    if (!itemName.trim()) return;
    const item: ProgramItem = { id: crypto.randomUUID(), name: itemName.trim(), description: itemDesc.trim() || undefined, trackingType: itemTracking, defaultSets: itemTracking === 'sets' ? itemSets : undefined };
    const updated = { ...program, blocks: program.blocks.map((b) => b.id === blockId ? { ...b, items: [...b.items, item] } : b) };
    updateProgram(updated); setSelectedProgram(updated); setItemName(''); setItemDesc(''); setShowAddItem(null);
  }

  function startSession(program: Program) {
    setSelectedProgram(program);
    setActiveSession({});
    setSessionSetCounts({});
    setQuickItems([]);
    setScreen('session');
  }

  function buildAndOpenPublish(program: Program | null, isFree: boolean) {
    let blocks: BlockLog[];
    if (isFree) {
      blocks = [{ blockId: '_free', title: 'Exercices', items: quickItems.map(qi => ({ ...(activeSession[qi.id] ?? { itemId: qi.id, done: false }), itemId: qi.id, name: qi.name })) }];
    } else {
      const prog = program!;
      const programBlocks: BlockLog[] = prog.blocks.map(b => ({
        blockId: b.id, title: b.title,
        items: b.items.map(item => ({ ...(activeSession[item.id] ?? { itemId: item.id, done: false }), itemId: item.id, name: item.name })),
      }));
      blocks = quickItems.length
        ? [...programBlocks, { blockId: QUICK_BLOCK_ID, title: 'Exercices ajoutés', items: quickItems.map(qi => ({ ...(activeSession[qi.id] ?? { itemId: qi.id, done: false }), itemId: qi.id, name: qi.name })) }]
        : programBlocks;
    }
    const log: DayLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      programId: program?.id ?? crypto.randomUUID(),
      programName: isFree ? freeSessionName : program!.name,
      programIcon: isFree ? '⚡' : program!.icon,
      programColor: isFree ? '#C8102E' : program!.color,
      programCategory: isFree ? 'custom' : undefined,
      blocks,
      completedAt: new Date().toISOString(),
    };
    setPendingLog(log);
    setPendingGoTo(isFree ? 'list' : 'detail');
    setFinishNote('');
    setFinishPublic(true);
    setExcludedItems(new Set());
  }

  function finishSession(program: Program) {
    buildAndOpenPublish(program, false);
  }

  function toggleItemDone(itemId: string) {
    setActiveSession((s) => ({
      ...s,
      [itemId]: { ...(s[itemId] ?? { itemId }), itemId, done: !(s[itemId]?.done ?? false) },
    }));
  }

  function updateSetLog(itemId: string, setIdx: number, field: keyof SetLog, value: number | boolean | undefined) {
    setActiveSession((s) => {
      const prev = s[itemId] ?? { itemId, done: false, sets: [] };
      const sets = [...(prev.sets ?? [])];
      while (sets.length <= setIdx) sets.push({ done: false });
      if (value === undefined) {
        const updated = { ...sets[setIdx] };
        delete (updated as Record<string, unknown>)[field as string];
        sets[setIdx] = updated;
      } else {
        sets[setIdx] = { ...sets[setIdx], [field]: value };
      }
      return { ...s, [itemId]: { ...prev, sets, done: sets.some((st) => st.done) } };
    });
  }

  function addSet(itemId: string, currentCount: number) {
    const currentSets = activeSession[itemId]?.sets ?? [];
    const lastSet     = currentSets[currentCount - 1] ?? {};
    setSessionSetCounts(c => ({ ...c, [itemId]: currentCount + 1 }));
    setActiveSession(s => {
      const prev = s[itemId] ?? { itemId, done: false, sets: [] };
      const sets = [...(prev.sets ?? [])];
      while (sets.length <= currentCount) sets.push({ done: false });
      sets[currentCount] = { done: false, w: lastSet.w, r: lastSet.r };
      return { ...s, [itemId]: { ...prev, sets } };
    });
  }

  function removeLastSet(itemId: string, currentCount: number) {
    if (currentCount <= 1) return;
    setSessionSetCounts(c => ({ ...c, [itemId]: currentCount - 1 }));
  }

  function addQuickItem() {
    if (!quickItemName.trim()) return;
    const id = crypto.randomUUID();
    setQuickItems(q => [...q, { id, name: quickItemName.trim() }]);
    setSessionSetCounts(c => ({ ...c, [id]: 3 }));
    setQuickItemName('');
    setShowQuickAdd(false);
  }

  // ─── Set grid (shared between program items and quick items) ───────────────
  function SetGrid({ itemId, setCount, lastSets, pr }: { itemId: string; setCount: number; lastSets?: SetLog[]; pr?: number }) {
    const log = activeSession[itemId];
    return (
      <>
        {(pr !== undefined || lastSets?.[0]) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 5, fontSize: '.64rem', color: 'var(--muted)' }}>
            {pr !== undefined && <span style={{ color: '#fbbf24', fontWeight: 700 }}>🏆 PR {pr} kg</span>}
            {lastSets?.[0] && <span>Dernière: {lastSets[0].w ? `${lastSets[0].w}kg` : '—'} × {lastSets[0].r ?? '—'} reps</span>}
          </div>
        )}
        <div style={{ background: 'var(--s2)', borderRadius: 9, padding: '8px 10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 1fr 1fr 32px', gap: 5, marginBottom: 4 }}>
            {['', 'KG', 'REPS', 'RPE', ''].map((h, i) => (
              <div key={i} style={{ fontSize: '.53rem', color: 'var(--muted)', textAlign: 'center', letterSpacing: '.05em' }}>{h}</div>
            ))}
          </div>
          {Array.from({ length: setCount }).map((_, si) => {
            const setLog  = (log?.sets?.[si] ?? {}) as Partial<SetLog>;
            const prevSet = (lastSets?.[si] ?? {}) as Partial<SetLog>;
            const curW    = log?.sets?.[si]?.w;
            const isPR    = pr !== undefined && curW !== undefined && curW > pr;
            return (
              <div key={si} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 1fr 1fr 32px', gap: 5, alignItems: 'center', marginBottom: 4 }}>
                <div className="font-display" style={{ fontSize: '.9rem', color: isPR ? '#fbbf24' : 'var(--muted)', textAlign: 'right' }}>{isPR ? '🏆' : si + 1}</div>
                {(['w', 'r', 'rpe'] as const).map((field) => (
                  <input key={field} className="field" type="number" inputMode="decimal"
                    placeholder={prevSet[field]?.toString() ?? '—'}
                    value={setLog[field]?.toString() ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      if (val === undefined || !isNaN(val)) updateSetLog(itemId, si, field, val);
                    }}
                    style={{ textAlign: 'center', padding: '6px 3px', fontSize: '.82rem' }}
                  />
                ))}
                <button className={`check-btn ${setLog.done ? 'done' : ''}`} onClick={() => updateSetLog(itemId, si, 'done', !(setLog.done ?? false))}>
                  {setLog.done ? '✓' : ''}
                </button>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
            <button onClick={() => addSet(itemId, setCount)} style={{ flex: 1, padding: '5px', background: 'rgba(200,16,46,.08)', border: '1px dashed rgba(200,16,46,.3)', borderRadius: 7, color: 'var(--primary)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer' }}>+ Série</button>
            {setCount > 1 && (
              <button onClick={() => removeLastSet(itemId, setCount)} style={{ padding: '5px 10px', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--muted)', fontSize: '.7rem', cursor: 'pointer' }}>−</button>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── List screen ───────────────────────────────────────────────────────────
  if (screen === 'list') return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="font-display" style={{ fontSize: '1.4rem', letterSpacing: '.1em' }}>Programmes</div>
        <button onClick={() => setShowCreate(true)} style={{ fontSize: '.65rem', color: 'var(--primary)', background: 'none', border: '1px solid rgba(200,16,46,.3)', fontWeight: 700, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em' }}>+ Nouveau</button>
      </div>

      {/* Free session CTA */}
      <div style={{ margin: '0 12px 12px' }}>
        <button
          onClick={() => { setQuickItems([]); setActiveSession({}); setSessionSetCounts({}); setFreeSessionName('Séance libre'); setScreen('free'); }}
          style={{ width: '100%', padding: '13px 16px', background: 'var(--s1)', border: '1px solid rgba(200,16,46,.25)', borderLeft: '3px solid var(--primary)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: 'var(--text)', textAlign: 'left' }}
        >
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '.88rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--primary)' }}>Séance libre</div>
            <div style={{ fontSize: '.66rem', color: 'var(--muted)', marginTop: 2 }}>Lance une séance sans programme défini</div>
          </div>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '4px 12px 12px', overflowX: 'auto' }}>
        {(Object.entries(CATEGORY_META) as [ProgramCategory, typeof CATEGORY_META[ProgramCategory]][]).map(([cat, meta]) => (
          <div key={cat} style={{ flexShrink: 0, padding: '5px 11px', background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: '.65rem', fontWeight: 700, color: categoryCounts[cat] > 0 ? meta.color : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {meta.icon} {meta.label} {categoryCounts[cat] > 0 && `(${categoryCounts[cat]})`}
          </div>
        ))}
      </div>

      {programs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Aucun programme</div>
          <div style={{ fontSize: '.8rem' }}>Crée ton premier programme</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
          {programs.map((program) => (
            <div key={program.id} className="card" style={{ cursor: 'pointer' }} onClick={() => { setSelectedProgram(program); setScreen('detail'); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${program.color}20`, border: `1px solid ${program.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{program.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.03em', fontSize: '.9rem' }}>{program.name}</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>{CATEGORY_META[program.category].label} · {program.blocks.reduce((n, b) => n + b.items.length, 0)} exercices</div>
                </div>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: program.color, flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.7rem', marginBottom: 14 }}>Nouveau programme</div>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Icône</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {ICONS.map((ic) => (<button key={ic} onClick={() => setNewIcon(ic)} style={{ fontSize: '1.4rem', padding: 6, borderRadius: 10, border: newIcon === ic ? `2px solid var(--primary)` : '2px solid transparent', background: newIcon === ic ? 'rgba(200,16,46,.1)' : 'none', cursor: 'pointer' }}>{ic}</button>))}
            </div>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Catégorie</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {(Object.entries(CATEGORY_META) as [ProgramCategory, typeof CATEGORY_META[ProgramCategory]][]).map(([cat, meta]) => (
                <button key={cat} onClick={() => setNewCategory(cat)} style={{ padding: '5px 11px', borderRadius: 8, border: newCategory === cat ? `1.5px solid ${meta.color}` : '1px solid var(--border)', background: newCategory === cat ? `${meta.color}15` : 'var(--s2)', color: newCategory === cat ? meta.color : 'var(--muted2)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em' }}>{meta.icon} {meta.label}</button>
              ))}
            </div>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Couleur</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {PALETTE.map((c) => (<div key={c} onClick={() => setNewColor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: newColor === c ? '3px solid white' : '2px solid transparent' }} />))}
            </div>
            <input className="field" placeholder="Nom du programme..." value={newName} onChange={(e) => setNewName(e.target.value)} style={{ marginBottom: 10 }} autoFocus />
            <button className="btn-primary" onClick={createProgram}>Créer</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowCreate(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Detail screen ─────────────────────────────────────────────────────────
  const prog = selectedProgram!;
  if (screen === 'detail') return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setScreen('list')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem' }}>←</button>
        <div style={{ flex: 1 }}>
          <div className="font-display" style={{ fontSize: '1.5rem', lineHeight: 1, letterSpacing: '.08em' }}>{prog.icon} {prog.name}</div>
          <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{CATEGORY_META[prog.category].label}</div>
        </div>
        <button onClick={() => startSession(prog)} style={{ padding: '8px 16px', background: prog.color, color: prog.color === '#C8102E' ? '#fff' : '#09090b', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '.8rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em' }}>▶ Démarrer</button>
      </div>

      {prog.blocks.map((block) => (
        <div key={block.id} className="card" style={{ margin: '0 12px 8px' }}>
          <div style={{ padding: '11px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: '.8rem', color: prog.color, textTransform: 'uppercase', letterSpacing: '.06em' }}>{block.title}</div>
            <button onClick={() => setShowAddItem(block.id)} style={{ fontSize: '.62rem', color: 'var(--teal)', background: 'none', border: '1px solid rgba(63,255,192,.3)', fontWeight: 700, padding: '3px 8px', borderRadius: 7, cursor: 'pointer', textTransform: 'uppercase' }}>+ Item</button>
          </div>
          {block.items.map((item) => (
            <div key={item.id} style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{item.name}</div>
              {item.description && <div style={{ fontSize: '.7rem', color: 'var(--muted2)', marginTop: 2 }}>{item.description}</div>}
              <div style={{ marginTop: 4 }}>
                <span className="pill pill-dim" style={{ textTransform: 'uppercase', letterSpacing: '.04em', fontSize: '.55rem' }}>
                  {item.trackingType === 'sets' ? `${item.defaultSets ?? 3} séries` : item.trackingType === 'duration' ? 'durée' : item.trackingType === 'checkbox' ? 'checkbox' : 'texte'}
                </span>
              </div>
            </div>
          ))}
          {block.items.length === 0 && <div style={{ padding: '8px 14px 12px', fontSize: '.78rem', color: 'var(--muted)' }}>Aucun exercice</div>}
        </div>
      ))}

      <div style={{ padding: '0 12px' }}>
        <button onClick={() => setShowAddBlock(true)} style={{ width: '100%', padding: '12px', background: 'var(--s1)', border: '1px dashed var(--border2)', borderRadius: 10, color: 'var(--muted2)', fontSize: '.82rem', cursor: 'pointer' }}>+ Ajouter un bloc</button>
      </div>
      <div style={{ padding: '10px 12px 0' }}>
        <button className="btn-danger" onClick={() => { deleteProgram(prog.id); setScreen('list'); }}>Supprimer le programme</button>
      </div>

      {showAddBlock && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddBlock(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.7rem', marginBottom: 12 }}>Nouveau bloc</div>
            <input className="field" placeholder="Ex: Échauffement, Exercices principaux..." value={blockTitle} onChange={(e) => setBlockTitle(e.target.value)} autoFocus style={{ marginBottom: 10 }} />
            <button className="btn-primary" onClick={() => addBlock(prog)}>Créer</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowAddBlock(false)}>Annuler</button>
          </div>
        </div>
      )}

      {showAddItem && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddItem(null); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.7rem', marginBottom: 12 }}>Nouvel exercice</div>
            <input className="field" placeholder="Nom..." value={itemName} onChange={(e) => setItemName(e.target.value)} autoFocus style={{ marginBottom: 8 }} />
            <input className="field" placeholder="Description (optionnel)..." value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Type de suivi</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              {([['sets', '🏋️ Séries (kg / reps / RPE)'], ['duration', '⏱ Durée (min)'], ['checkbox', '✓ Fait / pas fait'], ['text', '📝 Note libre']] as [TrackingType, string][]).map(([type, label]) => (
                <button key={type} onClick={() => setItemTracking(type)} style={{ padding: '10px 14px', borderRadius: 9, border: itemTracking === type ? '2px solid var(--primary)' : '1px solid var(--border)', background: itemTracking === type ? 'rgba(200,16,46,.06)' : 'var(--s2)', color: 'var(--text)', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>{label}</button>
              ))}
            </div>
            {itemTracking === 'sets' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: '.82rem', color: 'var(--muted2)' }}>Séries par défaut</span>
                <input className="field" type="number" value={itemSets} onChange={(e) => setItemSets(parseInt(e.target.value) || 3)} style={{ width: 80, textAlign: 'center' }} />
              </div>
            )}
            <button className="btn-primary" onClick={() => addItem(prog, showAddItem)}>Ajouter</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowAddItem(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Free session screen ───────────────────────────────────────────────────
  if (screen === 'free') return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setScreen('list')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem' }}>←</button>
        <input
          className="field"
          value={freeSessionName}
          onChange={e => setFreeSessionName(e.target.value)}
          style={{ flex: 1, fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 0 }}
        />
        <button
          onClick={() => {
            if (quickItems.length === 0) { setScreen('list'); return; }
            buildAndOpenPublish(null, true);
          }}
          style={{ padding: '8px 16px', background: 'var(--green)', color: '#fff', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '.8rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0 }}
        >✓ Terminer</button>
      </div>

      {quickItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>💪</div>
          <div style={{ fontSize: '.88rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Ajoute ton premier exercice</div>
        </div>
      )}

      {quickItems.map((qi) => (
        <div key={qi.id} className="card" style={{ margin: '0 12px 8px' }}>
          <div style={{ padding: '11px 14px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem', flex: 1, textTransform: 'uppercase', letterSpacing: '.03em' }}>{qi.name}</div>
            <button onClick={() => setQuickItems(q => q.filter(x => x.id !== qi.id))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '.9rem' }}>×</button>
          </div>
          <div style={{ padding: '6px 14px 10px' }}>
            <SetGrid itemId={qi.id} setCount={getQuickSetCount(qi.id)} />
          </div>
        </div>
      ))}

      <div style={{ padding: '4px 12px 8px' }}>
        <button onClick={() => setShowQuickAdd(true)} style={{ width: '100%', padding: '13px', background: 'rgba(200,16,46,.06)', border: '1px dashed rgba(200,16,46,.3)', borderRadius: 10, color: 'var(--primary)', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          + Ajouter un exercice
        </button>
      </div>

      {showQuickAdd && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowQuickAdd(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.6rem', marginBottom: 12 }}>Exercice</div>
            <input className="field" placeholder="Ex: Squat, Développé couché..." value={quickItemName} onChange={(e) => setQuickItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuickItem()} autoFocus style={{ marginBottom: 10 }} />
            <button className="btn-primary" onClick={addQuickItem}>Ajouter</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowQuickAdd(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Session screen ────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setScreen('detail')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem' }}>←</button>
        <div style={{ flex: 1 }}>
          <div className="font-display" style={{ fontSize: '1.3rem', letterSpacing: '.08em' }}>{prog.icon} {prog.name}</div>
          <div style={{ fontSize: '.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <button onClick={() => finishSession(prog)} style={{ padding: '8px 16px', background: 'var(--green)', color: '#fff', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '.8rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em' }}>✓ Terminer</button>
      </div>

      {prog.blocks.map((block) => (
        <div key={block.id} className="card" style={{ margin: '0 12px 8px' }}>
          <div style={{ padding: '11px 14px 4px' }}>
            <div style={{ fontWeight: 700, fontSize: '.8rem', color: prog.color, textTransform: 'uppercase', letterSpacing: '.06em' }}>{block.title}</div>
          </div>
          {block.items.map((item) => {
            const log      = activeSession[item.id];
            const setCount = getSetCount(item);
            const stats    = itemStats[item.id];
            return (
              <div key={item.id} style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: item.trackingType === 'sets' ? 6 : 0 }}>
                  {item.trackingType !== 'sets' && (
                    <button className={`check-btn ${log?.done ? 'done' : ''}`} onClick={() => toggleItemDone(item.id)}>{log?.done ? '✓' : ''}</button>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: '.68rem', color: 'var(--muted2)', marginTop: 1 }}>{item.description}</div>}
                  </div>
                </div>
                {item.trackingType === 'sets' && (
                  <SetGrid itemId={item.id} setCount={setCount} lastSets={stats?.lastSets} pr={stats?.pr} />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Quick-add exercises */}
      {quickItems.map((qi) => (
        <div key={qi.id} className="card" style={{ margin: '0 12px 8px', borderLeft: '3px solid var(--primary)' }}>
          <div style={{ padding: '11px 14px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: '.85rem', flex: 1 }}>{qi.name}</div>
            <span style={{ fontSize: '.6rem', color: 'var(--primary)', background: 'rgba(200,16,46,.1)', padding: '2px 7px', borderRadius: 5, fontWeight: 700, textTransform: 'uppercase' }}>Ajouté</span>
          </div>
          <div style={{ padding: '6px 14px 10px' }}>
            <SetGrid itemId={qi.id} setCount={getQuickSetCount(qi.id)} />
          </div>
        </div>
      ))}

      {/* Add unplanned exercise button */}
      <div style={{ padding: '4px 12px 8px' }}>
        <button onClick={() => setShowQuickAdd(true)} style={{ width: '100%', padding: '11px', background: 'rgba(200,16,46,.06)', border: '1px dashed rgba(200,16,46,.3)', borderRadius: 10, color: 'var(--primary)', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          + Ajouter un exercice
        </button>
      </div>

      {showQuickAdd && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowQuickAdd(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.6rem', marginBottom: 12 }}>Exercice non prévu</div>
            <input className="field" placeholder="Ex: Curl biceps, Tirage nuque..." value={quickItemName} onChange={(e) => setQuickItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuickItem()} autoFocus style={{ marginBottom: 10 }} />
            <button className="btn-primary" onClick={addQuickItem}>Ajouter</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowQuickAdd(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* ── Publish modal (shared between all session types) ─────────────── */}
      <PublishModal
        log={pendingLog}
        note={finishNote} onNoteChange={setFinishNote}
        isPublic={finishPublic} onPublicChange={setFinishPublic}
        excluded={excludedItems} onExcludedChange={setExcludedItems}
        onCancel={() => setPendingLog(null)}
        onSave={async () => {
          if (!pendingLog) return;
          const finalBlocks = pendingLog.blocks.map(b => ({
            ...b,
            items: b.items.map(item => ({ ...item, isPublic: !excludedItems.has(item.itemId) })),
          }));
          const finalLog = { ...pendingLog, blocks: finalBlocks, note: finishNote || undefined, isPublic: finishPublic };
          addLog(finalLog);
          if (finishPublic && user) {
            const authorName = appData?.social?.displayName ?? user.displayName ?? 'Anonyme';
            publishFeedPost({
              authorUid: user.uid,
              authorName,
              type: 'session',
              log: finalLog,
              likes: [],
              commentCount: 0,
              createdAt: new Date().toISOString(),
            }).then(postId => {
              updateLog(finalLog.id, { feedPostId: postId });
            }).catch(console.error);
          }
          setPendingLog(null);
          setScreen(pendingGoTo);
        }}
      />
    </div>
  );
}
