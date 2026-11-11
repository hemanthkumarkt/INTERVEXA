import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { generateCoding, evaluateCoding, getCodeHint } from "./api";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import LoadingTimer from "./LoadingTimer";
import HowItWorks from "./HowItWorks";

const TOPICS = [
  "Random", "Arrays", "Strings", "Linked Lists",
  "Stacks & Queues", "Trees", "Recursion",
  "Sorting & Searching", "Dynamic Programming"
];

const LANGUAGES = ["Python", "Java", "C++", "JavaScript"];

const getLangExtension = (lang) => {
  switch (lang) {
    case "Python": return [python()];
    case "Java": return [java()];
    case "C++": return [cpp()];
    case "JavaScript": return [javascript()];
    default: return [python()];
  }
};

const MODE_CARD = ({ icon, title, badge, desc, color, onClick }) => (
  <div onClick={onClick} style={{
    background: "#13132B", border: `1px solid ${color}40`,
    borderRadius: 16, padding: 28, cursor: "pointer",
    transition: "all 0.2s", position: "relative", overflow: "hidden",
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${color}30`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
  >
    <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `${color}15` }} />
    <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#F0F0FF" }}>{title}</div>
      {badge && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${color}20`, color, fontWeight: 600 }}>{badge}</span>}
    </div>
    <div style={{ fontSize: 13, color: "#A0A0C0", lineHeight: 1.6 }}>{desc}</div>
    <div style={{ marginTop: 16, fontSize: 13, color, fontWeight: 500 }}>Start →</div>
  </div>
);

