"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveEyecatch = resolveEyecatch;
exports.generatePostHtml = generatePostHtml;
exports.generateIndexHtml = generateIndexHtml;
exports.generateTagHtml = generateTagHtml;
exports.generateSitemapXml = generateSitemapXml;
// src/generator/index.ts の Node.js 対応版
// DOMParser → regex に置換、firebase/firestore の Timestamp は使わない
const config_1 = require("./config");
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function formatDate(post) {
    if (!post.publishedAt)
        return '';
    return new Date(post.publishedAt.seconds * 1000).toISOString();
}
function formatDateJa(post) {
    if (!post.publishedAt)
        return '';
    return new Date(post.publishedAt.seconds * 1000).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}
function gtagSnippet() {
    const id = config_1.BLOG_CONFIG.gaId;
    if (!id)
        return '';
    return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`;
}
function extractFirstImage(html) {
    const match = html.match(/<img[^>]+src="([^"]+)"/);
    return match?.[1] ?? '';
}
function resolveEyecatch(post) {
    return post.eyecatchUrl || extractFirstImage(post.content);
}
function tagUrl(tag) {
    return `${config_1.BLOG_CONFIG.siteUrl}/tag/${tag}/`;
}
function buildTagMap(posts) {
    const map = new Map();
    for (const post of posts) {
        for (const tag of post.tags) {
            map.set(tag, (map.get(tag) ?? 0) + 1);
        }
    }
    return map;
}
function renderHeader() {
    const nav = config_1.BLOG_CONFIG.parentSiteNav.length > 0
        ? `<nav class="header-nav">
      ${config_1.BLOG_CONFIG.parentSiteNav.map(item => `<a href="${item.href}">${escapeHtml(item.label)}</a>`).join('\n      ')}
      <a href="${config_1.BLOG_CONFIG.parentSiteUrl}/" class="btn-back">← 公式サイトに戻る</a>
    </nav>`
        : `<a href="/admin/" class="admin-link">管理者ログイン</a>`;
    return `<header class="site-header">
    <a href="${config_1.BLOG_CONFIG.siteUrl}/" class="site-logo">${escapeHtml(config_1.BLOG_CONFIG.siteName)}</a>
    ${nav}
  </header>`;
}
function renderFooter() {
    const year = new Date().getFullYear();
    return `<footer>
    <div class="footer-inner">
      <div class="footer-logo">${escapeHtml(config_1.BLOG_CONFIG.siteName)}</div>
      <div class="footer-links">
        ${config_1.BLOG_CONFIG.parentSiteUrl ? `<a href="${config_1.BLOG_CONFIG.parentSiteUrl}/">公式サイト</a>` : ''}
        <a href="/admin/">管理画面</a>
      </div>
      <p class="footer-copy">© ${year} ${escapeHtml(config_1.BLOG_CONFIG.siteName)}. All rights reserved.</p>
    </div>
  </footer>`;
}
function renderSidebar(tagMap) {
    const tagItems = [...tagMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => `<li><a href="${tagUrl(tag)}">${escapeHtml(tag)}<span class="tag-count">${count}</span></a></li>`).join('');
    const ctaLink = config_1.BLOG_CONFIG.parentSiteUrl || config_1.BLOG_CONFIG.siteUrl;
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
    </aside>`;
}
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
`;
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
  .featured-card .eyecatch img { width: 100%; aspect-ratio: 16/7; object-fit: cover; object-position: top; }
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
`;
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
`;
function generatePostHtml(post) {
    const title = post.metaTitle || post.title;
    const description = post.metaDescription || post.excerpt;
    const eyecatch = resolveEyecatch(post);
    const ogImage = post.ogImageUrl || eyecatch;
    const url = `${config_1.BLOG_CONFIG.siteUrl}/${post.slug}/`;
    const publishedIso = formatDate(post);
    const publishedJa = formatDateJa(post);
    const jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        datePublished: publishedIso,
        author: { '@type': 'Person', name: post.authorName },
        ...(ogImage ? { image: ogImage } : {}),
        publisher: {
            '@type': 'Organization',
            name: config_1.BLOG_CONFIG.siteName,
            url: config_1.BLOG_CONFIG.siteUrl,
        },
    });
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | ${escapeHtml(config_1.BLOG_CONFIG.siteName)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="${escapeHtml(config_1.BLOG_CONFIG.siteName)}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${url}">
  <script type="application/ld+json">${jsonLd}</script>
  <style>${SHARED_CSS}${POST_CSS}</style>
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
      <a href="${config_1.BLOG_CONFIG.siteUrl}/">← 記事一覧に戻る</a>
    </div>
  </div>
  ${renderFooter()}
  <script>fetch('${config_1.BLOG_CONFIG.trackViewUrl}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:'${post.slug}',referrer:document.referrer}),keepalive:true}).catch(function(){})</script>
</body>
</html>`;
}
function generateIndexHtml(posts) {
    const title = config_1.BLOG_CONFIG.siteName;
    const url = `${config_1.BLOG_CONFIG.siteUrl}/`;
    const tagMap = buildTagMap(posts);
    const featured = posts[0];
    const rest = posts.slice(1);
    const featuredHtml = featured ? (() => {
        const href = `${config_1.BLOG_CONFIG.siteUrl}/${featured.slug}/`;
        const eyecatch = resolveEyecatch(featured);
        const firstTag = featured.tags[0];
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
    </div>`;
    })() : '<p style="color:#9ca3af;padding:2rem 0">記事がまだありません。</p>';
    const restHtml = rest.length > 0 ? `
    <div class="section-header"><span class="section-title">新着記事</span></div>
    <div class="post-list">
      ${rest.map(post => {
        const href = `${config_1.BLOG_CONFIG.siteUrl}/${post.slug}/`;
        const eyecatch = resolveEyecatch(post);
        const firstTag = post.tags[0];
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
      </div>`;
    }).join('')}
    </div>` : '';
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
    <h1>${escapeHtml(config_1.BLOG_CONFIG.tagline)}</h1>
    <p>${escapeHtml(config_1.BLOG_CONFIG.taglineSub)}</p>
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
</html>`;
}
function generateTagHtml(tag, tagPosts, allTagMap) {
    const title = `${tag} の記事 | ${config_1.BLOG_CONFIG.siteName}`;
    const url = `${config_1.BLOG_CONFIG.siteUrl}/tag/${encodeURIComponent(tag)}/`;
    const postListHtml = tagPosts.map(post => {
        const href = `${config_1.BLOG_CONFIG.siteUrl}/${post.slug}/`;
        const eyecatch = resolveEyecatch(post);
        const firstTag = post.tags[0];
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
    </div>`;
    }).join('');
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
        <a href="${config_1.BLOG_CONFIG.siteUrl}/">← 記事一覧に戻る</a>
      </div>
    </main>
    ${renderSidebar(allTagMap)}
  </div>
  ${renderFooter()}
</body>
</html>`;
}
function generateSitemapXml(posts) {
    const urls = [
        `<url><loc>${config_1.BLOG_CONFIG.siteUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
        ...posts.map(post => {
            const lastmod = formatDate(post).split('T')[0];
            return `<url><loc>${config_1.BLOG_CONFIG.siteUrl}/${post.slug}/</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`;
        }),
    ].join('\n  ');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`;
}
//# sourceMappingURL=generator.js.map