import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { Conversation, ConvMember, Message } from '@/models/conversation';

function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function getConversations(uid: string): Promise<Conversation[]> {
  const q = query(collection(db, 'conversations'), where('memberUids', 'array-contains', uid));
  const snap = await getDocs(q);
  const convos = snap.docs.map(d => d.data() as Conversation);
  return convos.sort((a, b) =>
    (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt)
  );
}

export async function createDM(
  myUid: string,
  myName: string,
  friendUid: string,
  friendName: string
): Promise<Conversation> {
  // Check if a DM already exists between these two users
  const snap = await getDocs(
    query(collection(db, 'conversations'), where('memberUids', 'array-contains', myUid))
  );
  const existing = snap.docs
    .map(d => d.data() as Conversation)
    .find(c => c.type === 'dm' && c.memberUids.includes(friendUid));
  if (existing) return existing;

  const ref = doc(collection(db, 'conversations'));
  const now = new Date().toISOString();
  const convo: Conversation = {
    id: ref.id,
    type: 'dm',
    name: friendName,
    creatorUid: myUid,
    memberUids: [myUid, friendUid],
    memberCount: 2,
    createdAt: now,
  };
  const batch = writeBatch(db);
  batch.set(ref, clean(convo));
  batch.set(
    doc(db, 'conversations', ref.id, 'members', myUid),
    clean({ uid: myUid, displayName: myName, role: 'admin', joinedAt: now })
  );
  batch.set(
    doc(db, 'conversations', ref.id, 'members', friendUid),
    clean({ uid: friendUid, displayName: friendName, role: 'member', joinedAt: now })
  );
  await batch.commit();
  return convo;
}

export async function createGroup(
  name: string,
  emoji: string,
  creatorUid: string,
  creatorName: string,
  members: { uid: string; displayName: string }[]
): Promise<Conversation> {
  const ref = doc(collection(db, 'conversations'));
  const now = new Date().toISOString();
  const all = [{ uid: creatorUid, displayName: creatorName }, ...members];
  const convo: Conversation = {
    id: ref.id,
    type: 'group',
    name,
    emoji,
    creatorUid,
    memberUids: all.map(m => m.uid),
    memberCount: all.length,
    createdAt: now,
  };
  const batch = writeBatch(db);
  batch.set(ref, clean(convo));
  for (const m of all) {
    batch.set(
      doc(db, 'conversations', ref.id, 'members', m.uid),
      clean({ uid: m.uid, displayName: m.displayName, role: m.uid === creatorUid ? 'admin' : 'member', joinedAt: now })
    );
  }
  await batch.commit();
  return convo;
}

export async function getMembers(convoId: string): Promise<ConvMember[]> {
  const snap = await getDocs(collection(db, 'conversations', convoId, 'members'));
  return snap.docs.map(d => d.data() as ConvMember);
}

export async function sendMessage(convoId: string, msg: Omit<Message, 'id'>): Promise<void> {
  const batch = writeBatch(db);
  const msgRef = doc(collection(db, 'conversations', convoId, 'messages'));
  batch.set(msgRef, clean({ ...msg, id: msgRef.id }));
  batch.update(doc(db, 'conversations', convoId), {
    lastMessage: msg.text.slice(0, 80),
    lastMessageAt: msg.sentAt,
  });
  await batch.commit();
}

export function subscribeToMessages(
  convoId: string,
  cb: (msgs: Message[]) => void
): () => void {
  const q = query(
    collection(db, 'conversations', convoId, 'messages'),
    orderBy('sentAt', 'asc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as Message));
  });
}

export async function kickMember(convoId: string, uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'conversations', convoId, 'members', uid));
  batch.update(doc(db, 'conversations', convoId), {
    memberUids: arrayRemove(uid),
    memberCount: increment(-1),
  });
  await batch.commit();
}

export async function leaveConversation(convoId: string, uid: string): Promise<void> {
  return kickMember(convoId, uid);
}

export async function addMemberToGroup(
  convoId: string,
  uid: string,
  displayName: string
): Promise<void> {
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'conversations', convoId, 'members', uid),
    clean({ uid, displayName, role: 'member', joinedAt: now })
  );
  batch.update(doc(db, 'conversations', convoId), {
    memberUids: arrayUnion(uid),
    memberCount: increment(1),
  });
  await batch.commit();
}
