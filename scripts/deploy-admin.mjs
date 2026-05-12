import { createSign, createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const API = 'https://firebasehosting.googleapis.com/v1beta1'
const firebaseJson = JSON.parse(readFileSync('firebase.json', 'utf8'))
const SITE_ID = firebaseJson.hosting.site

async function getAccessToken() {
  const key = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.hosting',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url')
  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const jwt = `${header}.${payload}.${sign.sign(key.private_key, 'base64url')}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`トークン取得失敗: ${JSON.stringify(data)}`)
  return data.access_token
}

function sha256hex(data) {
  return createHash('sha256').update(data).digest('hex')
}

function collectFiles(dir, base = dir) {
  const result = {}
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) Object.assign(result, collectFiles(full, base))
    else result['/' + relative(base, full).replace(/\\/g, '/')] = readFileSync(full)
  }
  return result
}

async function fetchCurrentNonAdminHashes(token) {
  const res = await fetch(`${API}/sites/${SITE_ID}/releases?pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return {}
  const { releases } = await res.json()
  if (!releases?.length) return {}
  const filesRes = await fetch(`${API}/${releases[0].version.name}/files?pageSize=1000`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!filesRes.ok) return {}
  const { files } = await filesRes.json()
  if (!files) return {}
  return Object.fromEntries(files.filter(f => !f.path.startsWith('/admin/')).map(f => [f.path, f.hash]))
}

async function main() {
  console.log('アクセストークン取得中...')
  const token = await getAccessToken()

  console.log('dist/admin のファイルを読み込み中...')
  const rawFiles = collectFiles('dist/admin')
  const gzipped = {}
  const adminHashes = {}
  for (const [rel, content] of Object.entries(rawFiles)) {
    const gz = gzipSync(content)
    const hash = sha256hex(gz)
    gzipped[hash] = gz
    adminHashes[`/admin${rel}`] = hash
  }

  console.log('既存ブログファイルのハッシュを取得中...')
  const blogHashes = await fetchCurrentNonAdminHashes(token)
  console.log(`保持するブログファイル数: ${Object.keys(blogHashes).length}`)

  console.log('バージョン作成中...')
  const versionRes = await fetch(`${API}/sites/${SITE_ID}/versions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: {
        headers: [
          { glob: '/admin/**', headers: { 'Cache-Control': 'no-store' } },
          { glob: '**/*.html', headers: { 'Cache-Control': 'public, max-age=3600' } },
          { glob: '**/*.@(js|css)', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
        ],
        rewrites: [{ glob: '/admin/**', path: '/admin/index.html' }],
      },
    }),
  })
  if (!versionRes.ok) throw new Error(`バージョン作成失敗: ${await versionRes.text()}`)
  const { name: versionName } = await versionRes.json()
  const versionId = versionName.split('/').pop()

  console.log('ファイル登録中...')
  const populateRes = await fetch(`${API}/sites/${SITE_ID}/versions/${versionId}:populateFiles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { ...blogHashes, ...adminHashes } }),
  })
  if (!populateRes.ok) throw new Error(`ファイル登録失敗: ${await populateRes.text()}`)
  const { uploadRequiredHashes = [], uploadUrl } = await populateRes.json()

  console.log(`アップロード中... (${uploadRequiredHashes.length} ファイル)`)
  for (const hash of uploadRequiredHashes) {
    const res = await fetch(`${uploadUrl}/${hash}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
      body: gzipped[hash],
    })
    if (!res.ok) throw new Error(`アップロード失敗: ${hash}`)
  }

  console.log('バージョン確定中...')
  const finalizeRes = await fetch(`${API}/${versionName}?updateMask=status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'FINALIZED' }),
  })
  if (!finalizeRes.ok) throw new Error(`確定失敗: ${await finalizeRes.text()}`)

  console.log('リリース中...')
  const releaseRes = await fetch(`${API}/sites/${SITE_ID}/releases?versionName=${versionName}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!releaseRes.ok) throw new Error(`リリース失敗: ${await releaseRes.text()}`)

  console.log('デプロイ完了')
}

main().catch(err => { console.error(err.message); process.exit(1) })
