import { useEffect, useRef, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/firebase'
import Chart from 'chart.js/auto'

type Period = 'today' | 'week' | 'month' | 'all'
type Mode = 'all' | 'post'

interface DailyRecord {
  date: string
  slug: string
  views: number
  google: number
  direct: number
  social: number
  internal: number
  booking: number
  other: number
}

function getJstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function getDateRange(period: Period): { start: string; end: string } | null {
  const today = getJstToday()
  if (period === 'today') return { start: today, end: today }
  if (period === 'week') {
    const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
    d.setDate(d.getDate() - 6)
    return { start: d.toISOString().split('T')[0], end: today }
  }
  if (period === 'month') {
    const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
    d.setDate(1)
    return { start: d.toISOString().split('T')[0], end: today }
  }
  return null
}

const PERIOD_LABELS: Record<Period, string> = {
  today: '今日',
  week: '今週',
  month: '今月',
  all: '全期間',
}

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('month')
  const [mode, setMode] = useState<Mode>('all')
  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const range = getDateRange(period)
      const col = collection(db, 'analyticsDaily')
      const q = range
        ? query(col, where('date', '>=', range.start), where('date', '<=', range.end), orderBy('date'))
        : query(col, orderBy('date'))
      const snap = await getDocs(q)
      const data = snap.docs.map(d => d.data() as DailyRecord)
      setRecords(data)
      if (data.length > 0 && !selectedSlug) {
        const top = getSlugRanking(data)[0]
        if (top) setSelectedSlug(top[0])
      }
      setLoading(false)
    }
    load()
  }, [period])

  useEffect(() => {
    if (!canvasRef.current || loading) return
    if (chartRef.current) chartRef.current.destroy()

    const filtered = mode === 'post' && selectedSlug
      ? records.filter(r => r.slug === selectedSlug)
      : records

    const dateMap = new Map<string, number>()
    for (const r of filtered) {
      dateMap.set(r.date, (dateMap.get(r.date) || 0) + r.views)
    }
    const dates = [...dateMap.keys()].sort()
    const labels = dates.map(d => d.slice(5).replace('-', '/'))
    const data = dates.map(d => dateMap.get(d) || 0)

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: mode === 'post' ? '#7c3aed' : '#2563eb',
          backgroundColor: mode === 'post' ? 'rgba(124,58,237,0.08)' : 'rgba(37,99,235,0.08)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 }, maxTicksLimit: 8 } },
          y: { grid: { color: '#f3f4f6' }, ticks: { color: '#9ca3af', font: { size: 11 }, precision: 0, stepSize: 1 }, beginAtZero: true },
        },
      },
    })
  }, [records, mode, selectedSlug, loading])

  const totalViews = records.reduce((s, r) => s + (r.views || 0), 0)
  const totalGoogle = records.reduce((s, r) => s + (r.google || 0), 0)
  const totalDirect = records.reduce((s, r) => s + (r.direct || 0), 0)
  const totalSocial = records.reduce((s, r) => s + (r.social || 0), 0)
  const totalInternal = records.reduce((s, r) => s + (r.internal || 0), 0)
  const totalBooking = records.reduce((s, r) => s + (r.booking || 0), 0)
  const totalOther = records.reduce((s, r) => s + (r.other || 0), 0)

  const ranking = getSlugRanking(records)
  const slugs = [...new Set(records.map(r => r.slug))]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">アクセス解析</h2>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 text-sm">
          {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 ${period === p ? 'bg-blue-600 text-white font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* グラフ */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
            {(['all', 'post'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1 text-sm transition ${mode === m ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500 hover:bg-white'}`}
              >
                {m === 'all' ? '全体' : '記事ごと'}
              </button>
            ))}
          </div>
          {mode === 'all' ? (
            <p className="text-2xl font-bold text-gray-800">
              {totalViews.toLocaleString()} <span className="text-sm font-normal text-gray-400">PV</span>
            </p>
          ) : (
            <select
              value={selectedSlug}
              onChange={e => setSelectedSlug(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs truncate"
            >
              {slugs.map(s => (
                <option key={s} value={s}>{s === '_index' ? 'ブログトップ' : s}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ height: 220 }}>
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">読み込み中...</div>
          ) : records.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">データがありません</div>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>
      </div>

      {/* アクセス元 + ランキング */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-medium text-gray-700">アクセス元</p>
          {loading ? (
            <p className="text-sm text-gray-400">読み込み中...</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Google 検索', value: totalGoogle, color: 'bg-blue-500' },
                { label: '直接アクセス', value: totalDirect, color: 'bg-indigo-400' },
                { label: 'SNS', value: totalSocial, color: 'bg-pink-400' },
                { label: '自社サイト', value: totalInternal, color: 'bg-green-400' },
                { label: '予約アプリ', value: totalBooking, color: 'bg-amber-400' },
                { label: 'その他', value: totalOther, color: 'bg-gray-300' },
              ].map(({ label, value, color }) => {
                const pct = totalViews > 0 ? Math.round((value / totalViews) * 100) : 0
                return (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-medium text-gray-500">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="mb-4 text-sm font-medium text-gray-700">記事別ランキング（{PERIOD_LABELS[period]}）</p>
          {loading ? (
            <p className="text-sm text-gray-400">読み込み中...</p>
          ) : ranking.length === 0 ? (
            <p className="text-sm text-gray-400">データがありません</p>
          ) : (
            <div className="space-y-3">
              {ranking.slice(0, 6).map(([slug, views], i) => (
                <div key={slug} className="flex items-center gap-3">
                  <span className={`w-5 flex-shrink-0 text-center text-sm font-bold ${i === 0 ? 'text-blue-600' : i === 1 ? 'text-blue-400' : i === 2 ? 'text-blue-300' : 'text-gray-400'}`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm text-gray-800">{slug === '_index' ? 'ブログトップ' : slug}</span>
                  <span className="flex-shrink-0 text-sm font-medium text-gray-600">{views.toLocaleString()} PV</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getSlugRanking(records: DailyRecord[]): [string, number][] {
  const map = new Map<string, number>()
  for (const r of records) {
    map.set(r.slug, (map.get(r.slug) || 0) + r.views)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}
