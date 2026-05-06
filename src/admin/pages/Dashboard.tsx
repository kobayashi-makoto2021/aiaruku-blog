import type { User } from 'firebase/auth'
import type { UserRole } from '@/types'
import { signOut } from '@/auth'
import { BLOG_CONFIG } from '@/config'

interface Props {
  user: User
  role: UserRole
}

export default function DashboardPage({ user, role }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-gray-800">{BLOG_CONFIG.siteName} ブログ管理</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.displayName}</span>
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

      <main className="mx-auto max-w-4xl p-6">
        <p className="text-gray-500 text-sm">Phase 2で記事管理機能を追加します。</p>
      </main>
    </div>
  )
}
