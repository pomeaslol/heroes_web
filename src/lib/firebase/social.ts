import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  limit,
  onSnapshot,
  writeBatch,
  increment,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';
import type {
  PublicProfileDoc,
  FriendRequest,
  Friend,
  Group,
  GroupMember,
  GroupMessage,
  GroupInvitation,
} from '@/models/social';
import type { FeedPost } from '@/models/feed';
import type { DayLog } from '@/models/day-log';

function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Public Profiles ────────────────────────────────────────────────────────

export async function searchUsers(term: string): Promise<PublicProfileDoc[]> {
  const q = query(
    collection(db, 'public_profiles'),
    where('discoverable', '==', true),
    limit(50)
  );
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => d.data() as PublicProfileDoc);
  if (!term.trim()) return all;
  const lower = term.toLowerCase();
  return all.filter((p) => p.displayName.toLowerCase().includes(lower));
}

export async function getPublicProfile(uid: string): Promise<PublicProfileDoc | null> {
  const snap = await getDoc(doc(db, 'public_profiles', uid));
  return snap.exists() ? (snap.data() as PublicProfileDoc) : null;
}

export async function upsertPublicProfile(
  uid: string,
  profile: PublicProfileDoc
): Promise<void> {
  await setDoc(doc(db, 'public_profiles', uid), clean(profile));
}

// ─── Friend Requests ─────────────────────────────────────────────────────────

export async function sendFriendRequest(
  fromUid: string,
  fromName: string,
  toUid: string
): Promise<void> {
  const req: FriendRequest = {
    fromUid,
    fromName,
    sentAt: new Date().toISOString(),
  };
  await setDoc(
    doc(db, 'friend_requests', toUid, 'from', fromUid),
    clean(req)
  );
}

export async function getFriendRequests(uid: string): Promise<FriendRequest[]> {
  const snap = await getDocs(collection(db, 'friend_requests', uid, 'from'));
  return snap.docs.map((d) => d.data() as FriendRequest);
}

export async function acceptFriendRequest(
  myUid: string,
  myName: string,
  fromUid: string,
  fromName: string
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // Write friendship on both sides
  const myFriendRef = doc(db, 'friendships', myUid, 'list', fromUid);
  const theirFriendRef = doc(db, 'friendships', fromUid, 'list', myUid);

  const myEntry: Friend = { uid: fromUid, displayName: fromName, since: now };
  const theirEntry: Friend = { uid: myUid, displayName: myName, since: now };

  batch.set(myFriendRef, clean(myEntry));
  batch.set(theirFriendRef, clean(theirEntry));

  // Delete the friend request
  const requestRef = doc(db, 'friend_requests', myUid, 'from', fromUid);
  batch.delete(requestRef);

  await batch.commit();
}

export async function declineFriendRequest(
  myUid: string,
  fromUid: string
): Promise<void> {
  await deleteDoc(doc(db, 'friend_requests', myUid, 'from', fromUid));
}

// ─── Friends ─────────────────────────────────────────────────────────────────

export async function getFriends(uid: string): Promise<Friend[]> {
  const snap = await getDocs(collection(db, 'friendships', uid, 'list'));
  return snap.docs.map((d) => d.data() as Friend);
}

export async function removeFriend(
  myUid: string,
  friendUid: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'friendships', myUid, 'list', friendUid));
  batch.delete(doc(db, 'friendships', friendUid, 'list', myUid));
  await batch.commit();
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function createGroup(group: Group): Promise<void> {
  const batch = writeBatch(db);

  batch.set(doc(db, 'groups', group.id), clean(group));

  const memberEntry: GroupMember = {
    uid: group.creatorUid,
    displayName: group.creatorName,
    role: 'admin',
    joinedAt: new Date().toISOString(),
  };
  batch.set(
    doc(db, 'groups', group.id, 'members', group.creatorUid),
    clean(memberEntry)
  );

  await batch.commit();
}

export async function getPublicGroups(): Promise<Group[]> {
  const q = query(
    collection(db, 'groups'),
    where('isPublic', '==', true),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Group);
}

