// Mock NBA sentiment data. ~20 players across the league.
// Team colors are simplified neutral hex (NOT official trademarked colors).
// Player names are factual (current/recent NBA players); used as text only.

window.TEAMS = {
  LAL: { city: "Los Angeles", name: "Lakers", color1: "#552583", color2: "#FDB927" },
  GSW: { city: "Golden State", name: "Warriors", color1: "#1D428A", color2: "#FFC72C" },
  DEN: { city: "Denver", name: "Nuggets", color1: "#0E2240", color2: "#FEC524" },
  OKC: { city: "Oklahoma City", name: "Thunder", color1: "#007AC1", color2: "#EF3B24" },
  MIL: { city: "Milwaukee", name: "Bucks", color1: "#00471B", color2: "#EEE1C6" },
  BOS: { city: "Boston", name: "Celtics", color1: "#007A33", color2: "#BA9653" },
  PHI: { city: "Philadelphia", name: "76ers", color1: "#006BB6", color2: "#ED174C" },
  DAL: { city: "Dallas", name: "Mavericks", color1: "#00538C", color2: "#002B5E" },
  PHX: { city: "Phoenix", name: "Suns", color1: "#1D1160", color2: "#E56020" },
  MIA: { city: "Miami", name: "Heat", color1: "#98002E", color2: "#F9A01B" },
  NYK: { city: "New York", name: "Knicks", color1: "#006BB6", color2: "#F58426" },
  MEM: { city: "Memphis", name: "Grizzlies", color1: "#5D76A9", color2: "#12173F" },
  MIN: { city: "Minnesota", name: "Timberwolves", color1: "#0C2340", color2: "#236192" },
  SAC: { city: "Sacramento", name: "Kings", color1: "#5A2D81", color2: "#63727A" },
  ATL: { city: "Atlanta", name: "Hawks", color1: "#E03A3E", color2: "#26282A" },
  CLE: { city: "Cleveland", name: "Cavaliers", color1: "#860038", color2: "#FDBB30" },
  HOU: { city: "Houston", name: "Rockets", color1: "#CE1141", color2: "#000000" },
  IND: { city: "Indiana", name: "Pacers", color1: "#002D62", color2: "#FDBB30" },
  ORL: { city: "Orlando", name: "Magic", color1: "#0077C0", color2: "#C4CED4" },
  POR: { city: "Portland", name: "Trail Blazers", color1: "#E03A3E", color2: "#000000" },
};

// Deterministic pseudo-random for repeatable trend lines
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function genHistory(seed, base, vol = 12, n = 30) {
  const r = seededRand(seed);
  const out = [];
  let v = base;
  for (let i = n - 1; i >= 0; i--) {
    v = Math.max(5, Math.min(98, v + (r() - 0.5) * vol));
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      date: d.toISOString().slice(0, 10),
      score: Math.round(v),
      comments: Math.round(400 + r() * 1800),
    });
  }
  // pull last value toward base
  out[out.length - 1].score = Math.round(base);
  return out;
}

function pcts(score) {
  // derive a plausible split from score
  const pos = Math.round(score * 0.85 + 5);
  const neg = Math.round((100 - score) * 0.7);
  const neu = Math.max(0, 100 - pos - neg);
  return { pos, neu, neg };
}

const SUBS = ["nba", "nbadiscussion", "nbatalk", "fantasybball", "nbacirclejerk"];

function subBreakdown(seed) {
  const r = seededRand(seed);
  const total = 100;
  const raw = SUBS.map(() => 10 + r() * 90);
  const sum = raw.reduce((a, b) => a + b, 0);
  return SUBS.map((s, i) => ({
    sub: s,
    share: Math.round((raw[i] / sum) * total),
    sentiment: Math.round(40 + r() * 50),
    volume: Math.round(200 + r() * 3000),
  }));
}

