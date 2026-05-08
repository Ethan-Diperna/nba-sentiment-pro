const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface Comment {
  comment_text: string
  label: string
  score_compound: number
  upvotes: number
  subreddit: string
}

export interface SentimentResult {
  player_name: string
  score: number
  positive_pct: number
  neutral_pct: number
  negative_pct: number
  comment_count: number
  top_comments: Comment[]
  label: string
}

export interface HistoryPoint {
  score: number
  created_at: string
  comment_count: number
}

export interface ModelInfo {
  model_name: string
  use_fine_tuned: boolean
  version: string
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export function fetchPlayerSentiment(name: string): Promise<SentimentResult> {
  return request<SentimentResult>(`/player/${encodeURIComponent(name)}`)
}

export function fetchHistory(name: string, days = 30): Promise<HistoryPoint[]> {
  return request<HistoryPoint[]>(`/history/${encodeURIComponent(name)}?days=${days}`)
}

export function fetchComments(name: string, limit = 10): Promise<Comment[]> {
  return request<Comment[]>(`/comments/${encodeURIComponent(name)}?limit=${limit}`)
}

export function fetchModelInfo(): Promise<ModelInfo> {
  return request<ModelInfo>('/model-info')
}