export async function getMyGroups(uid: string): Promise<Group[]> {
  // Query all groups and filter by membership
  // We fetch all public groups + any group where this user is a member
  const allGroupsSnap = await getDocs(collection(db, 'groups'));
  const allGroups = allGroupsSnap.docs.map((d) => d.data() as Group);

  const myGroups: Group[] = [];
  for (const group of allGroups) {
    const memberSnap = await getDoc(doc(db, 'groups', group.id, 'members', uid));
    if (memberSnap.exists()) {
      myGroups.push(group);
    }
  }
  return myGroups;
}

export async function joinGroup(
  groupId: string,
  uid: string,
  displayName: string
): Promise<void> {
  const batch = writeBatch(db);

  const memberEntry: GroupMember = {
    uid,
    displayName,
    role: 'member',
    joinedAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'groups', groupId, 'members', uid), clean(memberEntry));
  batch.update(doc(db, 'groups', groupId), { memberCount: increment(1) });

  await batch.commit();
}

export async function leaveGroup(groupId: string, uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'groups', groupId, 'members', uid));
  batch.update(doc(db, 'groups', groupId), { memberCount: increment(-1) });
  await batch.commit();
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const snap = await getDocs(collection(db, 'groups', groupId, 'members'));
  return snap.docs.map((d) => d.data() as GroupMember);
}

export async function kickMember(groupId: string, uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'groups', groupId, 'members', uid));
  batch.update(doc(db, 'groups', groupId), { memberCount: increment(-1) });
  await batch.commit();
}

export async function deleteGroup(groupId: string): Promise<void> {
  const batch = writeBatch(db);
  const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
  membersSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'groups', groupId));
  await batch.commit();
}

// ─── Group Invitations ────────────────────────────────────────────────────────

export async function inviteToGroup(
  toUid: string,
  groupId: string,
  groupName: string,
  groupEmoji: string,
  fromUid: string,
  fromName: string
): Promise<void> {
  // Use groupId_fromUid as doc ID to prevent duplicate invites
  const inviteId = `${groupId}_${fromUid}`;
  const invitation = {
    groupId,
    groupName,
    groupEmoji,
    fromUid,
    fromName,
    invitedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'group_invitations', toUid, 'from', inviteId), clean(invitation));
}

export async function getGroupInvitations(uid: string): Promise<GroupInvitation[]> {
  const snap = await getDocs(collection(db, 'group_invitations', uid, 'from'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GroupInvitation, 'id'>) }));
}

export async function acceptGroupInvitation(
  uid: string,
  displayName: string,
  invitation: GroupInvitation
): Promise<void> {
  const batch = writeBatch(db);
  const memberEntry: GroupMember = {
    uid,
    displayName,
    role: 'member',
    joinedAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'groups', invitation.groupId, 'members', uid), clean(memberEntry));
  batch.update(doc(db, 'groups', invitation.groupId), { memberCount: increment(1) });
  batch.delete(doc(db, 'group_invitations', uid, 'from', invitation.id));
  await batch.commit();
}

export async function declineGroupInvitation(uid: string, inviteId: string): Promise<void> {
  await deleteDoc(doc(db, 'group_invitations', uid, 'from', inviteId));
}

// ─── Bot Seed ─────────────────────────────────────────────────────────────────

