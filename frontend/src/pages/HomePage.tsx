import { useState } from 'react'
import { Activity, Cpu, AlertTriangle, RefreshCw } from 'lucide-react'
import { PlayerSearch } from '../components/player/PlayerSearch'
import { PlayerDashboard } from '../components/player/PlayerDashboard'
import { usePlayerSentiment } from '../hooks/usePlayerSentiment'

export function HomePage() {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const { result, history, loading, error } = usePlayerSentiment(selectedPlayer)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f1117' }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          backgroundColor: 'rgba(15,17,23,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #2d3148',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#f97316' }}
          >
            <Activity size={16} color="#fff" />
          </div>
          <span className="font-black text-lg tracking-tight" style={{ color: '#f97316' }}>
            NBA Sentiment Pro
          </span>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.2)',
            color: '#94a3b8',
          }}
        >
          <Cpu size={11} style={{ color: '#f97316' }} />
          Powered by DistilBERT
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Hero / Search */}
        <section
          className="py-16 px-6 flex flex-col items-center gap-8"
          style={{
            background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(249,115,22,0.08) 0%, transparent 70%)',
          }}
        >
          {!result && !loading && !error && (
            <div className="text-center mb-2">
              <h1
                className="font-black tracking-tight leading-none mb-3"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                  color: '#f1f5f9',
                }}
              >
                Real-time NBA{' '}
                <span style={{ color: '#f97316' }}>Sentiment</span>
              </h1>
              <p className="text-base font-medium max-w-md mx-auto" style={{ color: '#64748b' }}>
                AI-powered analysis of Reddit discussions. Search any player to see what fans really think.
              </p>
            </div>
          )}

          <PlayerSearch onSearch={setSelectedPlayer} loading={loading} />
        </section>

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 py-24">
            <div
              className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#f97316' }}
            />
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: '#f1f5f9' }}>
                Analyzing Reddit…
              </p>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                Running DistilBERT sentiment inference
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex-1 flex items-center justify-center px-6 py-16">
            <div
              className="max-w-md w-full rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
              style={{
                backgroundColor: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <AlertTriangle size={32} color="#ef4444" />
              <div>
                <h2 className="font-bold text-lg mb-1" style={{ color: '#f1f5f9' }}>
                  Analysis Failed
                </h2>
                <p className="text-sm" style={{ color: '#94a3b8' }}>
                  {error}
                </p>
              </div>
              <button
                onClick={() => selectedPlayer && setSelectedPlayer(selectedPlayer + '')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ backgroundColor: '#ef4444', color: '#fff' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="px-6 pb-16">
            <PlayerDashboard result={result} history={history} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="flex items-center justify-center px-6 py-5 text-xs font-medium"
        style={{
          borderTop: '1px solid #2d3148',
          color: '#475569',
        }}
      >
        Built with DistilBERT + Reddit API &nbsp;·&nbsp; NBA Sentiment Pro
      </footer>
    </div>
  )
}
