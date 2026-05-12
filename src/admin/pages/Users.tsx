import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import type { BlogUser, Invitation, UserRole } from '@/types'
import { getAllUsers, updateUserRole, getInvitations, createInvitation, deleteInvitation } from '@/users'

interface Props {
  user: User
  role: UserRole
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: '管理者',
  author: '投稿者',
  pending: '承認待ち',
}

const ROLE_STYLE: Record<UserRole, string> = {
  admin: 'bg-blue-100 text-blue-700',
  author: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
}

export default function UsersPage({ user: currentUser, role }: Props) {
  const [users, setUsers] = useState<BlogUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Exclude<UserRole, 'pending'>>('author')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  if (role !== 'admin') {
    return <p className="text-sm text-gray-500">管理者のみアクセスできます。</p>
  }

  useEffect(() => {
    Promise.all([getAllUsers(), getInvitations()]).then(([userData, inviteData]) => {
      setUsers(userData)
      setInvitations(inviteData)
      setLoading(false)
    })
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return
    setInviting(true)
    setInviteMsg(null)
    try {
      await createInvitation(email, inviteRole, currentUser.uid)
      setInvitations((prev) => [...prev, { email, role: inviteRole, createdBy: currentUser.uid, createdAt: null as never }])
      setInviteEmail('')
      setInviteMsg('招待しました')
      setTimeout(() => setInviteMsg(null), 3000)
    } catch {
      setInviteMsg('失敗しました')
    } finally {
      setInviting(false)
    }
  }

  async function handleCancelInvite(email: string) {
    await deleteInvitation(email)
    setInvitations((prev) => prev.filter((i) => i.email !== email))
  }

  async function handleRoleChange(uid: string, newRole: UserRole) {
    setUpdating(uid)
    try {
      await updateUserRole(uid, newRole)
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: newRole } : u))
    } finally {
      setUpdating(null)
    }
  }

  const pending = users.filter((u) => u.role === 'pending')
  const active = users.filter((u) => u.role !== 'pending')

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-bold text-gray-800">ユーザー管理</h2>

      {/* 招待フォーム */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">メンバーを招待</h3>
        <form onSubmit={handleInvite} className="flex gap-2 flex-wrap">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="メールアドレス"
            required
            className="flex-1 min-w-48 rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Exclude<UserRole, 'pending'>)}
            className="rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="author">投稿者</option>
            <option value="admin">管理者</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {inviting ? '送信中...' : '招待する'}
          </button>
        </form>
        {inviteMsg && (
          <p className={`mt-2 text-xs ${inviteMsg.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>{inviteMsg}</p>
        )}
        {invitations.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-gray-400">招待中（ログイン待ち）</p>
            {invitations.map((inv) => (
              <div key={inv.email} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm">
                <span className="text-gray-700">{inv.email}</span>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${inv.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {ROLE_LABEL[inv.role]}
                  </span>
                  <button
                    onClick={() => handleCancelInvite(inv.email)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    取消
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : (
        <>
          {/* 承認待ち */}
          {pending.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-yellow-700 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-xs">{pending.length}</span>
                承認待ち
              </h3>
              <div className="divide-y divide-gray-100 rounded-lg border border-yellow-200 bg-white">
                {pending.map((u) => (
                  <UserRow
                    key={u.uid}
                    user={u}
                    isSelf={u.uid === currentUser.uid}
                    updating={updating === u.uid}
                    onRoleChange={handleRoleChange}
                  />
                ))}
              </div>
            </section>
          )}

          {/* アクティブユーザー */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-gray-600">メンバー（{active.length}名）</h3>
            {active.length === 0 ? (
              <p className="text-sm text-gray-400">メンバーがいません</p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                {active.map((u) => (
                  <UserRow
                    key={u.uid}
                    user={u}
                    isSelf={u.uid === currentUser.uid}
                    updating={updating === u.uid}
                    onRoleChange={handleRoleChange}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function UserRow({
  user,
  isSelf,
  updating,
  onRoleChange,
}: {
  user: BlogUser
  isSelf: boolean
  updating: boolean
  onRoleChange: (uid: string, role: UserRole) => void
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm">
          {user.displayName || '（名前なし）'}
          {isSelf && <span className="ml-2 text-xs text-gray-400">（自分）</span>}
        </p>
        <p className="text-xs text-gray-400">{user.email}</p>
      </div>

      <span className={`rounded-full px-2 py-0.5 text-xs flex-shrink-0 ${ROLE_STYLE[user.role]}`}>
        {ROLE_LABEL[user.role]}
      </span>

      {!isSelf && (
        <div className="flex gap-1 flex-shrink-0">
          {user.role !== 'author' && (
            <button
              onClick={() => onRoleChange(user.uid, 'author')}
              disabled={updating}
              className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              投稿者にする
            </button>
          )}
          {user.role !== 'admin' && (
            <button
              onClick={() => onRoleChange(user.uid, 'admin')}
              disabled={updating}
              className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              管理者にする
            </button>
          )}
          {user.role !== 'pending' && (
            <button
              onClick={() => onRoleChange(user.uid, 'pending')}
              disabled={updating}
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              停止
            </button>
          )}
        </div>
      )}
    </div>
  )
}