export default function CodingRound({ user }) {
  const [mode, setMode] = useState(null); // null | "assessment" | "practice"
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [difficulty, setDifficulty] = useState("Medium");
  const [problems, setProblems] = useState([]);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [language, setLanguage] = useState("Python");
  const [codes, setCodes] = useState({});
  const [results, setResults] = useState({});
  const [hints, setHints] = useState({});
  const [loadingHint, setLoadingHint] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [loading, setLoading] = useState(false);

  // ?? (not ||) so clearing the editor doesn't snap the starter code back in
  const currentCode = codes[currentProblem] ?? problems[currentProblem]?.starter_code?.[language] ?? "";

  const setCurrentCode = (val) => {
    setCodes(prev => ({ ...prev, [currentProblem]: val }));
  };

  // diff lets the assessment ask for "Mixed" without touching the practice difficulty buttons
  const generate = async (topic, count, diff = difficulty) => {
    setLoading(true);
    setProblems([]); setCodes({}); setResults({}); setHints({});
    setCurrentProblem(0);
    try {
      const data = await generateCoding(topic, diff, count);   // was generateCodingProblem (undefined)
      const probs = data.problems || [];
      if (!probs.length) throw new Error("No problems were returned");
      setProblems(probs);
      const initialCodes = {};
      probs.forEach((p, i) => { initialCodes[i] = p.starter_code?.[language] || ""; });
      setCodes(initialCodes);
    } catch (err) {
      alert("Failed to generate: " + err.message);
    }
    setLoading(false);
  };

  const handleEvaluate = async () => {
    const prob = problems[currentProblem];
    const code = currentCode;
    if (!code || code.trim() === prob?.starter_code?.[language]?.trim()) {
      return alert("Please write your solution first!");
    }
    setEvaluating(true);
    try {
      const data = await evaluateCoding(prob, code, language);   // was evaluateCode (undefined)
      setResults(prev => ({ ...prev, [currentProblem]: data }));
      try {
        await addDoc(collection(db, "users", user.uid, "attempts"), {
          type: "coding", subtype: prob.topic || selectedTopic,
          score: data.score || 0,
          result: data.verdict === "Accepted" ? "passed" : "failed",
          difficulty: prob.difficulty || difficulty, language, date: serverTimestamp(),
        });
      } catch (e) { console.warn("Could not save attempt:", e); }
    } catch (err) {
      alert("Evaluation failed: " + err.message);
    }
    setEvaluating(false);
  };

  const handleHint = async () => {
    setLoadingHint(true);
    try {
      const data = await getCodeHint(problems[currentProblem], currentCode);
      setHints(prev => ({ ...prev, [currentProblem]: data.hint }));
    } catch (_) {
      setHints(prev => ({ ...prev, [currentProblem]: "Could not load hint." }));
    }
    setLoadingHint(false);
  };

  // Switch language: swap starter code on problems the user hasn't edited yet
  const switchLanguage = (lang) => {
    setCodes(prev => {
      const next = { ...prev };
      problems.forEach((p, i) => {
        const oldStarter = (p.starter_code?.[language] || "").trim();
        if (next[i] === undefined || next[i].trim() === oldStarter) {
          next[i] = p.starter_code?.[lang] || "";
        }
      });
      return next;
    });
    setLanguage(lang);
  };

  const reset = () => {
    setMode(null); setSelectedTopic(null);
    setProblems([]); setCodes({}); setResults({}); setHints({});
    setCurrentProblem(0);
  };

  // ── Home ──────────────────────────────────────────────────────────────────
  if (!mode) return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#F0F0FF", marginBottom: 8 }}>Coding Round</div>
          <div style={{ fontSize: 14, color: "#A0A0C0" }}>Choose your mode</div>
        </div>
        <HowItWorks module="Coding" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <MODE_CARD
          icon="🎯" title="Assessment" badge="4 Questions"
          color="#6C63FF"
          desc="Coding test with 4 mixed-difficulty problems. Simulates a real placement coding round."
          onClick={() => setMode("assessment")}
        />
        <MODE_CARD
          icon="📚" title="Practice" badge="By Topic"
          color="#06B6D4"
          desc="Pick a topic and practice 2 problems. Includes hints and detailed feedback."
          onClick={() => setMode("practice")}
        />
      </div>
    </div>
  );

  // ── Assessment — setup ────────────────────────────────────────────────────
  if (mode === "assessment" && problems.length === 0 && !loading) return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <button onClick={reset} style={{ background: "#13132B", border: "1px solid #2A2A3E", borderRadius: 8, padding: "6px 14px", color: "#A0A0C0", cursor: "pointer", fontSize: 13, marginBottom: 24 }}>← Back</button>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#F0F0FF", marginBottom: 8 }}>Coding Assessment</div>
      <div style={{ fontSize: 13, color: "#A0A0C0", marginBottom: 28 }}>4 questions — 1 Easy + 2 Medium + 1 Hard</div>

      {/* Language */}
      <div style={{ background: "#13132B", border: "1px solid #2A2A3E", borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#F0F0FF", marginBottom: 12 }}>Select Language</div>
        <div style={{ display: "flex", gap: 8 }}>
          {LANGUAGES.map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)} style={{
              padding: "8px 20px", borderRadius: 99, fontSize: 13, cursor: "pointer",
              border: language === lang ? "none" : "1px solid #2A2A3E",
              background: language === lang ? "#6C63FF" : "#0D0D1A",
              color: language === lang ? "#fff" : "#A0A0C0", fontWeight: language === lang ? 600 : 400,
            }}>{lang}</button>
          ))}
        </div>
      </div>

      <button onClick={() => { setSelectedTopic("Mixed"); generate("a random mix of Arrays, Strings, Trees, Dynamic Programming", 4, "Mixed"); }}
        style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: "#6C63FF", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        Start Assessment →
      </button>
    </div>
  );

  // ── Practice — topic select ───────────────────────────────────────────────
  if (mode === "practice" && problems.length === 0 && !loading) return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <button onClick={reset} style={{ background: "#13132B", border: "1px solid #2A2A3E", borderRadius: 8, padding: "6px 14px", color: "#A0A0C0", cursor: "pointer", fontSize: 13, marginBottom: 24 }}>← Back</button>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#F0F0FF", marginBottom: 8 }}>Practice Mode</div>
      <div style={{ fontSize: 13, color: "#A0A0C0", marginBottom: 28 }}>Pick a topic — 2 problems per session</div>

      {/* Difficulty */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["Easy", "Medium", "Hard"].map(d => (
          <button key={d} onClick={() => setDifficulty(d)} style={{
            padding: "8px 20px", borderRadius: 99, fontSize: 13, cursor: "pointer",
            border: difficulty === d ? "none" : "1px solid #2A2A3E",
            background: difficulty === d ? "#6C63FF" : "#0D0D1A",
            color: difficulty === d ? "#fff" : "#A0A0C0", fontWeight: difficulty === d ? 600 : 400,
          }}>{d === "Easy" ? "🟢" : d === "Medium" ? "🟡" : "🔴"} {d}</button>
        ))}
      </div>

      {/* Language */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {LANGUAGES.map(lang => (
          <button key={lang} onClick={() => setLanguage(lang)} style={{
            padding: "8px 20px", borderRadius: 99, fontSize: 13, cursor: "pointer",
            border: language === lang ? "none" : "1px solid #2A2A3E",
            background: language === lang ? "#06B6D4" : "#0D0D1A",
            color: language === lang ? "#fff" : "#A0A0C0", fontWeight: language === lang ? 600 : 400,
          }}>{lang}</button>
        ))}
      </div>

      {/* Topics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {TOPICS.map(topic => (
          <div key={topic} onClick={() => { setSelectedTopic(topic); generate(topic, 2); }}
            style={{ background: "#13132B", border: "1px solid #2A2A3E", borderRadius: 12, padding: "16px", cursor: "pointer", textAlign: "center", transition: "all 0.15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#06B6D4"; e.currentTarget.style.background = "#06B6D410"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A3E"; e.currentTarget.style.background = "#13132B"; }}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>
              {topic === "Random" ? "🎲" : topic === "Arrays" ? "📊" : topic === "Strings" ? "🔤" : topic === "Linked Lists" ? "🔗" : topic === "Stacks & Queues" ? "📚" : topic === "Trees" ? "🌳" : topic === "Recursion" ? "🔄" : topic === "Sorting & Searching" ? "🔍" : "💡"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#F0F0FF" }}>{topic}</div>
            <div style={{ fontSize: 11, color: "#606080", marginTop: 3 }}>2 problems</div>
            {topic === "Random" && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 9, padding: "2px 6px", borderRadius: 99, background: "#6C63FF20", color: "#A78BFA" }}>NEW</span>}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading)
    return <LoadingTimer message="Generating problem" submessage="AI is creating a coding problem with test cases" icon="💻" />;

  // ── Problem screen ────────────────────────────────────────────────────────
  if (problems.length === 0) return null;

  const prob = problems[currentProblem];
  const result = results[currentProblem];
  const hint = hints[currentProblem];
  const verdictColor = result?.verdict === "Accepted" ? "#22C55E" : result?.verdict === "Partial" ? "#F59E0B" : "#EF4444";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={reset} style={{ background: "#13132B", border: "1px solid #2A2A3E", borderRadius: 8, padding: "6px 14px", color: "#A0A0C0", cursor: "pointer", fontSize: 13 }}>← Back</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F0F0FF" }}>{selectedTopic} — {mode === "assessment" ? "Assessment" : "Practice"}</div>
            <div style={{ fontSize: 12, color: "#606080" }}>{mode === "assessment" ? "Mixed" : difficulty} · {language}</div>
          </div>
        </div>

        {/* Problem tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          {problems.map((p, i) => (
            <button key={i} onClick={() => setCurrentProblem(i)} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              border: currentProblem === i ? "none" : "1px solid #2A2A3E",
              background: currentProblem === i ? "#6C63FF" : results[i] ? (results[i].verdict === "Accepted" ? "#22C55E20" : "#EF444420") : "#13132B",
              color: currentProblem === i ? "#fff" : results[i] ? (results[i].verdict === "Accepted" ? "#22C55E" : "#EF4444") : "#A0A0C0",
              fontWeight: currentProblem === i ? 600 : 400,
            }}>
              Q{i + 1} {results[i] ? (results[i].verdict === "Accepted" ? "✓" : "✗") : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Main split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* LEFT — Problem */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "80vh", overflowY: "auto" }}>

          <div style={{ background: "#13132B", border: "1px solid #2A2A3E", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#F0F0FF" }}>{prob.title}</span>
              <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, fontWeight: 600,
                background: prob.difficulty === "Easy" ? "#22C55E20" : prob.difficulty === "Hard" ? "#EF444420" : "#F59E0B20",
                color: prob.difficulty === "Easy" ? "#22C55E" : prob.difficulty === "Hard" ? "#EF4444" : "#F59E0B" }}>
                {prob.difficulty}
              </span>
              <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: "#6C63FF20", color: "#A78BFA" }}>{prob.topic}</span>
            </div>
            <div style={{ fontSize: 13, color: "#A0A0C0", lineHeight: 1.8 }}>{prob.description}</div>
          </div>

          {(prob.input_format || prob.output_format) && (
            <div style={{ background: "#13132B", border: "1px solid #2A2A3E", borderRadius: 14, padding: 20 }}>
              {prob.input_format && <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#606080", marginBottom: 4 }}>INPUT FORMAT</div>
                <div style={{ fontSize: 13, color: "#A0A0C0", marginBottom: 12 }}>{prob.input_format}</div>
              </>}
              {prob.output_format && <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#606080", marginBottom: 4 }}>OUTPUT FORMAT</div>
                <div style={{ fontSize: 13, color: "#A0A0C0" }}>{prob.output_format}</div>
              </>}
            </div>
          )}

          {prob.examples?.length > 0 && (
            <div style={{ background: "#13132B", border: "1px solid #2A2A3E", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#606080", marginBottom: 12 }}>EXAMPLES</div>
              {prob.examples.map((ex, i) => (
                <div key={i} style={{ background: "#0D0D1A", borderRadius: 10, padding: 14, marginBottom: 10, fontSize: 12 }}>
                  <div style={{ color: "#606080", marginBottom: 6 }}>Example {i + 1}</div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ color: "#606080" }}>Input: </span>
                    <code style={{ color: "#A78BFA", background: "#6C63FF15", padding: "2px 6px", borderRadius: 4 }}>{ex.input}</code>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "#606080" }}>Output: </span>
                    <code style={{ color: "#22C55E", background: "#22C55E15", padding: "2px 6px", borderRadius: 4 }}>{ex.output}</code>
                  </div>
                  {ex.explanation && <div style={{ color: "#606080" }}>💡 {ex.explanation}</div>}
                </div>
              ))}
            </div>
          )}

          {prob.constraints?.length > 0 && (
            <div style={{ background: "#13132B", border: "1px solid #2A2A3E", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#606080", marginBottom: 10 }}>CONSTRAINTS</div>
              {prob.constraints.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: "#A0A0C0", marginBottom: 5 }}>• {c}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, background: "#6C63FF15", border: "1px solid #6C63FF30", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: "#606080", marginBottom: 3 }}>EXPECTED TIME</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#A78BFA" }}>{prob.time_complexity || "O(?)"}</div>
            </div>
            <div style={{ flex: 1, background: "#22C55E15", border: "1px solid #22C55E30", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: "#606080", marginBottom: 3 }}>EXPECTED SPACE</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#22C55E" }}>{prob.space_complexity || "O(?)"}</div>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div style={{ background: "#13132B", border: `1px solid ${verdictColor}40`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 28 }}>{result.verdict === "Accepted" ? "✅" : result.verdict === "Partial" ? "⚠️" : "❌"}</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: verdictColor }}>{result.score}%</div>
                  <div style={{ fontSize: 12, color: "#606080" }}>{result.verdict} · {result.passed}/{result.total} test cases</div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                {result.test_results?.map((t, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, marginBottom: 6, fontSize: 12, background: t.passed ? "#22C55E10" : "#EF444410", border: `1px solid ${t.passed ? "#22C55E30" : "#EF444430"}` }}>
                    <span style={{ color: "#A0A0C0" }}>Test {t.test}: <code style={{ color: "#A78BFA" }}>{t.input}</code></span>
                    <span style={{ color: t.passed ? "#22C55E" : "#EF4444", fontWeight: 600 }}>{t.passed ? "✓ Pass" : `✗ Got: ${t.got}`}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, background: "#0D0D1A", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#606080" }}>Your Time</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#A0A0C0" }}>{result.time_complexity}</div>
                </div>
                <div style={{ flex: 1, background: "#0D0D1A", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#606080" }}>Your Space</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#A0A0C0" }}>{result.space_complexity}</div>
                </div>
              </div>

              {result.feedback && (
                <div style={{ background: "#0D0D1A", borderRadius: 8, padding: 12, fontSize: 12, color: "#A0A0C0", marginBottom: 10 }}>
                  💬 {result.feedback}
                </div>
              )}
              {result.optimized_hint && (
                <div style={{ background: "#F59E0B10", border: "1px solid #F59E0B30", borderRadius: 8, padding: 12, fontSize: 12, color: "#F59E0B" }}>
                  ⚡ {result.optimized_hint}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ display: "flex", gap: 6 }}>
            {LANGUAGES.map(lang => (
              <button key={lang} onClick={() => switchLanguage(lang)} style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                border: language === lang ? "none" : "1px solid #2A2A3E",
                background: language === lang ? "#6C63FF" : "#13132B",
                color: language === lang ? "#fff" : "#A0A0C0",
                fontWeight: language === lang ? 600 : 400,
              }}>{lang}</button>
            ))}
          </div>

          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #2A2A3E", flex: 1 }}>
            <CodeMirror
              value={currentCode}
              height="420px"
              theme={oneDark}
              extensions={getLangExtension(language)}
              onChange={(val) => setCurrentCode(val)}
              style={{ fontSize: 14 }}
            />
          </div>

          {hint && (
            <div style={{ background: "#F59E0B10", border: "1px solid #F59E0B30", borderRadius: 12, padding: 14, fontSize: 13, color: "#F59E0B", lineHeight: 1.6 }}>
              💡 {hint}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleHint} disabled={loadingHint}
              style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid #2A2A3E", background: "#13132B", color: "#A0A0C0", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
              {loadingHint ? "Loading…" : "💡 Hint"}
            </button>
            <button onClick={handleEvaluate} disabled={evaluating}
              style={{ flex: 2, padding: "12px 0", borderRadius: 10, border: "none", background: evaluating ? "#2A2A3E" : "#6C63FF", color: evaluating ? "#606080" : "#fff", fontSize: 13, fontWeight: 700, cursor: evaluating ? "not-allowed" : "pointer" }}>
              {evaluating ? "Evaluating…" : "Submit →"}
            </button>
          </div>

          {problems.length > 1 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setCurrentProblem(Math.max(0, currentProblem - 1))} disabled={currentProblem === 0}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #2A2A3E", background: "transparent", color: "#A0A0C0", fontSize: 13, cursor: currentProblem === 0 ? "not-allowed" : "pointer" }}>
                ← Prev Problem
              </button>
              <button onClick={() => setCurrentProblem(Math.min(problems.length - 1, currentProblem + 1))} disabled={currentProblem === problems.length - 1}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #2A2A3E", background: "transparent", color: "#A0A0C0", fontSize: 13, cursor: currentProblem === problems.length - 1 ? "not-allowed" : "pointer" }}>
                Next Problem →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}