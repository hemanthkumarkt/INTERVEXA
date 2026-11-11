import { useState, useEffect, useMemo, Component } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import HowItWorks from "./HowItWorks";
import ProfileSetup from "./Profilesetup";

const MODULES    = ["resume", "aptitude", "coding", "interview"];
const TYPE_COLOR = { resume: "#7C6FFF", aptitude: "#06B6D4", coding: "#10B981", interview: "#F59E0B" };
const TYPE_ICON  = { resume: "📄", aptitude: "🧠", coding: "💻", interview: "🎥" };
const TYPE_LABEL = { resume: "Resume", aptitude: "Aptitude", coding: "Coding", interview: "Interview" };
const RANGES     = [["7d", "7 days"], ["30d", "30 days"], ["all", "All time"]];
const DAY        = 86400000;
const EMPTY      = [];

const scoreColor = (s) => (s >= 70 ? "#34D399" : s >= 50 ? "#F59E0B" : "#F87171");
const isPass     = (h) => h.result === "passed" || h.result === "selected";
const dayKey     = (ms) => new Date(ms).toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
const avg        = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

// null  = Firestore timestamp not resolved yet (just saved) → treat as "now"
// undefined = old doc with no date → treat as oldest
const toMillis = (d) => {
  if (d === null) return Date.now();
  if (d === undefined) return 0;
  if (typeof d.toMillis === "function") return d.toMillis();
  if (d instanceof Date) return d.getTime();
  if (typeof d === "number") return d;
  return 0;
};

// If HowItWorks ever crashes, the Progress page must still render
class Safe extends Component {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  componentDidCatch(e) { console.warn("HowItWorks failed:", e); }
  render() { return this.state.bad ? null : this.props.children; }
}

