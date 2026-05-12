import { BLOG_CONFIG } from '@/config'

const API = 'https://firebasehosting.googleapis.com/v1beta1'

async function gzip(content: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(content)
  const stream = new Response(encoded).body!.pipeThrough(new CompressionStream('gzip'))
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length }
  return result
}

async function sha256hex(data: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function fetchCurrentAdminFileHashes(siteId: string, accessToken: string): Promise<Record<string, string>> {
  const releasesRes = await fetch(`${API}/sites/${siteId}/releases?pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!releasesRes.ok) return {}
  const { releases } = await releasesRes.json() as { releases?: { version: { name: string } }[] }
  if (!releases?.length) return {}

  const versionName = releases[0].version.name
  const filesRes = await fetch(`${API}/${versionName}/files?pageSize=1000`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!filesRes.ok) return {}
  const { files } = await filesRes.json() as { files?: { path: string; hash: string }[] }
  if (!files) return {}

  const adminHashes: Record<string, string> = {}
  for (const file of files) {
    if (file.path.startsWith('/admin/')) {
      adminHashes[file.path] = file.hash
    }
  }
  return adminHashes
}

export type DeployFiles = Record<string, string> // URLパス -> HTML文字列

export async function deployToHosting(
  files: DeployFiles,
  accessToken: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const siteId = BLOG_CONFIG.hostingSiteId
  onProgress?.('既存のadminファイルを取得中...')
  const adminFileHashes = await fetchCurrentAdminFileHashes(siteId, accessToken)

  onProgress?.('バージョンを作成中...')

  // 1. バージョン作成
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
  })
  if (!versionRes.ok) throw new Error(`バージョン作成失敗: ${await versionRes.text()}`)
  const version = await versionRes.json() as { name: string }
  const versionName = version.name
  const versionId = versionName.split('/').pop()!

  // 2. ファイルのgzip + sha256
  onProgress?.('ファイルを圧縮中...')
  const gzipped: Record<string, Uint8Array> = {}
  const fileHashes: Record<string, string> = {}
  for (const [path, content] of Object.entries(files)) {
    const gz = await gzip(content)
    const hash = await sha256hex(gz)
    gzipped[hash] = gz
    fileHashes[path] = hash
  }

  // adminファイルのハッシュを合わせて登録（既存ファイルは再アップロード不要）
  const allFileHashes = { ...adminFileHashes, ...fileHashes }

  // 3. アップロード対象を取得
  onProgress?.('アップロード準備中...')
  const populateRes = await fetch(`${API}/sites/${siteId}/versions/${versionId}:populateFiles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: allFileHashes }),
  })
  if (!populateRes.ok) throw new Error(`ファイル登録失敗: ${await populateRes.text()}`)
  const { uploadRequiredHashes = [], uploadUrl } = await populateRes.json() as {
    uploadRequiredHashes?: string[]
    uploadUrl: string
  }

  // 4. ファイルアップロード（新規/変更ファイルのみ）
  const total = uploadRequiredHashes.length
  for (let i = 0; i < total; i++) {
    const hash = uploadRequiredHashes[i]
    onProgress?.(`アップロード中... (${i + 1}/${total})`)
    const uploadRes = await fetch(`${uploadUrl}/${hash}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/octet-stream' },
      body: gzipped[hash] as unknown as BodyInit,
    })
    if (!uploadRes.ok) throw new Error(`ファイルアップロード失敗: ${hash}`)
  }

  // 5. バージョン確定
  onProgress?.('バージョンを確定中...')
  const finalizeRes = await fetch(`${API}/${versionName}?updateMask=status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'FINALIZED' }),
  })
  if (!finalizeRes.ok) throw new Error(`確定失敗: ${await finalizeRes.text()}`)

  // 6. リリース
  onProgress?.('リリース中...')
  const releaseRes = await fetch(
    `${API}/sites/${siteId}/releases?versionName=${versionName}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  if (!releaseRes.ok) throw new Error(`リリース失敗: ${await releaseRes.text()}`)

  onProgress?.('デプロイ完了')
}
