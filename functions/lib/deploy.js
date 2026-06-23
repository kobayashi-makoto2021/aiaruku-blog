"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployToHosting = deployToHosting;
// src/hosting/deploy.ts の Node.js 版（サービスアカウントトークン使用）
// Node.js 18+ の CompressionStream / crypto.subtle / fetch を使用
const config_1 = require("./config");
const API = 'https://firebasehosting.googleapis.com/v1beta1';
async function gzip(content) {
    const encoded = new TextEncoder().encode(content);
    const stream = new Response(encoded).body.pipeThrough(new CompressionStream('gzip'));
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}
async function sha256hex(data) {
    const buf = await crypto.subtle.digest('SHA-256', data.buffer);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function fetchCurrentAdminFileHashes(siteId, accessToken) {
    const releasesRes = await fetch(`${API}/sites/${siteId}/releases?pageSize=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!releasesRes.ok)
        return {};
    const { releases } = await releasesRes.json();
    if (!releases?.length)
        return {};
    const versionName = releases[0].version.name;
    const filesRes = await fetch(`${API}/${versionName}/files?pageSize=1000`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!filesRes.ok)
        return {};
    const { files } = await filesRes.json();
    if (!files)
        return {};
    const adminHashes = {};
    for (const file of files) {
        if (file.path.startsWith('/admin/')) {
            adminHashes[file.path] = file.hash;
        }
    }
    return adminHashes;
}
async function deployToHosting(files, accessToken) {
    const siteId = config_1.BLOG_CONFIG.hostingSiteId;
    console.log('[deploy] 既存のadminファイルを取得中...');
    const adminFileHashes = await fetchCurrentAdminFileHashes(siteId, accessToken);
    console.log('[deploy] バージョンを作成中...');
    const versionRes = await fetch(`${API}/sites/${siteId}/versions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            config: {
                headers: [
                    { glob: '/admin/**', headers: { 'Cache-Control': 'no-store' } },
                    { glob: '**/*.html', headers: { 'Cache-Control': 'public, max-age=3600' } },
                ],
                rewrites: [
                    { glob: '/admin', path: '/admin/index.html' },
                    { glob: '/admin/**', path: '/admin/index.html' },
                ],
            },
        }),
    });
    if (!versionRes.ok)
        throw new Error(`バージョン作成失敗: ${await versionRes.text()}`);
    const version = await versionRes.json();
    const versionName = version.name;
    const versionId = versionName.split('/').pop();
    console.log('[deploy] ファイルを圧縮中...');
    const gzipped = {};
    const fileHashes = {};
    for (const [path, content] of Object.entries(files)) {
        const gz = await gzip(content);
        const hash = await sha256hex(gz);
        gzipped[hash] = gz;
        fileHashes[path] = hash;
    }
    const allFileHashes = { ...adminFileHashes, ...fileHashes };
    console.log('[deploy] アップロード準備中...');
    const populateRes = await fetch(`${API}/sites/${siteId}/versions/${versionId}:populateFiles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: allFileHashes }),
    });
    if (!populateRes.ok)
        throw new Error(`ファイル登録失敗: ${await populateRes.text()}`);
    const { uploadRequiredHashes = [], uploadUrl } = await populateRes.json();
    const total = uploadRequiredHashes.length;
    for (let i = 0; i < total; i++) {
        const hash = uploadRequiredHashes[i];
        console.log(`[deploy] アップロード中... (${i + 1}/${total})`);
        const uploadRes = await fetch(`${uploadUrl}/${hash}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/octet-stream' },
            body: gzipped[hash],
        });
        if (!uploadRes.ok)
            throw new Error(`ファイルアップロード失敗: ${hash}`);
    }
    console.log('[deploy] バージョンを確定中...');
    const finalizeRes = await fetch(`${API}/${versionName}?updateMask=status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINALIZED' }),
    });
    if (!finalizeRes.ok)
        throw new Error(`確定失敗: ${await finalizeRes.text()}`);
    console.log('[deploy] リリース中...');
    const releaseRes = await fetch(`${API}/sites/${siteId}/releases?versionName=${versionName}`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
    if (!releaseRes.ok)
        throw new Error(`リリース失敗: ${await releaseRes.text()}`);
    console.log('[deploy] デプロイ完了');
}
//# sourceMappingURL=deploy.js.map