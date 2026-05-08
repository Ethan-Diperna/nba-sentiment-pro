// League leaderboard / trending screen.

const { useState: useStateL, useMemo: useMemoL } = React;

function LeaderRow({ player, rank, accent, onSelect, animDelay }) {
  const team = window.TEAMS[player.team];
  const last7 = player.history.slice(-7).map(d => d.score);
  return (
    <button
      className="leader-row"
      onClick={() => onSelect(player)}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="leader-rank">{String(rank).padStart(2, "0")}</div>
      <JerseyChip player={player} size={48} />
      <div className="leader-id">
        <div className="leader-name">{player.name}</div>
        <div className="leader-team">
          <TeamBadge team={player.team} size={16} />
          <span>{team.name.toUpperCase()} · {player.pos}</span>
        </div>
      </div>
      <div className="leader-score" style={{ color: accent }}>
        {player.score}
      </div>
      <div className="leader-spark">
        <Sparkline data={last7} color={accent} width={120} height={32} />
      </div>
      <div className={`leader-trend ${player.trend >= 0 ? "up" : "down"}`}>
        {player.trend >= 0 ? "▲" : "▼"} {player.trend >= 0 ? "+" : ""}{player.trend.toFixed(1)}
      </div>
      <div className="leader-vol">
        {player.comment_count.toLocaleString()}
        <span className="dim"> comments</span>
      </div>
      <div className="leader-cta">→</div>
    </button>
  );
}

function MoverCard({ player, accent, kind, onSelect }) {
  const team = window.TEAMS[player.team];
  return (
    <button className={`mover-card ${kind}`} onClick={() => onSelect(player)}>
      <div className="mover-head">
        <span className={`mover-kind ${kind}`}>{kind === "rise" ? "🔥 RISING" : "❄ COOLING"}</span>
        <span className="mover-delta">
          {player.trend >= 0 ? "+" : ""}{player.trend.toFixed(1)}
        </span>
      </div>
      <div className="mover-body">
        <JerseyChip player={player} size={56} />
        <div>
          <div className="mover-name">{player.name}</div>
          <div className="mover-meta">
            <TeamBadge team={player.team} size={14} />
            <span>{team.name.toUpperCase()}</span>
          </div>
        </div>
      </div>
      <div className="mover-foot">
        <Sparkline
          data={player.history.slice(-14).map(d => d.score)}
          color={kind === "rise" ? "#22c55e" : "#ef4444"}
          width={200}
          height={32}
        />
        <div className="mover-score" style={{ color: accent }}>{player.score}</div>
      </div>
    </button>
  );
}

function LeaderboardScreen({ accent, onSelect }) {
  const [sortBy, setSortBy] = useStateL("score"); // score | trend | volume
  const [filter, setFilter] = useStateL("all"); // all | rising | falling

  const sorted = useMemoL(() => {
    let list = [...window.PLAYERS];
    if (filter === "rising") list = list.filter(p => p.trend > 0);
    if (filter === "falling") list = list.filter(p => p.trend < 0);
    if (sortBy === "score") list.sort((a, b) => b.score - a.score);
    if (sortBy === "trend") list.sort((a, b) => b.trend - a.trend);
    if (sortBy === "volume") list.sort((a, b) => b.comment_count - a.comment_count);
    return list;
  }, [sortBy, filter]);

  const topRising = [...window.PLAYERS].sort((a, b) => b.trend - a.trend).slice(0, 3);
  const topFalling = [...window.PLAYERS].sort((a, b) => a.trend - b.trend).slice(0, 3);
  const totalComments = window.PLAYERS.reduce((s, p) => s + p.comment_count, 0);
  const avgScore = Math.round(window.PLAYERS.reduce((s,p) => s + p.score, 0) / window.PLAYERS.length);

  return (
    <div className="leader-screen">
      {/* League pulse */}
      <section className="league-pulse">
        <SlabHeader kicker="LEAGUE PULSE" title="THE LEAGUE TODAY" accent={accent} />
        <div className="league-pulse-grid">
          <StatTile label="League avg sentiment" value={<Counter value={avgScore} />} sub="across 20 stars" color={accent} />
          <StatTile label="Total comments analyzed" value={<Counter value={totalComments / 1000} decimals={1} suffix="K" />} sub="last 30 days" color="#f1f5f9" />
          <StatTile label="Players rising" value={<Counter value={window.PLAYERS.filter(p=>p.trend>0).length} />} sub="positive trend" color="#22c55e" />
          <StatTile label="Players cooling" value={<Counter value={window.PLAYERS.filter(p=>p.trend<0).length} />} sub="negative trend" color="#ef4444" />
        </div>
      </section>

      {/* Movers */}
      <section className="movers">
        <div className="movers-col">
          <div className="movers-head rise">🔥 BIGGEST RISERS</div>
          <div className="movers-list">
            {topRising.map(p => <MoverCard key={p.id} player={p} accent={accent} kind="rise" onSelect={onSelect} />)}
          </div>
        </div>
        <div className="movers-col">
          <div className="movers-head fall">❄ BIGGEST FALLERS</div>
          <div className="movers-list">
            {topFalling.map(p => <MoverCard key={p.id} player={p} accent={accent} kind="fall" onSelect={onSelect} />)}
          </div>
        </div>
      </section>

      {/* Full board */}
      <section className="board">
        <div className="board-head">
          <SlabHeader kicker="STANDINGS" title="LEAGUE LEADERBOARD" accent={accent} />
          <div className="board-controls">
            <div className="board-tabs">
              <button className={filter==="all"?"on":""} onClick={()=>setFilter("all")}>ALL</button>
              <button className={filter==="rising"?"on":""} onClick={()=>setFilter("rising")}>RISING</button>
              <button className={filter==="falling"?"on":""} onClick={()=>setFilter("falling")}>FALLING</button>
            </div>
            <div className="board-tabs">
              <span className="board-tabs-label">SORT</span>
              <button className={sortBy==="score"?"on":""} onClick={()=>setSortBy("score")}>SCORE</button>
              <button className={sortBy==="trend"?"on":""} onClick={()=>setSortBy("trend")}>MOMENTUM</button>
              <button className={sortBy==="volume"?"on":""} onClick={()=>setSortBy("volume")}>VOLUME</button>
            </div>
          </div>
        </div>
        <div className="leader-table">
          <div className="leader-table-head">
            <span>RANK</span>
            <span>PLAYER</span>
            <span>SCORE</span>
            <span>7D</span>
            <span>30D Δ</span>
            <span>VOLUME</span>
            <span></span>
          </div>
          {sorted.map((p, i) => (
            <LeaderRow key={p.id} player={p} rank={i+1} accent={accent} onSelect={onSelect} animDelay={i * 30} />
          ))}
        </div>
      </section>
    </div>
  );
}

window.LeaderboardScreen = LeaderboardScreen;