// Themed comment buckets — what fans actually argue about
function themedComments(playerKey, sentiment) {
  // (hand-curated to feel real; same shape across players)
  const banks = {
    LeBron: {
      Performance: [
        { text: "40 at 41 is just absurd. Whatever he's drinking, I want some.", label: "positive", upvotes: 4821, sub: "nba" },
        { text: "He's still putting up MVP numbers in year 23. The longevity is unreal.", label: "positive", upvotes: 3104, sub: "nbadiscussion" },
      ],
      Leadership: [
        { text: "Watching him mentor the rookies all season has been a treat.", label: "positive", upvotes: 1899, sub: "lakers" },
        { text: "Floor general energy in the 4th tonight. Still the smartest guy on the court.", label: "positive", upvotes: 2244, sub: "nba" },
      ],
      Criticism: [
        { text: "Defense has been a turnstile lately. They have to hide him.", label: "negative", upvotes: 1410, sub: "nbacirclejerk" },
        { text: "He coasts in the regular season and we all just accept it.", label: "negative", upvotes: 980, sub: "nba" },
      ],
      Legacy: [
        { text: "Most points + 4 rings + Finals MVPs across 3 teams. Case closed for me.", label: "positive", upvotes: 5612, sub: "nbadiscussion" },
      ],
    },
    Curry: {
      Performance: [
        { text: "11 threes tonight. He just bent the geometry of the gym.", label: "positive", upvotes: 6782, sub: "nba" },
        { text: "The off-ball gravity is still the most valuable trait in the league.", label: "positive", upvotes: 3511, sub: "nbadiscussion" },
      ],
      Leadership: [
        { text: "Quietly the best teammate culture-wise of the last 15 years.", label: "positive", upvotes: 2110, sub: "warriors" },
      ],
      Criticism: [
        { text: "When the threes don't fall, the rest of his game looks pedestrian.", label: "negative", upvotes: 712, sub: "nbacirclejerk" },
      ],
      Legacy: [
        { text: "Changed how every kid plays basketball. That's a top-10-ever ceiling.", label: "positive", upvotes: 4499, sub: "nba" },
      ],
    },
    Jokic: {
      Performance: [
        { text: "Triple-double averages in May. Casually. He's an alien.", label: "positive", upvotes: 8021, sub: "nba" },
        { text: "Best passing big ever, full stop. The reads are a different sport.", label: "positive", upvotes: 5677, sub: "nbadiscussion" },
      ],
      Leadership: [
        { text: "Quiet leader. Lets the game do the talking, every single night.", label: "positive", upvotes: 2188, sub: "denvernuggets" },
      ],
      Criticism: [
        { text: "He needs an All-Star running mate or this window slams shut.", label: "neutral", upvotes: 1502, sub: "nba" },
      ],
      Legacy: [
        { text: "3 MVPs and a ring at 30. The resume is wild.", label: "positive", upvotes: 4101, sub: "nbadiscussion" },
      ],
    },
    SGA: {
      Performance: [
        { text: "30+ on 55/40/90 splits. The midrange is a cheat code.", label: "positive", upvotes: 5544, sub: "nba" },
        { text: "He never speeds up. Every possession is on his clock.", label: "positive", upvotes: 3220, sub: "nbadiscussion" },
      ],
      Leadership: [
        { text: "Calmest closer in the league. Refuses to flinch.", label: "positive", upvotes: 2877, sub: "thunder" },
      ],
      Criticism: [
        { text: "Lives at the line a little too much for my taste.", label: "negative", upvotes: 612, sub: "nbacirclejerk" },
      ],
      Legacy: [
        { text: "If OKC wins it, he's the face of the next decade.", label: "positive", upvotes: 3990, sub: "nba" },
      ],
    },
    Giannis: {
      Performance: [
        { text: "60 on 33 shots. Posters every other possession. Unstoppable.", label: "positive", upvotes: 7322, sub: "nba" },
      ],
      Leadership: [
        { text: "Wears his heart on his sleeve every game. Hard not to root for it.", label: "positive", upvotes: 2410, sub: "mkebucks" },
      ],
      Criticism: [
        { text: "The free throw situation in crunch time is exhausting.", label: "negative", upvotes: 1822, sub: "nba" },
        { text: "Bucks are wasting his prime. Front office has been a mess.", label: "negative", upvotes: 1601, sub: "nbadiscussion" },
      ],
      Legacy: [
        { text: "MVP, DPOY, ring, Finals MVP. Whatever you want to say, he's already done.", label: "positive", upvotes: 3088, sub: "nba" },
      ],
    },
    GENERIC: {
      Performance: [
        { text: "Quietly putting up career numbers and nobody is talking about it.", label: "positive", upvotes: 1422, sub: "nba" },
        { text: "The shot diet has been so much better since the All-Star break.", label: "positive", upvotes: 988, sub: "nbadiscussion" },
      ],
      Leadership: [
        { text: "You can see the younger guys orbiting around him on the bench.", label: "positive", upvotes: 612, sub: "nba" },
      ],
      Criticism: [
        { text: "Defensively a step slow. Teams are hunting him in pick-and-roll.", label: "negative", upvotes: 740, sub: "nbacirclejerk" },
        { text: "Disappears in the 4th too often for a guy paid like a star.", label: "negative", upvotes: 612, sub: "nba" },
      ],
      Legacy: [
        { text: "Still don't think we appreciate his peak enough. Top-15 in his prime.", label: "neutral", upvotes: 502, sub: "nbadiscussion" },
      ],
    },
  };
  return banks[playerKey] || banks.GENERIC;
}

