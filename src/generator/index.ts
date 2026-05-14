import type { Post } from '@/types'
import { BLOG_CONFIG } from '@/config'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(post: Post): string {
  if (!post.publishedAt) return ''
  const ts = post.publishedAt as unknown as { seconds: number }
  return new Date(ts.seconds * 1000).toISOString()
}

function formatDateJa(post: Post): string {
  if (!post.publishedAt) return ''
  const ts = post.publishedAt as unknown as { seconds: number }
  return new Date(ts.seconds * 1000).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function gtagSnippet(): string {
  const id = BLOG_CONFIG.gaId
  if (!id) return ''
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`
}

export function extractFirstImage(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.querySelector('img')?.getAttribute('src') ?? ''
}

export function resolveEyecatch(post: { eyecatchUrl: string; content: string }): string {
  return post.eyecatchUrl || extractFirstImage(post.content)
}

function tagUrl(tag: string): string {
  return `${BLOG_CONFIG.siteUrl}/tag/${tag}/`
}

function buildTagMap(posts: Post[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1)
    }
  }
  return map
}

function renderHeader(): string {
  const nav = BLOG_CONFIG.parentSiteNav.length > 0
    ? `<nav class="header-nav">
      ${BLOG_CONFIG.parentSiteNav.map(item => `<a href="${item.href}">${escapeHtml(item.label)}</a>`).join('\n      ')}
      <a href="${BLOG_CONFIG.parentSiteUrl}/" class="btn-back">← 公式サイトに戻る</a>
    </nav>`
    : `<a href="/admin/" class="admin-link">管理者ログイン</a>`

  return `<header class="site-header">
    <a href="${BLOG_CONFIG.siteUrl}/" class="site-logo">${escapeHtml(BLOG_CONFIG.siteName)}</a>
    ${nav}
  </header>`
}

function renderFooter(): string {
  const year = new Date().getFullYear()
  return `<footer>
    <div class="footer-inner">
      <div class="footer-logo">${escapeHtml(BLOG_CONFIG.siteName)}</div>
      <div class="footer-links">
        ${BLOG_CONFIG.parentSiteUrl ? `<a href="${BLOG_CONFIG.parentSiteUrl}/">公式サイト</a>` : ''}
        <a href="/admin/">管理画面</a>
      </div>
      <p class="footer-copy">© ${year} ${escapeHtml(BLOG_CONFIG.siteName)}. All rights reserved.</p>
    </div>
  </footer>`
}

function renderSidebar(tagMap: Map<string, number>): string {
  const tagItems = [...tagMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) =>
      `<li><a href="${tagUrl(tag)}">${escapeHtml(tag)}<span class="tag-count">${count}</span></a></li>`,
    ).join('')

  const ctaLink = BLOG_CONFIG.parentSiteUrl || BLOG_CONFIG.siteUrl

  return `<aside>
      ${tagItems ? `<div class="side-card">
        <p class="side-title">カテゴリ</p>
        <ul class="tag-list">${tagItems}</ul>
      </div>` : ''}
      <div class="cta-card">
        <p class="cta-title">まずは体験してみませんか？</p>
        <p class="cta-sub">無料体験会を随時開催中。まずはお気軽にご参加ください。</p>
        <a href="${ctaLink}/" class="cta-btn">体験会に申し込む</a>
      </div>
    </aside>`
}

// ===== CSS =====

const SHARED_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif; color: #1a1a1a; line-height: 1.8; background: #fafaf8; }
  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; height: auto; display: block; }
  .site-header { background: #fff; border-bottom: 3px solid #52C5E8; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; height: 64px; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
  .site-logo { font-size: 1.1rem; font-weight: 800; color: #52C5E8; }
  .header-nav { display: flex; align-items: center; gap: 1.5rem; }
  .header-nav a { font-size: .8rem; color: #374151; font-weight: 500; }
  .header-nav a:hover { color: #52C5E8; }
  .header-nav .btn-back { background: #52C5E8; color: #fff; padding: .4rem 1rem; border-radius: 999px; font-size: .78rem; font-weight: 700; }
  .header-nav .btn-back:hover { background: #32B0D8; color: #fff; }
  .admin-link { font-size: .75rem; color: #9ca3af; }
  footer { background: #1a1a1a; color: #9ca3af; padding: 2rem; }
  .footer-inner { max-width: 1040px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .footer-logo { color: #fff; font-size: .9rem; font-weight: 700; }
  .footer-links { display: flex; gap: 1.25rem; font-size: .78rem; }
  .footer-links a { color: #9ca3af; }
  .footer-links a:hover { color: #fff; }
  .footer-copy { font-size: .72rem; color: #4b5563; }
`

const INDEX_CSS = `
  .hero { background: linear-gradient(135deg, #EEF9FD, #D6F1FA); border-bottom: 1px solid #B3E5F5; padding: 3rem 2rem 2.5rem; text-align: center; }
  .hero-label { display: inline-block; background: #52C5E8; color: #fff; font-size: .7rem; font-weight: 700; letter-spacing: .1em; padding: .2rem .8rem; border-radius: 999px; margin-bottom: 1rem; text-transform: uppercase; }
  .hero h1 { font-size: clamp(1.4rem, 4vw, 2rem); font-weight: 800; margin-bottom: .6rem; line-height: 1.4; }
  .hero p { font-size: .9rem; color: #6b7280; max-width: 480px; margin: 0 auto; }
  .layout { max-width: 1040px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; display: grid; grid-template-columns: 1fr 280px; gap: 2.5rem; align-items: start; }
  .section-header { margin-bottom: 1.25rem; }
  .section-title { font-size: 1rem; font-weight: 800; }
  .section-title::before { content: ''; display: inline-block; width: 4px; height: 1em; background: #52C5E8; border-radius: 2px; margin-right: .5rem; vertical-align: middle; }
  .featured-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.07); margin-bottom: 2rem; }
  .featured-card .eyecatch img { width: 100%; aspect-ratio: 16/7; object-fit: cover; }
  .featured-card .eyecatch-placeholder { width: 100%; aspect-ratio: 16/7; background: linear-gradient(135deg, #D6F1FA, #B3E5F5); display: flex; align-items: center; justify-content: center; font-size: 3.5rem; }
  .featured-card .body { padding: 1.5rem 1.75rem 1.75rem; }
  .featured-card h2 { font-size: 1.2rem; font-weight: 800; line-height: 1.45; margin-bottom: .6rem; }
  .featured-card h2 a:hover { color: #52C5E8; }
  .featured-card .excerpt { font-size: .875rem; color: #6b7280; line-height: 1.75; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .card-tag { display: inline-block; background: #EEF9FD; color: #32B0D8; font-size: .7rem; font-weight: 700; padding: .2rem .65rem; border-radius: 4px; margin-bottom: .6rem; }
  .card-tag:hover { background: #D6F1FA; }
  .card-meta { font-size: .775rem; color: #9ca3af; display: flex; gap: .75rem; align-items: center; }
  .read-more { margin-left: auto; font-size: .78rem; color: #F0587A; font-weight: 700; }
  .post-list { display: grid; gap: 1rem; }
  .post-card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); display: flex; transition: box-shadow .2s; }
  .post-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
  .post-card-thumb { width: 140px; flex-shrink: 0; }
  .post-card-thumb img { width: 140px; height: 100%; object-fit: cover; }
  .post-card-thumb-placeholder { width: 140px; height: 100%; min-height: 90px; background: linear-gradient(135deg, #D6F1FA, #E8F7C4); display: flex; align-items: center; justify-content: center; font-size: 2rem; }
  .post-card-body { padding: 1rem 1.25rem; flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .post-card h3 { font-size: .9rem; font-weight: 700; line-height: 1.5; margin-bottom: .3rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .post-card h3 a:hover { color: #52C5E8; }
  .post-card .excerpt-sm { font-size: .8rem; color: #9ca3af; margin-bottom: .4rem; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
  .post-card .meta { font-size: .75rem; color: #9ca3af; }
  .side-card { background: #fff; border-radius: 12px; padding: 1.25rem 1.25rem 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,.06); margin-bottom: 1.25rem; }
  .side-title { font-size: .8rem; font-weight: 800; color: #1a1a1a; margin-bottom: 1rem; padding-bottom: .5rem; border-bottom: 2px solid #B3E5F5; }
  .tag-list { list-style: none; display: grid; gap: .5rem; }
  .tag-list li a { display: flex; justify-content: space-between; align-items: center; font-size: .825rem; color: #374151; padding: .3rem 0; }
  .tag-list li a:hover { color: #52C5E8; }
  .tag-count { background: #f3f4f6; color: #6b7280; font-size: .7rem; padding: .1rem .5rem; border-radius: 999px; }
  .cta-card { background: linear-gradient(135deg, #F0587A, #F07AAA); border-radius: 12px; padding: 1.5rem 1.25rem; color: #fff; text-align: center; }
  .cta-title { font-size: .95rem; font-weight: 800; margin-bottom: .4rem; }
  .cta-sub { font-size: .775rem; opacity: .85; margin-bottom: 1rem; line-height: 1.6; }
  .cta-btn { display: block; background: #fff; color: #F0587A; font-weight: 800; font-size: .85rem; padding: .6rem; border-radius: 8px; }
  .cta-btn:hover { background: #FDE8EE; }
  .back-link { margin-top: 2rem; }
  .back-link a { color: #52C5E8; font-size: .875rem; }
`

const POST_CSS = `
  .container { max-width: 760px; margin: 0 auto; padding: 2rem 1.5rem; }
  .post-header { margin-bottom: 2rem; }
  .post-title { font-size: 1.75rem; font-weight: 800; line-height: 1.4; margin-bottom: .75rem; }
  .post-meta { font-size: .875rem; color: #6b7280; }
  .post-eyecatch { margin-bottom: 2rem; border-radius: 8px; overflow: hidden; }
  .post-eyecatch img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
  .post-content { font-size: 1rem; }
  .post-content h2 { font-size: 1.4rem; font-weight: 700; margin: 2rem 0 1rem; padding-bottom: .5rem; border-bottom: 2px solid #e5e7eb; }
  .post-content h3 { font-size: 1.15rem; font-weight: 700; margin: 1.5rem 0 .75rem; }
  .post-content p { margin-bottom: 1.25rem; }
  .post-content ul, .post-content ol { margin: 1rem 0 1.25rem 1.5rem; }
  .post-content li { margin-bottom: .5rem; }
  .post-content blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; color: #6b7280; margin: 1.25rem 0; }
  .post-content img { border-radius: 6px; margin: 1rem 0; }
  .post-content a { text-decoration: underline; color: #2563eb; }
  .post-tags { margin-top: 2rem; display: flex; flex-wrap: wrap; gap: .5rem; }
  .post-tag { background: #EEF9FD; color: #32B0D8; padding: .25rem .75rem; border-radius: 999px; font-size: .8rem; font-weight: 600; }
  .post-tag:hover { background: #D6F1FA; }
  .back-link { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; }
  .back-link a { color: #52C5E8; }
`

// ===== PUBLIC FUNCTIONS =====

export function generatePostHtml(post: Post): string {
  const title = post.metaTitle || post.title
  const description = post.metaDescription || post.excerpt
  const eyecatch = resolveEyecatch(post)
  const ogImage = post.ogImageUrl || eyecatch
  const url = `${BLOG_CONFIG.siteUrl}/${post.slug}/`
  const publishedIso = formatDate(post)
  const publishedJa = formatDateJa(post)

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: publishedIso,
    author: { '@type': 'Person', name: post.authorName },
    ...(ogImage ? { image: ogImage } : {}),
    publisher: {
      '@type': 'Organization',
      name: BLOG_CONFIG.siteName,
      url: BLOG_CONFIG.siteUrl,
    },
  })

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | ${escapeHtml(BLOG_CONFIG.siteName)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="${escapeHtml(BLOG_CONFIG.siteName)}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${url}">
  <script type="application/ld+json">${jsonLd}</script>
  <style>${SHARED_CSS}${POST_CSS}${post.commentsEnabled ? COMMENT_CSS : ''}</style>
  ${gtagSnippet()}
</head>
<body>
  ${renderHeader()}
  <div class="container">
    <article>
      <div class="post-header">
        <h1 class="post-title">${escapeHtml(post.title)}</h1>
        <p class="post-meta">${publishedJa}${post.authorName ? ` · ${escapeHtml(post.authorName)}` : ''}</p>
      </div>
      ${eyecatch ? `<div class="post-eyecatch"><img src="${eyecatch}" alt="${escapeHtml(post.title)}"></div>` : ''}
      <div class="post-content">${post.content}</div>
      ${post.tags.length > 0 ? `
      <div class="post-tags">
        ${post.tags.map(t => `<a href="${tagUrl(t)}" class="post-tag">${escapeHtml(t)}</a>`).join('')}
      </div>` : ''}
    </article>
    <div class="back-link">
      <a href="${BLOG_CONFIG.siteUrl}/">← 記事一覧に戻る</a>
    </div>
    ${post.commentsEnabled ? generateCommentSection(post.id) : ''}
  </div>
  ${renderFooter()}
</body>
</html>`
}

export function generateIndexHtml(posts: Post[]): string {
  const title = BLOG_CONFIG.siteName
  const url = `${BLOG_CONFIG.siteUrl}/`
  const tagMap = buildTagMap(posts)

  const featured = posts[0]
  const rest = posts.slice(1)

  const featuredHtml = featured ? (() => {
    const href = `${BLOG_CONFIG.siteUrl}/${featured.slug}/`
    const eyecatch = resolveEyecatch(featured)
    const firstTag = featured.tags[0]
    return `
    <div class="section-header"><span class="section-title">最新記事</span></div>
    <div class="featured-card">
      <div class="eyecatch">
        ${eyecatch
          ? `<img src="${eyecatch}" alt="${escapeHtml(featured.title)}">`
          : `<div class="eyecatch-placeholder">📝</div>`}
      </div>
      <div class="body">
        ${firstTag ? `<a href="${tagUrl(firstTag)}" class="card-tag">${escapeHtml(firstTag)}</a>` : ''}
        <h2><a href="${href}">${escapeHtml(featured.title)}</a></h2>
        ${featured.excerpt ? `<p class="excerpt">${escapeHtml(featured.excerpt)}</p>` : ''}
        <div class="card-meta">
          <span>${formatDateJa(featured)}</span>
          <a href="${href}" class="read-more">続きを読む →</a>
        </div>
      </div>
    </div>`
  })() : '<p style="color:#9ca3af;padding:2rem 0">記事がまだありません。</p>'

  const restHtml = rest.length > 0 ? `
    <div class="section-header"><span class="section-title">新着記事</span></div>
    <div class="post-list">
      ${rest.map(post => {
        const href = `${BLOG_CONFIG.siteUrl}/${post.slug}/`
        const eyecatch = resolveEyecatch(post)
        const firstTag = post.tags[0]
        return `
      <div class="post-card">
        <div class="post-card-thumb">
          ${eyecatch
            ? `<img src="${eyecatch}" alt="${escapeHtml(post.title)}">`
            : `<div class="post-card-thumb-placeholder">📝</div>`}
        </div>
        <div class="post-card-body">
          ${firstTag ? `<a href="${tagUrl(firstTag)}" class="card-tag">${escapeHtml(firstTag)}</a>` : ''}
          <h3><a href="${href}">${escapeHtml(post.title)}</a></h3>
          ${post.excerpt ? `<p class="excerpt-sm">${escapeHtml(post.excerpt)}</p>` : ''}
          <p class="meta">${formatDateJa(post)}</p>
        </div>
      </div>`
      }).join('')}
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <link rel="canonical" href="${url}">
  <style>${SHARED_CSS}${INDEX_CSS}</style>
  ${gtagSnippet()}
</head>
<body>
  ${renderHeader()}
  <div class="hero">
    <span class="hero-label">Official Blog</span>
    <h1>${escapeHtml(BLOG_CONFIG.tagline)}</h1>
    <p>${escapeHtml(BLOG_CONFIG.taglineSub)}</p>
  </div>
  <div class="layout">
    <main>
      ${featuredHtml}
      ${restHtml}
    </main>
    ${renderSidebar(tagMap)}
  </div>
  ${renderFooter()}
</body>
</html>`
}

export function generateTagHtml(tag: string, tagPosts: Post[], allTagMap: Map<string, number>): string {
  const title = `${tag} の記事 | ${BLOG_CONFIG.siteName}`
  const url = `${BLOG_CONFIG.siteUrl}/tag/${encodeURIComponent(tag)}/`

  const postListHtml = tagPosts.map(post => {
    const href = `${BLOG_CONFIG.siteUrl}/${post.slug}/`
    const eyecatch = resolveEyecatch(post)
    const firstTag = post.tags[0]
    return `
    <div class="post-card">
      <div class="post-card-thumb">
        ${eyecatch
          ? `<img src="${eyecatch}" alt="${escapeHtml(post.title)}">`
          : `<div class="post-card-thumb-placeholder">📝</div>`}
      </div>
      <div class="post-card-body">
        ${firstTag ? `<a href="${tagUrl(firstTag)}" class="card-tag">${escapeHtml(firstTag)}</a>` : ''}
        <h3><a href="${href}">${escapeHtml(post.title)}</a></h3>
        ${post.excerpt ? `<p class="excerpt-sm">${escapeHtml(post.excerpt)}</p>` : ''}
        <p class="meta">${formatDateJa(post)}</p>
      </div>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <link rel="canonical" href="${url}">
  <style>${SHARED_CSS}${INDEX_CSS}</style>
  ${gtagSnippet()}
</head>
<body>
  ${renderHeader()}
  <div class="hero">
    <span class="hero-label">カテゴリ</span>
    <h1>${escapeHtml(tag)}</h1>
    <p>${tagPosts.length}件の記事</p>
  </div>
  <div class="layout">
    <main>
      <div class="section-header"><span class="section-title">${escapeHtml(tag)} の記事</span></div>
      <div class="post-list">
        ${postListHtml}
      </div>
      <div class="back-link">
        <a href="${BLOG_CONFIG.siteUrl}/">← 記事一覧に戻る</a>
      </div>
    </main>
    ${renderSidebar(allTagMap)}
  </div>
  ${renderFooter()}
</body>
</html>`
}

export function generateSitemapXml(posts: Post[]): string {
  const urls = [
    `<url><loc>${BLOG_CONFIG.siteUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    ...posts.map(post => {
      const lastmod = formatDate(post).split('T')[0]
      return `<url><loc>${BLOG_CONFIG.siteUrl}/${post.slug}/</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`
    }),
  ].join('\n  ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`
}

// ===== COMMENT SECTION (unchanged) =====

function generateCommentSection(postId: string): string {
  const cfg = BLOG_CONFIG.firebase
  return `
  <section class="comment-section">
    <h2 class="comment-title">コメント</h2>
    <div id="comment-list" class="comment-list"></div>
    <form id="comment-form" class="comment-form">
      <input id="comment-name" type="text" placeholder="お名前" required class="comment-input" />
      <textarea id="comment-body" placeholder="コメントを入力してください" required rows="4" class="comment-textarea"></textarea>
      <button type="submit" class="comment-submit">送信する</button>
      <p id="comment-msg" class="comment-msg"></p>
    </form>
  </section>
  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
    import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp }
      from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js';
    const app = initializeApp(${JSON.stringify(cfg)});
    const db = getFirestore(app);
    const postId = ${JSON.stringify(postId)};

    async function loadComments() {
      const q = query(collection(db,'comments'), where('postId','==',postId), where('status','==','approved'));
      const snap = await getDocs(q);
      const list = document.getElementById('comment-list');
      list.innerHTML = '';
      if (snap.empty) { list.innerHTML = '<p class="no-comment">まだコメントはありません</p>'; return; }
      const docs = snap.docs.slice().sort((a,b) => (a.data().createdAt?.seconds||0) - (b.data().createdAt?.seconds||0));
      docs.forEach(d => {
        const c = d.data();
        const date = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString('ja-JP') : '';
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = '<p class="comment-author">' + escHtml(c.authorName) + '<span class="comment-date">' + date + '</span></p><p class="comment-body">' + escHtml(c.content) + '</p>';
        list.appendChild(div);
      });
    }
    function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    loadComments();

    document.getElementById('comment-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.querySelector('.comment-submit');
      const msg = document.getElementById('comment-msg');
      btn.disabled = true;
      try {
        await addDoc(collection(db,'comments'), {
          postId, status:'pending',
          authorName: document.getElementById('comment-name').value.trim(),
          content: document.getElementById('comment-body').value.trim(),
          createdAt: serverTimestamp(),
        });
        document.getElementById('comment-form').reset();
        msg.textContent = '送信しました。承認後に表示されます。';
        msg.style.color = '#16a34a';
      } catch(err) {
        msg.textContent = '送信に失敗しました。';
        msg.style.color = '#dc2626';
      } finally { btn.disabled = false; }
    });
  </script>`
}

const COMMENT_CSS = `
  .comment-section { margin-top: 3rem; border-top: 1px solid #e5e7eb; padding-top: 2rem; }
  .comment-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 1.5rem; }
  .comment-list { margin-bottom: 2rem; display: grid; gap: 1rem; }
  .no-comment { font-size: .875rem; color: #9ca3af; }
  .comment-item { background: #f9fafb; border-radius: 8px; padding: 1rem; }
  .comment-author { font-size: .875rem; font-weight: 600; margin-bottom: .5rem; }
  .comment-date { font-weight: 400; color: #9ca3af; margin-left: .75rem; font-size: .8rem; }
  .comment-body { font-size: .9rem; white-space: pre-wrap; }
  .comment-form { display: grid; gap: .75rem; }
  .comment-input, .comment-textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: .6rem .75rem; font-size: .9rem; font-family: inherit; }
  .comment-textarea { resize: vertical; }
  .comment-submit { justify-self: start; background: #52C5E8; color: #fff; border: none; border-radius: 6px; padding: .5rem 1.25rem; font-size: .875rem; cursor: pointer; }
  .comment-submit:disabled { opacity: .5; cursor: not-allowed; }
  .comment-msg { font-size: .8rem; margin: 0; }
`
