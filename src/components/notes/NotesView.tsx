'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { Note } from '@/models/note';

export function NotesView() {
  const appData = useAppStore((s) => s.appData);
  const addNote = useAppStore((s) => s.addNote);
  const deleteNote = useAppStore((s) => s.deleteNote);

  const domains = appData?.domains ?? [];
  const notes = appData?.notes ?? [];

  const [filter, setFilter] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const filtered = filter === 'all' ? notes : notes.filter((n) => n.domainId === filter);
  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function saveNote() {
    if (!newTitle.trim() && !newBody.trim()) return;
    addNote({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      domainId: newDomain || (domains[0]?.id ?? 'general'),
      title: newTitle.trim() || '(sans titre)',
      body: newBody.trim(),
      createdAt: new Date().toISOString(),
    });
    setNewTitle(''); setNewBody(''); setShowAdd(false);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  const getDomain = (id: string) => domains.find((d) => d.id === id);

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="font-display" style={{ fontSize: '1.4rem' }}>Carnet</div>
        <button onClick={() => { setNewDomain(domains[0]?.id ?? ''); setShowAdd(true); }} style={{ fontSize: '.68rem', color: 'var(--green)', background: 'none', border: '1px solid rgba(212,245,60,.3)', fontWeight: 700, padding: '5px 10px', borderRadius: 20, cursor: 'pointer' }}>
          + Note
        </button>
      </div>

      {/* Domain filter */}
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px', overflowX: 'auto' }}>
        <button onClick={() => setFilter('all')} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: filter === 'all' ? '1.5px solid var(--green)' : '1px solid var(--border)', background: filter === 'all' ? 'rgba(212,245,60,.1)' : 'var(--s1)', color: filter === 'all' ? 'var(--green)' : 'var(--muted)', fontSize: '.7rem', fontWeight: 600, cursor: 'pointer' }}>
          Toutes
        </button>
        {domains.map((d) => (
          <button key={d.id} onClick={() => setFilter(d.id)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: filter === d.id ? '1.5px solid var(--teal)' : '1px solid var(--border)', background: filter === d.id ? 'rgba(63,255,192,.1)' : 'var(--s1)', color: filter === d.id ? 'var(--teal)' : 'var(--muted)', fontSize: '.7rem', fontWeight: 600, cursor: 'pointer' }}>
            {d.emoji} {d.name}
          </button>
        ))}
      </div>

      {/* Notes list */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>Aucune note</div>
          <div style={{ fontSize: '.8rem' }}>Commence à écrire tes pensées et observations</div>
        </div>
      ) : (
        <div className="card" style={{ margin: '0 12px' }}>
          {sorted.map((note, i) => {
            const domain = getDomain(note.domainId);
            return (
              <div key={note.id} onClick={() => setSelectedNote(note)} style={{ padding: '12px 14px', borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', cursor: 'pointer' }}>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 3 }}>{formatDate(note.createdAt)}</div>
                {domain && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(63,255,192,.1)', color: 'var(--teal)', marginBottom: 4 }}>
                    {domain.emoji} {domain.name}
                  </div>
                )}
                <div style={{ fontSize: '.86rem', fontWeight: 600, marginBottom: 3 }}>{note.title}</div>
                <div style={{ fontSize: '.76rem', color: 'var(--muted2)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {note.body}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sheet: Add note */}
      {showAdd && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="font-display" style={{ fontSize: '1.7rem', marginBottom: 12 }}>Nouvelle note</div>
            {domains.length > 0 && (
              <select className="field" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} style={{ marginBottom: 8 }}>
                {domains.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.name}</option>)}
              </select>
            )}
            <input className="field" placeholder="Titre..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus style={{ marginBottom: 8 }} />
            <textarea className="field" placeholder="Contenu..." value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={5} style={{ resize: 'vertical', lineHeight: 1.5, marginBottom: 10 }} />
            <button className="btn-primary" onClick={saveNote}>Sauvegarder</button>
            <button className="btn-secondary" style={{ marginTop: 6 }} onClick={() => setShowAdd(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Sheet: Note detail */}
      {selectedNote && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedNote(null); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div style={{ fontSize: '.6rem', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>{formatDate(selectedNote.createdAt)}</div>
            {getDomain(selectedNote.domainId) && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(63,255,192,.1)', color: 'var(--teal)', marginBottom: 10 }}>
                {getDomain(selectedNote.domainId)!.emoji} {getDomain(selectedNote.domainId)!.name}
              </div>
            )}
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>{selectedNote.title}</div>
            <div style={{ fontSize: '.82rem', lineHeight: 1.7, color: 'var(--muted2)', whiteSpace: 'pre-wrap', marginBottom: 16 }}>{selectedNote.body}</div>
            <button className="btn-secondary" onClick={() => setSelectedNote(null)}>Fermer</button>
            <button className="btn-danger" style={{ marginTop: 6 }} onClick={() => { deleteNote(selectedNote.id); setSelectedNote(null); }}>Supprimer</button>
          </div>
        </div>
      )}
    </div>
  );
}
