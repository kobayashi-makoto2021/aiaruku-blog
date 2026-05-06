import { collection, getDocs, doc, updateDoc, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase'
import type { BlogUser, UserRole } from '@/types'

export async function getAllUsers(): Promise<BlogUser[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as BlogUser)
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role })
}
