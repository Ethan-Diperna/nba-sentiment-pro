import { MessageSquare, TrendingUp, BarChart2 } from 'lucide-react'
import { ScoreGauge } from '../ui/ScoreGauge'
import { SentimentBar } from '../ui/SentimentBar'
import { CommentCard } from '../ui/CommentCard'
import { SentimentChart } from '../charts/SentimentChart'
import type { SentimentResult, HistoryPoint } from '../../lib/api'

interface PlayerDashboardProps {
  result: SentimentResult
  history: HistoryPoint[]
}

function topSubreddit(result: SentimentResult): string {
  const counts: Record<string, number> = {}
  for (const c of result.top_comments) {
    counts[c.subreddit] = (counts[c.subreddit] ?? 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return top ? top[0] : 'nba'
}

export function PlayerDashboard({ result, history }: PlayerDashboardProps) {
  const displayedComments = result.top_comments.slice(0, 6)
  const subreddit = topSubreddit(result)

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Player name header */}
      <div className="text-center">
        <h2
          className="font-black tracking-tight leading-none"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#f1f5f9' }}
        >
          {result.player_name}
        </h2>
        <p className="text-sm font-medium mt-1" style={{ color: '#64748b' }}>
          Based on {result.comment_count.toLocaleString()} Reddit comments
        </p>
      </div>

      {/* Score + bar */}
      <div
        className="rounded-2xl p-6 md:p-8 flex flex-col items-center gap-6"
        style={{ backgroundColor: '#1e2130', border: '1px solid #2d3148' }}
      >
        <ScoreGauge score={result.score} label={result.label} />
        <div className="w-full max-w-md">
          <SentimentBar
            positive={result.positive_pct}
            neutral={result.neutral_pct}
            negative={result.negative_pct}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="rounded-xl p-4 flex flex-col gap-1"
          style={{ backgroundColor: '#1e2130', border: '1px solid #2d3148' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={14} style={{ color: '#f97316' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
              Comments
            </span>
          </div>
          <span className="text-2xl font-black" style={{ color: '#f1f5f9' }}>
            {result.comment_count.toLocaleString()}
          </span>
        </div>

        <div
          className="rounded-xl p-4 flex flex-col gap-1"
          style={{ backgroundColor: '#1e2130', border: '1px solid #2d3148' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} style={{ color: '#22c55e' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
              Positive
            </span>
          </div>
          <span className="text-2xl font-black" style={{ color: '#22c55e' }}>
            {Math.round(result.positive_pct)}%
          </span>
        </div>

        <div
          className="rounded-xl p-4 flex flex-col gap-1"
          style={{ backgroundColor: '#1e2130', border: '1px solid #2d3148' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={14} style={{ color: '#f97316' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
              Top Source
            </span>
          </div>
          <span className="text-2xl font-black truncate" style={{ color: '#f97316' }}>
            r/{subreddit}
          </span>
        </div>
      </div>

      {/* History chart */}
      {history.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: '#1e2130', border: '1px solid #2d3148' }}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#64748b' }}>
            Sentiment Trend (30 days)
          </h3>
          <SentimentChart history={history} />
        </div>
      )}

      {/* Top comments */}
      {displayedComments.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#64748b' }}>
            Top Comments
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedComments.map((comment, i) => (
              <CommentCard key={i} comment={comment} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
