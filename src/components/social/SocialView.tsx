'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import type { SocialSettings } from '@/models/app-data';
import type {
  PublicProfileDoc,
  FriendRequest,
  Friend,
  Group,
  GroupMember,
  GroupMessage,
  GroupInvitation,
} from '@/models/social';
import {
  searchUsers,
  getPublicProfile,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  removeFriend,
  seedBotFriends,
  getPublicGroups,
  getMyGroups,
  createGroup,
  joinGroup,
  leaveGroup,
  getGroupMembers,
  sendMessage,
  subscribeToMessages,
  inviteToGroup,
  getGroupInvitations,
  acceptGroupInvitation,
  declineGroupInvitation,
  kickMember,
  deleteGroup,
} from '@/lib/firebase/social';

// ─── Types ────────────────────────────────────────────────────────────────────

type SocialTab = 'discover' | 'friends' | 'groups';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Pill({ children, color = 'var(--teal)' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: '.62rem',
      fontWeight: 600,
      letterSpacing: '.04em',
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
    }}>
      {children}
    </span>
  );
}

function SubNav({ tab, setTab }: { tab: SocialTab; setTab: (t: SocialTab) => void }) {
  const tabs: { id: SocialTab; label: string }[] = [
    { id: 'discover', label: 'Découvrir' },
    { id: 'friends', label: 'Amis' },
    { id: 'groups', label: 'Groupes' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, padding: '12px 12px 0' }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: 20,
            border: tab === t.id ? '1px solid var(--green)' : '1px solid var(--border)',
            background: tab === t.id ? 'rgba(212,245,60,.1)' : 'var(--s1)',
            color: tab === t.id ? 'var(--green)' : 'var(--muted)',
            fontSize: '.72rem',
            fontWeight: 700,
            letterSpacing: '.05em',
            cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Profile Card (user result) ───────────────────────────────────────────────

function ProfileCard({
  profile,
  onAdd,
  added,
  onClick,
}: {
  profile: PublicProfileDoc;
  onAdd?: () => void;
  added?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{ margin: '0 12px 8px', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', flexShrink: 0,
        }}>
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 2 }}>{profile.displayName}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {profile.publicDomains.slice(0, 4).map((d, i) => (
              <span key={i} style={{ fontSize: '.82rem' }}>{d.emoji}</span>
            ))}
          </div>
          {profile.location && (
            <div style={{ fontSize: '.62rem', color: 'var(--muted)', marginTop: 2 }}>📍 {profile.location}</div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 8 }}>
          <div style={{ fontSize: '.7rem', color: 'var(--green)', fontWeight: 700 }}>🔥 {profile.streak}</div>
          <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>{profile.totalPoints} pts</div>
        </div>
        {onAdd && (
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            disabled={added}
            style={{
              padding: '6px 12px',
              borderRadius: 16,
              border: added ? '1px solid var(--border)' : '1px solid var(--green)',
              background: added ? 'var(--s2)' : 'rgba(212,245,60,.12)',
              color: added ? 'var(--muted)' : 'var(--green)',
              fontSize: '.7rem',
              fontWeight: 700,
              cursor: added ? 'default' : 'pointer',
              flexShrink: 0,
            }}
          >
            {added ? 'Envoyé' : '+ Ajouter'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mini Radar ───────────────────────────────────────────────────────────────

function MiniRadar({ domains }: { domains: { name: string; emoji: string; score: number }[] }) {
  if (domains.length < 2) return null;
  const n = domains.length;
  const cx = 80, cy = 76, r = 56;
  const maxScore = Math.max(...domains.map((d) => d.score), 1);

  const angle = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const px = (i: number, scale: number) => cx + Math.cos(angle(i)) * r * scale;
  const py = (i: number, scale: number) => cy + Math.sin(angle(i)) * r * scale;

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const dataPolygon = domains
    .map((d, i) => `${px(i, Math.min(d.score / maxScore, 1))},${py(i, Math.min(d.score / maxScore, 1))}`)
    .join(' ');

  return (
    <div style={{ maxWidth: 220, margin: '0 auto', padding: '0 10px' }}>
      <svg width="100%" viewBox="0 0 160 160" style={{ display: 'block', overflow: 'visible' }}>
        {gridLevels.map((lv) => (
          <polygon
            key={lv}
            points={domains.map((_, i) => `${px(i, lv)},${py(i, lv)}`).join(' ')}
            fill="none"
            stroke="var(--border)"
            strokeWidth="0.8"
          />
        ))}
        {domains.map((_, i) => (
          <line key={i} x1={cx} y1={cy} x2={px(i, 1)} y2={py(i, 1)} stroke="var(--border)" strokeWidth="0.8" />
        ))}
        <polygon points={dataPolygon} fill="rgba(212,245,60,.18)" stroke="#d4f53c" strokeWidth="1.5" />
        {domains.map((d, i) => {
          const norm = Math.min(d.score / maxScore, 1);
          return (
            <g key={i}>
              <circle cx={px(i, norm)} cy={py(i, norm)} r="3" fill="#d4f53c" />
              <text x={px(i, 1.38)} y={py(i, 1.38)} fontSize="11" textAnchor="middle" dominantBaseline="middle">
                {d.emoji}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Profile Sheet (full profile overlay) ────────────────────────────────────

function ProfileSheet({
  profile,
  onClose,
}: {
  profile: PublicProfileDoc;
  onClose: () => void;
}) {
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" style={{ maxHeight: '88vh', overflowY: 'auto', maxWidth: 460 }}>
        <div className="sheet-handle" />

        {/* Header: name + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--s2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', flexShrink: 0,
          }}>
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div className="font-display" style={{ fontSize: '1.6rem', lineHeight: 1 }}>{profile.displayName}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '.72rem', color: 'var(--green)', fontWeight: 700 }}>🔥 {profile.streak} jours</span>
              <span style={{ fontSize: '.72rem', color: 'var(--teal)', fontWeight: 700 }}>{profile.totalPoints} pts</span>
              {profile.location && (
                <span style={{ fontSize: '.66rem', color: 'var(--muted)' }}>📍 {profile.location}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p style={{ fontSize: '.82rem', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 12px', padding: '9px 12px', background: 'var(--s2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            {profile.bio}
          </p>
        )}

        {/* Radar */}
        {profile.publicDomains.length >= 2 && (
          <div style={{ margin: '0 0 12px', background: 'var(--s2)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '10px 12px 0' }}>
              Radar
            </div>
            <MiniRadar domains={profile.publicDomains} />
          </div>
        )}

        {/* Long-term goals */}
        {profile.publicGoals.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              Objectifs partagés
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {profile.publicGoals.map((g, i) => (
                <div key={i} style={{
                  padding: '8px 12px', borderRadius: 10,
                  background: 'var(--s2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: '.82rem', flex: 1 }}>{g.label}</span>
                  <Pill color="var(--purple)">{g.type}</Pill>
                  <span style={{ fontSize: '.66rem', color: 'var(--muted)' }}>{g.domainName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn-secondary" onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}

// ─── Similarity Scoring ───────────────────────────────────────────────────────

function computeSimilarity(me: PublicProfileDoc, other: PublicProfileDoc): number {
  let score = 0;

  // Domain overlap — up to 50 pts
  const myNames = new Set(me.publicDomains.map((d) => d.name.toLowerCase()));
  const overlap = other.publicDomains.filter((d) => myNames.has(d.name.toLowerCase())).length;
  const maxDomains = Math.max(me.publicDomains.length, other.publicDomains.length, 1);
  score += Math.round((overlap / maxDomains) * 50);

  // Streak proximity — up to 25 pts
  if (me.streak > 0 || other.streak > 0) {
    const maxStreak = Math.max(me.streak, other.streak, 1);
    const sim = 1 - Math.min(Math.abs(me.streak - other.streak) / maxStreak, 1);
    score += Math.round(sim * 25);
  }

  // Location match — up to 25 pts
  if (me.location && other.location) {
    const a = me.location.toLowerCase().trim();
    const b = other.location.toLowerCase().trim();
    if (a === b) score += 25;
    else if (a.includes(b) || b.includes(a)) score += 12;
  }

  return score;
}

// ─── DISCOVER Section ─────────────────────────────────────────────────────────

function DiscoverSection({ myUid, myName }: { myUid: string; myName: string }) {
  const appData = useAppStore((s) => s.appData);
  const updateSocialSettings = useAppStore((s) => s.updateSocialSettings);

  const social = appData?.social;

  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PublicProfileDoc[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState<PublicProfileDoc | null>(null);

  // Local social settings state
  const [editEnabled, setEditEnabled] = useState(social?.enabled ?? false);
  const [editDiscoverable, setEditDiscoverable] = useState(social?.discoverable ?? false);
  const [editDisplayName, setEditDisplayName] = useState(social?.displayName ?? myName ?? '');
  const [editBio, setEditBio] = useState(social?.bio ?? '');
  const [editLocation, setEditLocation] = useState(social?.location ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Suggestions
  const [suggestions, setSuggestions] = useState<PublicProfileDoc[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const socialEnabled = social?.enabled;
  const socialDiscoverable = social?.discoverable;

  useEffect(() => {
    if (!socialEnabled || !socialDiscoverable) return;
    let cancelled = false;
    setSuggestionsLoading(true);
    (async () => {
      try {
        const [myProfile, all] = await Promise.all([
          getPublicProfile(myUid),
          searchUsers(''),
        ]);
        if (cancelled) return;
        if (!myProfile) { setSuggestions([]); return; }
        const scored = all
          .filter((p) => p.uid !== myUid)
          .map((p) => ({ p, s: computeSimilarity(myProfile, p) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 6)
          .map((x) => x.p);
        if (!cancelled) setSuggestions(scored);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [myUid, socialEnabled, socialDiscoverable]);

  async function handleSaveProfile() {
    setSaving(true);
    const settings: SocialSettings = {
      enabled: editEnabled,
      discoverable: editDiscoverable,
      displayName: editDisplayName.trim() || myName,
      bio: editBio.trim() || undefined,
      location: editLocation.trim() || undefined,
    };
    await updateSocialSettings(settings);
    setSaving(false);
    setSaveMsg('Profil sauvegardé !');
    setTimeout(() => setSaveMsg(''), 2500);
  }

  async function handleSearch() {
    setSearching(true);
    try {
      const res = await searchUsers(searchTerm);
      // Exclude self
      setResults(res.filter((p) => p.uid !== myUid));
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }

  async function handleAddFriend(profile: PublicProfileDoc) {
    if (!social?.enabled) return;
    try {
      await sendFriendRequest(myUid, social.displayName || myName, profile.uid);
      setSentRequests((prev) => new Set([...prev, profile.uid]));
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div>
      {/* Mon profil public */}
      <div className="card" style={{ margin: '12px 12px 0' }}>
        <div style={{ padding: '13px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="font-display" style={{ fontSize: '1.15rem' }}>Mon profil</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Actif</span>
              <div
                onClick={() => setEditEnabled((v) => !v)}
                style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: editEnabled ? 'var(--green)' : 'var(--s2)',
                  border: '1px solid var(--border)',
                  position: 'relative', cursor: 'pointer', transition: 'background .2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2,
                  left: editEnabled ? 18 : 2,
                  width: 14, height: 14, borderRadius: '50%',
                  background: editEnabled ? 'var(--bg)' : 'var(--muted)',
                  transition: 'left .2s',
                }} />
              </div>
            </label>
          </div>

          {editEnabled && (
            <>
              <input
                className="field"
                placeholder="Nom affiché..."
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <textarea
                className="field"
                placeholder="Bio (optionnel)..."
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={2}
                style={{ marginBottom: 8, resize: 'vertical', minHeight: 52, fontFamily: 'inherit', fontSize: '.82rem' }}
              />
              <input
                className="field"
                placeholder="Localisation (ex: Paris, France)..."
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                style={{ marginBottom: 10 }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '.78rem', color: 'var(--text)' }}>Découvrable</span>
                <div
                  onClick={() => setEditDiscoverable((v) => !v)}
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: editDiscoverable ? 'var(--teal)' : 'var(--s2)',
                    border: '1px solid var(--border)',
                    position: 'relative', cursor: 'pointer', transition: 'background .2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2,
                    left: editDiscoverable ? 18 : 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: editDiscoverable ? 'var(--bg)' : 'var(--muted)',
                    transition: 'left .2s',
                  }} />
                </div>
              </div>

              <div style={{ marginBottom: 12, padding: '8px 10px', background: 'rgba(63,255,192,.06)', border: '1px solid rgba(63,255,192,.2)', borderRadius: 10 }}>
                <div style={{ fontSize: '.72rem', color: 'var(--teal)', fontWeight: 600, marginBottom: 3 }}>
                  Visibilité des domaines et objectifs
                </div>
                <div style={{ fontSize: '.68rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Dans l'onglet <strong style={{ color: 'var(--text)' }}>Profil</strong>, clique sur 🔒 à côté de chaque domaine ou objectif pour le rendre public (🌐).
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={handleSaveProfile}
                disabled={saving}
                style={{ marginTop: 4 }}
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              {saveMsg && (
                <div style={{ marginTop: 6, fontSize: '.75rem', color: 'var(--green)', textAlign: 'center' }}>{saveMsg}</div>
              )}
            </>
          )}

          {!editEnabled && (
            <div style={{ fontSize: '.78rem', color: 'var(--muted)', textAlign: 'center', padding: '4px 0 2px' }}>
              Active ton profil pour partager tes domaines et objectifs avec tes amis.
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {social?.enabled && social?.discoverable && (
        <div style={{ padding: '14px 12px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <div className="font-display" style={{ fontSize: '1.2rem' }}>Suggestions</div>
            <span style={{ fontSize: '.65rem', color: 'var(--muted)' }}>par domaines · niveau · localisation</span>
          </div>
          {suggestionsLoading && (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--muted)', fontSize: '.78rem' }}>
              Calcul des correspondances...
            </div>
          )}
          {!suggestionsLoading && suggestions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '12px 0 4px', color: 'var(--muted)', fontSize: '.75rem' }}>
              Aucune suggestion pour l'instant.
            </div>
          )}
          {suggestions.map((p) => (
            <ProfileCard
              key={p.uid}
              profile={p}
              onAdd={() => handleAddFriend(p)}
              added={sentRequests.has(p.uid)}
              onClick={() => setSelectedProfile(p)}
            />
          ))}
        </div>
      )}

      {/* Recherche */}
      <div style={{ padding: '14px 12px 8px' }}>
        <div className="font-display" style={{ fontSize: '1.2rem', marginBottom: 10 }}>Rechercher</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="field"
            placeholder="Nom d'utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1, margin: 0 }}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            style={{
              padding: '10px 16px', borderRadius: 12,
              border: '1px solid var(--green)',
              background: 'rgba(212,245,60,.12)',
              color: 'var(--green)', fontWeight: 700,
              fontSize: '.78rem', cursor: 'pointer',
            }}
          >
            {searching ? '...' : 'Chercher'}
          </button>
        </div>
      </div>

      {/* Résultats */}
      {results.length > 0 && (
        <div>
          {results.map((p) => (
            <ProfileCard
              key={p.uid}
              profile={p}
              onAdd={social?.enabled ? () => handleAddFriend(p) : undefined}
              added={sentRequests.has(p.uid)}
              onClick={() => setSelectedProfile(p)}
            />
          ))}
        </div>
      )}

      {results.length === 0 && searchTerm && !searching && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '.82rem' }}>
          Aucun résultat pour « {searchTerm} »
        </div>
      )}

      {!social?.enabled && results.length > 0 && (
        <div style={{ margin: '0 12px', padding: '10px 14px', background: 'rgba(255,165,0,.08)', border: '1px solid rgba(255,165,0,.25)', borderRadius: 12, fontSize: '.75rem', color: 'var(--orange)' }}>
          Active ton profil public pour pouvoir envoyer des demandes d'ami.
        </div>
      )}

      {selectedProfile && (
        <ProfileSheet
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}

// ─── FRIENDS Section ──────────────────────────────────────────────────────────

function FriendsSection({ myUid, myName }: { myUid: string; myName: string }) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<PublicProfileDoc | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function handleSeedBots() {
    setSeeding(true);
    try {
      await seedBotFriends(myUid, myName);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  }

  async function handleViewProfile(uid: string) {
    const profile = await getPublicProfile(uid).catch(() => null);
    if (profile) setSelectedProfile(profile);
  }

  async function load() {
    setLoading(true);
    try {
      const [reqs, friendList] = await Promise.all([
        getFriendRequests(myUid),
        getFriends(myUid),
      ]);
      setRequests(reqs);
      setFriends(friendList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [myUid]);

  async function handleAccept(req: FriendRequest) {
    setActionLoading(req.fromUid);
    try {
      await acceptFriendRequest(myUid, myName, req.fromUid, req.fromName);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(req: FriendRequest) {
    setActionLoading(req.fromUid);
    try {
      await declineFriendRequest(myUid, req.fromUid);
      setRequests((prev) => prev.filter((r) => r.fromUid !== req.fromUid));
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(friend: Friend) {
    setActionLoading(friend.uid);
    try {
      await removeFriend(myUid, friend.uid);
      setFriends((prev) => prev.filter((f) => f.uid !== friend.uid));
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)', fontSize: '.82rem' }}>
        Chargement...
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Demandes en attente */}
      {requests.length > 0 && (
        <div style={{ padding: '14px 12px 6px' }}>
          <div className="font-display" style={{ fontSize: '1.15rem', marginBottom: 8 }}>
            Demandes en attente ({requests.length})
          </div>
          {requests.map((req) => (
            <div key={req.fromUid} className="card" style={{ margin: '0 0 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'var(--s2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', flexShrink: 0,
                }}>
                  {req.fromName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{req.fromName}</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>
                    {new Date(req.sentAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleAccept(req)}
                    disabled={actionLoading === req.fromUid}
                    style={{
                      padding: '6px 12px', borderRadius: 16,
                      border: '1px solid var(--green)',
                      background: 'rgba(212,245,60,.12)',
                      color: 'var(--green)', fontSize: '.72rem',
                      fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => handleDecline(req)}
                    disabled={actionLoading === req.fromUid}
                    style={{
                      padding: '6px 12px', borderRadius: 16,
                      border: '1px solid var(--border)',
                      background: 'var(--s2)',
                      color: 'var(--muted)', fontSize: '.72rem',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Liste amis */}
      <div style={{ padding: requests.length > 0 ? '6px 12px 6px' : '14px 12px 6px' }}>
        <div className="font-display" style={{ fontSize: '1.15rem', marginBottom: 8 }}>
          Mes amis ({friends.length})
        </div>
      </div>

      {friends.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>👥</div>
          <div style={{ fontSize: '.85rem', fontWeight: 600, marginBottom: 4 }}>Aucun ami pour l'instant</div>
          <div style={{ fontSize: '.75rem', marginBottom: 16 }}>Recherche des utilisateurs dans l'onglet Découvrir</div>
          <button
            onClick={handleSeedBots}
            disabled={seeding}
            style={{
              padding: '9px 18px', borderRadius: 20,
              border: '1px solid var(--border)',
              background: 'var(--s2)',
              color: 'var(--muted)', fontSize: '.75rem',
              fontWeight: 600, cursor: seeding ? 'default' : 'pointer',
            }}
          >
            {seeding ? 'Ajout en cours...' : '+ Ajouter des exemples'}
          </button>
        </div>
      )}

      {friends.map((f) => (
        <div key={f.uid} className="card" style={{ margin: '0 12px 8px', cursor: 'pointer' }}
          onClick={() => handleViewProfile(f.uid)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'var(--s2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', flexShrink: 0,
            }}>
              {f.displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{f.displayName}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                {(f.publicDomains ?? []).slice(0, 4).map((d, i) => (
                  <span key={i} style={{ fontSize: '.8rem' }}>{d.emoji}</span>
                ))}
              </div>
            </div>
            {f.streak !== undefined && (
              <div style={{ textAlign: 'right', marginRight: 8 }}>
                <div style={{ fontSize: '.7rem', color: 'var(--green)', fontWeight: 700 }}>🔥 {f.streak}</div>
                {f.totalPoints !== undefined && (
                  <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>{f.totalPoints} pts</div>
                )}
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleRemove(f); }}
              disabled={actionLoading === f.uid}
              style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                cursor: 'pointer', fontSize: '1.1rem', padding: '2px 6px',
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}

      {selectedProfile && (
        <ProfileSheet
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}

// ─── Group Chat ────────────────────────────────────────────────────────────────

function GroupChat({ group, myUid, myName }: { group: Group; myUid: string; myName: string }) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToMessages(group.id, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [group.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await sendMessage(group.id, {
        uid: myUid,
        displayName: myName,
        text: trimmed,
        sentAt: new Date().toISOString(),
      });
      setText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 280 }}>
      <div style={{
        flex: 1, overflowY: 'auto', padding: '8px 0',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.75rem', padding: '24px' }}>
            Aucun message. Soyez le premier à écrire !
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.uid === myUid;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isMe ? 'row-reverse' : 'row',
                gap: 6,
                padding: '0 12px',
              }}
            >
              <div style={{
                maxWidth: '75%',
                padding: '7px 11px',
                borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: isMe ? 'rgba(212,245,60,.15)' : 'var(--s2)',
                border: `1px solid ${isMe ? 'rgba(212,245,60,.3)' : 'var(--border)'}`,
              }}>
                {!isMe && (
                  <div style={{ fontSize: '.62rem', color: 'var(--teal)', fontWeight: 700, marginBottom: 2 }}>
                    {msg.displayName}
                  </div>
                )}
                <div style={{ fontSize: '.82rem', color: 'var(--text)' }}>{msg.text}</div>
                <div style={{ fontSize: '.58rem', color: 'var(--muted)', marginTop: 2, textAlign: 'right' }}>
                  {new Date(msg.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{
        display: 'flex', gap: 8, padding: '8px 12px',
        borderTop: '1px solid var(--border)',
      }}>
        <input
          className="field"
          placeholder="Message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, margin: 0 }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          style={{
            padding: '10px 14px', borderRadius: 12,
            border: '1px solid var(--green)',
            background: 'rgba(212,245,60,.12)',
            color: 'var(--green)', fontWeight: 700,
            fontSize: '.78rem', cursor: 'pointer',
          }}
        >
          {sending ? '...' : '→'}
        </button>
      </div>
    </div>
  );
}

// ─── Group Sheet (detail) ──────────────────────────────────────────────────────

// ─── Invite Friends Sheet ─────────────────────────────────────────────────────

function InviteFriendsSheet({
  myUid,
  myName,
  group,
  memberUids,
  onClose,
}: {
  myUid: string;
  myName: string;
  group: Group;
  memberUids: Set<string>;
  onClose: () => void;
}) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitedUids, setInvitedUids] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    getFriends(myUid)
      .then((list) => setFriends(list.filter((f) => !memberUids.has(f.uid))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [myUid]);

  async function handleInvite(friend: Friend) {
    setInviting(friend.uid);
    try {
      await inviteToGroup(friend.uid, group.id, group.name, group.emoji, myUid, myName);
      setInvitedUids((prev) => new Set([...prev, friend.uid]));
    } catch (e) {
      console.error(e);
    } finally {
      setInviting(null);
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="font-display" style={{ fontSize: '1.5rem', marginBottom: 4 }}>
          Inviter des amis
        </div>
        <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 14 }}>
          dans {group.emoji} {group.name}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '.82rem' }}>
            Chargement...
          </div>
        )}

        {!loading && friends.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '.82rem' }}>
            Tous tes amis sont déjà membres de ce groupe.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {friends.map((f) => {
            const invited = invitedUids.has(f.uid);
            return (
              <div key={f.uid} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12,
                background: 'var(--s2)', border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--s1)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.95rem', flexShrink: 0,
                }}>
                  {f.displayName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{f.displayName}</div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                    {(f.publicDomains ?? []).slice(0, 4).map((d, i) => (
                      <span key={i} style={{ fontSize: '.78rem' }}>{d.emoji}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleInvite(f)}
                  disabled={invited || inviting === f.uid}
                  style={{
                    padding: '6px 13px', borderRadius: 16, fontWeight: 700, cursor: invited ? 'default' : 'pointer',
                    border: invited ? '1px solid var(--border)' : '1px solid var(--teal)',
                    background: invited ? 'var(--s1)' : 'rgba(63,255,192,.1)',
                    color: invited ? 'var(--muted)' : 'var(--teal)',
                    fontSize: '.72rem',
                  }}
                >
                  {inviting === f.uid ? '...' : invited ? 'Invité ✓' : 'Inviter'}
                </button>
              </div>
            );
          })}
        </div>

        <button className="btn-secondary" onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}

function GroupSheet({
  group,
  myUid,
  myName,
  isMember,
  onJoin,
  onLeave,
  onDelete,
  onClose,
}: {
  group: Group;
  myUid: string;
  myName: string;
  isMember: boolean;
  onJoin: () => Promise<void>;
  onLeave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [kickLoading, setKickLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<'info' | 'chat'>('info');
  const [showInvite, setShowInvite] = useState(false);

  const isCreator = group.creatorUid === myUid;

  useEffect(() => {
    getGroupMembers(group.id)
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoadingMembers(false));
  }, [group.id]);

  async function handleJoin() {
    setActionLoading(true);
    try { await onJoin(); } finally { setActionLoading(false); }
  }

  async function handleLeave() {
    setActionLoading(true);
    try { await onLeave(); } finally { setActionLoading(false); }
  }

  async function handleKick(uid: string) {
    setKickLoading(uid);
    try {
      await kickMember(group.id, uid);
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
    } catch (e) {
      console.error(e);
    } finally {
      setKickLoading(null);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    try { await onDelete(); } finally { setActionLoading(false); }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="sheet-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: '2rem' }}>{group.emoji}</span>
          <div style={{ flex: 1 }}>
            <div className="font-display" style={{ fontSize: '1.4rem' }}>{group.name}</div>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>
              {group.memberCount} membre{group.memberCount > 1 ? 's' : ''} · {group.isPublic ? 'Public' : 'Privé'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {isMember && (
              <button
                onClick={() => setShowInvite(true)}
                style={{
                  padding: '6px 12px', borderRadius: 16,
                  border: '1px solid var(--teal)',
                  background: 'rgba(63,255,192,.1)',
                  color: 'var(--teal)', fontSize: '.72rem',
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                👥 Inviter
              </button>
            )}
            {isMember && group.creatorUid !== myUid ? (
              <button
                onClick={handleLeave}
                disabled={actionLoading}
                className="btn-danger"
                style={{ fontSize: '.72rem', padding: '6px 12px' }}
              >
                Quitter
              </button>
            ) : !isMember ? (
              <button
                onClick={handleJoin}
                disabled={actionLoading}
                style={{
                  padding: '6px 12px', borderRadius: 16,
                  border: '1px solid var(--green)',
                  background: 'rgba(212,245,60,.12)',
                  color: 'var(--green)', fontSize: '.72rem',
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                Rejoindre
              </button>
            ) : null}
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['info', 'chat'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: 16,
                border: tab === t ? '1px solid var(--teal)' : '1px solid var(--border)',
                background: tab === t ? 'rgba(0,210,200,.1)' : 'var(--s2)',
                color: tab === t ? 'var(--teal)' : 'var(--muted)',
                fontSize: '.72rem', fontWeight: 700,
                letterSpacing: '.04em', cursor: 'pointer',
              }}
            >
              {t === 'info' ? 'Infos & Membres' : 'Chat'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'info' && (
            <div>
              {group.description && (
                <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  {group.description}
                </p>
              )}

              {group.sharedGoals.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Objectifs communs</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {group.sharedGoals.map((g, i) => (
                      <Pill key={i} color="var(--purple)">{g.label}</Pill>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                Membres ({members.length})
              </div>
              {loadingMembers ? (
                <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Chargement...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {members.map((m) => (
                    <div key={m.uid} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 10,
                      background: 'var(--s2)', border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'var(--s1)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.8rem', flexShrink: 0,
                      }}>
                        {m.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: '.82rem', fontWeight: 600 }}>{m.displayName}</span>
                      {m.role === 'admin' && <Pill color="var(--orange)">Admin</Pill>}
                      {isCreator && m.uid !== myUid && (
                        <button
                          onClick={() => handleKick(m.uid)}
                          disabled={kickLoading === m.uid}
                          title="Exclure du groupe"
                          style={{
                            background: 'none', border: 'none',
                            color: 'var(--muted)', cursor: 'pointer',
                            fontSize: '.82rem', padding: '2px 6px',
                            borderRadius: 8,
                          }}
                        >
                          {kickLoading === m.uid ? '…' : '⊖'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Delete group — creator only */}
              {isCreator && (
                <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        width: '100%', padding: '9px', borderRadius: 12,
                        border: '1px solid rgba(255,80,80,.35)',
                        background: 'rgba(255,80,80,.07)',
                        color: 'var(--red, #ff5050)', fontSize: '.78rem',
                        fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      🗑 Supprimer le groupe
                    </button>
                  ) : (
                    <div style={{
                      padding: '12px', borderRadius: 12,
                      border: '1px solid rgba(255,80,80,.4)',
                      background: 'rgba(255,80,80,.08)',
                    }}>
                      <div style={{ fontSize: '.8rem', fontWeight: 700, marginBottom: 8, color: 'var(--red, #ff5050)' }}>
                        Supprimer définitivement ce groupe ?
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={handleDelete}
                          disabled={actionLoading}
                          style={{
                            flex: 1, padding: '8px', borderRadius: 10,
                            border: '1px solid rgba(255,80,80,.5)',
                            background: 'rgba(255,80,80,.15)',
                            color: 'var(--red, #ff5050)', fontSize: '.78rem',
                            fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {actionLoading ? '...' : 'Confirmer'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          style={{
                            flex: 1, padding: '8px', borderRadius: 10,
                            border: '1px solid var(--border)', background: 'var(--s2)',
                            color: 'var(--muted)', fontSize: '.78rem',
                            fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'chat' && (
            isMember ? (
              <GroupChat group={group} myUid={myUid} myName={myName} />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)', fontSize: '.82rem' }}>
                Rejoins le groupe pour accéder au chat.
              </div>
            )
          )}
        </div>

        <button className="btn-secondary" style={{ marginTop: 12 }} onClick={onClose}>Fermer</button>
      </div>

      {showInvite && (
        <InviteFriendsSheet
          myUid={myUid}
          myName={myName}
          group={group}
          memberUids={new Set(members.map((m) => m.uid))}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}

// ─── Create Group Sheet ───────────────────────────────────────────────────────

const GROUP_EMOJIS = ['🏋️', '📚', '💼', '🎨', '🌍', '🎯', '🎵', '⚽', '🧘', '💪', '🚀', '🌿', '🏃', '🧠', '❤️'];

function CreateGroupSheet({
  myUid,
  myName,
  onCreate,
  onClose,
}: {
  myUid: string;
  myName: string;
  onCreate: (group: Group) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [isPublic, setIsPublic] = useState(true);
  const [goalInput, setGoalInput] = useState('');
  const [sharedGoals, setSharedGoals] = useState<{ label: string; type: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  function addGoal() {
    const trimmed = goalInput.trim();
    if (!trimmed) return;
    setSharedGoals((prev) => [...prev, { label: trimmed, type: 'shared' }]);
    setGoalInput('');
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Le nom est requis.'); return; }
    setCreating(true);
    setError('');
    const group: Group = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      emoji,
      creatorUid: myUid,
      creatorName: myName,
      isPublic,
      memberCount: 1,
      sharedGoals,
      createdAt: new Date().toISOString(),
    };
    try {
      await createGroup(group);
      onCreate(group);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
        <div className="sheet-handle" />
        <div className="font-display" style={{ fontSize: '1.7rem', marginBottom: 4 }}>Nouveau groupe</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {GROUP_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              style={{
                fontSize: '1.4rem', padding: 6, borderRadius: 10, cursor: 'pointer',
                border: emoji === e ? '2px solid var(--green)' : '2px solid transparent',
                background: emoji === e ? 'rgba(212,245,60,.1)' : 'none',
              }}
            >
              {e}
            </button>
          ))}
        </div>

        <input
          className="field"
          placeholder="Nom du groupe..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <input
          className="field"
          placeholder="Description (optionnel)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: '.82rem', color: 'var(--text)' }}>Groupe public</span>
          <div
            onClick={() => setIsPublic((v) => !v)}
            style={{
              width: 36, height: 20, borderRadius: 10,
              background: isPublic ? 'var(--teal)' : 'var(--s2)',
              border: '1px solid var(--border)',
              position: 'relative', cursor: 'pointer', transition: 'background .2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2,
              left: isPublic ? 18 : 2,
              width: 14, height: 14, borderRadius: '50%',
              background: isPublic ? 'var(--bg)' : 'var(--muted)',
              transition: 'left .2s',
            }} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Objectifs communs</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              className="field"
              placeholder="Ex: Courir 5km..."
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGoal()}
              style={{ flex: 1, margin: 0 }}
            />
            <button onClick={addGoal} style={{
              padding: '10px 14px', borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--s2)',
              color: 'var(--text)', fontSize: '.78rem', cursor: 'pointer',
            }}>
              +
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {sharedGoals.map((g, i) => (
              <button
                key={i}
                onClick={() => setSharedGoals((prev) => prev.filter((_, j) => j !== i))}
                style={{
                  padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                  background: 'rgba(160,90,255,.12)',
                  border: '1px solid rgba(160,90,255,.3)',
                  color: 'var(--purple)', fontSize: '.72rem',
                }}
              >
                {g.label} ×
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ marginBottom: 8, fontSize: '.75rem', color: 'var(--red)' }}>{error}</div>}

        <button className="btn-primary" onClick={handleCreate} disabled={creating}>
          {creating ? 'Création...' : 'Créer le groupe'}
        </button>
        <button className="btn-secondary" style={{ marginTop: 6 }} onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

// ─── GROUPS Section ───────────────────────────────────────────────────────────

function GroupsSection({ myUid, myName }: { myUid: string; myName: string }) {
  const [groupTab, setGroupTab] = useState<'mine' | 'public'>('mine');
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [memberMap, setMemberMap] = useState<Record<string, boolean>>({});
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [inviteActionLoading, setInviteActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [mine, pub, invites] = await Promise.all([
        getMyGroups(myUid),
        getPublicGroups(),
        getGroupInvitations(myUid),
      ]);
      setMyGroups(mine);
      setPublicGroups(pub);
      setInvitations(invites);
      // Build membership map
      const map: Record<string, boolean> = {};
      mine.forEach((g) => { map[g.id] = true; });
      setMemberMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptInvitation(inv: GroupInvitation) {
    setInviteActionLoading(inv.id);
    try {
      await acceptGroupInvitation(myUid, myName, inv);
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      setMemberMap((prev) => ({ ...prev, [inv.groupId]: true }));
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setInviteActionLoading(null);
    }
  }

  async function handleDeclineInvitation(inv: GroupInvitation) {
    setInviteActionLoading(inv.id);
    try {
      await declineGroupInvitation(myUid, inv.id);
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (e) {
      console.error(e);
    } finally {
      setInviteActionLoading(null);
    }
  }

  useEffect(() => { load(); }, [myUid]);

  async function handleJoin(group: Group) {
    await joinGroup(group.id, myUid, myName);
    setMemberMap((prev) => ({ ...prev, [group.id]: true }));
    setMyGroups((prev) => prev.some((g) => g.id === group.id) ? prev : [...prev, { ...group, memberCount: group.memberCount + 1 }]);
    setPublicGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, memberCount: g.memberCount + 1 } : g));
  }

  async function handleLeave(group: Group) {
    await leaveGroup(group.id, myUid);
    setMemberMap((prev) => ({ ...prev, [group.id]: false }));
    setMyGroups((prev) => prev.filter((g) => g.id !== group.id));
    setPublicGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g));
    if (selectedGroup?.id === group.id) setSelectedGroup(null);
  }

  async function handleDelete(group: Group) {
    await deleteGroup(group.id);
    setMyGroups((prev) => prev.filter((g) => g.id !== group.id));
    setPublicGroups((prev) => prev.filter((g) => g.id !== group.id));
    setSelectedGroup(null);
  }

  function handleCreated(group: Group) {
    setShowCreate(false);
    setMyGroups((prev) => [...prev, group]);
    setMemberMap((prev) => ({ ...prev, [group.id]: true }));
  }

  const displayedGroups = groupTab === 'mine' ? myGroups : publicGroups;

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px 10px' }}>
        <div className="font-display" style={{ fontSize: '1.2rem' }}>Groupes</div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '7px 14px', borderRadius: 20,
            border: '1px solid var(--green)',
            background: 'rgba(212,245,60,.12)',
            color: 'var(--green)', fontSize: '.72rem',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          + Créer
        </button>
      </div>

      {/* Invitations reçues */}
      {invitations.length > 0 && (
        <div style={{ padding: '0 12px 12px' }}>
          <div className="font-display" style={{ fontSize: '1rem', marginBottom: 8, color: 'var(--teal)' }}>
            Invitations reçues ({invitations.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {invitations.map((inv) => (
              <div key={inv.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12,
                background: 'rgba(63,255,192,.06)',
                border: '1px solid rgba(63,255,192,.2)',
              }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{inv.groupEmoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{inv.groupName}</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>
                    Invité par {inv.fromName}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button
                    onClick={() => handleAcceptInvitation(inv)}
                    disabled={inviteActionLoading === inv.id}
                    style={{
                      padding: '5px 10px', borderRadius: 14,
                      border: '1px solid var(--green)',
                      background: 'rgba(212,245,60,.12)',
                      color: 'var(--green)', fontSize: '.7rem',
                      fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Rejoindre
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(inv)}
                    disabled={inviteActionLoading === inv.id}
                    style={{
                      padding: '5px 10px', borderRadius: 14,
                      border: '1px solid var(--border)',
                      background: 'var(--s2)',
                      color: 'var(--muted)', fontSize: '.7rem',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab */}
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px' }}>
        {(['mine', 'public'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setGroupTab(t)}
            style={{
              flex: 1, padding: '7px 4px', borderRadius: 16,
              border: groupTab === t ? '1px solid var(--teal)' : '1px solid var(--border)',
              background: groupTab === t ? 'rgba(0,210,200,.1)' : 'var(--s1)',
              color: groupTab === t ? 'var(--teal)' : 'var(--muted)',
              fontSize: '.72rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {t === 'mine' ? 'Mes groupes' : 'Publics'}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)', fontSize: '.82rem' }}>
          Chargement...
        </div>
      )}

      {!loading && displayedGroups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>👥</div>
          <div style={{ fontSize: '.85rem', fontWeight: 600, marginBottom: 4 }}>
            {groupTab === 'mine' ? 'Aucun groupe rejoint' : 'Aucun groupe public'}
          </div>
          <div style={{ fontSize: '.75rem' }}>
            {groupTab === 'mine' ? 'Crée ou rejoins un groupe' : 'Aucun groupe public disponible'}
          </div>
        </div>
      )}

      {displayedGroups.map((group) => (
        <div
          key={group.id}
          className="card"
          style={{ margin: '0 12px 8px', cursor: 'pointer' }}
          onClick={() => setSelectedGroup(group)}
        >
          <div style={{ padding: '13px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: '1.6rem' }}>{group.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{group.name}</div>
                <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>
                  {group.memberCount} membre{group.memberCount > 1 ? 's' : ''} · {group.isPublic ? 'Public' : 'Privé'}
                </div>
              </div>
              {memberMap[group.id] && (
                <Pill color="var(--green)">Membre</Pill>
              )}
            </div>
            {group.description && (
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 6, lineHeight: 1.4 }}>
                {group.description.length > 80 ? group.description.slice(0, 80) + '…' : group.description}
              </div>
            )}
            {group.sharedGoals.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {group.sharedGoals.slice(0, 3).map((g, i) => (
                  <Pill key={i} color="var(--purple)">{g.label}</Pill>
                ))}
                {group.sharedGoals.length > 3 && (
                  <Pill color="var(--muted)">+{group.sharedGoals.length - 3}</Pill>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {selectedGroup && (
        <GroupSheet
          group={selectedGroup}
          myUid={myUid}
          myName={myName}
          isMember={memberMap[selectedGroup.id] ?? false}
          onJoin={() => handleJoin(selectedGroup)}
          onLeave={() => handleLeave(selectedGroup)}
          onDelete={() => handleDelete(selectedGroup)}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      {showCreate && (
        <CreateGroupSheet
          myUid={myUid}
          myName={myName}
          onCreate={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// ─── Main SocialView ──────────────────────────────────────────────────────────

export function SocialView() {
  const user = useAppStore((s) => s.user);
  const appData = useAppStore((s) => s.appData);
  const [tab, setTab] = useState<SocialTab>('discover');

  if (!user || !appData) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>👥</div>
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Connexion requise</div>
      </div>
    );
  }

  const myName =
    appData.social?.displayName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'Anonyme';

  return (
    <div style={{ paddingBottom: 24 }}>
      <SubNav tab={tab} setTab={setTab} />

      <div style={{ paddingTop: 4 }}>
        {tab === 'discover' && (
          <DiscoverSection myUid={user.uid} myName={myName} />
        )}
        {tab === 'friends' && (
          <FriendsSection myUid={user.uid} myName={myName} />
        )}
        {tab === 'groups' && (
          <GroupsSection myUid={user.uid} myName={myName} />
        )}
      </div>
    </div>
  );
}