const BOT_PROFILES: PublicProfileDoc[] = [
  {
    uid: 'bot_alice_001',
    displayName: 'Alice Moreau',
    language: 'fr',
    discoverable: true,
    bio: 'Ceinture bleue en BJJ, passionnée de force athlétique et de stoïcisme.',
    location: 'Paris, France',
    publicDomains: [
      { name: 'BJJ', emoji: '🥋', goalCount: 3, score: 18 },
      { name: 'Force', emoji: '💪', goalCount: 5, score: 32 },
      { name: 'Mental', emoji: '🧠', goalCount: 2, score: 10 },
    ],
    publicGoals: [
      { label: 'Ceinture bleue BJJ', type: 'long', domainName: 'BJJ' },
      { label: 'Bench press 80kg', type: 'medium', domainName: 'Force' },
    ],
    streak: 21,
    totalPoints: 487,
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'bot_thomas_002',
    displayName: 'Thomas Garnier',
    language: 'fr',
    discoverable: true,
    bio: 'Runner du dimanche devenu accro. 3 semi-marathons au compteur.',
    location: 'Lyon, France',
    publicDomains: [
      { name: 'Cardio', emoji: '🏃', goalCount: 4, score: 28 },
      { name: 'Nutrition', emoji: '🥗', goalCount: 3, score: 15 },
    ],
    publicGoals: [
      { label: 'Courir un marathon', type: 'long', domainName: 'Cardio' },
      { label: 'Courir 10km sous 50 min', type: 'medium', domainName: 'Cardio' },
    ],
    streak: 8,
    totalPoints: 213,
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'bot_sofia_003',
    displayName: 'Sofia Blanc',
    language: 'fr',
    discoverable: true,
    bio: 'Yoga, méditation et lecture. Je construis ma discipline un jour à la fois.',
    location: 'Bordeaux, France',
    publicDomains: [
      { name: 'Mental', emoji: '🧠', goalCount: 4, score: 22 },
      { name: 'Souplesse', emoji: '🧘', goalCount: 3, score: 14 },
    ],
    publicGoals: [
      { label: 'Grand écart complet', type: 'life', domainName: 'Souplesse' },
      { label: 'Lire 20 livres cette année', type: 'long', domainName: 'Mental' },
    ],
    streak: 45,
    totalPoints: 892,
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'bot_maxime_004',
    displayName: 'Maxime Petit',
    language: 'fr',
    discoverable: true,
    bio: 'Streetlifter et amateur de calisthenics. Objectif : muscle-up parfait.',
    location: 'Paris, France',
    publicDomains: [
      { name: 'Force', emoji: '💪', goalCount: 6, score: 40 },
      { name: 'Cardio', emoji: '🏃', goalCount: 2, score: 12 },
    ],
    publicGoals: [
      { label: 'Muscle-up propre', type: 'medium', domainName: 'Force' },
      { label: 'Tractions lestées +30kg', type: 'long', domainName: 'Force' },
    ],
    streak: 14,
    totalPoints: 356,
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'bot_lea_005',
    displayName: 'Léa Bernard',
    language: 'fr',
    discoverable: true,
    bio: 'Ex-sédentaire reconvertie. La régularité avant la performance.',
    location: 'Marseille, France',
    publicDomains: [
      { name: 'Force', emoji: '💪', goalCount: 3, score: 16 },
      { name: 'Nutrition', emoji: '🥗', goalCount: 4, score: 20 },
      { name: 'Souplesse', emoji: '🧘', goalCount: 2, score: 8 },
    ],
    publicGoals: [
      { label: 'Squatter mon poids de corps', type: 'medium', domainName: 'Force' },
    ],
    streak: 33,
    totalPoints: 641,
    updatedAt: new Date().toISOString(),
  },
];

// Bot feed posts — realistic sessions to populate the unified feed
function makeBotLog(
  id: string,
  programId: string,
  programName: string,
  programIcon: string,
  programColor: string,
  programCategory: string,
  daysAgo: number,
  blocks: DayLog['blocks'],
  note?: string
): DayLog {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dateStr = d.toISOString().split('T')[0];
  return {
    id,
    date: dateStr,
    programId,
    programName,
    programIcon,
    programColor,
    programCategory,
    blocks,
    completedAt: d.toISOString(),
    note,
    isPublic: true,
  };
}

