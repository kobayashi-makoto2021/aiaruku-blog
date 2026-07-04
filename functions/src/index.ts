import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue, type Firestore } from 'firebase-admin/firestore'
import { GoogleAuth } from 'google-auth-library'
import {
  generateIndexHtml,
  generatePostHtml,
  generateTagHtml,
  generateSitemapXml,
  type Post,
} from './generator'
import { deployToHosting } from './deploy'

initializeApp()

function classifyReferrer(ref: string): 'google' | 'social' | 'direct' | 'internal' | 'booking' | 'other' {
  if (!ref) return 'direct'
  if (/google\.|bing\.|yahoo\.|duckduckgo\./.test(ref)) return 'google'
  if (/twitter\.com|x\.com|facebook\.com|instagram\.com|line\.me/.test(ref)) return 'social'
  if (/booking\.aiaruku\.com/.test(ref)) return 'booking'
  if (/aiaruku\.com/.test(ref)) return 'internal'
  return 'other'
}

export const trackView = onRequest(
  { region: 'asia-northeast1', cors: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }
    const slug = typeof req.body?.slug === 'string' ? req.body.slug.trim() : ''
    if (!slug) {
      res.status(400).send('Bad Request')
      return
    }
    const referrer = typeof req.body?.referrer === 'string' ? req.body.referrer : ''
    const source = classifyReferrer(referrer)

    const jstOffset = 9 * 60 * 60 * 1000
    const date = new Date(Date.now() + jstOffset).toISOString().split('T')[0]
    const docId = `${date}_${slug}`

    const db = getFirestore()
    await db.collection('analyticsDaily').doc(docId).set(
      { date, slug, views: FieldValue.increment(1), [source]: FieldValue.increment(1) },
      { merge: true }
    )
    console.log(`[track-view] ${slug} ${source} ${date}`)
    res.status(200).send('ok')
  }
)

export const publishScheduledPosts = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'asia-northeast1',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getFirestore()
    const now = Timestamp.now()

    const snapshot = await db.collection('posts')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', now)
      .get()

    if (snapshot.empty) {
      console.log('[scheduled publish] 対象記事なし')
      return
    }

    console.log(`[scheduled publish] ${snapshot.size}件を公開処理`)

    const batch = db.batch()
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      batch.update(docSnap.ref, {
        status: 'published',
        publishedAt: data['scheduledAt'],
        scheduledAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      })
      console.log(`[scheduled publish] 公開: ${data['title']}`)
    }
    await batch.commit()

    console.log('[scheduled publish] デプロイ開始')
    await deployBlog(db)
    console.log('[scheduled publish] 完了')
  },
)

async function deployBlog(db: Firestore): Promise<void> {
  const postsSnap = await db.collection('posts')
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .get()

  const posts: Post[] = postsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Post))

  const files: Record<string, string> = {}
  files['/index.html'] = generateIndexHtml(posts)

  for (const post of posts) {
    files[`/${post.slug}/index.html`] = generatePostHtml(post)
  }

  const tagGrouped = new Map<string, Post[]>()
  for (const post of posts) {
    for (const tag of post.tags) {
      if (!tagGrouped.has(tag)) tagGrouped.set(tag, [])
      tagGrouped.get(tag)!.push(post)
    }
  }

  const allTagCountMap = new Map([...tagGrouped.entries()].map(([t, ps]) => [t, ps.length]))
  for (const [tag, tagPosts] of tagGrouped) {
    const tagHtml = generateTagHtml(tag, tagPosts, allTagCountMap)
    files[`/tag/${tag}/index.html`] = tagHtml
    const encodedTag = encodeURIComponent(tag)
    if (encodedTag !== tag) {
      files[`/tag/${encodedTag}/index.html`] = tagHtml
    }
  }

  files['/sitemap.xml'] = generateSitemapXml(posts)

  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/firebase.hosting'],
  })
  const client = await auth.getClient()
  const tokenResponse = await client.getAccessToken()
  if (!tokenResponse.token) throw new Error('サービスアカウントトークンの取得に失敗しました')

  console.log(`[scheduled publish] ${Object.keys(files).length}ファイルをデプロイ中...`)
  await deployToHosting(files, tokenResponse.token)
}
