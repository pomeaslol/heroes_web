'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { Program, ProgramCategory, ProgramBlock, ProgramItem, TrackingType, CATEGORY_META } from '@/models/program';
import { DayLog, BlockLog, ItemLog, SetLog } from '@/models/day-log';

const PALETTE = ['#d4f53c', '#3fffc0', '#ff8c2a', '#4aaeff', '#a855f7', '#f472b6', '#ff3f5e', '#fbbf24'];
const ICONS = ['💪', '🥗', '🧘', '📚', '🎨', '⚡', '🏃', '🏋️', '🥊', '🧠', '✍️', '🎵', '🏊', '🚴', '🧗', '⚽'];

type Screen = 'list' | 'detail' | 'session';

export function ProgramsView() {
  const programs = useAppStore((s) => s.appData?.programs ?? []);
  const addProgram = useAppStore((s) => s.addProgram);
  const updateProgram = useAppStore((s) => s.updateProgram);
  const deleteProgram = useAppStore((s) => s.deleteProgram);
  const addLog = useAppStore((s) => s.addLog);

  const [screen, setScreen] = useState<Screen>('list');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddItem, setShowAddItem] = useState<string | null>(null); // blockId
  const [activeSession, setActiveSession] = useState<Record<string, ItemLog>>({});

  // Create program state
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💪');
  const [newCategory, setNewCategory] = useState<ProgramCategory>('sport');
  const [newColor, setNewColor] = useState(PALETTE[0]);

  // Add block state
  const [blockTitle, setBlockTitle] = useState('');

  // Add item state
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemTracking, setItemTracking] = useState<TrackingType>('checkbox');
  const [itemSets, setItemSets] = useState(3);

  const categoryCounts = Object.keys(CATEGORY_META).reduce((acc, cat) => {
    acc[cat as ProgramCategory] = programs.filter((p) => p.category === cat).length;
    return acc;
  }, {} as Record<ProgramCategory, number>);

  function createProgram() {
    if (!newName.trim()) return;
    addProgram({
      id: crypto.randomUUID(),
      name: newName.trim(),
      icon: newIcon,
      category: newCategory,
      color: newColor,
      blocks: [],
      createdAt: new Date().toISOString(),
    });
    setNewName(''); setShowCreate(false);
  }

  function addBlock(program: Program) {
    if (!blockTitle.trim()) return;
    const block: ProgramBlock = { id: crypto.randomUUID(), title: blockTitle.trim(), items: [] };
    updateProgram({ ...program, blocks: [...program.blocks, block] });
    setBlockTitle(''); setShowAddBlock(false);
    setSelectedProgram({ ...program, blocks: [...program.blocks, block] });
  }

  function addItem(program: Program, blockId: string) {
    if (!itemName.trim()) return;
    const item: ProgramItem = {
      id: crypto.randomUUID(),
      name: itemName.trim(),
      description: itemDesc.trim() || undefined,
      trackingType: itemTracking,
      defaultSets: itemTracking === 'sets' ? itemSets : undefined,
    };
    const updated = { ...program, blocks: program.blocks.map((b) => b.id === blockId ? { ...b, items: [...b.items, item] } : b) };
    updateProgram(updated);
    setSelectedProgram(updated);
    setItemName(''); setItemDesc(''); setShowAddItem(null);
  }

  function startSession(program: Program) {
    setSelectedProgram(program);
    setActiveSession({});
    setScreen('session');
  }

  function finishSession(program: Program) {
    const blocks: BlockLog[] = program.blocks.map((b) => ({
      blockId: b.id,
      items: b.items.map((item) => activeSession[item.id] ?? { itemId: item.id, done: false }),
    }));
    const log: DayLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      programId: program.id,
      programName: program.name,
      programIcon: program.icon,
      programColor: program.color,
      blocks,
      completedAt: new Date().toISOString(),
    };
    addLog(log);
    setScreen('detail');
  }

  function toggleItemDone(itemId: string) {
    setActiveSession((s) => ({
      ...s,
      [itemId]: { ...(s[itemId] ?? { itemId }), itemId, done: !(s[itemId]?.done ?? false) },
    }));
  }

  function updateSetLog(itemId: string, setIdx: number, field: keyof SetLog, value: number | boolean) {
    setActiveSession((s) => {
      const prev = s[itemId] ?? { itemId, done: false, sets: [] };
      const sets = [...(prev.sets ?? [])];
      while (sets.length <= setIdx) sets.push({ done: false });
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      return { ...s, [itemId]: { ...prev, sets, done: sets.some((st) => st.done) } };
    });
  }

  // ── List screen ──
  if (screen === 'list') return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="font-display" style={{ fontSize: '1.4rem' }}>Programmes</div>
        <button onClick={() => setShowCreate(true)} style={{ fontSize: '.68rem', color: 'var(--green)', background: 'none', border: '1px solid rgba(212,245,60,.3)', fontWeight: 700, padding: '5px 10px', borderRadius: 20, cursor: 'pointer' }}>
          + Nouveau
        </button>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 12px 12px', overflowX: 'auto' }}>
        {(Object.entries(CATEGORY_META) as [ProgramCategory, typeof CATEGORY_META[ProgramCategory]][]).map(([cat, meta]) => (
          <div key={cat} style={{ flexShrink: 0, padding: '6px 12px', background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 20, fontSize: '.68rem', fontWeight: 600, color: categoryCounts[cat] > 0 ? meta.color : 'var(--muted)', cursor: 'pointer' }}>
            {meta.icon} {meta.label} {categoryCounts[cat] > 0 && <span style={{ opacity: .7 }}>({categoryCounts[cat]})</span>}
          </div>
        ))}
      </div>

      {programs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>Aucun programme</div>
          <div style={{ fontSize: '.8rem' }}>Crée ton premier programme — sport, nutrition, lecture...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
          {programs.map((program) => (
            <div key={program.id} className="card" style={{ cursor: 'pointer' }} onClick={() => { setSelectedProgram(program); setScreen('detail'); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${program.color}20`, border: `1px solid ${program.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                  {program.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{program.name}</div>
                  <div style={{ fontSize: '.67rem', color: 'var(--muted)' }}>
                    {CATEGORY_META[program.category].label} · {program.blocks.reduce((n, b) => n + b.items.length, 0)} items
                  </div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: program.color, flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sheet: Create Program */}
      {showCreate && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.7rem', marginBottom: 14 }}>Nouveau programme</div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6 }}>Icône</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {ICONS.map((ic) => (
                <button key={ic} onClick={() => setNewIcon(ic)} style={{ fontSize: '1.4rem', padding: 6, borderRadius: 10, border: newIcon === ic ? `2px solid var(--green)` : '2px solid transparent', background: newIcon === ic ? 'rgba(212,245,60,.1)' : 'none', cursor: 'pointer' }}>{ic}</button>
              ))}
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6 }}>Catégorie</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {(Object.entries(CATEGORY_META) as [ProgramCategory, typeof CATEGORY_META[ProgramCategory]][]).map(([cat, meta]) => (
                <button key={cat} onClick={() => setNewCategory(cat)} style={{ padding: '6px 12px', borderRadius: 20, border: newCategory === cat ? `1.5px solid ${meta.color}` : '1px solid var(--border)', background: newCategory === cat ? `${meta.color}15` : 'var(--s2)', color: newCategory === cat ? meta.color : 'var(--muted2)', fontSize: '.72rem', fontWeight: 600, cursor: 'pointer' }}>
                  {meta.icon} {meta.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6 }}>Couleur</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {PALETTE.map((c) => (
                <div key={c} onClick={() => setNewColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: newColor === c ? '3px solid white' : '2px solid transparent' }} />
              ))}
            </div>
            <input className="field" placeholder="Nom du programme..." value={newName} onChange={(e) => setNewName(e.target.value)} style={{ marginBottom: 10 }} autoFocus />
            <button className="btn-primary" onClick={createProgram}>Créer</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowCreate(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Detail screen ──
  const prog = selectedProgram!;
  if (screen === 'detail') return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setScreen('list')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem' }}>←</button>
        <div style={{ flex: 1 }}>
          <div className="font-display" style={{ fontSize: '1.6rem', lineHeight: 1 }}>{prog.icon} {prog.name}</div>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2 }}>{CATEGORY_META[prog.category].label}</div>
        </div>
        <button onClick={() => startSession(prog)} style={{ padding: '8px 16px', background: prog.color, color: '#09090b', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer' }}>
          ▶ Démarrer
        </button>
      </div>

      {prog.blocks.map((block) => (
        <div key={block.id} className="card" style={{ margin: '0 12px 9px' }}>
          <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem', color: prog.color }}>{block.title}</div>
            <button onClick={() => setShowAddItem(block.id)} style={{ fontSize: '.65rem', color: 'var(--teal)', background: 'none', border: '1px solid rgba(63,255,192,.3)', fontWeight: 700, padding: '3px 8px', borderRadius: 20, cursor: 'pointer' }}>+ Item</button>
          </div>
          {block.items.map((item) => (
            <div key={item.id} style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{item.name}</div>
                {item.description && <div style={{ fontSize: '.72rem', color: 'var(--muted2)', marginTop: 2, lineHeight: 1.4 }}>{item.description}</div>}
                <div style={{ marginTop: 4 }}>
                  <span className="pill pill-dim" style={{ textTransform: 'capitalize' }}>
                    {item.trackingType === 'sets' ? `${item.defaultSets ?? 3} séries` : item.trackingType === 'duration' ? `durée` : item.trackingType === 'checkbox' ? 'checkbox' : 'texte'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {block.items.length === 0 && (
            <div style={{ padding: '8px 14px 12px', fontSize: '.78rem', color: 'var(--muted)' }}>Aucun item — ajoute le premier</div>
          )}
        </div>
      ))}

      <div style={{ padding: '0 12px' }}>
        <button onClick={() => setShowAddBlock(true)} style={{ width: '100%', padding: '12px', background: 'var(--s1)', border: '1px dashed var(--border2)', borderRadius: 14, color: 'var(--muted2)', fontSize: '.85rem', cursor: 'pointer' }}>
          + Ajouter un bloc
        </button>
      </div>

      <div style={{ padding: '12px 12px 0' }}>
        <button className="btn-danger" onClick={() => { deleteProgram(prog.id); setScreen('list'); }}>Supprimer le programme</button>
      </div>

      {/* Sheet: Add block */}
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

      {/* Sheet: Add item */}
      {showAddItem && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddItem(null); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.7rem', marginBottom: 12 }}>Nouvel item</div>
            <input className="field" placeholder="Nom..." value={itemName} onChange={(e) => setItemName(e.target.value)} autoFocus style={{ marginBottom: 8 }} />
            <input className="field" placeholder="Description (optionnel)..." value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6 }}>Type de suivi</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              {([['sets', '🏋️ Séries (kg / reps / RPE)'], ['duration', '⏱ Durée (minutes)'], ['checkbox', '✓ Checkbox (fait / pas fait)'], ['text', '📝 Note libre']] as [TrackingType, string][]).map(([type, label]) => (
                <button key={type} onClick={() => setItemTracking(type)} style={{ padding: '10px 14px', borderRadius: 12, border: itemTracking === type ? '2px solid var(--green)' : '1px solid var(--border)', background: itemTracking === type ? 'rgba(212,245,60,.06)' : 'var(--s2)', color: 'var(--text)', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                  {label}
                </button>
              ))}
            </div>
            {itemTracking === 'sets' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: '.82rem', color: 'var(--muted2)' }}>Nombre de séries</span>
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

  // ── Session screen ──
  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setScreen('detail')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem' }}>←</button>
        <div style={{ flex: 1 }}>
          <div className="font-display" style={{ fontSize: '1.4rem' }}>{prog.icon} {prog.name}</div>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>Séance en cours — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <button onClick={() => finishSession(prog)} style={{ padding: '8px 16px', background: 'var(--green)', color: '#09090b', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer' }}>
          ✓ Terminer
        </button>
      </div>

      {prog.blocks.map((block) => (
        <div key={block.id} className="card" style={{ margin: '0 12px 9px' }}>
          <div style={{ padding: '12px 14px 4px' }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem', color: prog.color }}>{block.title}</div>
          </div>
          {block.items.map((item) => {
            const log = activeSession[item.id];
            return (
              <div key={item.id} style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: item.trackingType === 'sets' ? 8 : 0 }}>
                  {item.trackingType !== 'sets' && (
                    <button className={`check-btn ${log?.done ? 'done' : ''}`} onClick={() => toggleItemDone(item.id)}>{log?.done ? '✓' : ''}</button>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: '.7rem', color: 'var(--muted2)', marginTop: 1 }}>{item.description}</div>}
                  </div>
                </div>
                {item.trackingType === 'sets' && (
                  <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 1fr 1fr 32px', gap: 5, marginBottom: 4 }}>
                      {['', 'KG', 'REPS', 'RPE', ''].map((h, i) => (
                        <div key={i} style={{ fontSize: '.55rem', color: 'var(--muted)', textAlign: 'center', letterSpacing: '.05em', textTransform: 'uppercase' }}>{h}</div>
                      ))}
                    </div>
                    {Array.from({ length: item.defaultSets ?? 3 }).map((_, si) => {
                      const setLog = log?.sets?.[si] ?? {};
                      return (
                        <div key={si} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 1fr 1fr 32px', gap: 5, alignItems: 'center', marginBottom: 4 }}>
                          <div className="font-display" style={{ fontSize: '1rem', color: 'var(--muted)', textAlign: 'right' }}>{si + 1}</div>
                          {(['w', 'r', 'rpe'] as const).map((field) => (
                            <input key={field} className="field" type="number" inputMode="decimal" placeholder="—" defaultValue={(setLog as SetLog)[field]?.toString() ?? ''} onBlur={(e) => updateSetLog(item.id, si, field, parseFloat(e.target.value))} style={{ textAlign: 'center', padding: '6px 3px', fontSize: '.82rem' }} />
                          ))}
                          <button className={`check-btn ${setLog.done ? 'done' : ''}`} onClick={() => updateSetLog(item.id, si, 'done', !(setLog.done ?? false))}>{setLog.done ? '✓' : ''}</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
