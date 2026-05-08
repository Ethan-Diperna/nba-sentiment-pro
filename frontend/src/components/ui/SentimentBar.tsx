interface SentimentBarProps {
  positive: number
  neutral: number
  negative: number
}

export function SentimentBar({ positive, neutral, negative }: SentimentBarProps) {
  const total = positive + neutral + negative
  const positivePct = total > 0 ? (positive / total) * 100 : positive
  const neutralPct = total > 0 ? (neutral / total) * 100 : neutral
  const negativePct = total > 0 ? (negative / total) * 100 : negative

  return (
    <div className="w-full">
      <div className="flex rounded-full overflow-hidden h-7" style={{ gap: 2 }}>
        {positivePct > 0 && (
          <div
            className="flex items-center justify-center text-xs font-bold text-white transition-all duration-700"
            style={{
              width: `${positivePct}%`,
              backgroundColor: '#22c55e',
              minWidth: positivePct > 5 ? undefined : 0,
            }}
          >
            {positivePct >= 8 && `${Math.round(positivePct)}%`}
          </div>
        )}
        {neutralPct > 0 && (
          <div
            className="flex items-center justify-center text-xs font-bold text-white transition-all duration-700"
            style={{
              width: `${neutralPct}%`,
              backgroundColor: '#eab308',
              minWidth: neutralPct > 5 ? undefined : 0,
            }}
          >
            {neutralPct >= 8 && `${Math.round(neutralPct)}%`}
          </div>
        )}
        {negativePct > 0 && (
          <div
            className="flex items-center justify-center text-xs font-bold text-white transition-all duration-700"
            style={{
              width: `${negativePct}%`,
              backgroundColor: '#ef4444',
              minWidth: negativePct > 5 ? undefined : 0,
            }}
          >
            {negativePct >= 8 && `${Math.round(negativePct)}%`}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-2.5 text-xs font-medium" style={{ color: '#64748b' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span>Positive {Math.round(positivePct)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
          <span>Neutral {Math.round(neutralPct)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          <span>Negative {Math.round(negativePct)}%</span>
        </div>
      </div>
    </div>
  )
}
