import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import type { HistoryPoint } from '../../lib/api'

interface SentimentChartProps {
  history: HistoryPoint[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0]?.value ?? 0
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm"
      style={{
        backgroundColor: '#1e2130',
        border: '1px solid #2d3148',
        color: '#f1f5f9',
      }}
    >
      <div className="font-semibold" style={{ color: '#f97316' }}>
        Score: {typeof value === 'number' ? Math.round(value) : value}
      </div>
      <div style={{ color: '#64748b' }}>{label}</div>
    </div>
  )
}

export function SentimentChart({ history }: SentimentChartProps) {
  if (history.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-40 rounded-xl text-sm"
        style={{ color: '#64748b', backgroundColor: '#1e2130', border: '1px solid #2d3148' }}
      >
        No historical data available
      </div>
    )
  }

  const data = history.map((p) => ({
    date: formatDate(p.created_at),
    score: p.score,
    comments: p.comment_count,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#orangeGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#f97316', stroke: '#0f1117', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
