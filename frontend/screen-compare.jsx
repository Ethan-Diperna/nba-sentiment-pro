// Compare screen — head-to-head broadcast scoreboard.

const { useState: useStateC, useMemo: useMemoC } = React;

function ComparePicker({ players, value, onChange, side, accent }) {
  const [open, setOpen] = useStateC(false);
  const [q, setQ] = useStateC("");
  const filtered = players.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  const team = value ? window.TEAMS[value.team] : null;

  return (
    <div className={`cmp-picker side-${side}`} style={{ position: "relative" }}>
      <button className="cmp-picker-btn" onClick={() => setOpen(!open)}>
        {value ? (
          <>
            <JerseyChip player={value} size={48} />
            <div className="cmp-picker-meta">
              <div className="cmp-picker-name">{value.name}</div>
              <div className="cmp-picker-sub">{team.name.toUpperCase()} · #{value.num}</div>
            </div>
          </>
        ) : (
          <div className="cmp-picker-empty">+ pick a player</div>
        )}
        <span className="cmp-picker-caret">▾</span>
      </button>
      {open && (
        <div className="cmp-picker-menu">
          <input
            autoFocus
            className="cmp-picker-search"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="cmp-picker-list">
            {filtered.map(p => (
              <button
                key={p.id}
                className="cmp-picker-item"
                onClick={() => { onChange(p); setOpen(false); setQ(""); }}
              >
                <JerseyChip player={p} size={32} />
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <span className="dim" style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
                  {p.score}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompareDelta({ a, b }) {
  const delta = a - b;
  return (
    <div className={`cmp-delta ${delta >= 0 ? "up" : "down"}`}>
      {delta >= 0 ? "+" : ""}{delta}
    </div>
  );
}

function HeadToHeadBar({ a, b, accentA, accentB }) {
  const total = a + b || 1;
  const aPct = (a / total) * 100;
  const [w, setW] = useStateC([50, 50]);
  React.useEffect(() => {
    const t = setTimeout(() => setW([aPct, 100 - aPct]), 80);
    return () => clearTimeout(t);
  }, [aPct]);
  return (
    <div className="h2h-bar">
      <div className="h2h-seg left" style={{ width: `${w[0]}%`, background: accentA }}>
        {Math.round(aPct)}%
      </div>
      <div className="h2h-seg right" style={{ width: `${w[1]}%`, background: accentB }}>
        {Math.round(100 - aPct)}%
      </div>
    </div>
  );
}

function CompareScreen({ playerA, playerB, setA, setB, accent }) {
  const players = window.PLAYERS;
  const accentB = "#22d3ee"; // electric cyan, fixed for B side

  if (!playerA || !playerB) {
    return (
      <div className="cmp-screen">
        <div className="cmp-empty">
          <SlabHeader kicker="HEAD TO HEAD" title="COMPARE PLAYERS" accent={accent} />
          <p className="cmp-empty-msg">Pick two players to put their sentiment side-by-side.</p>
          <div className="cmp-pickers">
            <ComparePicker players={players} value={playerA} onChange={setA} side="left" accent={accent} />
            <div className="cmp-vs">VS</div>
            <ComparePicker players={players} value={playerB} onChange={setB} side="right" accent={accentB} />
          </div>
        </div>
      </div>
    );
  }

  const teamA = window.TEAMS[playerA.team];
  const teamB = window.TEAMS[playerB.team];

  const rows = [
    { label: "Sentiment Score", a: playerA.score, b: playerB.score, fmt: (v) => v },
    { label: "Positive %", a: playerA.positive_pct, b: playerB.positive_pct, fmt: (v) => `${v}%` },
    { label: "Negative %", a: playerA.negative_pct, b: playerB.negative_pct, fmt: (v) => `${v}%`, invert: true },
    { label: "30-day Trend", a: playerA.trend, b: playerB.trend, fmt: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}` },
    { label: "Comments", a: playerA.comment_count, b: playerB.comment_count, fmt: (v) => v.toLocaleString() },
  ];

  return (
    <div className="cmp-screen">
      {/* Pickers */}
      <div className="cmp-pickers compact">
        <ComparePicker players={players} value={playerA} onChange={setA} side="left" accent={accent} />
        <div className="cmp-vs">VS</div>
        <ComparePicker players={players} value={playerB} onChange={setB} side="right" accent={accentB} />
      </div>

      {/* Scoreboard */}
      <section className="cmp-scoreboard">
        <div
          className="cmp-side left"
          style={{ background: `linear-gradient(135deg, ${teamA.color1}cc 0%, transparent 80%)` }}
        >
          <JerseyChip player={playerA} size={120} />
          <div className="cmp-side-name">
            <div className="cmp-side-first">{playerA.first}</div>
            <div className="cmp-side-last">{playerA.last}</div>
          </div>
          <div className="cmp-side-team">{teamA.city.toUpperCase()} · {playerA.pos}</div>
          <div className="cmp-side-score" style={{ color: accent }}>
            <Counter value={playerA.score} />
          </div>
          <div className="cmp-side-label">{playerA.label.toUpperCase()}</div>
          <Sparkline data={playerA.history.map(h=>h.score)} color={accent} width={220} height={42} />
        </div>

        <div className="cmp-center">
          <div className="cmp-vs-big">VS</div>
          <CompareDelta a={playerA.score} b={playerB.score} />
          <div className="cmp-center-label">SCORE Δ</div>
        </div>

        <div
          className="cmp-side right"
          style={{ background: `linear-gradient(225deg, ${teamB.color1}cc 0%, transparent 80%)` }}
        >
          <JerseyChip player={playerB} size={120} />
          <div className="cmp-side-name">
            <div className="cmp-side-first">{playerB.first}</div>
            <div className="cmp-side-last">{playerB.last}</div>
          </div>
          <div className="cmp-side-team">{teamB.city.toUpperCase()} · {playerB.pos}</div>
          <div className="cmp-side-score" style={{ color: accentB }}>
            <Counter value={playerB.score} />
          </div>
          <div className="cmp-side-label">{playerB.label.toUpperCase()}</div>
          <Sparkline data={playerB.history.map(h=>h.score)} color={accentB} width={220} height={42} />
        </div>
      </section>

      {/* Stat rows */}
      <section className="cmp-stats">
        {rows.map((r, i) => {
          const winA = r.invert ? r.a < r.b : r.a > r.b;
          const winB = r.invert ? r.b < r.a : r.b > r.a;
          return (
            <div className="cmp-stat-row" key={r.label} style={{ animationDelay: `${i * 70}ms` }}>
              <div className={`cmp-stat-val left ${winA ? "win" : ""}`} style={winA ? { color: accent } : {}}>
                {r.fmt(r.a)}
              </div>
              <div className="cmp-stat-label">{r.label.toUpperCase()}</div>
              <div className={`cmp-stat-val right ${winB ? "win" : ""}`} style={winB ? { color: accentB } : {}}>
                {r.fmt(r.b)}
              </div>
            </div>
          );
        })}
      </section>

      {/* Sentiment mix h2h */}
      <section className="cmp-mix">
        <SlabHeader kicker="SHARE OF VOICE" title="WHO DOMINATES THE CONVERSATION" accent={accent} />
        <HeadToHeadBar a={playerA.comment_count} b={playerB.comment_count} accentA={accent} accentB={accentB} />
        <div className="cmp-mix-foot">
          <span style={{ color: accent }}>{playerA.last.toUpperCase()}</span>
          <span className="dim">{(playerA.comment_count + playerB.comment_count).toLocaleString()} TOTAL COMMENTS</span>
          <span style={{ color: accentB }}>{playerB.last.toUpperCase()}</span>
        </div>
      </section>

      {/* Side-by-side themed comments */}
      <section className="cmp-comments">
        <div className="cmp-comments-side">
          <div className="cmp-comments-head" style={{ color: accent }}>{playerA.last.toUpperCase()} · TOP TAKE</div>
          {(playerA.themes.Performance || []).slice(0,1).map((c, i) => (
            <article key={i} className="comment-card label-positive" style={{ borderLeftColor: accent }}>
              <div className="comment-quote">"</div>
              <p className="comment-text">{c.text}</p>
              <div className="comment-foot">
                <span className={`comment-label label-${c.label}`}>{c.label}</span>
                <span className="comment-sub">r/{c.sub}</span>
                <span className="comment-up">▲ {c.upvotes.toLocaleString()}</span>
              </div>
            </article>
          ))}
        </div>
        <div className="cmp-comments-side">
          <div className="cmp-comments-head" style={{ color: accentB }}>{playerB.last.toUpperCase()} · TOP TAKE</div>
          {(playerB.themes.Performance || []).slice(0,1).map((c, i) => (
            <article key={i} className="comment-card label-positive" style={{ borderLeftColor: accentB }}>
              <div className="comment-quote">"</div>
              <p className="comment-text">{c.text}</p>
              <div className="comment-foot">
                <span className={`comment-label label-${c.label}`}>{c.label}</span>
                <span className="comment-sub">r/{c.sub}</span>
                <span className="comment-up">▲ {c.upvotes.toLocaleString()}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

window.CompareScreen = CompareScreen;