const BOT_LOGS: Record<string, DayLog[]> = {
  bot_alice_001: [
    makeBotLog('al1', 'prog_alice_force', 'Squat & Bench', '🏋️', '#C8102E', 'sport', 1, [
      {
        blockId: 'b1', title: 'Force',
        items: [
          { itemId: 'i1', name: 'Squat', done: true, isPublic: true, sets: [{ w: 100, r: 5, done: true }, { w: 100, r: 5, done: true }, { w: 105, r: 3, done: true }, { w: 105, r: 3, done: true }, { w: 110, r: 2, done: true }] },
          { itemId: 'i2', name: 'Développé couché', done: true, isPublic: true, sets: [{ w: 72.5, r: 5, done: true }, { w: 72.5, r: 5, done: true }, { w: 75, r: 4, done: true }, { w: 75, r: 3, done: true }] },
          { itemId: 'i3', name: 'Overhead Press', done: true, isPublic: true, sets: [{ w: 52.5, r: 6, done: true }, { w: 52.5, r: 5, done: true }, { w: 55, r: 4, done: true }] },
        ],
      },
    ], 'Nouvelle PR au squat 🔥 110kg x2 !'),
    makeBotLog('al2', 'prog_alice_bjj', 'Entraînement BJJ', '🥋', '#4aaeff', 'sport', 4, [
      {
        blockId: 'b2', title: 'Technique',
        items: [
          { itemId: 'i4', name: 'Drilling guard passé', done: true, isPublic: true },
          { itemId: 'i5', name: 'Sparring 5×5 min', done: true, isPublic: true },
        ],
      },
    ], '2h de drilling, je sens le progrès sur la garde ouverte.'),
  ],
  bot_thomas_002: [
    makeBotLog('th1', 'prog_thomas_run', 'Running endurance', '🏃', '#ff8c2a', 'sport', 2, [
      {
        blockId: 'b3', title: 'Sortie',
        items: [
          { itemId: 'i6', name: 'Course 10km', done: true, isPublic: true, duration: 52 },
          { itemId: 'i7', name: 'Étirements', done: true, isPublic: true, duration: 10 },
        ],
      },
    ], '52 min sur le 10km, objectif sous 50 min bientôt 💪'),
    makeBotLog('th2', 'prog_thomas_run2', 'Fractionné 5×1000m', '🏃', '#ff8c2a', 'sport', 6, [
      {
        blockId: 'b4', title: 'Intervalles',
        items: [
          { itemId: 'i8', name: '5×1000m à allure seuil', done: true, isPublic: true, duration: 40 },
        ],
      },
    ], 'Dur mais efficace. Moyenne 4:05/km sur les séries.'),
  ],
  bot_sofia_003: [
    makeBotLog('sf1', 'prog_sofia_yoga', 'Yoga morning', '🧘', '#a855f7', 'wellbeing', 1, [
      {
        blockId: 'b5', title: 'Practice',
        items: [
          { itemId: 'i9', name: 'Flow vinyasa 45min', done: true, isPublic: true, duration: 45 },
          { itemId: 'i10', name: 'Méditation', done: true, isPublic: true, duration: 15 },
        ],
      },
    ], 'Un mois sans manquer un matin. La constance est tout 🙏'),
    makeBotLog('sf2', 'prog_sofia_yoga2', 'Yin yoga & stretching', '🧘', '#a855f7', 'wellbeing', 5, [
      {
        blockId: 'b6', title: 'Souplesse',
        items: [
          { itemId: 'i11', name: 'Pigeon pose 3min/côté', done: true, isPublic: true },
          { itemId: 'i12', name: 'Grand écart progressif', done: true, isPublic: true },
        ],
      },
    ]),
  ],
  bot_maxime_004: [
    makeBotLog('mx1', 'prog_maxime_cal', 'Calisthenics', '💪', '#3fffc0', 'sport', 1, [
      {
        blockId: 'b7', title: 'Pull & Push',
        items: [
          { itemId: 'i13', name: 'Tractions lestées +20kg', done: true, isPublic: true, sets: [{ w: 20, r: 6, done: true }, { w: 20, r: 5, done: true }, { w: 20, r: 5, done: true }, { w: 20, r: 4, done: true }] },
          { itemId: 'i14', name: 'Dips lestés +25kg', done: true, isPublic: true, sets: [{ w: 25, r: 8, done: true }, { w: 25, r: 8, done: true }, { w: 25, r: 6, done: true }] },
          { itemId: 'i15', name: 'Muscle-up', done: true, isPublic: true, sets: [{ r: 3, done: true }, { r: 3, done: true }, { r: 2, done: true }] },
        ],
      },
    ], 'Muscle-up de plus en plus propre. +30kg de lest aux tractions cet été 🎯'),
    makeBotLog('mx2', 'prog_maxime_cal2', 'Handstand & Core', '💪', '#3fffc0', 'sport', 4, [
      {
        blockId: 'b8', title: 'Skills',
        items: [
          { itemId: 'i16', name: 'Handstand wall hold 3×45s', done: true, isPublic: true },
          { itemId: 'i17', name: 'Dragon flag 3×6', done: true, isPublic: true },
          { itemId: 'i18', name: 'L-sit 3×20s', done: true, isPublic: true },
        ],
      },
    ]),
  ],
  bot_lea_005: [
    makeBotLog('le1', 'prog_lea_force', 'Squat & Deadlift', '💪', '#fbbf24', 'sport', 3, [
      {
        blockId: 'b9', title: 'Compound',
        items: [
          { itemId: 'i19', name: 'Squat', done: true, isPublic: true, sets: [{ w: 75, r: 5, done: true }, { w: 75, r: 5, done: true }, { w: 80, r: 3, done: true }, { w: 80, r: 3, done: true }] },
          { itemId: 'i20', name: 'Soulevé de terre', done: true, isPublic: true, sets: [{ w: 100, r: 4, done: true }, { w: 100, r: 4, done: true }, { w: 105, r: 2, done: true }] },
          { itemId: 'i21', name: 'Hip thrust', done: true, isPublic: true, sets: [{ w: 90, r: 10, done: true }, { w: 90, r: 10, done: true }, { w: 90, r: 8, done: true }] },
        ],
      },
    ], 'Squat au poids de corps atteint 🎉 80kg × 3 !'),
    makeBotLog('le2', 'prog_lea_nutrition', 'Bilan nutrition', '🥗', '#22c55e', 'nutrition', 6, [
      {
        blockId: 'b10', title: 'Suivi',
        items: [
          { itemId: 'i22', name: 'Macro tracking fait', done: true, isPublic: true },
          { itemId: 'i23', name: '2L d\'eau atteints', done: true, isPublic: true },
        ],
      },
    ], 'Semaine 3 de suivi macro — 145g protéines/j en moyenne 💪'),
  ],
};

