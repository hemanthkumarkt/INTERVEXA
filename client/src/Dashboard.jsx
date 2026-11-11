import { useState } from "react";
import Logo from "./Logo";
import { db } from "./firebase";
import { doc, deleteDoc } from "firebase/firestore";

const NAV_ITEMS = [
  { id: "Dashboard", label: "Dashboard" },
  { id: "Resume",    label: "Resume" },
  { id: "Aptitude",  label: "Aptitude" },
  { id: "Coding",    label: "Coding" },
  { id: "Interview", label: "Interview" },
  { id: "Progress",  label: "Progress" },
];

// Modules that open a landing page first, then the real module on "Start"
const LANDING_MODULES = ["Resume", "Aptitude", "Coding", "Interview"];

const MODULE_INFO = {
  Resume: {
    icon: "📄", title: "Resume Analyzer",
    color: "#7C6FFF", bg: "rgba(124,111,255,0.1)",
    tagline: "Get your resume ATS-ready in seconds",
    desc: "Upload your resume and our AI evaluates it like a real ATS system used by top companies. Get a score, skill extraction, strengths, weaknesses, and actionable improvement tips.",
    features: [
      { icon: "🎯", label: "ATS Score", desc: "See exactly how your resume ranks" },
      { icon: "🔍", label: "Skill Extraction", desc: "Auto-detect skills from your resume" },
      { icon: "💡", label: "Improvement Tips", desc: "Specific suggestions to improve" },
      { icon: "✅", label: "Selection Decision", desc: "Pass/fail like a real placement filter" },
    ],
  },
  Aptitude: {
    icon: "🧠", title: "Aptitude Round",
    color: "#06B6D4", bg: "rgba(6,182,212,0.1)",
    tagline: "Practice placement-level aptitude questions",
    desc: "AI-generated MCQs across Quantitative, Verbal and Logical Reasoning. Practice mode gives 10 questions on a topic you choose; the Full Test gives 30 mixed questions with a 30-minute timer. Every answer comes with an explanation.",
    features: [
      { icon: "📚", label: "12 Topics", desc: "Quantitative, Verbal & Logical Reasoning" },
      { icon: "🎚️", label: "3 Difficulty Levels", desc: "Easy, Medium, Hard" },
      { icon: "🔄", label: "AI-Generated", desc: "Fresh questions every attempt" },
      { icon: "📝", label: "Answer Review", desc: "Detailed explanations after submit" },
    ],
  },
  Coding: {
    icon: "💻", title: "Coding Round",
    color: "#10B981", bg: "rgba(16,185,129,0.1)",
    tagline: "Solve real coding problems in a real editor",
    desc: "Split-screen code editor with AI-generated problems. Write code in Java, Python, C++, or JavaScript — then AI reviews it against test cases and gives complexity analysis.",
    features: [
      { icon: "⌨️", label: "Real Code Editor", desc: "Syntax highlighting, line numbers, Tab support" },
      { icon: "🧪", label: "Test Case Review", desc: "AI checks your code against test cases" },
      { icon: "💡", label: "AI Hints", desc: "Get a nudge without the full solution" },
      { icon: "📊", label: "Complexity Analysis", desc: "Time & space complexity feedback" },
    ],
  },
  Interview: {
    icon: "🎥", title: "AI Mock Interview",
    color: "#F59E0B", bg: "rgba(245,158,11,0.1)",
    tagline: "Interview with a real AI avatar — voice answers",
    desc: "A human-like AI avatar asks you HR and technical questions based on your target job role and skills. Answer by voice, get live feedback after each question, and download a full report.",
    features: [
      { icon: "🤖", label: "AI Avatar", desc: "Real human face with lip sync (D-ID)" },
      { icon: "🎤", label: "Voice Answers", desc: "Speak your answers naturally" },
      { icon: "💬", label: "Live Feedback", desc: "AI reacts after each answer" },
      { icon: "📥", label: "Download Report", desc: "Full report after the interview" },
    ],
  },
};

const TYPE_ICON  = { resume: "📄", aptitude: "🧠", coding: "💻", interview: "🎥" };
const TYPE_COLOR = { resume: "#7C6FFF", aptitude: "#06B6D4", coding: "#10B981", interview: "#F59E0B" };
const TYPE_LABEL = { resume: "Resume", aptitude: "Aptitude", coding: "Coding", interview: "Interview" };

const isPass = (r) => r === "passed" || r === "selected";

