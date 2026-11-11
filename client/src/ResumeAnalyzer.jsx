import { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { analyzeResume } from "./api";
import LoadingTimer from "./LoadingTimer";
import HowItWorks from "./HowItWorks";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MAX_FILE_SIZE_MB = 2;
const RESUME_KEYWORDS = [
  "education", "skills", "experience", "project", "internship", "objective",
  "summary", "certification", "b.e", "b.tech", "bachelor", "@",
];

// Cheap sanity check so random PDFs (notes, assignments) are rejected
const looksLikeResume = (text) => {
  const t = text.toLowerCase();
  return RESUME_KEYWORDS.filter((k) => t.includes(k)).length >= 2;
};

export default function ResumeAnalyzer({ user }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (f) => {
    if (!f) return "Please select a file.";
    if (f.type !== "application/pdf") return "Only PDF files are accepted.";
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
      return `File too large. Max size is ${MAX_FILE_SIZE_MB}MB. Compress your resume and try again.`;
    return null;
  };

  const extractText = async (f) => {
    const arrayBuffer = await f.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return text;
  };

  const handleFile = (f) => {
    const err = validateFile(f);
    if (err) { setError(err); return; }
    setFile(f);
    setError("");
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!file) { setError("Please upload your resume first."); return; }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // 1. Read the real text out of the PDF (previously only the filename was sent)
      const text = (await extractText(file)).replace(/\s+/g, " ").trim();
      if (text.length < 150)
        throw new Error("Couldn't read text from this PDF. It may be a scanned image — upload a text-based PDF.");
      if (!looksLikeResume(text))
        throw new Error("This doesn't look like a resume. Upload your actual resume (education, skills, experience).");

      // 2. Analyze
      const parsed = await analyzeResume(text);
      setResult(parsed);

      // 3. Save attempt — a Firestore failure must not hide a successful analysis
      try {
        await addDoc(collection(db, "users", user.uid, "attempts"), {
          type: "resume", score: parsed.ats_score,
          result: parsed.decision, date: serverTimestamp(),
        });
      } catch (e) {
        console.warn("Could not save attempt:", e);
      }
    } catch (err) {
      setError(err.message || "Analysis failed. Try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ width: "100%", fontFamily: "Inter, sans-serif", paddingBottom: 40 }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .drop-zone{border:2px dashed rgba(124,111,255,0.3);border-radius:16px;padding:48px 24px;text-align:center;cursor:pointer;transition:all 0.2s;background:rgba(124,111,255,0.04)}
        .drop-zone:hover,.drop-zone.over{border-color:#7C6FFF;background:rgba(124,111,255,0.09)}
        .drop-zone.has-file{border-color:rgba(124,111,255,0.5);background:rgba(124,111,255,0.08)}
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Resume Analyzer</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Upload your resume and get an instant ATS score + feedback</div>
        </div>
        <HowItWorks module="Resume" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* LEFT: Upload panel */}
        <div style={{ animation: "fadeUp 0.4s ease 0.1s both" }}>
          <div
            className={`drop-zone${dragOver ? " over" : ""}${file ? " has-file" : ""}`}
            onClick={() => document.getElementById("resume-input").click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}>
            <input id="resume-input" type="file" accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }} />
            {file ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#A78BFA", marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to change
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⬆️</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Drop your resume here</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>or click to browse files</div>
                <div style={{ display: "inline-flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                  <span>📎 PDF only</span>
                  <span>📏 Max {MAX_FILE_SIZE_MB}MB</span>
                  <span>🔒 Resume files only</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", fontSize: 13, color: "#F87171", lineHeight: 1.5 }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleAnalyze} disabled={loading || !file}
            style={{ width: "100%", marginTop: 14, padding: "13px 0", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600, cursor: loading || !file ? "not-allowed" : "pointer", fontFamily: "inherit", background: loading || !file ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#7C6FFF,#A855F7)", color: loading || !file ? "rgba(255,255,255,0.2)" : "#fff" }}>
            {loading ? "Analyzing…" : "Analyze Resume →"}
          </button>

          {/* Tips */}
          <div style={{ marginTop: 20, padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 10, letterSpacing: "0.06em" }}>TIPS FOR BEST RESULTS</div>
            {[
              "Upload your actual resume — not notes or assignments",
              "Use a text-based PDF, not a scanned image",
              "Include name, education, skills, and experience sections",
              "Keep it 1-2 pages for placement roles",
            ].map((tip, i) => (
              <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 6, display: "flex", gap: 8 }}>
                <span style={{ color: "#7C6FFF" }}>→</span>{tip}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Result or timer */}
        <div style={{ animation: "fadeUp 0.4s ease 0.15s both" }}>

          {loading && (
            <LoadingTimer
              message="Analyzing your resume"
              submessage="Checking ATS compatibility, extracting skills, evaluating formatting and content quality"
              icon="📄"
            />
          )}

          {!result && !loading && (
            <div style={{ padding: "48px 24px", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.08)", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📊</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)", lineHeight: 1.6 }}>
                Your ATS score, skills,<br />strengths and tips will<br />appear here after analysis
              </div>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Score */}
              <div style={{ borderRadius: 14, padding: "24px 20px", background: result.decision === "selected" ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", border: `2px solid ${result.decision === "selected" ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`, display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 44, fontWeight: 800, color: result.ats_score >= 70 ? "#34D399" : result.ats_score >= 50 ? "#F59E0B" : "#F87171", letterSpacing: "-0.03em" }}>{result.ats_score}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>ATS Score</div>
                </div>
                <div>
                  <span style={{ display: "inline-block", fontSize: 13, fontWeight: 600, padding: "4px 14px", borderRadius: 99, background: result.decision === "selected" ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)", color: result.decision === "selected" ? "#34D399" : "#F87171", border: `1px solid ${result.decision === "selected" ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}` }}>
                    {result.decision === "selected" ? "✅ Selected" : "❌ Rejected"}
                  </span>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8, lineHeight: 1.5 }}>
                    {result.decision === "selected" ? "Your resume passed the ATS filter!" : "Your resume needs improvement before applying."}
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 10, letterSpacing: "0.06em" }}>🔍 SKILLS FOUND</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.skills_found?.map((s, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(124,111,255,0.15)", color: "#A78BFA", border: "1px solid rgba(124,111,255,0.2)" }}>{s}</span>
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#34D399", marginBottom: 8 }}>💪 STRENGTHS</div>
                  {result.strengths?.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5, display: "flex", gap: 6 }}><span style={{ color: "#34D399" }}>✓</span>{s}</div>
                  ))}
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#F87171", marginBottom: 8 }}>⚠️ WEAKNESSES</div>
                  {result.weaknesses?.map((w, i) => (
                    <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5, display: "flex", gap: 6 }}><span style={{ color: "#F87171" }}>✗</span>{w}</div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B", marginBottom: 10, letterSpacing: "0.06em" }}>💡 IMPROVEMENT TIPS</div>
                {result.tips?.map((t, i) => (
                  <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 7, lineHeight: 1.5, display: "flex", gap: 8 }}>
                    <span style={{ color: "#F59E0B", flexShrink: 0 }}>{i + 1}.</span>{t}
                  </div>
                ))}
              </div>

              <button onClick={() => { setFile(null); setResult(null); setError(""); }}
                style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Analyze Another Resume
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}