interface SeoPanelProps {
  metaTitle: string
  metaDescription: string
  ogImageUrl: string
  onMetaTitleChange: (v: string) => void
  onMetaDescriptionChange: (v: string) => void
  onOgImageUrlChange: (v: string) => void
  postTitle: string
}

export default function SeoPanel({
  metaTitle,
  metaDescription,
  ogImageUrl,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onOgImageUrlChange,
  postTitle,
}: SeoPanelProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          メタタイトル
          <span className="ml-1 font-normal text-gray-400">（空欄 = 記事タイトルを使用）</span>
        </label>
        <input
          type="text"
          value={metaTitle}
          onChange={(e) => onMetaTitleChange(e.target.value)}
          placeholder={postTitle}
          className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">{(metaTitle || postTitle).length} 文字</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          メタディスクリプション
        </label>
        <textarea
          value={metaDescription}
          onChange={(e) => onMetaDescriptionChange(e.target.value)}
          rows={3}
          placeholder="検索結果に表示される説明文（120文字程度推奨）"
          className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="mt-1 text-xs text-gray-400">{metaDescription.length} 文字</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          OG画像URL
          <span className="ml-1 font-normal text-gray-400">（空欄 = アイキャッチを使用）</span>
        </label>
        <input
          type="text"
          value={ogImageUrl}
          onChange={(e) => onOgImageUrlChange(e.target.value)}
          placeholder="https://..."
          className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}
