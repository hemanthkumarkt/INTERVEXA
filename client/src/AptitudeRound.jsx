import { useState, useEffect, useRef } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { generateAptitude } from "./api";
import LoadingTimer from "./LoadingTimer";
import HowItWorks from "./HowItWorks";

const FULL_TEST_SECONDS = 30 * 60;

const SECTIONS = {
  Quantitative: {
    color: "#06B6D4", bg: "rgba(6,182,212,0.1)", icon: "🔢",
    topics: ["Number System", "Percentages", "Time & Work", "Speed & Distance", "Simple & Compound Interest"]
  },
  Verbal: {
    color: "#A78BFA", bg: "rgba(167,139,250,0.1)", icon: "📝",
    topics: ["Reading Comprehension", "Grammar & Vocabulary", "Sentence Correction"]
  },
  "Logical Reasoning": {
    color: "#F59E0B", bg: "rgba(245,158,11,0.1)", icon: "🧩",
    topics: ["Blood Relations", "Coding & Decoding", "Data Interpretation", "Syllogisms"]
  },
};

const formatTime = (s) => {
  const m = Math.max(0, Math.floor(s / 60));
  const sec = Math.max(0, s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export default function AptitudeRound({ user }) {
  // mode: null | "full_setup" | "full" | "practice_setup" | "practice"
  const [mode, setMode]             = useState(null);
  const [section, setSection]       = useState(null);
  const [topic, setTopic]           = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questions, setQuestions]   = useState([]);
  const [currentQ, setCurrentQ]     = useState(0);
  const [answers, setAnswers]       = useState({});
  const [bookmarked, setBookmarked] = useState({});
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [timeLeft, setTimeLeft]     = useState(FULL_TEST_SECONDS);

  const submitRef = useRef(null);

  // ── Generation ─────────────────────────────────────────────────────────────
  // Switches mode FIRST so the screen actually changes (this was the "nothing happens" bug)
  const loadQuestions = async (fetcher, nextMode) => {
    setMode(nextMode);
    setLoading(true);
    setQuestions([]); setAnswers({}); setResult(null);
    setSubmitted(false); setCurrentQ(0); setBookmarked({});
    try {
      const qs = await fetcher();
      if (!qs.length) throw new Error("No questions were generated");
      setQuestions(qs.map((q, i) => ({ ...q, id: i + 1 })));
      if (nextMode === "full") setTimeLeft(FULL_TEST_SECONDS);
    } catch (err) {
      alert("Failed to generate questions: " + err.message);
      setMode(nextMode === "full" ? "full_setup" : "practice_setup");
    }
    setLoading(false);
  };

  const startFullTest = () =>
    loadQuestions(async () => {
      // 3 smaller requests in parallel — faster and far less likely to get cut off than one 30-question call
      const parts = await Promise.all(
        Object.entries(SECTIONS).map(([name, s]) =>
          generateAptitude(`${name} (${s.topics.join(", ")})`, difficulty, 10).then((d) => d.questions || [])
        )
      );
      return parts.flat();
    }, "full");

  const startPractice = () =>
    loadQuestions(async () => (await generateAptitude(topic, difficulty, 10)).questions || [], "practice");

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitted || !questions.length) return;
    let correct = 0;
    questions.forEach((q) => { if (answers[q.id] === q.correct) correct++; });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= 60;
    setResult({ correct, total: questions.length, score, passed });
    setSubmitted(true);
    try {
      await addDoc(collection(db, "users", user.uid, "attempts"), {
        type: "aptitude", subtype: mode === "full" ? "Full Test" : topic,
        score, result: passed ? "passed" : "failed",
        correct, total: questions.length, difficulty,
        date: serverTimestamp(),
      });
    } catch (_) {}
  };
  submitRef.current = handleSubmit;

  // ── 30-min countdown (full test only) ──────────────────────────────────────
  useEffect(() => {
    if (mode !== "full" || !questions.length || submitted) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [mode, questions.length, submitted]);

  useEffect(() => {
    if (mode === "full" && questions.length && !submitted && timeLeft <= 0) submitRef.current?.();
  }, [timeLeft]); // eslint-disable-line

  const reset = () => {
    setMode(null); setSection(null); setTopic("");
    setQuestions([]); setAnswers({}); setBookmarked({});
    setResult(null); setSubmitted(false); setCurrentQ(0);
  };

  const q = questions[currentQ];
  const answered  = Object.keys(answers).length;
  const bookmarks = Object.keys(bookmarked).filter((k) => bookmarked[k]).length;

  // ── MODE SELECT ────────────────────────────────────────────────────────────
  if (!mode) return (
    <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#F0F0FF", marginBottom: 8 }}>Aptitude Round</div>
          <div style={{ fontSize: 14, color: "#A0A0C0" }}>Choose your preparation mode</div>
        </div>
        <HowItWorks module="Aptitude" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28, animation: "fadeUp 0.4s ease 0.1s both" }}>
        {/* Full Test */}
        <div onClick={() => setMode("full_setup")}
          style={{ padding: 28, borderRadius: 16, border: "1px solid rgba(6,182,212,0.2)", background: "rgba(6,182,212,0.06)", cursor: "pointer", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.4)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)"; e.currentTarget.style.transform = "none"; }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Full Test Mode</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 14 }}>30 questions · Quant + Verbal + Logical mixed · Like a real placement test</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["30 Questions", "All Sections", "Timed"].map((t) => (
              <span key={t} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(6,182,212,0.12)", color: "#06B6D4", border: "1px solid rgba(6,182,212,0.2)" }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Practice Mode */}
        <div onClick={() => setMode("practice_setup")}
          style={{ padding: 28, borderRadius: 16, border: "1px solid rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.06)", cursor: "pointer", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)"; e.currentTarget.style.transform = "none"; }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>📚</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Practice Mode</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 14 }}>10 questions · Choose topic, section and difficulty · Detailed explanations</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["10 Questions", "Topic-wise", "Explanations"].map((t) => (
              <span key={t} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(167,139,250,0.12)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── FULL TEST SETUP ────────────────────────────────────────────────────────
  if (mode === "full_setup") return (
    <div style={{ maxWidth: 560, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => setMode(null)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 20 }}>← Back</button>
        <div style={{ fontSize: 20, fontWeight: 700 }}>🎯 Full Placement Test</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>30 mixed questions — Quantitative, Verbal, Logical Reasoning</div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 14 }}>DIFFICULTY</div>
        <div style={{ display: "flex", gap: 10 }}>
          {[["Easy", "🟢", "#34D399", "rgba(52,211,153,0.15)"], ["Medium", "🟡", "#F59E0B", "rgba(245,158,11,0.15)"], ["Hard", "🔴", "#F87171", "rgba(248,113,113,0.15)"]].map(([d, emoji, color, bg]) => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{ padding: "8px 22px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid", fontFamily: "inherit", transition: "all 0.15s", background: difficulty === d ? bg : "transparent", borderColor: difficulty === d ? color : "rgba(255,255,255,0.1)", color: difficulty === d ? color : "rgba(255,255,255,0.4)" }}>
              {emoji} {d}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
          📋 <strong style={{ color: "#fff" }}>30 Questions · 30 minutes</strong><br />
          • 10 Quantitative (Number System, Percentages, Time & Work...)<br />
          • 10 Verbal (Reading Comprehension, Grammar...)<br />
          • 10 Logical Reasoning (Blood Relations, Syllogisms...)
        </div>
      </div>

      <button onClick={startFullTest}
        style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: "linear-gradient(135deg, #06B6D4, #0891B2)", color: "#fff" }}>
        Start Full Test →
      </button>
    </div>
  );

  // ── PRACTICE SETUP ─────────────────────────────────────────────────────────
  if (mode === "practice_setup") return (
    <div style={{ maxWidth: 680, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .topic-card{padding:12px 14px;border-radius:10px;cursor:pointer;font-size:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.45);transition:all 0.15s;text-align:center}
        .topic-card:hover{border-color:rgba(255,255,255,0.15);color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.05)}
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <button onClick={() => setMode(null)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 20 }}>← Back</button>
        <div style={{ fontSize: 20, fontWeight: 700 }}>📚 Practice Mode</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Select section, topic and difficulty</div>
      </div>

      {/* Difficulty */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 12 }}>DIFFICULTY</div>
        <div style={{ display: "flex", gap: 10 }}>
          {[["Easy", "🟢", "#34D399", "rgba(52,211,153,0.15)"], ["Medium", "🟡", "#F59E0B", "rgba(245,158,11,0.15)"], ["Hard", "🔴", "#F87171", "rgba(248,113,113,0.15)"]].map(([d, emoji, color, bg]) => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{ padding: "7px 20px", borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1px solid", fontFamily: "inherit", background: difficulty === d ? bg : "transparent", borderColor: difficulty === d ? color : "rgba(255,255,255,0.1)", color: difficulty === d ? color : "rgba(255,255,255,0.4)" }}>
              {emoji} {d}
            </button>
          ))}
        </div>
      </div>

      {/* Sections + Topics */}
      {Object.entries(SECTIONS).map(([sectionName, sectionData]) => (
        <div key={sectionName} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>{sectionData.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: sectionData.color }}>{sectionName}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {sectionData.topics.map((t) => (
              <div key={t} className="topic-card"
                onClick={() => { setTopic(t); setSection(sectionName); }}
                style={{ borderColor: topic === t ? sectionData.color : "rgba(255,255,255,0.08)", background: topic === t ? sectionData.bg : "rgba(255,255,255,0.02)", color: topic === t ? sectionData.color : "rgba(255,255,255,0.45)", fontWeight: topic === t ? 500 : 400 }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={startPractice} disabled={!topic}
        style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600, cursor: topic ? "pointer" : "not-allowed", fontFamily: "inherit", background: topic ? "linear-gradient(135deg, #A78BFA, #7C6FFF)" : "rgba(255,255,255,0.06)", color: topic ? "#fff" : "rgba(255,255,255,0.2)" }}>
        {topic ? `Start Practice: ${topic} →` : "Select a topic to continue"}
      </button>
    </div>
  );

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading)
    return <LoadingTimer message="Generating questions" submessage="AI is creating placement-level questions for you" icon="🧠" />;

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (submitted && result) return (
    <div style={{ maxWidth: 680, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ borderRadius: 16, padding: 32, marginBottom: 20, textAlign: "center", background: result.passed ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", border: `2px solid ${result.passed ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`, animation: "fadeUp 0.4s ease both" }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>{result.passed ? "🎉" : "😔"}</div>
        <div style={{ fontSize: 48, fontWeight: 800, color: result.score >= 80 ? "#34D399" : result.score >= 60 ? "#F59E0B" : "#F87171", letterSpacing: "-0.03em" }}>{result.score}%</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{result.correct} / {result.total} correct</div>
        <span style={{ display: "inline-block", marginTop: 12, padding: "5px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600, background: result.passed ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)", color: result.passed ? "#34D399" : "#F87171", border: `1px solid ${result.passed ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}` }}>
          {result.passed ? "✅ Passed" : "❌ Failed"}
        </span>
      </div>

      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 12 }}>ANSWER REVIEW</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {questions.map((qu, idx) => {
          const isCorrect = answers[qu.id] === qu.correct;
          return (
            <div key={qu.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${isCorrect ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                <span style={{ color: "#06B6D4", marginRight: 6 }}>Q{idx + 1}.</span>{qu.question}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {qu.options.map((opt) => {
                  const letter = opt[0]; const isUser = letter === answers[qu.id]; const isRight = letter === qu.correct;
                  return (
                    <div key={opt} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, background: isRight ? "rgba(52,211,153,0.1)" : isUser && !isRight ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.02)", color: isRight ? "#34D399" : isUser && !isRight ? "#F87171" : "rgba(255,255,255,0.45)", border: `1px solid ${isRight ? "rgba(52,211,153,0.2)" : isUser && !isRight ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.06)"}`, fontWeight: isRight || isUser ? 500 : 400 }}>
                      {opt} {isRight ? "✓" : isUser && !isRight ? "✗" : ""}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 8, lineHeight: 1.5 }}>💡 {qu.explanation}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={reset} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#06B6D4,#0891B2)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Try Another</button>
        <button onClick={() => { setSubmitted(false); setResult(null); setAnswers({}); setBookmarked({}); setCurrentQ(0); if (mode === "full") setTimeLeft(FULL_TEST_SECONDS); }}
          style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Retry</button>
      </div>
    </div>
  );

  // ── FULL SCREEN QUESTION UI ────────────────────────────────────────────────
  if (questions.length && !submitted && q) return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .opt-row{padding:12px 18px;border-radius:10px;cursor:pointer;font-size:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.6);transition:all 0.12s;margin-bottom:10px}
        .opt-row:hover{border-color:rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.9)}
        .opt-row.selected{border-color:#06B6D4;background:rgba(6,182,212,0.12);color:#06B6D4;font-weight:500}
        .palette-btn{width:36px;height:36px;border-radius:8px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:inherit}
      `}</style>

      {/* LEFT: Question area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#0d0b18" }}>
        {/* Top bar */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0814" }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{mode === "full" ? "Full Placement Test" : topic}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginLeft: 12 }}>{difficulty} · Q{currentQ + 1}/{questions.length}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {mode === "full" && (
              <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: timeLeft <= 60 ? "#F87171" : timeLeft <= 300 ? "#F59E0B" : "#34D399" }}>
                ⏱ {formatTime(timeLeft)}
              </div>
            )}
            <div style={{ width: 200, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,#06B6D4,#0891B2)", width: `${((currentQ + 1) / questions.length) * 100}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        </div>

        {/* Question */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ background: "rgba(124,111,255,0.2)", border: "1px solid rgba(124,111,255,0.3)", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#A78BFA" }}>Q{currentQ + 1}</div>
              <button onClick={() => setBookmarked((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                style={{ background: bookmarked[q.id] ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${bookmarked[q.id] ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "4px 12px", fontSize: 12, cursor: "pointer", color: bookmarked[q.id] ? "#F59E0B" : "rgba(255,255,255,0.4)", fontFamily: "inherit" }}>
                🔖 {bookmarked[q.id] ? "Bookmarked" : "Bookmark"}
              </button>
            </div>

            <div key={`q-${q.id}`} style={{ fontSize: 17, fontWeight: 500, color: "#fff", lineHeight: 1.7, marginBottom: 28, animation: "fadeUp 0.3s ease both", whiteSpace: "pre-wrap" }}>
              {q.question}
            </div>

            <div key={`o-${q.id}`} style={{ animation: "fadeUp 0.3s ease 0.05s both" }}>
              {q.options.map((opt) => {
                const letter = opt[0];
                const selected = answers[q.id] === letter;
                return (
                  <div key={opt} className={`opt-row ${selected ? "selected" : ""}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: letter }))}>
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding: "16px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0814" }}>
          <button onClick={() => setCurrentQ((p) => Math.max(0, p - 1))} disabled={currentQ === 0}
            style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: currentQ === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)", fontSize: 13, cursor: currentQ === 0 ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            ← Previous
          </button>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{answered} of {questions.length} answered</div>
          {currentQ < questions.length - 1 ? (
            <button onClick={() => setCurrentQ((p) => p + 1)}
              style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#06B6D4,#0891B2)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit}
              style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#34D399,#059669)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Submit Test ✓
            </button>
          )}
        </div>
      </div>

      {/* RIGHT: Palette */}
      <div style={{ width: 280, background: "#0a0814", borderLeft: "1px solid rgba(255,255,255,0.06)", padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Question Palette</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Answered", val: answered, color: "#34D399", bg: "rgba(52,211,153,0.1)" },
            { label: "Skipped", val: questions.length - answered, color: "#F87171", bg: "rgba(248,113,113,0.1)" },
            { label: "Bookmarked", val: bookmarks, color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
            { label: "Not Viewed", val: Math.max(0, questions.length - currentQ - 1), color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "12px 10px", borderRadius: 10, background: s.bg, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {questions.map((question, i) => {
            const isAnswered = answers[question.id] !== undefined;
            const isBookmarked = bookmarked[question.id];
            const isCurrent = i === currentQ;
            return (
              <button key={i} className="palette-btn"
                onClick={() => setCurrentQ(i)}
                style={{ background: isCurrent ? "#7C6FFF" : isAnswered ? "rgba(52,211,153,0.2)" : isBookmarked ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)", color: isCurrent ? "#fff" : isAnswered ? "#34D399" : isBookmarked ? "#F59E0B" : "rgba(255,255,255,0.4)", border: `1px solid ${isCurrent ? "#7C6FFF" : isAnswered ? "rgba(52,211,153,0.3)" : isBookmarked ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                {i + 1}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[["#7C6FFF", "Current"], ["#34D399", "Answered"], ["#F59E0B", "Bookmarked"], ["rgba(255,255,255,0.3)", "Not answered"]].map(([color, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}
            </div>
          ))}
        </div>

        <button onClick={handleSubmit}
          style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#34D399,#059669)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: "auto" }}>
          Submit Test ✓
        </button>
      </div>
    </div>
  );

  return null;
}