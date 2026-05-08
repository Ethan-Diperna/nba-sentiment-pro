// Main app shell + landing screen + screen routing.

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

const PALETTES = {
  "court-orange": { accent: "#f97316", glow: "#fb923c", name: "Court Orange" },
  "electric-cyan": { accent: "#22d3ee", glow: "#67e8f9", name: "Electric Cyan" },
  "hot-magenta": { accent: "#ec4899", glow: "#f9a8d4", name: "Hot Magenta" },
  "court-lime": { accent: "#a3e635", glow: "#bef264", name: "Court Lime" },
};

// Fast suggestions
function searchPlayers(q) {
  if (!q.trim()) return [];
  const ql = q.toLowerCase();
  return window.PLAYERS.filter(p => p.name.toLowerCase().includes(ql)).slice(0, 6);
}

function LandingScreen({ accent, onPick, paletteKey }) {
  const [q, setQ] = useStateA("");
  const suggestions = searchPlayers(q);
  const featured = useMemoA(() => {
    return [...window.PLAYERS].sort((a,b) => Math.abs(b.trend) - Math.abs(a.trend)).slice(0, 4);
  }, []);

  return (
    <div className="landing" data-screen-label="Landing">
      {/* Cinematic hero */}
      <section className="landing-hero">
        <div className="landing-hero-bg">
          <div className="landing-glow" style={{ background: `radial-gradient(60% 50% at 50% 30%, ${accent}33 0%, transparent 70%)` }} />
          <div className="landing-stripe" style={{ background: accent }} />
          <Scanlines />
        </div>

        <div className="landing-hero-content">
          <div className="landing-kicker">
            <span className="live-dot" />
            POWERED BY DISTILBERT · REDDIT FIRE-HOSE
          </div>
          <h1 className="landing-title">
            <span>WHAT THE</span>
            <span className="landing-title-accent" style={{ color: accent }}>LEAGUE</span>
            <span>IS REALLY</span>
            <span className="landing-title-accent" style={{ color: accent }}>SAYING.</span>
          </h1>
          <p className="landing-sub">
            Real-time sentiment for every player on the floor. Search, compare, watch the league pulse move with every game.
          </p>

          {/* Search */}
          <div className="landing-search-wrap">
            <div className="landing-search">
              <span className="landing-search-icon">⌕</span>
              <input
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                placeholder="Search any NBA player…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suggestions[0]) onPick(suggestions[0]);
                }}
              />
              <button
                className="landing-search-btn"
                onClick={() => suggestions[0] && onPick(suggestions[0])}
                style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}
              >
                ANALYZE →
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="landing-suggest">
                {suggestions.map(p => (
                  <button key={p.id} className="landing-suggest-item" onClick={() => onPick(p)}>
                    <JerseyChip player={p} size={32} />
                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                    <span className="dim" style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace" }}>{p.score}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="landing-chips">
              {["LeBron James","Stephen Curry","Nikola Jokić","Shai Gilgeous-Alexander","Anthony Edwards"].map(name => {
                const p = window.PLAYERS.find(x => x.name === name);
                if (!p) return null;
                return (
                  <button
                    key={name}
                    className="landing-chip"
                    onClick={() => onPick(p)}
                    style={{ borderColor: `${accent}66` }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Featured (highest |trend|) */}
      <section className="landing-featured">
        <SlabHeader kicker="WHO'S MOVING" title="HOTTEST CONVERSATIONS" accent={accent} />
        <div className="landing-featured-grid">
          {featured.map((p, i) => {
            const team = window.TEAMS[p.team];
            return (
              <button
                key={p.id}
                className="featured-card"
                onClick={() => onPick(p)}
                style={{
                  animationDelay: `${i * 100}ms`,
                  background: `linear-gradient(135deg, ${team.color1}66 0%, transparent 60%), #14161f`,
                }}
              >
                <div className="featured-top">
                  <JerseyChip player={p} size={56} />
                  <TrendPill delta={p.trend} />
                </div>
                <div className="featured-name">{p.name}</div>
                <div className="featured-meta">
                  <TeamBadge team={p.team} size={16} />
                  <span>{team.name.toUpperCase()}</span>
                </div>
                <div className="featured-bottom">
                  <div className="featured-score" style={{ color: accent }}>{p.score}</div>
                  <Sparkline data={p.history.slice(-14).map(d=>d.score)} color={accent} width={140} height={36} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* How it works strip */}
      <section className="landing-how">
        <div className="how-step">
          <div className="how-num" style={{ color: accent }}>01</div>
          <div className="how-title">PULL FROM REDDIT</div>
          <div className="how-body">Stream tens of thousands of fan comments from r/nba and team subs.</div>
        </div>
        <div className="how-step">
          <div className="how-num" style={{ color: accent }}>02</div>
          <div className="how-title">SCORE WITH DISTILBERT</div>
          <div className="how-body">Each comment runs through a fine-tuned sentiment model.</div>
        </div>
        <div className="how-step">
          <div className="how-num" style={{ color: accent }}>03</div>
          <div className="how-title">SHIP THE BROADCAST</div>
          <div className="how-body">Live scores, momentum, themes, sourced directly to your screen.</div>
        </div>
      </section>
    </div>
  );
}

function NavBar({ screen, setScreen, accent, paletteKey, setPaletteKey, onHome }) {
  const tabs = [
    { id: "search",   label: "SEARCH" },
    { id: "player",   label: "PLAYER" },
    { id: "compare",  label: "COMPARE" },
    { id: "league",   label: "LEAGUE" },
  ];
  return (
    <header className="navbar">
      <button className="navbar-brand" onClick={onHome}>
        <div className="navbar-brand-mark" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}>NS</div>
        <div className="navbar-brand-text">
          <div className="navbar-brand-title">NBA SENTIMENT<span style={{ color: accent }}>·PRO</span></div>
          <div className="navbar-brand-sub">v2 · BROADCAST EDITION</div>
        </div>
      </button>

      <nav className="navbar-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-tab ${screen === t.id ? "on" : ""}`}
            onClick={() => setScreen(t.id)}
            style={screen === t.id ? { color: accent, borderColor: accent } : {}}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="navbar-right">
        <div className="navbar-clock">
          <span className="live-dot" />
          <span>LIVE</span>
        </div>
        <div className="navbar-model">DISTILBERT · v2.1</div>
      </div>
    </header>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "court-orange",
  "density": "comfortable",
  "motion": "heavy",
  "showTicker": true,
  "showScanlines": true,
  "bgMode": "court-navy"
}/*EDITMODE-END*/;

function App() {
  const [screen, setScreen] = useStateA("landing");
  const [player, setPlayer] = useStateA(null);
  const [cmpA, setCmpA] = useStateA(window.PLAYER_BY_ID.lebron);
  const [cmpB, setCmpB] = useStateA(window.PLAYER_BY_ID.curry);

  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const palette = PALETTES[t.palette] || PALETTES["court-orange"];
  const accent = palette.accent;

  // body bg
  useEffectA(() => {
    document.documentElement.dataset.bg = t.bgMode;
    document.documentElement.dataset.density = t.density;
    document.documentElement.dataset.motion = t.motion;
    document.documentElement.dataset.scanlines = t.showScanlines ? "on" : "off";
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-glow", palette.glow);
  }, [t, accent, palette.glow]);

  const pickPlayer = (p) => {
    setPlayer(p);
    setScreen("player");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goCompare = () => {
    if (player) setCmpA(player);
    setScreen("compare");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // navbar uses different "search" id but maps to landing
  const navScreen = screen === "landing" ? "search" : screen;
  const setNavScreen = (s) => {
    if (s === "search") { setScreen("landing"); return; }
    if (s === "player") { setScreen(player ? "player" : "landing"); return; }
    setScreen(s);
  };

  return (
    <div className="app-shell" data-screen-label={screen.toUpperCase()}>
      <NavBar
        screen={navScreen}
        setScreen={setNavScreen}
        accent={accent}
        paletteKey={t.palette}
        setPaletteKey={(k) => tweaks.setTweak("palette", k)}
        onHome={() => setScreen("landing")}
      />

      {t.showTicker && <Ticker items={window.LEAGUE_TICKER} accent={accent} />}

      <main className="app-main" key={screen}>
        {screen === "landing" && <LandingScreen accent={accent} onPick={pickPlayer} paletteKey={t.palette} />}
        {screen === "player" && player && (
          <PlayerScreen
            player={player}
            accent={accent}
            density={t.density}
            onCompare={goCompare}
          />
        )}
        {screen === "compare" && (
          <CompareScreen
            playerA={cmpA}
            playerB={cmpB}
            setA={setCmpA}
            setB={setCmpB}
            accent={accent}
          />
        )}
        {screen === "league" && (
          <LeaderboardScreen accent={accent} onSelect={pickPlayer} />
        )}
      </main>

      <footer className="app-footer">
        <span>NBA SENTIMENT PRO · v2 BROADCAST</span>
        <span>·</span>
        <span>DISTILBERT FINE-TUNE · 92.4% F1</span>
        <span>·</span>
        <span>{window.PLAYERS.length} PLAYERS TRACKED</span>
      </footer>

      <window.TweaksPanel title="TWEAKS">
        <window.TweakSection label="Palette" />
        <window.TweakColor
          label="Accent"
          value={palette.accent}
          options={Object.keys(PALETTES).map(k => PALETTES[k].accent)}
          onChange={(v) => {
            const key = Object.keys(PALETTES).find(k => PALETTES[k].accent === v);
            setTweak("palette", key || "court-orange");
          }}
        />
        <window.TweakRadio
          label="Background"
          value={t.bgMode}
          options={["court-navy","midnight","carbon"]}
          onChange={(v) => setTweak("bgMode", v)}
        />

        <window.TweakSection label="Density & Motion" />
        <window.TweakRadio
          label="Density"
          value={t.density}
          options={["compact","comfortable","spacious"]}
          onChange={(v) => setTweak("density", v)}
        />
        <window.TweakRadio
          label="Motion"
          value={t.motion}
          options={["subtle","notable","heavy"]}
          onChange={(v) => setTweak("motion", v)}
        />

        <window.TweakSection label="Chrome" />
        <window.TweakToggle
          label="League ticker"
          value={t.showTicker}
          onChange={(v) => setTweak("showTicker", v)}
        />
        <window.TweakToggle
          label="Broadcast scanlines"
          value={t.showScanlines}
          onChange={(v) => setTweak("showScanlines", v)}
        />
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
