import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import type { BlogUser, Invitation, UserRole } from '@/types'

export async function getAllUsers(): Promise<BlogUser[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as BlogUser)
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role })
}

export async function getInvitations(): Promise<Invitation[]> {
  const snap = await getDocs(collection(db, 'invitations'))
  return snap.docs.map((d) => d.data() as Invitation)
}

export async function createInvitation(email: string, role: Exclude<UserRole, 'pending'>, createdBy: string): Promise<void> {
  await setDoc(doc(db, 'invitations', email), { email, role, createdBy, createdAt: serverTimestamp() })
}

export async function deleteInvitation(email: string): Promise<void> {
  await deleteDoc(doc(db, 'invitations', email))
}
