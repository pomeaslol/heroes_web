'use client';

import { useState, useEffect, useRef } from 'react';
import type { Friend } from '@/models/social';
import type { Conversation, Message, ConvMember } from '@/models/conversation';
import {
  getConversations,
  createDM,
  createGroup,
  getMembers,
  sendMessage,
  subscribeToMessages,
  kickMember,
  leaveConversation,
} from '@/lib/firebase/conversations';

const GROUP_EMOJIS = ['💬', '🏋️', '🥊', '🏃', '🎯', '🧠', '🔥', '⚡', '🏆', '💪', '🧘', '🎮', '🎵', '🎨', '🥗'];

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'maintenant';
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

function convoDisplayName(c: Conversation): string {
  return c.type === 'group' ? `${c.emoji ?? '💬'} ${c.name}` : c.name;
}

export function ChatView({
  myUid,
  myName,
  friends,
  onClose,
}: {
  myUid: string;
  myName: string;
  friends: Friend[];
  onClose: () => void;
}) {
  const [convos,         setConvos]         = useState<Conversation[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedConvo,  setSelectedConvo]  = useState<Conversation | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [members,        setMembers]        = useState<ConvMember[]>([]);
  const [input,          setInput]          = useState('');
  const [sending,        setSending]        = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showNewModal,   setShowNewModal]   = useState(false);
  const [newMode,        setNewMode]        = useState<'dm' | 'group'>('dm');
  const [groupName,      setGroupName]      = useState('');
  const [groupEmoji,     setGroupEmoji]     = useState('💬');
  const [selectedUids,   setSelectedUids]   = useState<Set<string>>(new Set());
  const [creating,       setCreating]       = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const unsubRef   = useRef<(() => void) | null>(null);

  useEffect(() => {
    setLoading(true);
    getConversations(myUid)
      .then(setConvos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [myUid]);

  useEffect(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (!selectedConvo) { setMessages([]); setMembers([]); return; }
    getMembers(selectedConvo.id).then(setMembers).catch(console.error);
    unsubRef.current = subscribeToMessages(selectedConvo.id, msgs => {
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    setTimeout(() => inputRef.current?.focus(), 150);
    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, [selectedConvo?.id]);

  async function handleSend() {
    if (!input.trim() || !selectedConvo || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await sendMessage(selectedConvo.id, {
        authorUid: myUid,
        authorName: myName,
        text,
        sentAt: new Date().toISOString(),
      });
      const now = new Date().toISOString();
      setConvos(prev => prev.map(c =>
        c.id === selectedConvo.id ? { ...c, lastMessage: text.slice(0, 80), lastMessageAt: now } : c
      ));
    } catch (e) { console.error(e); }
    setSending(false);
  }

  async function handleStartDM(friend: Friend) {
    setCreating(true);
    try {
      const convo = await createDM(myUid, myName, friend.uid, friend.displayName);
      setConvos(prev => prev.find(c => c.id === convo.id) ? prev : [convo, ...prev]);
      setSelectedConvo(convo);
      setShowNewModal(false);
    } catch (e) { console.error(e); }
    setCreating(false);
  }

  async function handleCreateGroup() {
    if (!groupName.trim() || selectedUids.size === 0 || creating) return;
    setCreating(true);
    try {
      const memberList = friends
        .filter(f => selectedUids.has(f.uid))
        .map(f => ({ uid: f.uid, displayName: f.displayName }));
      const convo = await createGroup(groupName.trim(), groupEmoji, myUid, myName, memberList);
      setConvos(prev => [convo, ...prev]);
      setSelectedConvo(convo);
      setShowNewModal(false);
      setGroupName(''); setSelectedUids(new Set());
    } catch (e) { console.error(e); }
    setCreating(false);
  }

  async function handleKick(uid: string) {
    if (!selectedConvo) return;
    try {
      await kickMember(selectedConvo.id, uid);
      setMembers(prev => prev.filter(m => m.uid !== uid));
      setSelectedConvo(c => c ? { ...c, memberCount: c.memberCount - 1, memberUids: c.memberUids.filter(u => u !== uid) } : c);
    } catch (e) { console.error(e); }
  }

  async function handleLeave() {
    if (!selectedConvo) return;
    try {
      await leaveConversation(selectedConvo.id, myUid);
      setConvos(prev => prev.filter(c => c.id !== selectedConvo.id));
      setSelectedConvo(null);
      setShowSettings(false);
    } catch (e) { console.error(e); }
  }

  function openNewModal(mode: 'dm' | 'group') {
    setNewMode(mode); setSelectedUids(new Set());
    setGroupName(''); setGroupEmoji('💬');
    setShowNewModal(true);
  }

  const myRole = members.find(m => m.uid === myUid)?.role;

  // ── Conversation list ────────────────────────────────────────────────────────
  if (!selectedConvo) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>←</button>
          <div className="font-display" style={{ flex: 1, fontSize: '1.3rem', letterSpacing: '.08em' }}>Messages</div>
          <button
            onClick={() => openNewModal('group')}
            style={{ padding: '6px 11px', borderRadius: 9, background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700 }}
          >👥 Groupe</button>
          <button
            onClick={() => openNewModal('dm')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >✏️</button>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '.82rem' }}>Chargement...</div>
          )}
          {!loading && convos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 10 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Aucun message</div>
              <div style={{ fontSize: '.78rem', marginBottom: 20 }}>Commence une conv avec un ami</div>
              <button onClick={() => openNewModal('dm')} className="btn-primary" style={{ display: 'inline-flex', gap: 6 }}>✏️ Nouveau message</button>
            </div>
          )}
          {convos.map(c => (
            <button key={c.id} onClick={() => { setSelectedConvo(c); setShowSettings(false); }} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: c.type === 'group' ? 'rgba(200,16,46,.12)' : 'rgba(63,255,192,.08)', border: `1.5px solid ${c.type === 'group' ? 'rgba(200,16,46,.25)' : 'rgba(63,255,192,.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: c.type === 'group' ? '1.4rem' : '1rem', fontWeight: 800, color: c.type === 'group' ? 'var(--primary)' : 'var(--teal)', flexShrink: 0 }}>
                  {c.type === 'group' ? (c.emoji ?? '💬') : c.name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{convoDisplayName(c)}</span>
                    <span style={{ fontSize: '.58rem', color: 'var(--muted)', flexShrink: 0 }}>{timeAgo(c.lastMessageAt ?? c.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: '.73rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {c.lastMessage ?? 'Envoie le premier message…'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* New conversation modal */}
        {showNewModal && (
          <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowNewModal(false); }}>
            <div className="sheet" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
              <div className="sheet-handle" />
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--s1)', borderRadius: 10, padding: 4 }}>
                {(['dm', 'group'] as const).map(m => (
                  <button key={m} onClick={() => { setNewMode(m); setSelectedUids(new Set()); }} style={{ flex: 1, padding: '8px', borderRadius: 7, border: 'none', background: newMode === m ? 'var(--primary)' : 'none', color: newMode === m ? '#fff' : 'var(--muted)', fontWeight: 700, fontSize: '.72rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {m === 'dm' ? '💬 Message privé' : '👥 Groupe'}
                  </button>
                ))}
              </div>

              {newMode === 'group' && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {GROUP_EMOJIS.map(e => (
                      <button key={e} onClick={() => setGroupEmoji(e)} style={{ fontSize: '1.25rem', padding: '5px 6px', borderRadius: 8, border: groupEmoji === e ? '2px solid var(--primary)' : '2px solid transparent', background: groupEmoji === e ? 'rgba(200,16,46,.08)' : 'none', cursor: 'pointer' }}>{e}</button>
                    ))}
                  </div>
                  <input className="field" placeholder="Nom du groupe..." value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus style={{ marginBottom: 12 }} />
                </>
              )}

              <div style={{ fontSize: '.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                {newMode === 'dm' ? 'Sélectionner un ami' : `Ajouter des membres · ${selectedUids.size} sélectionné${selectedUids.size > 1 ? 's' : ''}`}
              </div>

              {friends.length === 0 && (
                <div style={{ padding: '20px 0', fontSize: '.78rem', color: 'var(--muted)', textAlign: 'center' }}>Aucun ami disponible</div>
              )}
              {friends.map(f => {
                const sel = selectedUids.has(f.uid);
                return (
                  <button key={f.uid} onClick={() => {
                    if (newMode === 'dm') { handleStartDM(f); }
                    else { setSelectedUids(prev => { const s = new Set(prev); s.has(f.uid) ? s.delete(f.uid) : s.add(f.uid); return s; }); }
                  }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', background: 'none', border: 'none', cursor: creating ? 'wait' : 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(200,16,46,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.95rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                      {f.displayName[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, fontSize: '.88rem', fontWeight: 600 }}>{f.displayName}</div>
                    {newMode === 'group' && (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${sel ? 'var(--primary)' : 'var(--border)'}`, background: sel ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '.78rem', flexShrink: 0 }}>
                        {sel ? '✓' : ''}
                      </div>
                    )}
                  </button>
                );
              })}

              {newMode === 'group' && (
                <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleCreateGroup} disabled={!groupName.trim() || selectedUids.size === 0 || creating}>
                  {creating ? 'Création...' : `Créer · ${selectedUids.size + 1} membre${selectedUids.size > 0 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Conversation window ──────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={() => { setSelectedConvo(null); setShowSettings(false); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: selectedConvo.type === 'group' ? 'rgba(200,16,46,.12)' : 'rgba(63,255,192,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: selectedConvo.type === 'group' ? '1.2rem' : '.95rem', fontWeight: 800, color: selectedConvo.type === 'group' ? 'var(--primary)' : 'var(--teal)', flexShrink: 0 }}>
          {selectedConvo.type === 'group' ? (selectedConvo.emoji ?? '💬') : selectedConvo.name[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convoDisplayName(selectedConvo)}</div>
          <div style={{ fontSize: '.58rem', color: 'var(--muted)' }}>
            {selectedConvo.type === 'group' ? `${selectedConvo.memberCount} membre${selectedConvo.memberCount > 1 ? 's' : ''}` : 'Message privé'}
          </div>
        </div>
        {selectedConvo.type === 'group' && (
          <button onClick={() => setShowSettings(s => !s)} style={{ padding: '6px 10px', borderRadius: 8, border: showSettings ? '1px solid rgba(200,16,46,.3)' : '1px solid var(--border)', background: showSettings ? 'rgba(200,16,46,.08)' : 'none', color: showSettings ? 'var(--primary)' : 'var(--muted)', cursor: 'pointer', fontSize: '.78rem', fontWeight: 700, flexShrink: 0 }}>
            ⚙️ Membres
          </button>
        )}
      </div>

      {/* Group settings panel (slide-in from top) */}
      {showSettings && selectedConvo.type === 'group' && (
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--s1)', maxHeight: '42vh', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '10px 16px 4px', fontSize: '.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Membres · {members.length}</div>
          {members.map(m => (
            <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--s2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.82rem', fontWeight: 700, color: 'var(--muted2)', flexShrink: 0 }}>
                {m.displayName[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.84rem', fontWeight: 600 }}>{m.displayName}{m.uid === myUid ? ' (moi)' : ''}</div>
                {m.role === 'admin' && <div style={{ fontSize: '.58rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Admin</div>}
              </div>
              {myRole === 'admin' && m.uid !== myUid && (
                <button onClick={() => handleKick(m.uid)} style={{ padding: '4px 10px', background: 'rgba(200,16,46,.08)', color: 'var(--primary)', border: '1px solid rgba(200,16,46,.25)', borderRadius: 7, fontSize: '.65rem', fontWeight: 700, cursor: 'pointer' }}>
                  Virer
                </button>
              )}
            </div>
          ))}
          <div style={{ padding: '10px 16px 12px' }}>
            <button onClick={handleLeave} style={{ fontSize: '.78rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              Quitter le groupe
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)', fontSize: '.78rem', padding: '32px 0' }}>
            Envoie le premier message 👋
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.authorUid === myUid;
          const prevSameAuthor = i > 0 && messages[i - 1].authorUid === msg.authorUid;
          const nextSameAuthor = i < messages.length - 1 && messages[i + 1].authorUid === msg.authorUid;
          const showName = !isMe && selectedConvo.type === 'group' && !prevSameAuthor;
          const showTime = !nextSameAuthor;

          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginTop: prevSameAuthor ? 2 : 10 }}>
              {showName && (
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: 3, paddingLeft: 4 }}>{msg.authorName}</div>
              )}
              <div style={{
                maxWidth: '78%', padding: '10px 14px',
                borderRadius: isMe
                  ? `16px 16px ${nextSameAuthor ? '16px' : '4px'} 16px`
                  : `16px 16px 16px ${nextSameAuthor ? '16px' : '4px'}`,
                background: isMe ? 'var(--primary)' : 'var(--s2)',
                color: isMe ? '#fff' : 'var(--text)',
                fontSize: '.88rem', lineHeight: 1.5, wordBreak: 'break-word',
              }}>
                {msg.text}
              </div>
              {showTime && (
                <div style={{ fontSize: '.55rem', color: 'rgba(255,255,255,.3)', marginTop: 3, paddingRight: isMe ? 2 : 0, paddingLeft: isMe ? 0 : 2 }}>
                  {new Date(msg.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--bg)', flexShrink: 0 }}>
        <input
          ref={inputRef}
          className="field"
          placeholder="Message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          style={{ flex: 1, fontSize: '.9rem', padding: '11px 16px', marginBottom: 0, borderRadius: 24 }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{ width: 44, height: 44, borderRadius: '50%', background: input.trim() ? 'var(--primary)' : 'var(--s2)', color: input.trim() ? '#fff' : 'var(--muted)', border: 'none', cursor: input.trim() ? 'pointer' : 'default', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s', alignSelf: 'center' }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