// Roster
window.PLAYERS = [
  { id: "lebron", name: "LeBron James", first: "LeBron", last: "James", num: 23, pos: "SF", team: "LAL", score: 78, vol: 8, seed: 11, bank: "LeBron", trend: 6 },
  { id: "curry", name: "Stephen Curry", first: "Stephen", last: "Curry", num: 30, pos: "PG", team: "GSW", score: 86, vol: 6, seed: 22, bank: "Curry", trend: 3 },
  { id: "jokic", name: "Nikola Jokić", first: "Nikola", last: "Jokić", num: 15, pos: "C", team: "DEN", score: 92, vol: 5, seed: 33, bank: "Jokic", trend: 4 },
  { id: "sga", name: "Shai Gilgeous-Alexander", first: "Shai", last: "Gilgeous-Alexander", num: 2, pos: "PG", team: "OKC", score: 89, vol: 6, seed: 44, bank: "SGA", trend: 8 },
  { id: "giannis", name: "Giannis Antetokounmpo", first: "Giannis", last: "Antetokounmpo", num: 34, pos: "PF", team: "MIL", score: 71, vol: 14, seed: 55, bank: "Giannis", trend: -9 },
  { id: "tatum", name: "Jayson Tatum", first: "Jayson", last: "Tatum", num: 0, pos: "SF", team: "BOS", score: 74, vol: 11, seed: 66, bank: "GENERIC", trend: 2 },
  { id: "embiid", name: "Joel Embiid", first: "Joel", last: "Embiid", num: 21, pos: "C", team: "PHI", score: 48, vol: 16, seed: 77, bank: "GENERIC", trend: -14 },
  { id: "luka", name: "Luka Dončić", first: "Luka", last: "Dončić", num: 77, pos: "PG", team: "DAL", score: 81, vol: 13, seed: 88, bank: "GENERIC", trend: 5 },
  { id: "booker", name: "Devin Booker", first: "Devin", last: "Booker", num: 1, pos: "SG", team: "PHX", score: 66, vol: 10, seed: 99, bank: "GENERIC", trend: -3 },
  { id: "butler", name: "Jimmy Butler", first: "Jimmy", last: "Butler", num: 22, pos: "SF", team: "MIA", score: 69, vol: 15, seed: 110, bank: "GENERIC", trend: 1 },
  { id: "brunson", name: "Jalen Brunson", first: "Jalen", last: "Brunson", num: 11, pos: "PG", team: "NYK", score: 84, vol: 9, seed: 121, bank: "GENERIC", trend: 7 },
  { id: "morant", name: "Ja Morant", first: "Ja", last: "Morant", num: 12, pos: "PG", team: "MEM", score: 41, vol: 18, seed: 132, bank: "GENERIC", trend: -11 },
  { id: "edwards", name: "Anthony Edwards", first: "Anthony", last: "Edwards", num: 5, pos: "SG", team: "MIN", score: 87, vol: 7, seed: 143, bank: "GENERIC", trend: 6 },
  { id: "fox", name: "De'Aaron Fox", first: "De'Aaron", last: "Fox", num: 5, pos: "PG", team: "SAC", score: 63, vol: 12, seed: 154, bank: "GENERIC", trend: -2 },
  { id: "trae", name: "Trae Young", first: "Trae", last: "Young", num: 11, pos: "PG", team: "ATL", score: 38, vol: 17, seed: 165, bank: "GENERIC", trend: -6 },
  { id: "donovan", name: "Donovan Mitchell", first: "Donovan", last: "Mitchell", num: 45, pos: "SG", team: "CLE", score: 72, vol: 11, seed: 176, bank: "GENERIC", trend: 3 },
  { id: "vanvleet", name: "Fred VanVleet", first: "Fred", last: "VanVleet", num: 5, pos: "PG", team: "HOU", score: 58, vol: 13, seed: 187, bank: "GENERIC", trend: 4 },
  { id: "halib", name: "Tyrese Haliburton", first: "Tyrese", last: "Haliburton", num: 0, pos: "PG", team: "IND", score: 76, vol: 10, seed: 198, bank: "GENERIC", trend: 5 },
  { id: "banchero", name: "Paolo Banchero", first: "Paolo", last: "Banchero", num: 5, pos: "PF", team: "ORL", score: 70, vol: 11, seed: 209, bank: "GENERIC", trend: 4 },
  { id: "lillard", name: "Damian Lillard", first: "Damian", last: "Lillard", num: 0, pos: "PG", team: "POR", score: 55, vol: 14, seed: 220, bank: "GENERIC", trend: -4 },
];

