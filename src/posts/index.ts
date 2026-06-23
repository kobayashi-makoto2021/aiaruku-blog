import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Post, PostStatus } from '@/types'

export type PostInput = Pick<
  Post,
  | 'title'
  | 'slug'
  | 'content'
  | 'excerpt'
  | 'eyecatchUrl'
  | 'metaTitle'
  | 'metaDescription'
  | 'ogImageUrl'
  | 'tags'
  | 'commentsEnabled'
>

export async function createPost(
  input: PostInput,
  authorId: string,
  authorName: string,
  status: PostStatus,
  scheduledAt?: Date | null,
): Promise<string> {
  const ref = await addDoc(collection(db, 'posts'), {
    ...input,
    authorId,
    authorName,
    status,
    publishedAt: status === 'published' ? serverTimestamp() : null,
    scheduledAt: status === 'scheduled' && scheduledAt ? Timestamp.fromDate(scheduledAt) : null,
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePost(
  postId: string,
  input: Partial<PostInput>,
  status?: PostStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const data: Record<string, unknown> = {
    ...input,
    updatedAt: serverTimestamp(),
  }
  if (status !== undefined) {
    data.status = status
    if (status === 'published') {
      data.publishedAt = serverTimestamp()
      data.scheduledAt = null
    } else if (status === 'scheduled' && scheduledAt) {
      data.scheduledAt = Timestamp.fromDate(scheduledAt)
      data.publishedAt = null
    } else if (status === 'draft') {
      data.publishedAt = null
      data.scheduledAt = null
    }
  }
  await updateDoc(doc(db, 'posts', postId), data)
}

export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId))
}

export async function getPost(postId: string): Promise<Post | null> {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Post
}

// 自分の記事一覧（author）
export async function getMyPosts(authorId: string): Promise<Post[]> {
  const q = query(
    collection(db, 'posts'),
    where('authorId', '==', authorId),
    orderBy('updatedAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post)
}

// 全記事一覧（admin）
export async function getAllPosts(): Promise<Post[]> {
  const q = query(collection(db, 'posts'), orderBy('updatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post)
}

// 公開記事一覧（静的HTML生成用）
export async function getPublishedPosts(): Promise<Post[]> {
  const q = query(
    collection(db, 'posts'),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post)
}

export function generateSlug(title: string): string {
  return title.trim().replace(/\s+/g, '-').slice(0, 80)
}
