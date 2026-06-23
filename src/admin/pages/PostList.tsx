import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from 'firebase/auth'
import type { Post, UserRole } from '@/types'
import { getAllPosts, getMyPosts, deletePost, updatePost } from '@/posts'
import { runDeploy } from '@/hosting'
import { extractFirstImage } from '@/generator'

interface Props {
  user: User
  role: UserRole
}

export default function PostList({ user, role }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const data =
        role === 'admin' ? await getAllPosts() : await getMyPosts(user.uid)
      setPosts(data)
      setLoading(false)
    }
    load()
  }, [user.uid, role])

  async function handleDelete(post: Post) {
    if (!window.confirm(`「${post.title}」を削除しますか？`)) return
    await deletePost(post.id)
    setPosts((prev) => prev.filter((p) => p.id !== post.id))
  }

  async function handleToggleStatus(post: Post) {
    if (post.status === 'published') {
      if (!window.confirm(`「${post.title}」を非公開にしますか？`)) return
      setTogglingId(post.id)
      try {
        await updatePost(post.id, {}, 'draft')
        setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, status: 'draft' } : p))
        await runDeploy()
      } finally {
        setTogglingId(null)
      }
    } else if (post.status === 'scheduled') {
      if (!window.confirm(`「${post.title}」の予約を解除して下書きに戻しますか？`)) return
      setTogglingId(post.id)
      try {
        await updatePost(post.id, {}, 'draft')
        setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, status: 'draft' } : p))
      } finally {
        setTogglingId(null)
      }
    } else {
      if (!window.confirm(`「${post.title}」を公開しますか？`)) return
      setTogglingId(post.id)
      try {
        await updatePost(post.id, {}, 'published')
        setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, status: 'published' } : p))
        await runDeploy()
      } finally {
        setTogglingId(null)
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">記事一覧</h2>
        <button
          onClick={() => navigate('/posts/new')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          ＋ 新しい記事
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-400">まだ記事がありません</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {posts.map((post) => (
            <div key={post.id} className="flex items-center gap-4 px-4 py-3">
              <Thumbnail post={post} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-800">{post.title}</p>
                <p className="text-xs text-gray-400">
                  {role === 'admin' && <span className="mr-2">{post.authorName}</span>}
                  {post.updatedAt
                    ? new Date((post.updatedAt as unknown as { seconds: number }).seconds * 1000).toLocaleDateString('ja-JP')
                    : ''}
                </p>
              </div>
              <button
                onClick={() => handleToggleStatus(post)}
                disabled={togglingId === post.id}
                title={
                  post.status === 'published' ? 'クリックして非公開にする' :
                  post.status === 'scheduled' ? 'クリックして予約を解除する' :
                  'クリックして公開する'
                }
                className={`rounded-full px-2 py-0.5 text-xs flex-shrink-0 transition hover:opacity-70 disabled:opacity-50 ${
                  post.status === 'published' ? 'bg-green-100 text-green-700' :
                  post.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}
              >
                {togglingId === post.id ? '処理中...' :
                  post.status === 'published' ? '公開中' :
                  post.status === 'scheduled' ? '予約中' :
                  '下書き'}
              </button>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate(`/posts/${post.id}/edit`)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(post)}
                  className="text-sm text-red-400 hover:underline"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Thumbnail({ post }: { post: Post }) {
  const candidates = [post.eyecatchUrl, extractFirstImage(post.content)].filter(Boolean)
  const [index, setIndex] = useState(0)
  const src = candidates[index] ?? ''

  if (!src) return <div className="h-12 w-16 rounded bg-gray-100 flex-shrink-0" />
  return (
    <img
      src={src}
      alt=""
      className="h-12 w-16 rounded object-cover flex-shrink-0"
      onError={() => setIndex((i) => i + 1)}
    />
  )
}
