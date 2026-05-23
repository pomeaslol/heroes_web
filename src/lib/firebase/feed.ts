import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';
import type { FeedPost, FeedComment } from '@/models/feed';

function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function publishFeedPost(post: Omit<FeedPost, 'id'>): Promise<string> {
  const ref = doc(collection(db, 'feed_posts'));
  await setDoc(ref, clean({ ...post, id: ref.id }));
  return ref.id;
}

export async function loadFeedPosts(uids: string[]): Promise<FeedPost[]> {
  if (uids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));

  const results: FeedPost[] = [];
  for (const chunk of chunks) {
    const q = query(collection(db, 'feed_posts'), where('authorUid', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => results.push(d.data() as FeedPost));
  }

  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 60);
}

export async function toggleLike(postId: string, uid: string, isCurrentlyLiked: boolean): Promise<void> {
  await updateDoc(doc(db, 'feed_posts', postId), {
    likes: isCurrentlyLiked ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function addComment(postId: string, comment: Omit<FeedComment, 'id'>): Promise<FeedComment> {
  const ref = await addDoc(collection(db, 'feed_posts', postId, 'comments'), clean(comment));
  await updateDoc(doc(db, 'feed_posts', postId), { commentCount: increment(1) });
  return { id: ref.id, ...comment };
}

export async function loadComments(postId: string): Promise<FeedComment[]> {
  const q = query(collection(db, 'feed_posts', postId, 'comments'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FeedComment, 'id'>) }));
}

export async function deleteFeedPost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'feed_posts', postId));
}
