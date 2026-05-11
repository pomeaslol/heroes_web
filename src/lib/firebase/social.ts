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

    // Write reverse friendship (bot → me), allowed because request.auth.uid == friendUid == myUid
    const reverseFriendEntry: Friend = {
      uid: myUid,
      displayName: myName,
      since: now,
    };
    batch.set(doc(db, 'friendships', bot.uid, 'list', myUid), clean(reverseFriendEntry));
  }

  await batch.commit();
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