export async function seedBotFriends(myUid: string, myName: string): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  for (const bot of BOT_PROFILES) {
    // Write bot's public profile
    batch.set(doc(db, 'public_profiles', bot.uid), clean({ ...bot, updatedAt: now }));

    // Write friendship entry on my side
    const myFriendEntry: Friend = {
      uid: bot.uid,
      displayName: bot.displayName,
      since: now,
      publicDomains: bot.publicDomains.map((d) => ({ name: d.name, emoji: d.emoji, score: d.score })),
      streak: bot.streak,
      totalPoints: bot.totalPoints,
    };
    batch.set(doc(db, 'friendships', myUid, 'list', bot.uid), clean(myFriendEntry));

    // Write reverse friendship (bot → me)
    const reverseFriendEntry: Friend = {
      uid: myUid,
      displayName: myName,
      since: now,
    };
    batch.set(doc(db, 'friendships', bot.uid, 'list', myUid), clean(reverseFriendEntry));
  }

  await batch.commit();

  // Write bot feed posts in a second pass (separate batch to stay under 500 op limit)
  const postBatch = writeBatch(db);
  for (const [botUid, logs] of Object.entries(BOT_LOGS)) {
    const bot = BOT_PROFILES.find(b => b.uid === botUid)!;
    for (const log of logs) {
      const postRef = doc(collection(db, 'feed_posts'));
      const post: FeedPost = {
        id: postRef.id,
        authorUid: botUid,
        authorName: bot.displayName,
        type: 'session',
        log,
        likes: [],
        commentCount: 0,
        createdAt: log.completedAt ?? log.date,
      };
      postBatch.set(postRef, clean(post));
    }
  }
  await postBatch.commit();
}

// ─── Group Messages ───────────────────────────────────────────────────────────

export async function sendMessage(
  groupId: string,
  message: Omit<GroupMessage, 'id'>
): Promise<void> {
  await addDoc(collection(db, 'groups', groupId, 'messages'), clean(message));
}

export function subscribeToMessages(
  groupId: string,
  cb: (msgs: GroupMessage[]) => void
): () => void {
  const q = query(
    collection(db, 'groups', groupId, 'messages'),
    orderBy('sentAt', 'asc')
  );
  const unsubscribe = onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<GroupMessage, 'id'>),
    }));
    cb(msgs);
  });
  return unsubscribe;
}
