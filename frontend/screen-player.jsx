// Player dashboard screen — broadcast-style.

const { useState: useStateP, useEffect: useEffectP, useMemo: useMemoP } = React;

function SubredditChart({ data, accent }) {
  const max = Math.max(...data.map(d => d.share));
  return (
    <div className="sub-chart">
      {data.map((d, i) => (
        <div key={d.sub} className="sub-row" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="sub-label">r/{d.sub}</div>
          <div className="sub-bar-wrap">
            <div
              className="sub-bar"
              style={{
                width: `${(d.share / max) * 100}%`,
                background: `linear-gradient(90deg, ${accent} 0%, ${accent}88 100%)`,
              }}
            >
              <span className="sub-share">{d.share}%</span>
            </div>
          </div>
          <div className="sub-meta">
            <span className="sub-sent">{d.sentiment}</span>
            <span className="sub-vol">{d.volume.toLocaleString()}</span>
          </div>
        </div>
      ))}
      <div className="sub-chart-foot">
        <span>SHARE OF VOICE</span>
        <span>SENT · VOL</span>
      </div>
    </div>
  );
}

function ThemedComments({ themes, accent }) {
  const themeKeys = Object.keys(themes);
  const [active, setActive] = useStateP(themeKeys[0]);
  return (
    <div className="themes">
      <div className="themes-tabs">
        {themeKeys.map((k) => (
          <button
            key={k}
            className={`theme-tab ${active === k ? "on" : ""}`}
            onClick={() => setActive(k)}
            style={active === k ? { borderColor: accent, color: accent } : {}}
          >
            {k}
            <span className="theme-tab-count">{themes[k].length}</span>
          </button>
        ))}
      </div>
      <div className="themes-grid" key={active}>
        {themes[active].map((c, i) => (
          <article
            key={i}
            className={`comment-card label-${c.label}`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
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
    </div>
  );
}

function HistoryChart({ history, accent, height = 220 }) {
  const w = 880;
  const h = height;
  const pad = { l: 36, r: 16, t: 16, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const stepX = innerW / Math.max(1, history.length - 1);
  const pts = history.map((d, i) => [pad.l + i * stepX, pad.t + innerH - (d.score / 100) * innerH]);
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const areaPath = `${linePath} L ${pad.l + innerW} ${pad.t + innerH} L ${pad.l} ${pad.t + innerH} Z`;
  const ref = React.useRef(null);

  useEffectP(() => {
    if (!ref.current) return;
    const len = ref.current.getTotalLength();
    ref.current.style.strokeDasharray = len;
    ref.current.style.strokeDashoffset = len;
    requestAnimationFrame(() => {
      ref.current.style.transition = "stroke-dashoffset 1.8s cubic-bezier(.16,1,.3,1)";
      ref.current.style.strokeDashoffset = "0";
    });
  }, [history]);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="hist-svg">
      <defs>
        <linearGradient id="hist-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => {
        const y = pad.t + innerH - (g / 100) * innerH;
        return <line key={g} x1={pad.l} x2={pad.l + innerW} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" />;
      })}
      {[0, 25, 50, 75, 100].map((g) => {
        const y = pad.t + innerH - (g / 100) * innerH;
        return <text key={g} x={pad.l - 8} y={y + 4} textAnchor="end" className="hist-tick">{g}</text>;
      })}
      <path d={areaPath} fill="url(#hist-area)" />
      <path ref={ref} d={linePath} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 8px ${accent}88)` }} />
      {/* Last point pulse */}
      {pts.length > 0 && (
        <>
          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="6" fill={accent} opacity="0.25">
            <animate attributeName="r" from="4" to="14" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4" fill={accent} />
        </>
      )}
      {/* X axis dates */}
      {[0, Math.floor(history.length/2), history.length-1].map(i => (
        <text key={i} x={pad.l + i * stepX} y={h - 8} textAnchor="middle" className="hist-tick">
          {new Date(history[i].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </text>
      ))}
    </svg>
  );
}

function PlayerScreen({ player, accent, density, onCompare }) {
  const team = window.TEAMS[player.team];
  const last7 = player.history.slice(-7).map(d => d.score);
  const sevenAvg = last7.reduce((a,b)=>a+b,0)/last7.length;
  const overallAvg = player.history.reduce((a,b)=>a+b.score,0)/player.history.length;
  const peak = Math.max(...player.history.map(d=>d.score));
  const trough = Math.min(...player.history.map(d=>d.score));

  return (
    <div className={`player-screen density-${density}`}>
      {/* Hero band */}
      <section className="player-hero">
        <div
          className="player-hero-bg"
          style={{
            background: `linear-gradient(120deg, ${team.color1}cc 0%, ${team.color2}77 50%, transparent 100%)`,
          }}
        />
        <div className="player-hero-content">
          <div className="player-hero-left">
            <JerseyChip player={player} size={140} />
            <div>
              <div className="player-meta">
                <TeamBadge team={player.team} />
                <span className="player-pos">{player.pos} · #{player.num}</span>
                <span className="player-team-name">{team.city} {team.name}</span>
              </div>
              <h1 className="player-name">
                <span className="player-first">{player.first}</span>
                <span className="player-last">{player.last}</span>
              </h1>
              <div className="player-hero-foot">
                <span className="live-dot" />
                <span>LIVE · {player.comment_count.toLocaleString()} COMMENTS · LAST 30 DAYS</span>
              </div>
            </div>
          </div>
          <div className="player-hero-right">
            <RingGauge score={player.score} color={accent} size={260} />
          </div>
        </div>
      </section>

      {/* Score row */}
      <section className="player-row score-row">
        <StatTile
          label="Sentiment Score"
          value={<Counter value={player.score} />}
          sub={`/ 100 · ${player.label}`}
          color={accent}
        />
        <StatTile
          label="Positive"
          value={<><Counter value={player.positive_pct} suffix="%" /></>}
          sub={`${Math.round(player.comment_count * player.positive_pct / 100).toLocaleString()} comments`}
          color="#22c55e"
        />
        <StatTile
          label="Negative"
          value={<><Counter value={player.negative_pct} suffix="%" /></>}
          sub={`${Math.round(player.comment_count * player.negative_pct / 100).toLocaleString()} comments`}
          color="#ef4444"
        />
        <StatTile
          label="30-day trend"
          value={<><Counter value={Math.abs(player.trend)} prefix={player.trend >= 0 ? "+" : "-"} decimals={1} /></>}
          sub={player.trend >= 0 ? "rising" : "falling"}
          color={player.trend >= 0 ? "#22c55e" : "#ef4444"}
        />
        <StatTile
          label="Peak / Low"
          value={<span style={{ fontVariantNumeric: "tabular-nums" }}>{peak}<span className="dim"> / </span>{trough}</span>}
          sub="last 30d"
          color="#f1f5f9"
        />
      </section>

      {/* Trend chart + sentiment split */}
      <section className="player-row two-col">
        <div className="card big-card">
          <div className="card-head">
            <SlabHeader kicker="TREND · 30D" title="SENTIMENT TIMELINE" accent={accent} />
            <div className="card-head-meta">
              <span>7d avg <strong style={{color:accent}}>{Math.round(sevenAvg)}</strong></span>
              <span>30d avg <strong>{Math.round(overallAvg)}</strong></span>
            </div>
          </div>
          <HistoryChart history={player.history} accent={accent} />
        </div>
        <div className="card">
          <SlabHeader kicker="SPLIT" title="SENTIMENT MIX" accent={accent} />
          <div className="mix-content">
            <div className="mix-item">
              <span className="mix-dot" style={{ background: "#22c55e" }} />
              <span className="mix-label">POSITIVE</span>
              <span className="mix-val">{player.positive_pct}%</span>
            </div>
            <div className="mix-item">
              <span className="mix-dot" style={{ background: "#eab308" }} />
              <span className="mix-label">NEUTRAL</span>
              <span className="mix-val">{player.neutral_pct}%</span>
            </div>
            <div className="mix-item">
              <span className="mix-dot" style={{ background: "#ef4444" }} />
              <span className="mix-label">NEGATIVE</span>
              <span className="mix-val">{player.negative_pct}%</span>
            </div>
            <SentimentBar pos={player.positive_pct} neu={player.neutral_pct} neg={player.negative_pct} height={18} />
          </div>
          <button
            className="action-btn"
            onClick={onCompare}
            style={{ marginTop: 24, background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}
          >
            COMPARE WITH ANOTHER PLAYER →
          </button>
        </div>
      </section>

      {/* Subreddit breakdown + themed comments */}
      <section className="player-row two-col">
        <div className="card">
          <SlabHeader kicker="SOURCES" title="SUBREDDIT BREAKDOWN" accent={accent} />
          <SubredditChart data={player.subBreakdown} accent={accent} />
        </div>
        <div className="card">
          <SlabHeader kicker="WHAT FANS SAY" title="COMMENTS BY THEME" accent={accent} />
          <ThemedComments themes={player.themes} accent={accent} />
        </div>
      </section>
    </div>
  );
}

window.PlayerScreen = PlayerScreen;
