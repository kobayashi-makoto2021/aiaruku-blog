import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import type { UserRole } from '@/types'
import { signOut } from '@/auth'
import { BLOG_CONFIG } from '@/config'
import { getPendingComments } from '@/comments'

interface Props {
  user: User
  role: UserRole
}

export default function Layout({ user, role }: Props) {
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (role !== 'admin') return
    getPendingComments().then((c) => setPendingCount(c.length))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="font-bold text-gray-800 hover:text-blue-600"
        >
          {BLOG_CONFIG.siteName} ブログ管理
        </button>
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-800'}>
            記事一覧
          </NavLink>
          {role === 'admin' && (
            <NavLink to="/comments" className={({ isActive }) => `relative ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`}>
              コメント
              {pendingCount > 0 && (
                <span className="ml-1 rounded-full bg-yellow-400 px-1.5 py-0.5 text-xs text-white font-bold">{pendingCount}</span>
              )}
            </NavLink>
          )}
          {role === 'admin' && (
            <NavLink to="/users" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-800'}>
              ユーザー
            </NavLink>
          )}
          {role === 'admin' && (
            <NavLink to="/analytics" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-800'}>
              アクセス解析
            </NavLink>
          )}
          {role === 'admin' && (
            <NavLink to="/deploy" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-800'}>
              デプロイ
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block">{user.displayName}</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            {role === 'admin' ? '管理者' : '投稿者'}
          </span>
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  )
}
