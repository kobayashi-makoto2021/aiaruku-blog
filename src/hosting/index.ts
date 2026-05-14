import { getGoogleAccessToken } from '@/auth'
import { getPublishedPosts } from '@/posts'
import { generatePostHtml, generateIndexHtml, generateTagHtml, generateSitemapXml } from '@/generator'
import { deployToHosting } from './deploy'
import type { Post } from '@/types'

export async function runDeploy(onProgress?: (msg: string) => void): Promise<void> {
  onProgress?.('Googleアカウントで認証中...')
  const accessToken = await getGoogleAccessToken()

  onProgress?.('公開記事を取得中...')
  const posts = await getPublishedPosts()

  onProgress?.('HTMLを生成中...')
  const files: Record<string, string> = {}

  // トップページ
  files['/index.html'] = generateIndexHtml(posts)

  // 個別記事ページ
  for (const post of posts) {
    files[`/${post.slug}/index.html`] = generatePostHtml(post)
  }

  // タグ別にグループ化
  const tagGrouped = new Map<string, Post[]>()
  for (const post of posts) {
    for (const tag of post.tags) {
      if (!tagGrouped.has(tag)) tagGrouped.set(tag, [])
      tagGrouped.get(tag)!.push(post)
    }
  }

  // タグページ生成（サイドバー用に全タグの件数マップを渡す）
  const allTagCountMap = new Map([...tagGrouped.entries()].map(([t, ps]) => [t, ps.length]))
  for (const [tag, tagPosts] of tagGrouped) {
    files[`/tag/${tag}/index.html`] = generateTagHtml(tag, tagPosts, allTagCountMap)
  }

  // サイトマップ
  files['/sitemap.xml'] = generateSitemapXml(posts)

  await deployToHosting(files, accessToken, onProgress)
}
