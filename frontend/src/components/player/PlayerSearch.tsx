import { useState, type KeyboardEvent, type FormEvent } from 'react'
import { Search, Loader2 } from 'lucide-react'

interface PlayerSearchProps {
  onSearch: (name: string) => void
  loading: boolean
}

const SUGGESTED_PLAYERS = [
  'LeBron James',
  'Stephen Curry',
  'Nikola Jokic',
  'Shai Gilgeous-Alexander',
  'Giannis Antetokounmpo',
]

export function PlayerSearch({ onSearch, loading }: PlayerSearchProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed && !loading) onSearch(trimmed)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = query.trim()
      if (trimmed && !loading) onSearch(trimmed)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <form onSubmit={handleSubmit} className="relative flex gap-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: '#64748b' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any NBA player…"
            disabled={loading}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium outline-none transition-all disabled:opacity-50"
            style={{
              backgroundColor: '#1e2130',
              border: '1px solid #2d3148',
              color: '#f1f5f9',
              caretColor: '#f97316',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#f97316'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#2d3148'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ backgroundColor: '#f97316', color: '#fff' }}
          onMouseEnter={(e) => {
            if (!loading && query.trim()) {
              e.currentTarget.style.backgroundColor = '#ea6b0a'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f97316'
          }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {loading ? 'Analyzing' : 'Analyze'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTED_PLAYERS.map((name) => (
          <button
            key={name}
            onClick={() => {
              setQuery(name)
              if (!loading) onSearch(name)
            }}
            disabled={loading}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'rgba(249,115,22,0.1)',
              color: '#f97316',
              border: '1px solid rgba(249,115,22,0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(249,115,22,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(249,115,22,0.1)'
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}
