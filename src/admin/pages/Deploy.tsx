import { useState } from 'react'
import type { User } from 'firebase/auth'
import type { UserRole } from '@/types'
import { runDeploy } from '@/hosting'

interface Props {
  user: User
  role: UserRole
}

type DeployState = 'idle' | 'running' | 'done' | 'error'

export default function DeployPage({ role }: Props) {
  const [state, setState] = useState<DeployState>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  if (role !== 'admin') {
    return <p className="text-sm text-gray-500 p-6">管理者のみデプロイできます。</p>
  }

  function log(msg: string) {
    setLogs((prev) => [...prev, msg])
  }

  async function handleDeploy() {
    setState('running')
    setLogs([])
    setError(null)
    try {
      await runDeploy(log)
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setState('error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">サイトをデプロイ</h2>
        <button
          onClick={handleDeploy}
          disabled={state === 'running'}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {state === 'running' ? 'デプロイ中...' : 'デプロイ開始'}
        </button>
      </div>

      <p className="text-sm text-gray-500">
        公開済みの全記事からHTMLを生成してFirebase Hostingに配置します。
      </p>

      {logs.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs space-y-1">
          {logs.map((l, i) => (
            <div key={i} className="text-gray-700">{l}</div>
          ))}
          {state === 'done' && (
            <div className="text-green-600 font-semibold mt-2">デプロイ完了！</div>
          )}
          {state === 'error' && error && (
            <div className="text-red-600 font-semibold mt-2">エラー: {error}</div>
          )}
        </div>
      )}
    </div>
  )
}