// null = Firestore timestamp still resolving (just saved)
const fmtDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  d === null ? "Just now" : d?.toDate ? d.toDate().toLocaleDateString("en-IN", opts) : "—";

export default function Dashboard({
  user, name, college, skills = [], imageUrl,
  history = [], setHistory,
  activePage, setActivePage,
  onEditProfile, onSignOut, children,
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const resumeAttempts    = history.filter(h => h.type === "resume");
  const aptitudeAttempts  = history.filter(h => h.type === "aptitude");
  const interviewAttempts = history.filter(h => h.type === "interview");
  const codingAttempts    = history.filter(h => h.type === "coding");
  const lastResumeScore   = resumeAttempts[0]?.score ?? null;

  const stats = [
    { label: "Resume Score", value: lastResumeScore !== null ? `${lastResumeScore}%` : "—", sub: lastResumeScore !== null ? (lastResumeScore >= 70 ? "Good ✓" : "Needs work") : "Not analyzed", subColor: lastResumeScore !== null ? (lastResumeScore >= 70 ? "#34D399" : "#F87171") : "#F59E0B", icon: "📄", color: "#7C6FFF" },
    { label: "Mock Interviews", value: interviewAttempts.length, sub: interviewAttempts.length === 0 ? "Get started" : `${interviewAttempts.length} done`, subColor: "#A855F7", icon: "🎥", color: "#A855F7" },
    { label: "Aptitude Tests", value: aptitudeAttempts.length, sub: aptitudeAttempts.length === 0 ? "Practice now" : `${aptitudeAttempts.length} done`, subColor: "#06B6D4", icon: "🧠", color: "#06B6D4" },
    { label: "Coding Rounds", value: codingAttempts.length, sub: codingAttempts.length === 0 ? "Try a problem" : `${codingAttempts.length} done`, subColor: "#10B981", icon: "💻", color: "#10B981" },
  ];

  const handleDeleteResult = async (item) => {
    if (!window.confirm("Delete this result permanently?")) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "attempts", item.id));
      setHistory?.(prev => prev.filter(h => h.id !== item.id)); // the live listener in App also updates this
      setSelectedResult(null);
    } catch (e) { alert("Failed to delete: " + e.message); }
    setDeleting(false);
  };

  const AvatarOrInitial = ({ size = 32, fontSize = 13 }) =>
    imageUrl ? (
      <img src={imageUrl} alt="avatar" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
    ) : (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(124,111,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize, fontWeight: 700, color: "#A78BFA", border: "1px solid rgba(124,111,255,0.3)", flexShrink: 0 }}>
        {name ? name[0].toUpperCase() : "U"}
      </div>
    );

  // NOTE: called as a plain function (not <ModuleLandingPage/>) so React doesn't remount it
  // — and replay its fade-in animation — every time the live history updates.
  const ModuleLandingPage = ({ moduleKey }) => {
    const info = MODULE_INFO[moduleKey];
    if (!info) return null;
    const attempts = history.filter(h => h.type === moduleKey.toLowerCase());
    const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score || 0)) : null;

    return (
      <div style={{ maxWidth: 800, margin: "0 auto", animation: "fadeUp 0.4s ease both" }}>
        {/* Hero */}
        <div style={{ borderRadius: 20, padding: "40px 36px", marginBottom: 24, background: info.bg, border: `1px solid ${info.color}25`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${info.color}20, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ fontSize: 48, marginBottom: 16 }}>{info.icon}</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.03em" }}>{info.title}</h1>
          <p style={{ fontSize: 16, color: info.color, fontWeight: 500, marginBottom: 12 }}>{info.tagline}</p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 560, marginBottom: 28 }}>{info.desc}</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setActivePage(`${moduleKey}_active`)}
              style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${info.color}, ${info.color}99)`, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Start {info.title} →
            </button>
            {attempts.length > 0 && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                {attempts.length} attempt{attempts.length > 1 ? "s" : ""} · Best: <span style={{ color: info.color, fontWeight: 600 }}>{bestScore}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {info.features.map((f, i) => (
            <div key={i} style={{ padding: "18px 20px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent attempts for this module */}
        {attempts.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 12 }}>YOUR ATTEMPTS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {attempts.slice(0, 5).map((item, i) => {
                const scoreColor = item.score >= 70 ? "#34D399" : item.score >= 50 ? "#F59E0B" : "#F87171";
                const pass = isPass(item.result);
                return (
                  <div key={item.id || i} onClick={() => setSelectedResult(item)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
                    <div style={{ fontSize: 18 }}>{info.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.subtype || info.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{fmtDate(item.date)}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor }}>{item.score}%</div>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: pass ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)", color: pass ? "#34D399" : "#F87171", border: `1px solid ${pass ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}` }}>
                      {item.result}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>View →</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const isActiveNav = (id) => activePage === id || activePage === `${id}_active`;

  return (
    <div style={{ minHeight: "100vh", background: "#09090f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .nav-link { padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; white-space: nowrap; }
        .nav-link:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
        .nav-link.active { background: rgba(124,111,255,0.15); border-color: rgba(124,111,255,0.25); color: #A78BFA; }
        .stat-card { border-radius: 14px; padding: 20px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); transition: all 0.2s; cursor: default; }
        .stat-card:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-2px); }
        .activity-row { display: flex; align-items: center; gap: 14px; padding: 13px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); cursor: pointer; transition: background 0.15s; }
        .activity-row:hover { background: rgba(255,255,255,0.05); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .modal-box { background: #13111f; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; width: 100%; max-width: 540px; max-height: 80vh; overflow-y: auto; padding: 32px 28px; animation: modalIn 0.25s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
      `}</style>

      {/* ── TOP NAVBAR ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(9,9,15,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 32px", display: "flex", alignItems: "center", gap: 8, height: 56 }}>
        <div style={{ marginRight: 16 }}><Logo size="sm" /></div>
        <div style={{ display: "flex", gap: 4, flex: 1, overflowX: "auto" }}>
          {NAV_ITEMS.map(item => (
            <div key={item.id}
              className={`nav-link ${isActiveNav(item.id) ? "active" : ""}`}
              // Progress has no landing page — it opens the real page directly
              onClick={() => setActivePage(item.id === "Progress" ? "Progress_active" : item.id)}
              style={{ color: isActiveNav(item.id) ? "#A78BFA" : "rgba(255,255,255,0.4)" }}>
              {item.label}
            </div>
          ))}
        </div>
        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 8 }}>
          <div onClick={() => setShowProfile(!showProfile)} style={{ cursor: "pointer" }}>
            <AvatarOrInitial size={32} fontSize={13} />
          </div>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main style={{ padding: "32px 40px", width: "100%" }}>

        {/* Dashboard home */}
        {activePage === "Dashboard" && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            {/* Welcome */}
            <div style={{ borderRadius: 16, padding: "28px 32px", marginBottom: 28, background: "linear-gradient(135deg, rgba(124,111,255,0.18), rgba(168,85,247,0.08))", border: "1px solid rgba(124,111,255,0.2)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -50, right: -50, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,111,255,0.15), transparent 70%)", pointerEvents: "none" }} />
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Welcome back, {name || "there"} 👋</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Ready to crack your placement? Let's keep the momentum going.</div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
              {stats.map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ fontSize: 22, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>{s.label}</div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: s.subColor }}>{s.sub}</span>
                </div>
              ))}
            </div>

            {/* Quick start */}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 12 }}>QUICK START</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
              {[
                { icon: "🚀", label: "Full Placement Mode", desc: "Resume → Aptitude → Coding → Interview", page: "Resume", accent: "#7C6FFF" },
                { icon: "🎯", label: "Practice Mode", desc: "Pick any module and practice at your pace", page: "Aptitude", accent: "#06B6D4" },
              ].map(card => (
                <div key={card.label} onClick={() => setActivePage(card.page)}
                  style={{ padding: "20px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.2s", display: "flex", gap: 14, alignItems: "flex-start" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${card.accent}40`; e.currentTarget.style.background = `${card.accent}08`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.transform = "none"; }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{card.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{card.label}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{card.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>RECENT ACTIVITY</div>
              {history.length > 0 && (
                <div onClick={() => setActivePage("Progress_active")} style={{ fontSize: 12, color: "#A78BFA", cursor: "pointer" }}>View all progress →</div>
              )}
            </div>
            {history.length === 0 ? (
              <div style={{ borderRadius: 14, padding: "40px 24px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
                No attempts yet — complete a module to see history here!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.slice(0, 8).map((item, i) => {
                  const scoreColor = item.score >= 70 ? "#34D399" : item.score >= 50 ? "#F59E0B" : "#F87171";
                  const pass = isPass(item.result);
                  return (
                    <div key={item.id || i} className="activity-row" onClick={() => setSelectedResult(item)}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${TYPE_COLOR[item.type] || "#7C6FFF"}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        {TYPE_ICON[item.type] || "📋"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>
                          {TYPE_LABEL[item.type] || item.type}{item.subtype ? ` — ${item.subtype}` : ""}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{fmtDate(item.date)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        {item.score !== undefined && <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor }}>{item.score}%</div>}
                        {item.result && (
                          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 500, background: pass ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)", color: pass ? "#34D399" : "#F87171", border: `1px solid ${pass ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}` }}>
                            {item.result}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>View →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Module landing pages */}
        {LANDING_MODULES.map(mod => (
          activePage === mod && <div key={mod}>{ModuleLandingPage({ moduleKey: mod })}</div>
        ))}

        {/* Active module pages (actual module UI) */}
        {LANDING_MODULES.map(mod => (
          activePage === `${mod}_active` && (
            <div key={mod} style={{ animation: "fadeUp 0.3s ease both" }}>
              <button onClick={() => setActivePage(mod)}
                style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                ← Back to {mod}
              </button>
              {children}
            </div>
          )
        ))}

        {/* Progress — this branch was MISSING, which is why the Progress page never appeared */}
        {activePage === "Progress_active" && (
          <div style={{ animation: "fadeUp 0.3s ease both" }}>
            {children}
          </div>
        )}
      </main>

      {/* ── PROFILE DROPDOWN ── */}
      {showProfile && (
        <>
          <div onClick={() => setShowProfile(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{ position: "fixed", top: 60, right: 24, width: 260, background: "#13111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "16px", zIndex: 100, animation: "modalIn 0.2s ease both" }}>
            {/* User info */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <AvatarOrInitial size={40} fontSize={16} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{name || "User"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{user?.email}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={() => { setShowProfile(false); onEditProfile?.(); }}
                style={{ padding: "9px 12px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                ✏️ Edit profile
              </button>
              <button onClick={onSignOut}
                style={{ padding: "9px 12px", borderRadius: 8, border: "none", background: "rgba(248,113,113,0.08)", color: "#F87171", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── RESULT MODAL ── */}
      {selectedResult && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedResult(null)}>
          <div className="modal-box">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 24 }}>{TYPE_ICON[selectedResult.type]}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, textTransform: "capitalize" }}>
                    {TYPE_LABEL[selectedResult.type]} {selectedResult.subtype ? `— ${selectedResult.subtype}` : ""}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                  {fmtDate(selectedResult.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
              <button onClick={() => setSelectedResult(null)}
                style={{ background: "rgba(255,255,255,0.06)", border: "none", width: 30, height: 30, borderRadius: "50%", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer" }}>✕</button>
            </div>

            {/* Score */}
            <div style={{ textAlign: "center", padding: "24px 0", marginBottom: 24, borderRadius: 14, background: isPass(selectedResult.result) ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${isPass(selectedResult.result) ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}` }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: selectedResult.score >= 70 ? "#34D399" : selectedResult.score >= 50 ? "#F59E0B" : "#F87171", letterSpacing: "-0.03em" }}>
                {selectedResult.score}%
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, padding: "4px 16px", borderRadius: 99, background: isPass(selectedResult.result) ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)", color: isPass(selectedResult.result) ? "#34D399" : "#F87171" }}>
                {isPass(selectedResult.result) ? "✅ " : "❌ "}{selectedResult.result}
              </span>
            </div>

            {/* Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {selectedResult.subtype && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>Topic / Role</span>
                  <span style={{ fontWeight: 500 }}>{selectedResult.subtype}</span>
                </div>
              )}
              {selectedResult.difficulty && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>Difficulty</span>
                  <span style={{ fontWeight: 500 }}>{selectedResult.difficulty}</span>
                </div>
              )}
              {selectedResult.correct !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>Correct answers</span>
                  <span style={{ fontWeight: 500 }}>{selectedResult.correct} / {selectedResult.total}</span>
                </div>
              )}
              {selectedResult.language && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>Language</span>
                  <span style={{ fontWeight: 500 }}>{selectedResult.language}</span>
                </div>
              )}
              {selectedResult.verdict && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>Verdict</span>
                  <span style={{ fontWeight: 500 }}>{selectedResult.verdict}</span>
                </div>
              )}
            </div>

            {/* Delete button */}
            <button onClick={() => handleDeleteResult(selectedResult)} disabled={deleting}
              style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.08)", color: "#F87171", fontSize: 13, fontWeight: 500, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: deleting ? 0.5 : 1 }}>
              {deleting ? "Deleting…" : "🗑️ Delete this result permanently"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}