export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name: string;
  emoji?: string;
  creatorUid: string;
  memberUids: string[];
  memberCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface ConvMember {
  uid: string;
  displayName: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Message {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  sentAt: string;
}
