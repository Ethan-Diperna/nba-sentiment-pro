import { ThumbsUp, Hash } from 'lucide-react'
import type { Comment } from '../../lib/api'

interface CommentCardProps {
  comment: Comment
}

function getLabelColor(label: string): string {
  const l = label.toLowerCase()
  if (l === 'positive') return '#22c55e'
  if (l === 'negative') return '#ef4444'
  return '#eab308'
}

function getLabelBg(label: string): string {
  const l = label.toLowerCase()
  if (l === 'positive') return 'rgba(34,197,94,0.12)'
  if (l === 'negative') return 'rgba(239,68,68,0.12)'
  return 'rgba(234,179,8,0.12)'
}

export function CommentCard({ comment }: CommentCardProps) {
  const borderColor = getLabelColor(comment.label)
  const truncated =
    comment.comment_text.length > 120
      ? comment.comment_text.slice(0, 120).trim() + '…'
      : comment.comment_text

  return (
    <article
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        backgroundColor: '#1e2130',
        border: '1px solid #2d3148',
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
        {truncated}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider"
            style={{
              color: getLabelColor(comment.label),
              backgroundColor: getLabelBg(comment.label),
            }}
          >
            {comment.label}
          </span>

          <span
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: '#64748b' }}
          >
            <ThumbsUp size={11} />
            {comment.upvotes.toLocaleString()}
          </span>
        </div>

        <span
          className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md"
          style={{ color: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)' }}
        >
          <Hash size={10} />
          {comment.subreddit}
        </span>
      </div>
    </article>
  )
}
