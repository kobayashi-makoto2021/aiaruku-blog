import {
  signInWithPopup,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/firebase'
import { BLOG_CONFIG } from '@/config'
import type { BlogUser, UserRole } from '@/types'

export async function signInWithGoogle(): Promise<void> {
  const result = await signInWithPopup(auth, googleProvider)
  const user = result.user

  if (!isAllowedDomain(user.email ?? '')) {
    await firebaseSignOut(auth)
    throw new Error('このアカウントはログインが許可されていません。')
  }

  await ensureUserDoc(user)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export async function getUserRole(uid: string): Promise<UserRole | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return (snap.data() as BlogUser).role
}

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export async function getGoogleAccessToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('ログインしていません')
  const result = await reauthenticateWithPopup(user, googleProvider)
  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (!credential?.accessToken) throw new Error('アクセストークンの取得に失敗しました')
  return credential.accessToken
}

function isAllowedDomain(email: string): boolean {
  if (BLOG_CONFIG.allowedDomains.length === 0) return true
  return BLOG_CONFIG.allowedDomains.some((domain) => email.endsWith(`@${domain}`))
}

async function ensureUserDoc(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    const inviteRef = doc(db, 'invitations', user.email!)
    const inviteSnap = await getDoc(inviteRef)
    const role = inviteSnap.exists() ? (inviteSnap.data().role as string) : 'pending'

    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    })

    if (inviteSnap.exists()) {
      await deleteDoc(inviteRef)
    }
  } else {
    await updateDoc(ref, { lastLoginAt: serverTimestamp() })
  }
}
