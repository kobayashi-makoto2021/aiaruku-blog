import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { onAuthChanged, getUserRole } from '@/auth'
import type { UserRole } from '@/types'
import LoginPage from './pages/Login'
import PendingPage from './pages/Pending'
import Layout from './Layout'
import PostList from './pages/PostList'
import PostEditor from './pages/PostEditor'
import DeployPage from './pages/Deploy'
import UsersPage from './pages/Users'
import CommentsPage from './pages/Comments'
import AnalyticsPage from './pages/Analytics'

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User; role: UserRole }

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    return onAuthChanged(async (user) => {
      if (!user) {
        setAuthState({ status: 'unauthenticated' })
        return
      }
      try {
        const role = await getUserRole(user.uid)
        setAuthState({ status: 'authenticated', user, role: role ?? 'pending' })
      } catch {
        setAuthState({ status: 'unauthenticated' })
      }
    })
  }, [])

  if (authState.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  if (authState.status === 'unauthenticated') {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  if (authState.role === 'pending') {
    return (
      <Routes>
        <Route path="*" element={<PendingPage user={authState.user} />} />
      </Routes>
    )
  }

  const { user, role } = authState

  return (
    <Routes>
      <Route element={<Layout user={user} role={role} />}>
        <Route index element={<PostList user={user} role={role} />} />
        <Route path="posts/new" element={<PostEditor user={user} role={role} />} />
        <Route path="posts/:postId/edit" element={<PostEditor user={user} role={role} />} />
        <Route path="deploy" element={<DeployPage user={user} role={role} />} />
        <Route path="users" element={<UsersPage user={user} role={role} />} />
        <Route path="comments" element={<CommentsPage user={user} role={role} />} />
        {role === 'admin' && <Route path="analytics" element={<AnalyticsPage />} />}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
