import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import type { Comment, UserRole } from '@/types'
import { getAllComments, updateCommentStatus, deleteComment } from '@/comments'

interface Props {
  user: User
  role: UserRole
}

const STATUS_LABEL = { pending: '承認待ち', approved: '承認済み', rejected: '却下' }
const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-100 text-gray-500',
}

export default function CommentsPage({ role }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [actingId, setActingId] = useState<string | null>(null)

  if (role !== 'admin') {
    return <p className="text-sm text-gray-500">管理者のみアクセスできます。</p>
  }

  useEffect(() => {
    getAllComments().then((data) => {
      setComments(data)
      setLoading(false)
    })
  }, [])

  async function handleStatus(comment: Comment, status: Comment['status']) {
    setActingId(comment.id)
    try {
      await updateCommentStatus(comment.id, status)
      setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, status } : c))
    } finally {
      setActingId(null)
    }
  }

  async function handleDelete(comment: Comment) {
    if (!window.confirm('このコメントを削除しますか？')) return
    setActingId(comment.id)
    try {
      await deleteComment(comment.id)
      setComments((prev) => prev.filter((c) => c.id !== comment.id))
    } finally {
      setActingId(null)
    }
  }

  const filtered = filter === 'all' ? comments : comments.filter((c) => c.status === filter)
  const pendingCount = comments.filter((c) => c.status === 'pending').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">
          コメント管理
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">{pendingCount} 件承認待ち</span>
          )}
        </h2>
        <div className="flex gap-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                filter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'すべて' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-400">コメントがありません</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {filtered.map((comment) => (
            <div key={comment.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-800">{comment.authorName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[comment.status]}`}>
                      {STATUS_LABEL[comment.status]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {comment.createdAt
                        ? new Date((comment.createdAt as unknown as { seconds: number }).seconds * 1000).toLocaleDateString('ja-JP')
                        : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{comment.content}</p>
                  <p className="text-xs text-gray-400 mt-1">記事ID: {comment.postId}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {comment.status !== 'approved' && (
                    <button
                      onClick={() => handleStatus(comment, 'approved')}
                      disabled={actingId === comment.id}
                      className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
                    >
                      承認
                    </button>
                  )}
                  {comment.status !== 'rejected' && (
                    <button
                      onClick={() => handleStatus(comment, 'rejected')}
                      disabled={actingId === comment.id}
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      却下
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(comment)}
                    disabled={actingId === comment.id}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