// Hydrate each player
window.PLAYERS = window.PLAYERS.map(p => {
  const splits = pcts(p.score);
  return {
    ...p,
    history: genHistory(p.seed, p.score, p.vol),
    positive_pct: splits.pos,
    neutral_pct: splits.neu,
    negative_pct: splits.neg,
    comment_count: 1500 + (p.seed * 37) % 12500,
    label: p.score >= 75 ? "Very Positive" : p.score >= 60 ? "Positive" : p.score >= 45 ? "Mixed" : p.score >= 30 ? "Negative" : "Very Negative",
    subBreakdown: subBreakdown(p.seed),
    themes: themedComments(p.bank, p.score),
  };
});

window.PLAYER_BY_ID = Object.fromEntries(window.PLAYERS.map(p => [p.id, p]));

// League-wide rolling sentiment (for landing ticker)
window.LEAGUE_TICKER = [
  { kind: "rise", player: "Anthony Edwards", val: "+6.2" },
  { kind: "fall", player: "Trae Young", val: "-5.8" },
  { kind: "rise", player: "Jalen Brunson", val: "+7.1" },
  { kind: "fall", player: "Joel Embiid", val: "-13.4" },
  { kind: "rise", player: "Shai Gilgeous-Alexander", val: "+8.0" },
  { kind: "fall", player: "Ja Morant", val: "-10.7" },
  { kind: "rise", player: "Nikola Jokić", val: "+3.9" },
  { kind: "rise", player: "LeBron James", val: "+6.4" },
  { kind: "fall", player: "Giannis Antetokounmpo", val: "-9.0" },
  { kind: "rise", player: "Tyrese Haliburton", val: "+4.8" },
];
