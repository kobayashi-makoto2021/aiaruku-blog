import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { User } from 'firebase/auth'
import type { UserRole } from '@/types'
import { createPost, updatePost, getPost, generateSlug, type PostInput } from '@/posts'
import { uploadImage } from '@/storage'
import { runDeploy } from '@/hosting'
import { BLOG_CONFIG } from '@/config'
import type { PostStatus } from '@/types'
import Editor from '@/admin/components/Editor'
import SeoPanel from '@/admin/components/SeoPanel'
import TagInput from '@/admin/components/TagInput'

interface Props {
  user: User
  role: UserRole
}

const EMPTY_FORM: PostInput = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  eyecatchUrl: '',
  metaTitle: '',
  metaDescription: '',
  ogImageUrl: '',
  tags: [],
  commentsEnabled: false,
}

export default function PostEditor({ user }: Props) {
  const { postId } = useParams<{ postId?: string }>()
  const isNew = !postId
  const navigate = useNavigate()

  const [form, setForm] = useState<PostInput>(EMPTY_FORM)
  const [currentStatus, setCurrentStatus] = useState<PostStatus>('draft')
  const [slugEdited, setSlugEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [deploying, setDeploying] = useState(false)
  const [showSeo, setShowSeo] = useState(false)
  const [savedPostId, setSavedPostId] = useState<string | null>(postId ?? null)

  // 新規記事でも画像をアップロードできるよう一時IDを持つ
  const tempId = useRef(postId ?? `tmp-${Date.now()}`)

  useEffect(() => {
    if (!postId) return
    getPost(postId).then((post) => {
      if (!post) return
      setForm({
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        eyecatchUrl: post.eyecatchUrl,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        ogImageUrl: post.ogImageUrl,
        tags: post.tags,
        commentsEnabled: post.commentsEnabled ?? false,
      })
      setCurrentStatus(post.status)
      setSlugEdited(true)
      // commentsEnabled が未設定の古い記事は false 扱い
    })
  }, [postId])

  function set<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleTitleChange(title: string) {
    set('title', title)
    if (!slugEdited) set('slug', generateSlug(title))
  }

  async function handleEyecatchUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const id = savedPostId ?? tempId.current
    const url = await uploadImage(file, id, 'eyecatch')
    set('eyecatchUrl', url)
  }

  async function save(status: 'draft' | 'published') {
    if (!form.title.trim()) {
      alert('タイトルを入力してください')
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      let id: string
      if (isNew && !savedPostId) {
        id = await createPost(form, user.uid, user.displayName ?? '', status)
        setSavedPostId(id)
      } else {
        id = savedPostId ?? postId!
        await updatePost(id, form, status)
      }
      setCurrentStatus(status)
      if (status === 'published' || (currentStatus === 'published' && status === 'draft')) {
        setSaveMsg('デプロイ中...')
        setDeploying(true)
        try {
          await runDeploy()
        } finally {
          setDeploying(false)
        }
        navigate('/')
      } else {
        if (isNew && !savedPostId) {
          navigate(`/posts/${id}/edit`, { replace: true })
        }
        setSaveMsg('下書きを保存しました')
        setTimeout(() => setSaveMsg(null), 3000)
      }
    } catch (e) {
      setSaveMsg('失敗しました: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex gap-6">
      {/* メインエリア */}
      <div className="flex-1 min-w-0 space-y-4">
        <input
          type="text"
          value={form.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="記事タイトル"
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>URL:</span>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => { set('slug', e.target.value); setSlugEdited(true) }}
            className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Editor
          content={form.content}
          onChange={(html) => set('content', html)}
          tempPostId={tempId.current}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">抜粋</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => set('excerpt', e.target.value)}
            rows={2}
            placeholder="記事一覧に表示される短い説明（省略可）"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* サイドバー */}
      <aside className="w-64 flex-shrink-0 space-y-4">
        {/* 保存ボタン */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
          {currentStatus === 'published' ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">公開中</span>
              </div>
              <button
                onClick={() => save('published')}
                disabled={saving || deploying}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {deploying ? 'デプロイ中...' : saving ? '保存中...' : '更新して公開'}
              </button>
              <button
                onClick={() => save('draft')}
                disabled={saving || deploying}
                className="w-full rounded-lg border border-orange-300 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
              >
                非公開にする
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">下書き</span>
              </div>
              <button
                onClick={() => save('published')}
                disabled={saving || deploying}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {deploying ? 'デプロイ中...' : saving ? '保存中...' : '公開する'}
              </button>
              <button
                onClick={() => save('draft')}
                disabled={saving}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                下書き保存
              </button>
            </>
          )}
          {form.slug && (
            <a
              href={`${BLOG_CONFIG.siteUrl}/${form.slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 truncate"
            >
              <span className="flex-shrink-0">🔗</span>
              <span className="truncate">{BLOG_CONFIG.siteUrl}/{form.slug}/</span>
            </a>
          )}
          <button
            onClick={() => navigate('/')}
            className="w-full text-sm text-gray-400 hover:text-gray-600"
          >
            ← 一覧に戻る
          </button>
          {saveMsg && (
            <p className={`text-xs text-center ${saveMsg.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>
              {saveMsg}
            </p>
          )}
        </div>

        {/* アイキャッチ */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">アイキャッチ画像</p>
          {form.eyecatchUrl && (
            <img src={form.eyecatchUrl} alt="" className="mb-2 w-full rounded object-cover aspect-video" />
          )}
          <label className="flex cursor-pointer items-center justify-center rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
            画像を選択
            <input type="file" accept="image/*" className="hidden" onChange={handleEyecatchUpload} />
          </label>
        </div>

        {/* タグ */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">タグ</p>
          <TagInput tags={form.tags} onChange={(tags) => set('tags', tags)} />
        </div>

        {/* コメント */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700">コメントを受け付ける</span>
            <button
              type="button"
              onClick={() => set('commentsEnabled', !form.commentsEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                form.commentsEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                form.commentsEnabled ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </label>
        </div>

        {/* SEO */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <button
            onClick={() => setShowSeo((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-700"
          >
            SEO設定
            <span className="text-gray-400">{showSeo ? '▲' : '▼'}</span>
          </button>
          {showSeo && (
            <div className="mt-3">
              <SeoPanel
                metaTitle={form.metaTitle}
                metaDescription={form.metaDescription}
                ogImageUrl={form.ogImageUrl}
                onMetaTitleChange={(v) => set('metaTitle', v)}
                onMetaDescriptionChange={(v) => set('metaDescription', v)}
                onOgImageUrlChange={(v) => set('ogImageUrl', v)}
                postTitle={form.title}
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
