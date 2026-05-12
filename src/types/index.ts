import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'author' | 'pending'

export interface BlogUser {
  uid: string
  email: string
  displayName: string
  role: UserRole
  createdAt: Timestamp
  lastLoginAt: Timestamp
}

export type PostStatus = 'draft' | 'published'

export interface Post {
  id: string
  title: string
  slug: string
  content: string        // WYSIWYG出力HTML
  excerpt: string
  authorId: string
  authorName: string
  status: PostStatus
  publishedAt: Timestamp | null
  updatedAt: Timestamp
  metaTitle: string
  metaDescription: string
  ogImageUrl: string
  tags: string[]
  eyecatchUrl: string
  commentsEnabled: boolean
}

export interface Invitation {
  email: string
  role: Exclude<UserRole, 'pending'>
  createdBy: string
  createdAt: Timestamp
}

export type CommentStatus = 'pending' | 'approved' | 'rejected'

export interface Comment {
  id: string
  postId: string
  authorName: string
  content: string
  status: CommentStatus
  createdAt: Timestamp
}
