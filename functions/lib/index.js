"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishScheduledPosts = exports.trackView = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const google_auth_library_1 = require("google-auth-library");
const generator_1 = require("./generator");
const deploy_1 = require("./deploy");
(0, app_1.initializeApp)();
function classifyReferrer(ref) {
    if (!ref)
        return 'direct';
    if (/google\.|bing\.|yahoo\.|duckduckgo\./.test(ref))
        return 'google';
    if (/twitter\.com|x\.com|facebook\.com|instagram\.com|line\.me/.test(ref))
        return 'social';
    if (/booking\.aiaruku\.com/.test(ref))
        return 'booking';
    if (/aiaruku\.com/.test(ref))
        return 'internal';
    return 'other';
}
exports.trackView = (0, https_1.onRequest)({ region: 'asia-northeast1', cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const slug = typeof req.body?.slug === 'string' ? req.body.slug.trim() : '';
    if (!slug) {
        res.status(400).send('Bad Request');
        return;
    }
    const referrer = typeof req.body?.referrer === 'string' ? req.body.referrer : '';
    const source = classifyReferrer(referrer);
    const jstOffset = 9 * 60 * 60 * 1000;
    const date = new Date(Date.now() + jstOffset).toISOString().split('T')[0];
    const docId = `${date}_${slug}`;
    const db = (0, firestore_1.getFirestore)();
    await db.collection('analyticsDaily').doc(docId).set({ date, slug, views: firestore_1.FieldValue.increment(1), [source]: firestore_1.FieldValue.increment(1) }, { merge: true });
    console.log(`[track-view] ${slug} ${source} ${date}`);
    res.status(200).send('ok');
});
exports.publishScheduledPosts = (0, scheduler_1.onSchedule)({
    schedule: 'every 5 minutes',
    region: 'asia-northeast1',
    timeoutSeconds: 540,
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const now = firestore_1.Timestamp.now();
    const snapshot = await db.collection('posts')
        .where('status', '==', 'scheduled')
        .where('scheduledAt', '<=', now)
        .get();
    if (snapshot.empty) {
        console.log('[scheduled publish] 対象記事なし');
        return;
    }
    console.log(`[scheduled publish] ${snapshot.size}件を公開処理`);
    const batch = db.batch();
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        batch.update(docSnap.ref, {
            status: 'published',
            publishedAt: data['scheduledAt'],
            scheduledAt: null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        console.log(`[scheduled publish] 公開: ${data['title']}`);
    }
    await batch.commit();
    console.log('[scheduled publish] デプロイ開始');
    await deployBlog(db);
    console.log('[scheduled publish] 完了');
});
async function deployBlog(db) {
    const postsSnap = await db.collection('posts')
        .where('status', '==', 'published')
        .orderBy('publishedAt', 'desc')
        .get();
    const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const files = {};
    files['/index.html'] = (0, generator_1.generateIndexHtml)(posts);
    for (const post of posts) {
        files[`/${post.slug}/index.html`] = (0, generator_1.generatePostHtml)(post);
    }
    const tagGrouped = new Map();
    for (const post of posts) {
        for (const tag of post.tags) {
            if (!tagGrouped.has(tag))
                tagGrouped.set(tag, []);
            tagGrouped.get(tag).push(post);
        }
    }
    const allTagCountMap = new Map([...tagGrouped.entries()].map(([t, ps]) => [t, ps.length]));
    for (const [tag, tagPosts] of tagGrouped) {
        const tagHtml = (0, generator_1.generateTagHtml)(tag, tagPosts, allTagCountMap);
        files[`/tag/${tag}/index.html`] = tagHtml;
        const encodedTag = encodeURIComponent(tag);
        if (encodedTag !== tag) {
            files[`/tag/${encodedTag}/index.html`] = tagHtml;
        }
    }
    files['/sitemap.xml'] = (0, generator_1.generateSitemapXml)(posts);
    const auth = new google_auth_library_1.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/firebase.hosting'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token)
        throw new Error('サービスアカウントトークンの取得に失敗しました');
    console.log(`[scheduled publish] ${Object.keys(files).length}ファイルをデプロイ中...`);
    await (0, deploy_1.deployToHosting)(files, tokenResponse.token);
}
//# sourceMappingURL=index.js.map