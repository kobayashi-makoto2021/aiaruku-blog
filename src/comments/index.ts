import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  query, where, orderBy,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Comment, CommentStatus } from '@/types'

export async function getPendingComments(): Promise<Comment[]> {
  const q = query(
    collection(db, 'comments'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment)
}

export async function getAllComments(): Promise<Comment[]> {
  const q = query(collection(db, 'comments'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment)
}

export async function updateCommentStatus(id: string, status: CommentStatus): Promise<void> {
  await updateDoc(doc(db, 'comments', id), { status })
}

export async function deleteComment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'comments', id))
}
