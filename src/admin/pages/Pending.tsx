import type { User } from 'firebase/auth'
import { signOut } from '@/auth'

interface Props {
  user: User
}

export default function PendingPage({ user }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md text-center">
        <div className="mb-4 text-4xl">⏳</div>
        <h1 className="mb-2 text-lg font-bold text-gray-800">承認待ちです</h1>
        <p className="mb-1 text-sm text-gray-500">
          {user.email}
        </p>
        <p className="mb-8 text-sm text-gray-500">
          管理者がアカウントを承認するまでお待ちください。
        </p>
        <button
          onClick={() => signOut()}
          className="text-sm text-gray-400 underline hover:text-gray-600"
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}
