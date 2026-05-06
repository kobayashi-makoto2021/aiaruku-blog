import { getGoogleAccessToken } from '@/auth'
import { getPublishedPosts } from '@/posts'
import { generatePostHtml, generateIndexHtml, generateSitemapXml } from '@/generator'
import { deployToHosting } from './deploy'

export async function runDeploy(onProgress?: (msg: string) => void): Promise<void> {
  onProgress?.('Googleアカウントで認証中...')
  const accessToken = await getGoogleAccessToken()

  onProgress?.('公開記事を取得中...')
  const posts = await getPublishedPosts()

  onProgress?.('HTMLを生成中...')
  const files: Record<string, string> = {}
  files['/index.html'] = generateIndexHtml(posts)
  for (const post of posts) {
    files[`/${post.slug}/index.html`] = generatePostHtml(post)
  }
  files['/sitemap.xml'] = generateSitemapXml(posts)

  await deployToHosting(files, accessToken, onProgress)
}
