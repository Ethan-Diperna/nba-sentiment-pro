import { useState, useEffect } from 'react'
import { fetchPlayerSentiment, fetchHistory } from '../lib/api'
import type { SentimentResult, HistoryPoint } from '../lib/api'

interface UsePlayerSentimentReturn {
  result: SentimentResult | null
  history: HistoryPoint[]
  loading: boolean
  error: string | null
}

export function usePlayerSentiment(playerName: string | null): UsePlayerSentimentReturn {
  const [result, setResult] = useState<SentimentResult | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!playerName) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setResult(null)
      setHistory([])

      try {
        const [sentimentData, historyData] = await Promise.all([
          fetchPlayerSentiment(playerName),
          fetchHistory(playerName, 30),
        ])

        if (!cancelled) {
          setResult(sentimentData)
          setHistory(historyData)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [playerName])

  return { result, history, loading, error }
}
