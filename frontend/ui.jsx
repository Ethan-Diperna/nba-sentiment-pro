// Shared UI primitives for the broadcast-y NBA Sentiment Pro prototype.

const { useState, useEffect, useRef, useMemo } = React;

// =============== TICKER ===============
function Ticker({ items, accent }) {
  // Continuous marquee
  const list = [...items, ...items, ...items];
  return (
    <div className="ticker-wrap">
      <div className="ticker-label" style={{ background: accent }}>LIVE · LEAGUE PULSE</div>
      <div className="ticker-track">
        {list.map((it, i) => (
          <div key={i} className="ticker-item">
            <span className={`ticker-arrow ${it.kind}`}>{it.kind === "rise" ? "▲" : "▼"}</span>
            <span className="ticker-name">{it.player}</span>
            <span className={`ticker-val ${it.kind}`}>{it.val}</span>
            <span className="ticker-sep">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============== ANIMATED COUNTER ===============
function Counter({ value, decimals = 0, duration = 1100, prefix = "", suffix = "" }) {
  const [v, setV] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    let raf;
    const step = (t) => {
      if (!startRef.current) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span>{prefix}{v.toFixed(decimals)}{suffix}</span>;
}

// =============== JERSEY CHIP (placeholder for player photo) ===============
function JerseyChip({ player, size = 72, style = {} }) {
  const team = window.TEAMS[player.team];
  const initials = (player.first[0] + player.last[0]).toUpperCase();
  return (
    <div
      className="jersey-chip"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${team.color1} 0%, ${team.color2} 100%)`,
        ...style,
      }}
    >
      <span className="jersey-num">{player.num}</span>
      <span className="jersey-init">{initials}</span>
    </div>
  );
}

// =============== TEAM BADGE ===============
function TeamBadge({ team, size = 28 }) {
  const t = window.TEAMS[team];
  return (
    <div
      className="team-badge"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${t.color1} 0%, ${t.color2} 100%)`,
      }}
    >
      <span style={{ fontSize: size * 0.34 }}>{team}</span>
    </div>
  );
}

// =============== SPARKLINE ===============
function Sparkline({ data, color, height = 32, width = 120, animate = true, fill = true }) {
  const pathRef = useRef(null);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);
  const stepX = width / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2]);
  const d = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const dArea = `${d} L ${width} ${height} L 0 ${height} Z`;

  useEffect(() => {
    if (!animate || !pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    pathRef.current.style.strokeDasharray = len;
    pathRef.current.style.strokeDashoffset = len;
    requestAnimationFrame(() => {
      pathRef.current.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.16,1,.3,1)";
      pathRef.current.style.strokeDashoffset = "0";
    });
  }, [data, animate]);

  return (
    <svg width={width} height={height} className="sparkline">
      {fill && (
        <defs>
          <linearGradient id={`spk-${color.replace("#","")}-${width}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={dArea} fill={`url(#spk-${color.replace("#","")}-${width})`} />}
      <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// =============== SCORE BLOCK (broadcast-style big score) ===============
function ScoreBlock({ score, label, color, size = "lg" }) {
  const sz = size === "lg" ? 144 : size === "md" ? 96 : 56;
  return (
    <div className="score-block" style={{ "--sb-color": color }}>
      <div className="score-block-num" style={{ fontSize: sz, lineHeight: 0.85 }}>
        <Counter value={score} />
      </div>
      <div className="score-block-label">{label}</div>
    </div>
  );
}

// =============== SENTIMENT BAR (animated sweep) ===============
function SentimentBar({ pos, neu, neg, height = 14, animate = true }) {
  const [w, setW] = useState(animate ? [0, 0, 0] : [pos, neu, neg]);
  useEffect(() => {
    const t = setTimeout(() => setW([pos, neu, neg]), 60);
    return () => clearTimeout(t);
  }, [pos, neu, neg]);
  return (
    <div className="sentbar" style={{ height }}>
      <div className="sentbar-seg pos" style={{ width: `${w[0]}%` }} />
      <div className="sentbar-seg neu" style={{ width: `${w[1]}%` }} />
      <div className="sentbar-seg neg" style={{ width: `${w[2]}%` }} />
    </div>
  );
}

// =============== RING GAUGE (with broadcast glow) ===============
function RingGauge({ score, color, size = 240, accentColor }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  const ringRef = useRef(null);
  useEffect(() => {
    if (!ringRef.current) return;
    ringRef.current.style.strokeDashoffset = c;
    requestAnimationFrame(() => {
      ringRef.current.style.transition = "stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)";
      ringRef.current.style.strokeDashoffset = off;
    });
  }, [score, off, c]);
  return (
    <div className="ring-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={accentColor || color} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          ref={ringRef}
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c}
          style={{ filter: `drop-shadow(0 0 18px ${color}88)` }}
        />
      </svg>
      <div className="ring-gauge-center">
        <div className="ring-gauge-num" style={{ color }}>
          <Counter value={score} />
        </div>
        <div className="ring-gauge-cap">SENTIMENT</div>
      </div>
    </div>
  );
}

// =============== DIAGONAL SLAB HEADER ===============
function SlabHeader({ kicker, title, accent }) {
  return (
    <div className="slab-header">
      <div className="slab-kicker" style={{ background: accent }}>{kicker}</div>
      <h2 className="slab-title">{title}</h2>
    </div>
  );
}

// =============== STAT TILE ===============
function StatTile({ label, value, sub, color, icon }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-head">
        {icon && <span className="stat-tile-icon">{icon}</span>}
        <span className="stat-tile-label">{label}</span>
      </div>
      <div className="stat-tile-value" style={{ color }}>{value}</div>
      {sub && <div className="stat-tile-sub">{sub}</div>}
    </div>
  );
}

// =============== TREND PILL (▲+6.4) ===============
function TrendPill({ delta }) {
  const positive = delta >= 0;
  return (
    <span className={`trend-pill ${positive ? "up" : "down"}`}>
      {positive ? "▲" : "▼"} {positive ? "+" : ""}{delta.toFixed(1)}
    </span>
  );
}

// =============== SCANLINE OVERLAY ===============
function Scanlines() {
  return <div className="scanlines" aria-hidden="true" />;
}

// Export
Object.assign(window, {
  Ticker, Counter, JerseyChip, TeamBadge, Sparkline, ScoreBlock,
  SentimentBar, RingGauge, SlabHeader, StatTile, TrendPill, Scanlines,
});
