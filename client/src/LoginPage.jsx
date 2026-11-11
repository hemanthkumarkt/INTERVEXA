import { useState } from "react";
import { auth, googleProvider } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import Logo from "./Logo";

export default function LoginPage() {
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const openModal = (loginMode = true) => {
    setIsLogin(loginMode);
    setError("");
    setEmail("");
    setPassword("");
    setShowModal(true);
  };

  const handleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/\(auth.*\)/, "").trim());
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      setShowModal(false);
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").trim());
    }
  };

  const modules = [
    {
      icon: "📄",
      title: "Resume Analyzer",
      desc: "Upload your resume and get an instant ATS score, skill extraction, strengths, weaknesses, and improvement tips tailored for placement roles.",
      tags: ["ATS Score", "Skill Match", "Feedback"],
      color: "#7C6FFF",
      bg: "rgba(124,111,255,0.08)",
    },
    {
      icon: "🧠",
      title: "Aptitude Round",
      desc: "AI-generated MCQs across 8 topics at Easy, Medium, and Hard difficulty levels — exactly like real placement aptitude tests.",
      tags: ["10 Questions", "8 Topics", "3 Levels"],
      color: "#06B6D4",
      bg: "rgba(6,182,212,0.08)",
    },
    {
      icon: "💻",
      title: "Coding Round",
      desc: "Real split-screen code editor with AI-generated problems, test case evaluation, time/space complexity analysis, and optimization hints.",
      tags: ["4 Languages", "Test Cases", "AI Review"],
      color: "#10B981",
      bg: "rgba(16,185,129,0.08)",
    },
    {
      icon: "🎥",
      title: "AI Mock Interview",
      desc: "A human-like AI avatar asks HR and technical questions based on your resume and job role. Voice answers, live feedback, downloadable report.",
      tags: ["Voice Answers", "Live Feedback", "Report"],
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.08)",
    },
  ];

  const steps = [
    { num: "01", title: "Set up your profile", desc: "Add your name, college, skills and upload your photo. Takes 2 minutes." },
    { num: "02", title: "Analyze your resume", desc: "Get an ATS score and understand exactly where your resume stands." },
    { num: "03", title: "Practice each round", desc: "Go through aptitude, coding, and mock interviews at your own pace." },
    { num: "04", title: "Download your report", desc: "Get a detailed performance report after every interview session." },
  ];

  const stats = [
    { val: "4", label: "Placement modules" },
    { val: "12+", label: "Aptitude topics" },
    { val: "4", label: "Coding languages" },
    { val: "AI", label: "Powered feedback" },
  ];

  return (
    <div style={{
      background: "#09090f",
      minHeight: "100vh",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: "#fff",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gradientShift { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        @keyframes pulse { 0%,100% { opacity:0.3; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.08); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .nav-btn {
          padding: 9px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;
          cursor: pointer; font-family: inherit; transition: all 0.2s;
        }
        .hero-btn {
          padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: all 0.2s; border: none;
        }
        .hero-btn:hover { transform: translateY(-2px); opacity: 0.92; }
        .module-card {
          border-radius: 16px; padding: 28px; border: 1px solid rgba(255,255,255,0.07);
          transition: all 0.25s; cursor: default;
          animation: fadeUp 0.5s ease both;
        }
        .module-card:hover {
          border-color: rgba(255,255,255,0.14);
          transform: translateY(-4px);
        }
        .step-card {
          padding: 24px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          animation: fadeUp 0.5s ease both;
        }
        .login-input {
          width: 100%; padding: 13px 16px;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px; color: #fff; font-size: 14px; outline: none;
          transition: border-color 0.2s, background 0.2s; font-family: inherit;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.3); }
        .login-input:focus { border-color: #7C6FFF; background: rgba(124,111,255,0.08); }
        .btn-primary {
          width: 100%; padding: 13px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #7C6FFF, #A855F7);
          color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: opacity 0.2s, transform 0.15s; font-family: inherit;
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-google {
          width: 100%; padding: 12px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 500;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 10px; transition: background 0.2s; font-family: inherit;
        }
        .btn-google:hover { background: rgba(255,255,255,0.09); }
        .tab-btn {
          flex: 1; padding: 9px; border: none; border-radius: 8px;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.2s; font-family: inherit;
        }
        @media (max-width: 768px) {
          .modules-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-title { font-size: 40px !important; }
          .hero-btns { flex-direction: column !important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 48px",
        background: "rgba(9,9,15,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <Logo size="sm" />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="nav-btn"
            onClick={() => openModal(true)}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>
            Sign in
          </button>
          <button className="nav-btn"
            onClick={() => openModal(false)}
            style={{ background: "linear-gradient(135deg, #7C6FFF, #A855F7)", border: "none", color: "#fff" }}>
            Get started
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "120px 24px 80px", position: "relative",
      }}>
        {/* Ambient blobs */}
        <div style={{
          position: "absolute", top: "20%", left: "30%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,111,255,0.12) 0%, transparent 70%)",
          animation: "pulse 7s ease-in-out infinite", pointerEvents: "none",
          transform: "translate(-50%, -50%)",
        }} />
        <div style={{
          position: "absolute", top: "60%", right: "20%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
          animation: "pulse 9s ease-in-out 2s infinite", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", animation: "fadeUp 0.7s ease both" }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(124,111,255,0.12)", border: "1px solid rgba(124,111,255,0.25)",
            borderRadius: 99, padding: "6px 16px", marginBottom: 32,
            fontSize: 12, color: "#A78BFA", fontWeight: 500, letterSpacing: "0.05em",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C6FFF" }} />
            AI-POWERED PLACEMENT PREPARATION
          </div>

          {/* Title */}
          <h1 className="hero-title" style={{
            fontSize: 72, fontWeight: 800, lineHeight: 1.1,
            letterSpacing: "-0.04em", marginBottom: 24, maxWidth: 800,
          }}>
            Crack your placement<br />
            <span style={{
              background: "linear-gradient(135deg, #7C6FFF 0%, #C084FC 50%, #EC4899 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite",
            }}>
              with AI by your side
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 18, color: "rgba(255,255,255,0.45)", lineHeight: 1.7,
            maxWidth: 560, margin: "0 auto 48px",
          }}>
            Resume analysis, aptitude rounds, coding problems, and AI mock interviews
            — everything you need to land your dream job, in one place.
          </p>

          {/* CTAs */}
          <div className="hero-btns" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="hero-btn"
              onClick={() => openModal(false)}
              style={{ background: "linear-gradient(135deg, #7C6FFF, #A855F7)", color: "#fff" }}>
              Start for free →
            </button>
            <button className="hero-btn"
              onClick={() => openModal(true)}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}>
              Sign in
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          color: "rgba(255,255,255,0.2)", fontSize: 11, letterSpacing: "0.1em",
        }}>
          SCROLL
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)" }} />
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: "0 48px 80px" }}>
        <div className="stats-grid" style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1, maxWidth: 900, margin: "0 auto",
          border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden",
        }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{
              padding: "32px 24px", textAlign: "center",
              background: "rgba(255,255,255,0.02)",
              borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
            }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#7C6FFF", letterSpacing: "-0.03em" }}>{s.val}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MODULES ── */}
      <section style={{ padding: "80px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 12, color: "#7C6FFF", letterSpacing: "0.1em", fontWeight: 500, marginBottom: 16 }}>
            WHAT'S INSIDE
          </div>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16 }}>
            Everything you need<br />to crack placements
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 480, margin: "0 auto" }}>
            Four AI-powered modules that simulate the real placement process end to end.
          </p>
        </div>

        <div className="modules-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {modules.map((m, i) => (
            <div key={m.title} className="module-card"
              style={{ background: m.bg, animationDelay: `${i * 0.1}s` }}>
              <div style={{ fontSize: 36, marginBottom: 20 }}>{m.icon}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.02em" }}>{m.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 20 }}>{m.desc}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {m.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 11, padding: "4px 12px", borderRadius: 99,
                    background: `${m.color}20`, color: m.color,
                    fontWeight: 500, border: `1px solid ${m.color}30`,
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{
        padding: "80px 48px", maxWidth: 1200, margin: "0 auto",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 12, color: "#7C6FFF", letterSpacing: "0.1em", fontWeight: 500, marginBottom: 16 }}>
            HOW IT WORKS
          </div>
          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Four steps to placement ready
          </h2>
        </div>

        <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {steps.map((step, i) => (
            <div key={step.num} className="step-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "#7C6FFF",
                marginBottom: 16, fontFamily: "monospace", letterSpacing: "0.05em",
              }}>{step.num}</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, lineHeight: 1.3 }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        padding: "100px 48px", textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,111,255,0.1) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)", pointerEvents: "none",
        }} />
        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 20, lineHeight: 1.1 }}>
            Ready to crack your<br />
            <span style={{
              background: "linear-gradient(135deg, #7C6FFF, #C084FC)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>placement?</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 40 }}>
            Free to use. No credit card required.
          </p>
          <button className="hero-btn"
            onClick={() => openModal(false)}
            style={{
              background: "linear-gradient(135deg, #7C6FFF, #A855F7)",
              color: "#fff", fontSize: 16, padding: "16px 48px",
            }}>
            Start for free →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "32px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Logo size="sm" />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          © 2026 Intervexa. AI-Powered Placement Prep.
        </div>
      </footer>

      {/* ── LOGIN MODAL ── */}
      {showModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{
            background: "#13111f", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 420,
            animation: "modalIn 0.25s ease both", position: "relative",
          }}>
            {/* Close */}
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute", top: 16, right: 16,
                background: "rgba(255,255,255,0.06)", border: "none",
                width: 32, height: 32, borderRadius: "50%",
                color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>

            <div style={{ marginBottom: 28 }}>
              <Logo size="sm" />
              <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 20, marginBottom: 6, letterSpacing: "-0.02em" }}>
                {isLogin ? "Welcome back" : "Create account"}
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                {isLogin ? "Sign in to continue your prep journey" : "Start your placement prep today"}
              </p>
            </div>

            {/* Toggle */}
            <div style={{
              display: "flex", background: "rgba(255,255,255,0.05)",
              borderRadius: 10, padding: 4, marginBottom: 24,
            }}>
              <button className="tab-btn"
                onClick={() => { setIsLogin(true); setError(""); }}
                style={{
                  background: isLogin ? "rgba(124,111,255,0.3)" : "transparent",
                  color: isLogin ? "#fff" : "rgba(255,255,255,0.4)",
                  border: isLogin ? "1px solid rgba(124,111,255,0.4)" : "1px solid transparent",
                }}>Sign in</button>
              <button className="tab-btn"
                onClick={() => { setIsLogin(false); setError(""); }}
                style={{
                  background: !isLogin ? "rgba(124,111,255,0.3)" : "transparent",
                  color: !isLogin ? "#fff" : "rgba(255,255,255,0.4)",
                  border: !isLogin ? "1px solid rgba(124,111,255,0.4)" : "1px solid transparent",
                }}>Sign up</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>Email</label>
                <input className="login-input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAuth()} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>Password</label>
                <input className="login-input" type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAuth()} />
              </div>
            </div>

            {error && (
              <div style={{
                fontSize: 12, color: "#F87171",
                background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16, lineHeight: 1.5,
              }}>{error}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn-primary" onClick={handleAuth}
                disabled={loading || !email || !password}>
                {loading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              </div>
              <button className="btn-google" onClick={handleGoogle}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.1 0 5.8 1.1 8 2.9l6-6C34.5 3.5 29.6 1.5 24 1.5 14.8 1.5 7 7.2 3.8 15.1l7 5.4C12.5 14 17.8 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7C43.8 36.8 46.5 30.9 46.5 24z"/>
                  <path fill="#FBBC05" d="M10.8 28.5A14.4 14.4 0 0 1 9.5 24c0-1.6.3-3.1.8-4.5l-7-5.4A22.4 22.4 0 0 0 1.5 24c0 3.6.9 7 2.4 10l7-5.5z"/>
                  <path fill="#34A853" d="M24 46.5c5.6 0 10.3-1.8 13.7-5l-7.4-5.7c-1.8 1.2-4.1 2-6.3 2-6.2 0-11.5-4.2-13.2-9.8l-7 5.5C7 39.3 14.8 46.5 24 46.5z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}