// ── Trend chart ──────────────────────────────────────────────────────────────
function TrendChart({ points }) {
  const W = 640, H = 240, pl = 36, pr = 14, pt = 14, pb = 34;
  const n = points.length;
  const x = (i) => pl + (i * (W - pl - pr)) / (n - 1);
  const y = (s) => pt + (1 - Math.max(0, Math.min(100, s)) / 100) * (H - pt - pb);
  const line = points.map((p, i) => `${x(i)},${y(p.score)}`).join(" ");
  const area =
    `M ${x(0)} ${y(points[0].score)} ` +
    points.map((p, i) => `L ${x(i)} ${y(p.score)}`).join(" ") +
    ` L ${x(n - 1)} ${H - pb} L ${x(0)} ${H - pb} Z`;
  const every = Math.ceil(n / 8);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C6FFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#7C6FFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={pl - 8} y={y(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.28)" fontSize="10">{v}</text>
        </g>
      ))}

      {/* pass line */}
      <line x1={pl} x2={W - pr} y1={y(60)} y2={y(60)} stroke="#34D399" strokeOpacity="0.35" strokeDasharray="4 4" />
      <text x={W - pr} y={y(60) - 5} textAnchor="end" fill="#34D399" fillOpacity="0.6" fontSize="9">pass 60%</text>

      <path d={area} fill="url(#trendGrad)" />
      <polyline points={line} fill="none" stroke="#7C6FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => (
        <g key={p.id || i}>
          <circle cx={x(i)} cy={y(p.score)} r="5.5" fill={TYPE_COLOR[p.type] || "#7C6FFF"} stroke="#0d0b18" strokeWidth="2">
            <title>{`${TYPE_LABEL[p.type] || p.type}${p.subtype ? " — " + p.subtype : ""}: ${p.score}%`}</title>
          </circle>
          {i % every === 0 && (
            <text x={x(i)} y={H - 12} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">
              {new Date(p.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

const Card = ({ children, style }) => (
  <div style={{ padding: "18px 20px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", ...style }}>
    {children}
  </div>
);

const Chip = ({ active, color = "#7C6FFF", onClick, children }) => (
  <button onClick={onClick}
    style={{ padding: "5px 13px", borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "1px solid", fontFamily: "inherit", background: active ? `${color}22` : "transparent", borderColor: active ? color : "rgba(255,255,255,0.1)", color: active ? color : "rgba(255,255,255,0.4)" }}>
    {children}
  </button>
);

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProgressPage({ user, history = EMPTY }) {
  const [filter, setFilter] = useState("all");
  const [range, setRange]   = useState("all");
  const [shown, setShown]   = useState(10);
  const [remote, setRemote] = useState(null);
  const [status, setStatus] = useState(user?.uid ? "loading" : "ready");
  const [errMsg, setErrMsg] = useState("");

  // Load attempts directly (live) — no longer depends on what App passes down
  useEffect(() => {
    if (!user?.uid) { setStatus("ready"); return; }
    setStatus("loading");
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "attempts"),
      (snap) => {
        setRemote(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setStatus("ready");
        setErrMsg("");
      },
      (err) => {
        console.error("Progress load failed:", err);
        setErrMsg(err.code === "permission-denied"
          ? "Firestore blocked reading your attempts (permission-denied). Check your Firestore rules allow read on users/{uid}/attempts."
          : err.message);
        setStatus("error");
      }
    );
    return unsub;
  }, [user?.uid]);

  useEffect(() => { setShown(10); }, [filter, range]);

  const source = remote ?? history;

  const items = useMemo(
    () =>
      (source || [])
        .map((h) => ({
          ...h,
          type: String(h.type || "").toLowerCase(),
          score: Number.isFinite(Number(h.score)) ? Number(h.score) : 0,
          ts: toMillis(h.date),
        }))
        .sort((a, b) => b.ts - a.ts),
    [source]
  );

  const data = useMemo(() => {
    const cutoff = range === "7d" ? Date.now() - 7 * DAY : range === "30d" ? Date.now() - 30 * DAY : 0;
    const ranged = items.filter((h) => h.ts >= cutoff);
    const view   = filter === "all" ? ranged : ranged.filter((h) => h.type === filter);

    const moduleStats = MODULES.map((type) => {
      const a = ranged.filter((h) => h.type === type);
      const scores = a.map((x) => x.score);
      return {
        type, attempts: a.length,
        best: scores.length ? Math.max(...scores) : null,
        avg: scores.length ? avg(scores) : null,
        passed: a.filter(isPass).length,
      };
    });

    const scores = view.map((h) => h.score);
    const overall = {
      attempts: view.length,
      avg: avg(scores),
      best: scores.length ? Math.max(...scores) : 0,
      passed: view.filter(isPass).length,
      passRate: view.length ? Math.round((view.filter(isPass).length / view.length) * 100) : 0,
    };

    // Improvement: latest n vs the n before it
    const chron = [...view].reverse();
    let delta = null;
    if (chron.length >= 4) {
      const n = Math.min(5, Math.floor(chron.length / 2));
      delta = avg(chron.slice(-n).map((h) => h.score)) - avg(chron.slice(-2 * n, -n).map((h) => h.score));
    }

    // Strong / weak topics
    const groups = {};
    view.forEach((h) => {
      if (!h.subtype) return;
      const k = `${h.type}|${h.subtype}`;
      (groups[k] = groups[k] || { type: h.type, subtype: h.subtype, scores: [] }).scores.push(h.score);
    });
    const topics = Object.values(groups).map((g) => ({ ...g, avg: avg(g.scores), n: g.scores.length }));
    const weak   = topics.filter((t) => t.avg < 60).sort((a, b) => a.avg - b.avg).slice(0, 3);
    const strong = topics.filter((t) => t.avg >= 75).sort((a, b) => b.avg - a.avg).slice(0, 3);

    // Streak (all-time, independent of filters)
    const days = new Set(items.filter((h) => h.ts > 0).map((h) => dayKey(h.ts)));
    let streak = 0;
    const d = new Date();
    if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d.getTime()))) { streak++; d.setDate(d.getDate() - 1); }
    let best = 0, run = 0, prev = null;
    [...days].sort().forEach((k) => {
      run = prev && new Date(k) - new Date(prev) === DAY ? run + 1 : 1;
      best = Math.max(best, run);
      prev = k;
    });

    // Last 7 days activity
    const week = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(); dt.setDate(dt.getDate() - (6 - i));
      const key = dayKey(dt.getTime());
      return {
        label: dt.toLocaleDateString("en-IN", { weekday: "short" }),
        count: items.filter((h) => h.ts > 0 && dayKey(h.ts) === key).length,
      };
    });

    return { ranged, view, moduleStats, overall, delta, weak, strong, streak, bestStreak: best, week, trend: chron.slice(-12) };
  }, [items, filter, range]);

  const { view, moduleStats, overall, delta, weak, strong, streak, bestStreak, week, trend } = data;
  const maxWeek = Math.max(1, ...week.map((w) => w.count));

  // ── Loading / error / empty ───────────────────────────────────────────────
  const header = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>📊 Progress</div>
        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          {items.length ? `${items.length} total attempts across all modules` : "Track your improvement across all modules"}
        </div>
      </div>
      <Safe><HowItWorks module="Progress" /></Safe>
    </div>
  );

  if (status === "loading" && !items.length) return (
    <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {header}
      <div style={{ padding: "60px 24px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Loading your progress…</div>
    </div>
  );

  if (status === "error" && !items.length) return (
    <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {header}
      <div style={{ padding: 24, borderRadius: 14, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#F87171", marginBottom: 8 }}>⚠️ Couldn't load your progress</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{errMsg}</div>
      </div>
    </div>
  );

  if (!items.length) return (
    <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {header}
      <div style={{ padding: "60px 24px", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.08)", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📊</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>No attempts yet</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>Complete a module to start tracking your progress</div>
      </div>
    </div>
  );

  // ── Main ──────────────────────────────────────────────────────────────────
  const statCards = [
    { label: "Attempts", value: overall.attempts, color: "#A78BFA", icon: "🎯" },
    { label: "Average score", value: `${overall.avg}%`, color: scoreColor(overall.avg), icon: "📈",
      sub: delta === null ? null : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} pts vs earlier`,
      subColor: delta === null ? null : delta >= 0 ? "#34D399" : "#F87171" },
    { label: "Best score", value: `${overall.best}%`, color: scoreColor(overall.best), icon: "🏅" },
    { label: "Pass rate", value: `${overall.passRate}%`, color: overall.passRate >= 60 ? "#34D399" : overall.passRate >= 40 ? "#F59E0B" : "#F87171", icon: "✅",
      sub: `${overall.passed} passed / selected` },
    { label: "Day streak", value: `${streak}🔥`, color: streak > 0 ? "#F59E0B" : "rgba(255,255,255,0.3)", icon: "📅",
      sub: `best ${bestStreak} day${bestStreak === 1 ? "" : "s"}` },
  ];

  return (
    <div style={{ width: "100%", fontFamily: "Inter, sans-serif", paddingBottom: 40 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .mod-card{cursor:pointer;transition:transform .15s,border-color .15s}
        .mod-card:hover{transform:translateY(-2px)}`}</style>

      {header}

      {status === "error" && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 12, color: "#F59E0B" }}>
          Live updates paused: {errMsg}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All modules</Chip>
          {MODULES.map((m) => (
            <Chip key={m} active={filter === m} color={TYPE_COLOR[m]} onClick={() => setFilter(m)}>
              {TYPE_ICON[m]} {TYPE_LABEL[m]}
            </Chip>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {RANGES.map(([k, label]) => (
            <Chip key={k} active={range === k} color="#A78BFA" onClick={() => setRange(k)}>{label}</Chip>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20, animation: "fadeUp 0.4s ease 0.05s both" }}>
        {statCards.map((s) => (
          <Card key={s.label}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-0.03em", marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 11, marginTop: 6, color: s.subColor || "rgba(255,255,255,0.3)" }}>{s.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Module breakdown (click to filter) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginBottom: 20, animation: "fadeUp 0.4s ease 0.1s both" }}>
        {moduleStats.map((m) => (
          <Card key={m.type} style={{ borderColor: filter === m.type ? TYPE_COLOR[m.type] : undefined }}>
            <div className="mod-card" onClick={() => setFilter(filter === m.type ? "all" : m.type)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${TYPE_COLOR[m.type]}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{TYPE_ICON[m.type]}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{TYPE_LABEL[m.type]}</div>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{m.attempts} attempt{m.attempts === 1 ? "" : "s"}</div>
              </div>
              {m.attempts === 0 ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>No attempts in this period</div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 22 }}>
                    {[["Best", `${m.best}%`, scoreColor(m.best)], ["Average", `${m.avg}%`, scoreColor(m.avg)], ["Passed", m.passed, "#34D399"]].map(([label, value, color]) => (
                      <div key={label}>
                        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 99, background: TYPE_COLOR[m.type], width: `${m.avg}%`, transition: "width 0.6s ease" }} />
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {view.length === 0 ? (
        <Card style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
          No attempts match this filter. Try a wider time range or another module.
        </Card>
      ) : (
        <>
          {/* Trend */}
          {trend.length >= 2 && (
            <Card style={{ marginBottom: 20, padding: "20px 24px", animation: "fadeUp 0.4s ease 0.15s both" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em" }}>
                  SCORE TREND · LAST {trend.length} ATTEMPTS
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {MODULES.map((m) => (
                    <span key={m} style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLOR[m] }} />{TYPE_LABEL[m]}
                    </span>
                  ))}
                </div>
              </div>
              <TrendChart points={trend} />
            </Card>
          )}

          {/* Activity + topics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, marginBottom: 24, animation: "fadeUp 0.4s ease 0.2s both" }}>
            <Card>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", marginBottom: 14 }}>LAST 7 DAYS</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
                {week.map((w, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{w.count || ""}</div>
                    <div style={{ width: "100%", height: `${Math.max(4, (w.count / maxWeek) * 56)}px`, borderRadius: 6, background: w.count ? "linear-gradient(180deg,#7C6FFF,#A855F7)" : "rgba(255,255,255,0.06)" }} />
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{w.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", marginBottom: 12 }}>TOPIC INSIGHTS</div>
              {weak.length === 0 && strong.length === 0 ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
                  Practice a few topics to see what you're strong at and what needs work.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {weak.map((t) => (
                    <div key={"w" + t.type + t.subtype} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "7px 10px", borderRadius: 8, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)" }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>⚠️ {TYPE_LABEL[t.type] || t.type} · {t.subtype}</span>
                      <span style={{ color: "#F87171", fontWeight: 600 }}>{t.avg}%</span>
                    </div>
                  ))}
                  {strong.map((t) => (
                    <div key={"s" + t.type + t.subtype} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "7px 10px", borderRadius: 8, background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.15)" }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>💪 {TYPE_LABEL[t.type] || t.type} · {t.subtype}</span>
                      <span style={{ color: "#34D399", fontWeight: 600 }}>{t.avg}%</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* History */}
          <div style={{ animation: "fadeUp 0.4s ease 0.25s both" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 12 }}>
              ALL ATTEMPTS · {view.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {view.slice(0, shown).map((item, i) => {
                const pass = isPass(item);
                return (
                  <div key={item.id || i}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${TYPE_COLOR[item.type] || "#7C6FFF"}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {TYPE_ICON[item.type] || "📋"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {TYPE_LABEL[item.type] || item.type}{item.subtype ? ` — ${item.subtype}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                        {[item.difficulty, item.language,
                          item.total ? `${item.correct}/${item.total} correct` : null,
                          item.ts ? new Date(item.ts).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"]
                          .filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor(item.score) }}>{item.score}%</div>
                      {item.result && (
                        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 500, background: pass ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)", color: pass ? "#34D399" : "#F87171", border: `1px solid ${pass ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}` }}>
                          {item.result}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {view.length > shown && (
              <button onClick={() => setShown((s) => s + 10)}
                style={{ width: "100%", marginTop: 12, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Show more ({view.length - shown} left)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}