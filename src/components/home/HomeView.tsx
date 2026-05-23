'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { searchUsers, getFriends, sendFriendRequest, getPublicProfile } from '@/lib/firebase/social';
import { loadFeedPosts, toggleLike, addComment, loadComments, deleteFeedPost } from '@/lib/firebase/feed';
import type { Friend, PublicProfileDoc } from '@/models/social';
import type { FeedPost, FeedComment } from '@/models/feed';
import { DayLog } from '@/models/day-log';

const MACRO_FILTERS = [
  { id: 'all',        label: 'Tout',        icon: '⚡' },
  { id: 'sport',      label: 'Sport',       icon: '💪' },
  { id: 'nutrition',  label: 'Nutrition',   icon: '🥗' },
  { id: 'wellbeing',  label: 'Bien-être',   icon: '🌱' },
  { id: 'philosophy', label: 'Philo',       icon: '🙏' },
  { id: 'creativity', label: 'Créativité',  icon: '🎨' },
];

// ─── Friend Profile (full-screen) ────────────────────────────────────────────
function FriendProfileModal({ friend, onClose }: { friend: Friend; onClose: () => void }) {
  const [profile, setProfile] = useState<PublicProfileDoc | null>(null);
  useEffect(() => {
    getPublicProfile(friend.uid).then(p => setProfile(p)).catch(() => {});
  }, [friend.uid]);

  const domains = profile?.publicDomains ?? friend.publicDomains ?? [];
  const bio      = profile?.bio      ?? (friend as any).bio;
  const location = profile?.location ?? (friend as any).location;
  const streak   = profile?.streak   ?? friend.streak;
  const totalPoints = profile?.totalPoints ?? friend.totalPoints;

  const n = domains.length;
  const showRadar = n >= 3;
  const cx = 140, cy = 130, r = 95;
  const angle = (i: number) => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt = (i: number, ratio: number) => ({
    x: cx + Math.cos(angle(i)) * r * ratio,
    y: cy + Math.sin(angle(i)) * r * ratio,
  });
  const fillPts = domains.map((d, i) => pt(i, Math.max(0.05, Math.min(1, (d.score ?? 0) / 8))));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 1 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>←</button>
        <div style={{ flex: 1, fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{friend.displayName}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(streak ?? 0) > 0 && <span style={{ fontSize: '.72rem', color: '#ff8c2a', fontWeight: 700 }}>🔥 {streak}j</span>}
          {(totalPoints ?? 0) > 0 && <span style={{ fontSize: '.72rem', color: 'var(--teal)', fontWeight: 700 }}>⚡ {totalPoints}</span>}
        </div>
      </div>

      <div style={{ padding: '20px 16px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(200,16,46,.15)', border: '2px solid rgba(200,16,46,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
            {friend.displayName[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-display" style={{ fontSize: '1.6rem', letterSpacing: '.08em', lineHeight: 1.1 }}>{friend.displayName}</div>
            {location && <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 4 }}>📍 {location}</div>}
            {bio && <div style={{ fontSize: '.78rem', color: 'var(--muted2)', marginTop: 6, lineHeight: 1.5 }}>{bio}</div>}
          </div>
        </div>

        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px 0', fontSize: '.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Profil</div>
          {showRadar ? (
            <div style={{ padding: '4px 24px' }}>
              <svg viewBox="0 0 280 260" width="100%" style={{ maxWidth: 340, display: 'block', margin: '0 auto', overflow: 'visible' }}>
                {[0.25, 0.5, 0.75, 1].map((ratio, ri) => (
                  <polygon key={ri} points={domains.map((_, i) => { const p = pt(i, ratio); return `${p.x},${p.y}`; }).join(' ')} fill="none" stroke="var(--border)" strokeWidth="1" />
                ))}
                {domains.map((_, i) => { const p = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1" />; })}
                <polygon points={fillPts.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(200,16,46,.1)" stroke="var(--primary)" strokeWidth="1.5" />
                {fillPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--primary)" stroke="var(--bg)" strokeWidth="1.5" />)}
                {domains.map((d, i) => {
                  const p = pt(i, 1.24);
                  const anchor = p.x < cx - 6 ? 'end' : p.x > cx + 6 ? 'start' : 'middle';
                  return (
                    <g key={i}>
                      <text x={p.x} y={p.y + 3} textAnchor={anchor} fill="var(--text)" fontSize="10" fontFamily="DM Sans" fontWeight="600">{d.emoji} {d.name}</text>
                      <text x={p.x} y={p.y + 14} textAnchor={anchor} fill="var(--primary)" fontSize="8.5" fontFamily="DM Sans" fontWeight="700">Lvl {d.score ?? '—'}</text>
                    </g>
                  );
                })}
              </svg>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', padding: '4px 8px 12px' }}>
                {domains.map((d, i) => (
                  <div key={i} style={{ fontSize: '.62rem', color: 'var(--muted2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {d.emoji} {d.name} <strong style={{ color: 'var(--primary)' }}>Lvl {d.score ?? '—'}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px 16px', fontSize: '.78rem', color: 'var(--muted)', textAlign: 'center' }}>
              {profile === null && domains.length === 0 ? 'Chargement...' : 'Aucun domaine public partagé'}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <div style={{ padding: '12px 16px 0', fontSize: '.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Activités publiques</div>
          <div style={{ padding: '20px 16px', fontSize: '.78rem', color: 'var(--muted)', textAlign: 'center' }}>
            Les séances publiques de {friend.displayName.split(' ')[0]} apparaîtront ici
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Activity detail modal (full-screen) ─────────────────────────────────────
export function ActivityDetailModal({ log, onClose }: { log: DayLog; onClose: () => void }) {
  const doneSets = log.blocks.flatMap(b => b.items).flatMap(i => i.sets ?? []).filter(s => s.done);
  const totalKg  = doneSets.reduce((n, s) => n + (s.w ?? 0) * (s.r ?? 1), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 1, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>←</button>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${log.programColor}20`, border: `1px solid ${log.programColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{log.programIcon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '.88rem', textTransform: 'uppercase', letterSpacing: '.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.programName}</div>
          <div style={{ fontSize: '.6rem', color: 'var(--muted)' }}>
            {new Date(log.completedAt ?? log.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', flex: 1 }}>
        {(doneSets.length > 0 || totalKg > 0) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {doneSets.length > 0 && (
              <div className="card" style={{ flex: 1, padding: '12px 16px', textAlign: 'center' }}>
                <div className="font-display" style={{ fontSize: '1.5rem', color: 'var(--primary)', lineHeight: 1 }}>{doneSets.length}</div>
                <div style={{ fontSize: '.58rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 3 }}>Séries</div>
              </div>
            )}
            {totalKg > 0 && (
              <div className="card" style={{ flex: 1, padding: '12px 16px', textAlign: 'center' }}>
                <div className="font-display" style={{ fontSize: '1.5rem', color: 'var(--primary)', lineHeight: 1 }}>{Math.round(totalKg)}</div>
                <div style={{ fontSize: '.58rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 3 }}>kg total</div>
              </div>
            )}
            <div className="card" style={{ flex: 1, padding: '12px 16px', textAlign: 'center' }}>
              <div className="font-display" style={{ fontSize: '1.5rem', color: 'var(--primary)', lineHeight: 1 }}>{log.blocks.flatMap(b => b.items).filter(i => i.done || i.sets?.some(s => s.done)).length}</div>
              <div style={{ fontSize: '.58rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 3 }}>Exos</div>
            </div>
          </div>
        )}

        {log.note && (
          <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, fontSize: '.84rem', color: 'var(--text)', lineHeight: 1.55, fontStyle: 'italic' }}>
            "{log.note}"
          </div>
        )}

        {log.blocks.map(block => (
          <div key={block.blockId} style={{ marginBottom: 16 }}>
            {block.title && block.title !== 'Exercices' && (
              <div style={{ fontWeight: 700, fontSize: '.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{block.title}</div>
            )}
            {block.items.map(item => (
              <div key={item.itemId} className="card" style={{ marginBottom: 10, opacity: item.isPublic === false ? 0.5 : 1 }}>
                <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, fontWeight: 700, fontSize: '.85rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>{item.name ?? 'Exercice'}</div>
                  {item.isPublic === false && <span style={{ fontSize: '.6rem', color: 'var(--muted)', background: 'var(--s2)', borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>Privé</span>}
                  {item.done && (!item.sets || item.sets.length === 0) && <span style={{ fontSize: '.72rem', color: 'var(--green)', fontWeight: 800 }}>✓</span>}
                </div>
                {item.sets && item.sets.length > 0 && (
                  <div style={{ padding: '0 14px 12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 1fr 1fr 28px', gap: 5, marginBottom: 5 }}>
                      {['', 'KG', 'REPS', 'RPE', ''].map((h, i) => (
                        <div key={i} style={{ fontSize: '.52rem', color: 'var(--muted)', textAlign: 'center', letterSpacing: '.06em' }}>{h}</div>
                      ))}
                    </div>
                    {item.sets.map((s, si) => (
                      <div key={si} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 1fr 1fr 28px', gap: 5, alignItems: 'center', marginBottom: 4, opacity: s.done ? 1 : 0.32 }}>
                        <div style={{ fontSize: '.78rem', color: 'var(--muted)', textAlign: 'right', fontWeight: 700 }}>{si + 1}</div>
                        <div style={{ background: 'var(--s2)', borderRadius: 6, padding: '6px 4px', textAlign: 'center', fontSize: '.82rem', fontWeight: 700 }}>{s.w ?? '—'}</div>
                        <div style={{ background: 'var(--s2)', borderRadius: 6, padding: '6px 4px', textAlign: 'center', fontSize: '.82rem', fontWeight: 700 }}>{s.r ?? '—'}</div>
                        <div style={{ background: 'var(--s2)', borderRadius: 6, padding: '6px 4px', textAlign: 'center', fontSize: '.82rem', color: 'var(--muted)' }}>{s.rpe ?? '—'}</div>
                        <div style={{ textAlign: 'center', fontSize: '.8rem', color: s.done ? 'var(--green)' : 'rgba(255,255,255,.2)' }}>{s.done ? '✓' : '○'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feed post card ───────────────────────────────────────────────────────────
function FeedCard({
  post,
  myUid,
  onLike,
  onOpenDetail,
  onDelete,
  onOpenProfile,
}: {
  post: FeedPost;
  myUid: string;
  onLike: (post: FeedPost) => void;
  onOpenDetail: (log: DayLog) => void;
  onDelete: (postId: string) => void;
  onOpenProfile: (uid: string, name: string) => void;
}) {
  const [showComments, setShowComments]   = useState(false);
  const [comments,     setComments]       = useState<FeedComment[]>([]);
  const [loadingCmts,  setLoadingCmts]    = useState(false);
  const [commentText,  setCommentText]    = useState('');
  const [submitting,   setSubmitting]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const log = post.log;
  const isLiked = post.likes.includes(myUid);
  const likeCount = post.likes.length;

  const doneSets = log?.blocks.flatMap(b => b.items).flatMap(i => i.sets ?? []).filter(s => s.done) ?? [];
  const totalKg  = doneSets.reduce((n, s) => n + (s.w ?? 0) * (s.r ?? 1), 0);
  const publicItems = log?.blocks.flatMap(b => b.items).filter(i => i.name && i.isPublic !== false) ?? [];
  const exoNames = publicItems.filter(i => i.sets && i.sets.length > 0).map(i => i.name!);

  const timeAgo = (() => {
    const diff = Date.now() - new Date(post.createdAt).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'il y a moins d\'1h';
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h / 24)}j`;
  })();

  async function handleToggleComments() {
    if (!showComments && comments.length === 0 && post.commentCount > 0) {
      setLoadingCmts(true);
      try { setComments(await loadComments(post.id)); } catch {}
      setLoadingCmts(false);
    }
    setShowComments(v => !v);
    if (!showComments) setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function handleAddComment() {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const name = post.authorUid === myUid ? post.authorName : post.authorName;
      // We'll need the current user's name — passed via props in the parent
      const c = await addComment(post.id, {
        authorUid: myUid,
        authorName: (window as any).__heroMyName ?? 'Moi',
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
      });
      setComments(prev => [...prev, c]);
      setCommentText('');
    } catch {}
    setSubmitting(false);
  }

  return (
    <div className="card" style={{ margin: '0 12px 10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px' }}>
        <button
          onClick={() => post.authorUid !== myUid && onOpenProfile(post.authorUid, post.authorName)}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(200,16,46,.15)', border: '1.5px solid rgba(200,16,46,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.95rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0, cursor: post.authorUid !== myUid ? 'pointer' : 'default', padding: 0 }}
        >
          {post.authorName[0]?.toUpperCase()}
        </button>
        <button
          onClick={() => post.authorUid !== myUid && onOpenProfile(post.authorUid, post.authorName)}
          style={{ flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: post.authorUid !== myUid ? 'pointer' : 'default' }}
        >
          <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--text)' }}>{post.authorName}</div>
          <div style={{ fontSize: '.6rem', color: 'var(--muted)' }}>{timeAgo}</div>
        </button>
        {log && (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${log.programColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{log.programIcon}</div>
        )}
        {post.type === 'goal' && (
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(251,191,36,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{post.goalEmoji ?? '🏆'}</div>
        )}
        {post.authorUid === myUid && (
          <button
            onClick={() => onDelete(post.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', padding: '3px 5px', color: 'rgba(255,255,255,.2)', flexShrink: 0 }}
          >🗑</button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0 14px 6px' }}>
        {log && (
          <div style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: exoNames.length > 0 ? 4 : 0, cursor: 'pointer' }} onClick={() => onOpenDetail(log)}>
            {log.programName}
          </div>
        )}
        {post.type === 'goal' && post.goalLabel && (
          <>
            <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 2 }}>
              🏆 {post.goalLabel}
              {post.domainName && <span style={{ fontSize: '.7rem', color: 'var(--muted)', fontWeight: 400, marginLeft: 6 }}>· {post.domainName}</span>}
            </div>
            {post.note && (
              <div style={{ fontSize: '.78rem', color: 'var(--muted2)', lineHeight: 1.45, fontStyle: 'italic', marginTop: 2 }}>
                "{post.note}"
              </div>
            )}
          </>
        )}
        {exoNames.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
            {exoNames.slice(0, 4).map((n, i) => (
              <span key={i} style={{ fontSize: '.62rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px', color: 'var(--muted2)', fontWeight: 600 }}>{n}</span>
            ))}
            {exoNames.length > 4 && <span style={{ fontSize: '.62rem', color: 'var(--muted)' }}>+{exoNames.length - 4}</span>}
          </div>
        )}
        {log?.note && (
          <div style={{ fontSize: '.78rem', color: 'var(--muted2)', lineHeight: 1.45, fontStyle: 'italic', marginTop: 2 }}>
            "{log.note.slice(0, 80)}{log.note.length > 80 ? '…' : ''}"
          </div>
        )}
      </div>

      {/* Stats */}
      {(doneSets.length > 0 || totalKg > 0) && (
        <div style={{ display: 'flex', gap: 6, padding: '2px 14px 8px', flexWrap: 'wrap' }}>
          {doneSets.length > 0 && <span className="pill pill-dim">{doneSets.length} séries</span>}
          {totalKg > 0 && <span className="pill pill-dim">{Math.round(totalKg)} kg</span>}
        </div>
      )}

      {/* Actions bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px 8px', borderTop: '1px solid var(--border)' }}>
        {/* Like */}
        <button
          onClick={() => onLike(post)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: 'none', background: isLiked ? 'rgba(200,16,46,.1)' : 'transparent', color: isLiked ? 'var(--primary)' : 'var(--muted)', cursor: 'pointer', fontSize: '.78rem', fontWeight: isLiked ? 700 : 500, transition: 'all .15s' }}
        >
          {isLiked ? '❤️' : '🤍'} {likeCount > 0 && <span>{likeCount}</span>}
        </button>

        {/* Comments */}
        <button
          onClick={handleToggleComments}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: 'none', background: showComments ? 'rgba(63,255,192,.08)' : 'transparent', color: showComments ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer', fontSize: '.78rem', fontWeight: showComments ? 700 : 500, transition: 'all .15s' }}
        >
          💬 {post.commentCount > 0 && <span>{post.commentCount}</span>}
        </button>

        {/* Detail link */}
        {log && (
          <button
            onClick={() => onOpenDetail(log)}
            style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '.7rem' }}
          >
            Détail →
          </button>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px 12px' }}>
          {loadingCmts && <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 8 }}>Chargement...</div>}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--s2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700, color: 'var(--muted2)', flexShrink: 0 }}>
                {c.authorName[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text)', marginRight: 6 }}>{c.authorName}</span>
                <span style={{ fontSize: '.78rem', color: 'var(--muted2)', lineHeight: 1.4 }}>{c.text}</span>
              </div>
            </div>
          ))}
          {comments.length === 0 && !loadingCmts && (
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 8 }}>Sois le premier à commenter</div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              ref={inputRef}
              className="field"
              placeholder="Ajouter un commentaire..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              style={{ flex: 1, fontSize: '.8rem', padding: '7px 10px', marginBottom: 0 }}
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim() || submitting}
              style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: commentText.trim() ? 'var(--primary)' : 'var(--s2)', color: commentText.trim() ? '#fff' : 'var(--muted)', cursor: commentText.trim() ? 'pointer' : 'default', fontSize: '.78rem', fontWeight: 700, flexShrink: 0, transition: 'all .15s' }}
            >
              {submitting ? '...' : '↑'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main HomeView ────────────────────────────────────────────────────────────
export function HomeView() {
  const user        = useAppStore(s => s.user);
  const appData     = useAppStore(s => s.appData);
  const currentView = useAppStore(s => s.currentView);

  const [showSearch,     setShowSearch]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchResults,  setSearchResults]  = useState<PublicProfileDoc[]>([]);
  const [friends,        setFriends]        = useState<Friend[]>([]);
  const [suggestions,    setSuggestions]    = useState<PublicProfileDoc[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewingFriend,  setViewingFriend]  = useState<Friend | null>(null);
  const [selectedLog,    setSelectedLog]    = useState<DayLog | null>(null);
  const [sendingReq,     setSendingReq]     = useState<Set<string>>(new Set());
  const [requestsSent,   setRequestsSent]   = useState<Set<string>>(new Set());
  const [loadingSearch,  setLoadingSearch]  = useState(false);

  const [feedPosts,    setFeedPosts]    = useState<FeedPost[]>([]);
  const [loadingFeed,  setLoadingFeed]  = useState(true);

  const myName    = appData?.social?.displayName ?? user?.displayName ?? 'Moi';
  const myInitial = myName[0]?.toUpperCase() ?? '?';

  // Store name globally so FeedCard comment author can access it
  useEffect(() => { (window as any).__heroMyName = myName; }, [myName]);

  // Reload friends + feed every time user switches to home tab
  useEffect(() => {
    if (!user || currentView !== 'home') return;
    setLoadingFeed(true);
    getFriends(user.uid)
      .then(async (f) => {
        setFriends(f);
        const friendUids = f.map(fr => fr.uid);
        const posts = await loadFeedPosts([user.uid, ...friendUids]);
        setFeedPosts(posts);
        setLoadingFeed(false);
      })
      .catch(() => setLoadingFeed(false));
    searchUsers('').then(r => setSuggestions(r.slice(0, 6))).catch(console.error);
  }, [user, currentView]);

  // Live search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    setLoadingSearch(true);
    const t = setTimeout(() => {
      searchUsers(searchQuery)
        .then(r => { setSearchResults(r); setLoadingSearch(false); })
        .catch(() => setLoadingSearch(false));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function handleSendRequest(uid: string) {
    if (!user || sendingReq.has(uid) || requestsSent.has(uid)) return;
    setSendingReq(s => new Set(s).add(uid));
    try {
      await sendFriendRequest(user.uid, myName, uid);
      setRequestsSent(s => new Set(s).add(uid));
    } catch {}
    setSendingReq(s => { const ns = new Set(s); ns.delete(uid); return ns; });
  }

  function handleDeletePost(postId: string) {
    setFeedPosts(prev => prev.filter(p => p.id !== postId));
    deleteFeedPost(postId).catch(console.error);
  }

  function handleOpenProfile(uid: string, name: string) {
    const existing = friends.find(f => f.uid === uid);
    setViewingFriend(existing ?? { uid, displayName: name, since: '' });
  }

  function handleLike(post: FeedPost) {
    if (!user) return;
    const isLiked = post.likes.includes(user.uid);
    // Optimistic update
    setFeedPosts(prev => prev.map(p => p.id !== post.id ? p : {
      ...p,
      likes: isLiked ? p.likes.filter(u => u !== user.uid) : [...p.likes, user.uid],
    }));
    toggleLike(post.id, user.uid, isLiked).catch(() => {
      // Revert on error
      setFeedPosts(prev => prev.map(p => p.id !== post.id ? p : post));
    });
  }

  const friendIds = new Set(friends.map(f => f.uid));

  const filteredPosts = feedPosts.filter(p => {
    if (selectedFilter === 'all') return true;
    const cat = p.log?.programCategory;
    return cat === selectedFilter;
  });

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="font-display" style={{ fontSize: '1.3rem', flex: 1, letterSpacing: '.1em' }}>Feed</div>
        <button
          onClick={() => { setShowSearch(s => !s); setSearchQuery(''); setSearchResults([]); }}
          style={{ background: showSearch ? 'rgba(200,16,46,.12)' : 'var(--s2)', border: `1px solid ${showSearch ? 'rgba(200,16,46,.4)' : 'var(--border)'}`, borderRadius: 10, padding: '8px 12px', color: showSearch ? 'var(--primary)' : 'var(--muted)', cursor: 'pointer', fontSize: '.9rem' }}
        >
          🧭 Rechercher
        </button>
      </div>

      {/* ── Search bar ─────────────────────────────────────── */}
      {showSearch && (
        <div style={{ padding: '0 12px 8px' }}>
          <input
            className="field"
            placeholder="Nom d'un utilisateur..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
            style={{ marginBottom: searchResults.length > 0 ? 8 : 0 }}
          />
          {loadingSearch && <div style={{ fontSize: '.72rem', color: 'var(--muted)', padding: '4px 0' }}>Recherche...</div>}
          {searchResults.map(u => {
            const isFriend = friendIds.has(u.uid) || u.uid === user?.uid;
            const sent = requestsSent.has(u.uid);
            return (
              <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--s2)', borderRadius: 10, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.85rem', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                  {u.displayName[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{u.displayName}</div>
                  {u.location && <div style={{ fontSize: '.6rem', color: 'var(--muted)' }}>{u.location}</div>}
                </div>
                {isFriend ? (
                  <span style={{ fontSize: '.62rem', color: 'var(--green)', fontWeight: 700 }}>Ami ✓</span>
                ) : sent ? (
                  <span style={{ fontSize: '.62rem', color: 'var(--muted)', fontWeight: 600 }}>Envoyé</span>
                ) : (
                  <button onClick={() => handleSendRequest(u.uid)} style={{ padding: '5px 10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: '.68rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                    + Ajouter
                  </button>
                )}
              </div>
            );
          })}
          {searchQuery.length === 0 && suggestions.length > 0 && (
            <>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 2px 8px' }}>Suggestions</div>
              {suggestions.filter(u => u.uid !== user?.uid && !friendIds.has(u.uid)).slice(0, 4).map(u => {
                const sent = requestsSent.has(u.uid);
                return (
                  <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--s2)', borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(200,16,46,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.85rem', color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>
                      {u.displayName[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{u.displayName}</div>
                      <div style={{ fontSize: '.6rem', color: 'var(--muted)' }}>
                        {u.publicDomains.slice(0, 2).map(d => d.emoji).join(' ')} {u.streak > 0 ? `· 🔥${u.streak}j` : ''}
                      </div>
                    </div>
                    {sent ? (
                      <span style={{ fontSize: '.62rem', color: 'var(--muted)', fontWeight: 600 }}>Envoyé</span>
                    ) : (
                      <button onClick={() => handleSendRequest(u.uid)} style={{ padding: '5px 10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: '.68rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                        + Ajouter
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── Friends strip ───────────────────────────────────── */}
      {friends.length > 0 && (
        <div style={{ padding: '4px 12px 6px' }}>
          <div style={{ fontSize: '.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Amis · {friends.length}</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {friends.map(f => (
              <button key={f.uid} onClick={() => setViewingFriend(f)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(200,16,46,.15)', border: '2px solid rgba(200,16,46,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {f.displayName[0]?.toUpperCase()}
                </div>
                <div style={{ fontSize: '.58rem', color: 'var(--muted)', maxWidth: 50, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.displayName.split(' ')[0]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Macro-domain filter chips ───────────────────────── */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 12px 10px', overflowX: 'auto' }}>
        {MACRO_FILTERS.map(f => (
          <button key={f.id} onClick={() => setSelectedFilter(f.id)} style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 20,
            border: selectedFilter === f.id ? '1.5px solid var(--primary)' : '1px solid var(--border)',
            background: selectedFilter === f.id ? 'rgba(200,16,46,.1)' : 'var(--s1)',
            color: selectedFilter === f.id ? 'var(--primary)' : 'var(--muted)',
            fontSize: '.65rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em',
          }}>
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* ── Feed ───────────────────────────────────────────── */}
      {loadingFeed && (
        <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--muted)', fontSize: '.82rem' }}>Chargement du feed...</div>
      )}

      {!loadingFeed && filteredPosts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--muted)' }}>
          {friends.length === 0 ? (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🧭</div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Trouve des amis</div>
              <div style={{ fontSize: '.78rem', marginBottom: 14 }}>Recherche des athlètes pour voir leurs activités ici</div>
              <button onClick={() => setShowSearch(true)} style={{ padding: '9px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: '.8rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                🧭 Rechercher
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: '.82rem' }}>Aucune activité pour ce filtre</div>
            </>
          )}
        </div>
      )}

      {filteredPosts.map(post => (
        <FeedCard
          key={post.id}
          post={post}
          myUid={user?.uid ?? ''}
          onLike={handleLike}
          onOpenDetail={(log) => setSelectedLog(log)}
          onDelete={handleDeletePost}
          onOpenProfile={handleOpenProfile}
        />
      ))}

      {/* Modals */}
      {viewingFriend && (
        <FriendProfileModal friend={viewingFriend} onClose={() => setViewingFriend(null)} />
      )}
      {selectedLog && (
        <ActivityDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
