export interface PublicProfileDoc {
  uid: string;
  displayName: string;
  language: 'en' | 'fr';
  discoverable: boolean;
  bio?: string;
  location?: string;
  publicDomains: { name: string; emoji: string; goalCount: number; score: number }[];
  publicGoals: { label: string; type: string; domainName: string }[];
  streak: number;
  totalPoints: number;
  updatedAt: string;
}

export interface FriendRequest {
  fromUid: string;
  fromName: string;
  sentAt: string;
}

export interface Friend {
  uid: string;
  displayName: string;
  since: string;
  publicDomains?: { name: string; emoji: string; score?: number }[];
  streak?: number;
  totalPoints?: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  emoji: string;
  creatorUid: string;
  creatorName: string;
  isPublic: boolean;
  memberCount: number;
  sharedGoals: { label: string; type: string }[];
  createdAt: string;
}

export interface GroupMember {
  uid: string;
  displayName: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface GroupMessage {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  sentAt: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  groupEmoji: string;
  fromUid: string;
  fromName: string;
  invitedAt: string;
}
