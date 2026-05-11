import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { AppData } from '@/models/app-data';
import { PublicProfile, MatchingProfile } from '@/models/public-profile';

// App data sync — mirrors Flutter's users/{uid}/app_data/current
export async function fetchAppData(uid: string): Promise<AppData | null> {
  const ref = doc(db, 'users', uid, 'app_data', 'current');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as AppData) : null;
}

// Strips undefined values (Firestore rejects them)
function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function saveAppData(uid: string, data: AppData): Promise<void> {
  const ref = doc(db, 'users', uid, 'app_data', 'current');
  await setDoc(ref, clean({ ...data, lastSyncedAt: new Date().toISOString() }));
}

// Public profile — mirrors Flutter's users/{uid}/public_profile/current
export async function fetchPublicProfile(uid: string): Promise<PublicProfile | null> {
  const ref = doc(db, 'users', uid, 'public_profile', 'current');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as PublicProfile) : null;
}

export async function savePublicProfile(uid: string, profile: PublicProfile): Promise<void> {
  const ref = doc(db, 'users', uid, 'public_profile', 'current');
  await setDoc(ref, { ...profile, updatedAt: new Date().toISOString() });
}

// Matching profile
export async function saveMatchingProfile(uid: string, profile: MatchingProfile): Promise<void> {
  const ref = doc(db, 'users', uid, 'matching_profile', 'current');
  await setDoc(ref, { ...profile, updatedAt: new Date().toISOString() });
}
