interface ScoreGaugeProps {
  score: number
  label: string
}

function getColor(score: number): string {
  if (score >= 60) return '#22c55e'
  if (score >= 40) return '#eab308'
  return '#ef4444'
}

function getGlowColor(score: number): string {
  if (score >= 60) return 'rgba(34,197,94,0.25)'
  if (score >= 40) return 'rgba(234,179,8,0.25)'
  return 'rgba(239,68,68,0.25)'
}

export function ScoreGauge({ score, label }: ScoreGaugeProps) {
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const clampedScore = Math.max(0, Math.min(100, score))
  const offset = circumference - (clampedScore / 100) * circumference
  const color = getColor(clampedScore)
  const glowColor = getGlowColor(clampedScore)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 220, height: 220 }}>
        <svg width="220" height="220" viewBox="0 0 220 220" className="rotate-[-90deg]">
          {/* Track */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="#2d3148"
            strokeWidth="14"
          />
          {/* Progress */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1), stroke 0.3s ease',
              filter: `drop-shadow(0 0 8px ${glowColor})`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-black leading-none tracking-tight"
            style={{ fontSize: 52, color }}
          >
            {Math.round(clampedScore)}
          </span>
          <span className="text-sm font-semibold uppercase tracking-widest mt-1" style={{ color: '#64748b' }}>
            out of 100
          </span>
        </div>
      </div>

      <div
        className="px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest"
        style={{
          backgroundColor: `${color}18`,
          color,
          border: `1px solid ${color}40`,
        }}
      >
        {label}
      </div>
    </div>
  )
}
