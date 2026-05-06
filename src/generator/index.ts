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

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif; color: #1a1a1a; line-height: 1.8; background: #fff; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  img { max-width: 100%; height: auto; }
  .site-header { border-bottom: 1px solid #e5e7eb; padding: 1rem 1.5rem; }
  .site-header a { font-weight: 700; font-size: 1.1rem; color: #1a1a1a; }
  .container { max-width: 760px; margin: 0 auto; padding: 2rem 1.5rem; }
  .post-header { margin-bottom: 2rem; }
  .post-title { font-size: 1.75rem; font-weight: 800; line-height: 1.4; margin-bottom: 0.75rem; }
  .post-meta { font-size: 0.875rem; color: #6b7280; }
  .post-eyecatch { margin-bottom: 2rem; border-radius: 8px; overflow: hidden; }
  .post-eyecatch img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
  .post-content { font-size: 1rem; }
  .post-content h2 { font-size: 1.4rem; font-weight: 700; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e5e7eb; }
  .post-content h3 { font-size: 1.15rem; font-weight: 700; margin: 1.5rem 0 0.75rem; }
  .post-content p { margin-bottom: 1.25rem; }
  .post-content ul, .post-content ol { margin: 1rem 0 1.25rem 1.5rem; }
  .post-content li { margin-bottom: 0.5rem; }
  .post-content blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; color: #6b7280; margin: 1.25rem 0; }
  .post-content img { border-radius: 6px; margin: 1rem 0; }
  .post-content a { text-decoration: underline; }
  .post-tags { margin-top: 2rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .post-tag { background: #f3f4f6; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; color: #374151; }
  .back-link { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; }
  .post-list { display: grid; gap: 1.5rem; }
  .post-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .post-card-body { padding: 1.25rem; }
  .post-card-eyecatch img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
  .post-card-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
  .post-card-excerpt { font-size: 0.9rem; color: #6b7280; margin-bottom: 0.75rem; }
  .post-card-meta { font-size: 0.8rem; color: #9ca3af; }
  .page-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 1.5rem; }
`

export function extractFirstImage(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.querySelector('img')?.getAttribute('src') ?? ''
}

export function resolveEyecatch(post: { eyecatchUrl: string; content: string }): string {
  return post.eyecatchUrl || extractFirstImage(post.content)
}

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
  <style>${BASE_CSS}${post.commentsEnabled ? COMMENT_CSS : ''}</style>
</head>
<body>
  <header class="site-header">
    <a href="${BLOG_CONFIG.siteUrl}/">${escapeHtml(BLOG_CONFIG.siteName)}</a>
  </header>
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
        ${post.tags.map(t => `<span class="post-tag">${escapeHtml(t)}</span>`).join('')}
      </div>` : ''}
    </article>
    <div class="back-link">
      <a href="${BLOG_CONFIG.siteUrl}/">← 記事一覧に戻る</a>
    </div>
    ${post.commentsEnabled ? generateCommentSection(post.id) : ''}
  </div>
</body>
</html>`
}

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
  .no-comment { font-size: 0.875rem; color: #9ca3af; }
  .comment-item { background: #f9fafb; border-radius: 8px; padding: 1rem; }
  .comment-author { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; }
  .comment-date { font-weight: 400; color: #9ca3af; margin-left: 0.75rem; font-size: 0.8rem; }
  .comment-body { font-size: 0.9rem; white-space: pre-wrap; }
  .comment-form { display: grid; gap: 0.75rem; }
  .comment-input, .comment-textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.6rem 0.75rem; font-size: 0.9rem; font-family: inherit; }
  .comment-textarea { resize: vertical; }
  .comment-submit { justify-self: start; background: #2563eb; color: #fff; border: none; border-radius: 6px; padding: 0.5rem 1.25rem; font-size: 0.875rem; cursor: pointer; }
  .comment-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .comment-msg { font-size: 0.8rem; margin: 0; }
`

export function generateIndexHtml(posts: Post[]): string {
  const title = `${BLOG_CONFIG.siteName} ブログ`
  const url = `${BLOG_CONFIG.siteUrl}/`

  const postCards = posts.map(post => {
    const href = `${BLOG_CONFIG.siteUrl}/${post.slug}/`
    const eyecatch = resolveEyecatch(post)
    return `
    <article class="post-card">
      ${eyecatch ? `<div class="post-card-eyecatch"><a href="${href}"><img src="${eyecatch}" alt="${escapeHtml(post.title)}"></a></div>` : ''}
      <div class="post-card-body">
        <h2 class="post-card-title"><a href="${href}">${escapeHtml(post.title)}</a></h2>
        ${post.excerpt ? `<p class="post-card-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
        <p class="post-card-meta">${formatDateJa(post)}</p>
      </div>
    </article>`
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
  <style>${BASE_CSS}</style>
</head>
<body>
  <header class="site-header">
    <a href="${url}">${escapeHtml(BLOG_CONFIG.siteName)}</a>
  </header>
  <div class="container">
    <h1 class="page-title">ブログ</h1>
    <div class="post-list">
      ${postCards}
    </div>
  </div>
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
