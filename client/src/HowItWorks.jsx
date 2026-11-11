import { useState, useEffect } from "react";

const AI_LAYERS = [
  { label: "Frontend", sub: "React.js", icon: "🖥️", color: "#6C63FF" },
  { label: "Backend", sub: "Node.js + Express", icon: "⚙️", color: "#F59E0B" },
  { label: "AI Model", sub: "Language Model", icon: "🤖", color: "#A855F7" },
];

const PROMPT_CONCEPT = {
  title: "What is Prompt Engineering?",
  intro: "Prompt Engineering is the technique of designing structured instructions to guide an AI model to produce the desired output. Instead of training a new model, we write carefully crafted prompts that tell the AI:",
  points: [
    ["What role to play", ' — "You are an ATS evaluator"'],
    ["What to do", ' — "Analyze this resume"'],
    ["What rules to follow", ' — "Score below 60 = rejected"'],
    ["What format to return", ' — "Respond ONLY in JSON"'],
  ],
  showAIArchitecture: true,
};

const modules = {
  Resume: {
    title: "Resume Analyzer",
    icon: "📄",
    color: "#6C63FF",
    algorithm: "Prompt Engineering with pre-trained Large Language Model (LLM)",
    description: "The text of the resume PDF is extracted in the browser using PDF.js and sent to an AI model with a structured prompt. The AI acts as an ATS evaluator and returns a score with detailed feedback.",
    steps: [
      "User uploads a text-based resume PDF (max 2 MB)",
      "PDF.js extracts the text in the browser — scanned or non-resume PDFs are rejected with a clear message",
      "The extracted text is sent to the Node.js backend via an API call",
      "Backend sends a structured prompt + resume text to the AI model",
      "AI model analyzes skills, formatting, completeness and relevance",
      "Returns ATS score (0-100), skills found, strengths, weaknesses and tips — the backend marks a score of 60 or more as 'selected'",
      "Frontend displays the result and the attempt is saved to the database"
    ],
    tech: ["React.js", "PDF.js (pdfjs-dist)", "Node.js + Express", "AI Language Model", "Firebase Firestore"],
    viva: [
      { q: "What algorithm is used for resume analysis?", a: "Prompt Engineering with a pre-trained LLM. We design structured prompts that instruct the AI to act as an ATS evaluator." },
      { q: "What is ATS?", a: "Applicant Tracking System — a software used by recruiters to automatically screen resumes based on keywords, skills and formatting." },
      { q: "How do you read the text from a PDF?", a: "Using PDF.js (pdfjs-dist) in the browser. It reads every page of the PDF and joins the text. If almost no text is found, the file is probably a scanned image and we ask for a text-based PDF." },
      { q: "How is the score calculated?", a: "The AI model evaluates the resume on parameters like skills relevance, completeness, formatting and experience, then returns a score from 0 to 100. Our backend then applies a fixed rule: 60 or above is 'selected', below 60 is 'rejected'." },
      { q: "Where are prompts written?", a: "In the backend route file — server/routes/resume.js. The prompt instructs the AI on what to evaluate and what JSON format to return." },
    ],
    flow: [
      { label: "Upload Resume", icon: "📤", color: "#6C63FF" },
      { label: "Extract Text (PDF.js)", icon: "📝", color: "#06B6D4" },
      { label: "Send to Backend", icon: "⚙️", color: "#F59E0B" },
      { label: "AI Model", icon: "🤖", color: "#A855F7" },
      { label: "ATS Score + Feedback", icon: "📊", color: "#22C55E" },
    ],
    concept: PROMPT_CONCEPT,
  },
  Aptitude: {
    title: "Aptitude Round",
    icon: "🧠",
    color: "#06B6D4",
    algorithm: "Prompt Engineering with LLM for question generation + Percentage-based scoring",
    description: "The AI model generates placement-level MCQs based on the selected topic and difficulty. Answers are evaluated using a simple correct/total percentage calculation.",
    steps: [
      "User selects the mode (Full Test or Practice), topic and difficulty",
      "Frontend sends topic + difficulty to the backend",
      "Backend sends a structured prompt asking the AI to generate the questions — Full Test makes 3 parallel requests of 10 (Quantitative, Verbal, Logical)",
      "AI returns questions with options, correct answer and explanation",
      "User answers the questions — the Full Test has a 30-minute countdown and auto-submits at zero",
      "Score is calculated as (correct answers / total) × 100",
      "Results with explanations are saved to the database and displayed"
    ],
    tech: ["React.js", "Node.js + Express", "AI Language Model", "Firebase Firestore", "Timer (setInterval)"],
    viva: [
      { q: "How are questions generated?", a: "Using Prompt Engineering — we send a structured prompt to an AI model specifying topic, difficulty and count. The AI returns questions in JSON format." },
      { q: "How is scoring done?", a: "Simple percentage calculation — (number of correct answers / total questions) × 100. Pass mark is 60%." },
      { q: "Why is the Full Test generated in three parts?", a: "Generating 30 questions in one request is slow and can get cut off. Three smaller requests (10 each for Quantitative, Verbal and Logical) run in parallel, which is faster and more reliable." },
      { q: "Are questions the same every time?", a: "No — the AI generates fresh questions every attempt, so students cannot memorize answers. This makes it more realistic." },
      { q: "What is Prompt Engineering?", a: "It is the technique of designing structured input instructions to guide an AI model to produce the desired output — like writing a detailed brief for the AI." },
    ],
    flow: [
      { label: "Select Topic", icon: "🎯", color: "#6C63FF" },
      { label: "Backend Request", icon: "⚙️", color: "#F59E0B" },
      { label: "AI Generates MCQs", icon: "🤖", color: "#A855F7" },
      { label: "User Answers", icon: "✍️", color: "#06B6D4" },
      { label: "Score + Review", icon: "📊", color: "#22C55E" },
    ],
    concept: PROMPT_CONCEPT,
  },
  Coding: {
    title: "Coding Round",
    icon: "💻",
    color: "#F59E0B",
    algorithm: "Prompt Engineering with LLM for problem generation + AI-based Code Review",
    description: "The AI generates placement-level coding problems. When the user submits code, the AI reviews the logic, approach and test cases — similar to how a human evaluator would review code.",
    steps: [
      "User selects topic, difficulty and language (Assessment mode gives 1 Easy + 2 Medium + 1 Hard)",
      "Backend sends a prompt to the AI to generate coding problems with examples and test cases",
      "User writes the solution in the code editor (with syntax highlighting)",
      "On submit, the code is sent to the backend along with the problem details",
      "AI model reviews the code — checks logic, approach and each test case",
      "Backend counts the passed test cases to compute the score and verdict (Accepted / Partial / Wrong Answer)",
      "Result is saved to the database and displayed with complexity analysis and feedback"
    ],
    tech: ["React.js", "CodeMirror (syntax highlighting)", "Node.js + Express", "AI Language Model", "Firebase Firestore"],
    viva: [
      { q: "Does the code actually execute?", a: "No — we use AI-based code review. The AI model analyzes the logic and approach rather than running the code in a sandbox. This is similar to how a human reviewer evaluates code." },
      { q: "What is the algorithm used?", a: "Prompt Engineering with LLM for both problem generation and code evaluation. The AI acts as an expert code reviewer." },
      { q: "How is the score calculated?", a: "The AI reports pass/fail for each test case. Our backend then counts them: score = (passed / total) × 100. All passed = Accepted, some = Partial, none = Wrong Answer. We calculate this in code instead of trusting the AI's arithmetic." },
      { q: "How is syntax highlighting implemented?", a: "Using the CodeMirror library — it supports Python, Java, C++ and JavaScript with proper keyword coloring and formatting." },
      { q: "How are test cases evaluated?", a: "The AI is given the problem, test cases and the student's code. It simulates the expected output and checks if the code logic would produce the correct result." },
    ],
    flow: [
      { label: "Select Topic", icon: "🎯", color: "#6C63FF" },
      { label: "AI Generates Problem", icon: "🤖", color: "#A855F7" },
      { label: "User Writes Code", icon: "✍️", color: "#06B6D4" },
      { label: "AI Reviews Code", icon: "🔍", color: "#F59E0B" },
      { label: "Score + Feedback", icon: "📊", color: "#22C55E" },
    ],
    concept: PROMPT_CONCEPT,
  },
  Interview: {
    title: "AI Mock Interview",
    icon: "🎥",
    color: "#A855F7",
    algorithm: "Prompt Engineering with LLM + Speech Recognition (STT) + Text-to-Speech + AI Avatar",
    description: "The AI generates role-specific interview questions. An AI avatar asks them, the user speaks the answers (converted to text by the Web Speech API), and the AI evaluates each answer with live feedback and a final report.",
    steps: [
      "User selects the job role, AI interviewer avatar and screen layout",
      "Backend generates 7 HR + Technical questions using the AI",
      "The AI interviewer asks each question — a talking avatar video (D-ID) is used, with the browser's Text-to-Speech as a fallback",
      "User speaks the answer — the Web Speech API converts it to text (Speech Recognition)",
      "After each answer, the AI gives instant spoken feedback (Good / Average / Poor); each question has a 60-second timer",
      "After all 7 questions, the AI generates a final detailed report",
      "Report includes overall score, strengths, weaknesses, suggestions and per-question ratings — a score above 65 counts as selected"
    ],
    tech: ["React.js", "Web Speech API (Speech-to-Text)", "Speech Synthesis API (Text-to-Speech)", "D-ID (talking avatar)", "Node.js + Express", "AI Language Model", "Firebase Firestore"],
    viva: [
      { q: "How does the AI understand what we speak?", a: "Using the Web Speech API built into the browser — it converts spoken words to text in real-time. This is called Speech-to-Text or STT." },
      { q: "How does the AI interviewer speak the questions?", a: "A talking avatar video is generated with the D-ID service. If it is unavailable, the browser's Speech Synthesis API (Text-to-Speech) reads the question aloud instead, so the interview never stops." },
      { q: "What algorithm evaluates the interview answers?", a: "Prompt Engineering with LLM — we send the question and the user's transcribed answer to the AI with a prompt asking it to evaluate communication, relevance and depth." },
      { q: "How is the final score calculated?", a: "The AI evaluates all 7 answers together and returns an overall score from 0-100, along with strengths, weaknesses and improvement suggestions. Our backend decides the result: above 65 is 'selected'." },
      { q: "Why do API calls go through your backend?", a: "So API keys stay on the server and are never exposed in the browser, and so we can validate and clean the AI's response before showing it." },
    ],
    flow: [
      { label: "Select Role", icon: "🎯", color: "#6C63FF" },
      { label: "AI Generates Questions", icon: "🤖", color: "#A855F7" },
      { label: "User Speaks Answer", icon: "🎤", color: "#06B6D4" },
      { label: "Speech → Text", icon: "📝", color: "#F59E0B" },
      { label: "AI Evaluates", icon: "🔍", color: "#EF4444" },
      { label: "Final Report", icon: "📊", color: "#22C55E" },
    ],
    concept: PROMPT_CONCEPT,
  },
  Progress: {
    title: "Progress Tracker",
    icon: "📊",
    color: "#22C55E",
    algorithm: "Real-time Data Aggregation + Statistical Analysis + SVG Chart Visualization",
    description: "Every attempt result is stored in the database. The progress page listens to this data in real time, calculates averages, streaks and trends, and displays them as charts and insights.",
    steps: [
      "Every module (Resume, Aptitude, Coding, Interview) saves its score, result and date to Firebase Firestore",
      "The Progress page subscribes to the user's attempts in real time, so new attempts appear instantly without refreshing",
      "Attempts are sorted by date and can be filtered by module and by time range (7 days, 30 days, all time)",
      "Statistics are calculated — average, best score, pass rate, improvement versus earlier attempts and the daily streak",
      "A trend chart (line + area) and a last-7-days activity chart are drawn using SVG",
      "Topic insights group attempts by topic to highlight weak (below 60%) and strong (75% and above) areas"
    ],
    tech: ["React.js", "Custom SVG charts", "Firebase Firestore (real-time listener)", "Data Aggregation"],
    layers: [
      { label: "Frontend", sub: "React.js + SVG charts", icon: "🖥️", color: "#6C63FF" },
      { label: "Database", sub: "Firestore (live updates)", icon: "💾", color: "#F59E0B" },
      { label: "Analytics", sub: "JavaScript aggregation", icon: "🔢", color: "#22C55E" },
    ],
    viva: [
      { q: "How is progress data stored?", a: "Every time a user completes a module, the result (score, result, date, module type) is saved to Firebase Firestore under that user's attempts collection." },
      { q: "What algorithm is used for progress tracking?", a: "Data aggregation — we fetch all attempt records, group them by module type and topic, and calculate averages, pass rates and trends using JavaScript array methods." },
      { q: "Which library draws the charts?", a: "No external chart library. The charts are drawn directly with SVG elements inside React, which keeps the app lighter and gives full control over the design." },
      { q: "How does the page update without refreshing?", a: "It uses a Firestore real-time listener (onSnapshot). Whenever a new attempt is saved, the listener fires and the page recalculates everything automatically." },
      { q: "How is the average calculated?", a: "Sum of all scores divided by the number of attempts. For example, if aptitude scores are 60, 70, 80 — average is (60+70+80)/3 = 70." },
      { q: "How is the day streak calculated?", a: "We collect the distinct days on which the user made at least one attempt, then count how many consecutive days end today (or yesterday)." },
    ],
    flow: [
      { label: "Complete Module", icon: "✅", color: "#6C63FF" },
      { label: "Save to Database", icon: "💾", color: "#F59E0B" },
      { label: "Live Listener", icon: "📡", color: "#06B6D4" },
      { label: "Calculate Stats", icon: "🔢", color: "#A855F7" },
      { label: "Display Charts", icon: "📊", color: "#22C55E" },
    ],
    concept: {
      title: "What is Data Aggregation?",
      intro: "Data aggregation means combining many individual records into summary values that are easier to understand. For Progress we do this with plain JavaScript:",
      points: [
        ["Grouping", " — attempts are grouped by module and by topic"],
        ["Averages and best scores", " — sum of scores ÷ number of attempts, and the maximum score"],
        ["Rates", " — pass rate = passed attempts ÷ total attempts × 100"],
        ["Trends", " — comparing the latest attempts with the ones before them to show improvement"],
      ],
      showAIArchitecture: false,
    },
  },
};

const FlowDiagram = ({ flow }) => (
  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, margin: "16px 0" }}>
    {flow.map((step, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          background: `${step.color}15`, border: `1px solid ${step.color}40`,
          borderRadius: 12, padding: "10px 16px", textAlign: "center", minWidth: 100,
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>{step.icon}</div>
          <div style={{ fontSize: 11, color: "#F0F0FF", fontWeight: 500, lineHeight: 1.3 }}>{step.label}</div>
        </div>
        {i < flow.length - 1 && (
          <div style={{ fontSize: 16, color: "#606080", flexShrink: 0 }}>→</div>
        )}
      </div>
    ))}
  </div>
);

export default function HowItWorks({ module }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("flow");

  // Esc closes the modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const data = modules[module];
  if (!data) return null;

  const layers = data.layers || AI_LAYERS;
  const concept = data.concept;

  const tabs = [
    { id: "flow", label: "Flow", icon: "🔄" },
    { id: "algorithm", label: "Algorithm", icon: "⚙️" },
    { id: "steps", label: "Steps", icon: "📋" },
    { id: "tech", label: "Tech", icon: "🛠️" },
    { id: "viva", label: "Viva Q&A", icon: "❓" },
  ];

  return (
    <>
      {/* Trigger button */}
      <button onClick={() => { setActiveTab("flow"); setOpen(true); }} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 99, fontSize: 12, fontWeight: 600,
        border: `1px solid ${data.color}40`, background: `${data.color}10`,
        color: data.color, cursor: "pointer", transition: "all 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = `${data.color}20`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${data.color}10`; }}
      >
        💡 How it Works
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20, backdropFilter: "blur(4px)",
        }} onClick={() => setOpen(false)}>

          <div onClick={e => e.stopPropagation()} style={{
            background: "#13132B", border: `1px solid ${data.color}40`,
            borderRadius: 20, width: "100%", maxWidth: 780,
            maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column",
          }}>

            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #2A2A3E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${data.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {data.icon}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#F0F0FF" }}>How it Works</div>
                  <div style={{ fontSize: 13, color: data.color }}>{data.title}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "#2A2A3E", border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", color: "#A0A0C0", fontSize: 16 }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, padding: "12px 24px", borderBottom: "1px solid #2A2A3E", overflowX: "auto" }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  padding: "7px 16px", borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                  border: activeTab === tab.id ? "none" : "1px solid #2A2A3E",
                  background: activeTab === tab.id ? data.color : "transparent",
                  color: activeTab === tab.id ? "#fff" : "#A0A0C0",
                }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>

              <div style={{ background: `${data.color}10`, border: `1px solid ${data.color}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#A0A0C0", lineHeight: 1.7 }}>
                {data.description}
              </div>

              {/* Flow tab */}
              {activeTab === "flow" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F0FF", marginBottom: 4 }}>Data Flow Diagram</div>
                  <div style={{ fontSize: 12, color: "#606080", marginBottom: 16 }}>How data moves through the system</div>

                  <div style={{ background: "#0D0D1A", borderRadius: 14, padding: 24, marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: "#606080", marginBottom: 16, textAlign: "center" }}>SYSTEM FLOW</div>
                    <FlowDiagram flow={data.flow} />

                    <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      {layers.map(layer => (
                        <div key={layer.label} style={{ background: `${layer.color}10`, border: `1px solid ${layer.color}30`, borderRadius: 10, padding: "12px", textAlign: "center" }}>
                          <div style={{ fontSize: 22, marginBottom: 6 }}>{layer.icon}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#F0F0FF" }}>{layer.label}</div>
                          <div style={{ fontSize: 11, color: "#606080", marginTop: 2 }}>{layer.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Algorithm tab */}
              {activeTab === "algorithm" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F0FF", marginBottom: 16 }}>Algorithm Used</div>
                  <div style={{ background: `${data.color}10`, border: `1px solid ${data.color}30`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: data.color, marginBottom: 8 }}>⚙️ {data.algorithm}</div>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F0FF", marginBottom: 12 }}>{concept.title}</div>
                  <div style={{ background: "#0D0D1A", borderRadius: 12, padding: 20, fontSize: 13, color: "#A0A0C0", lineHeight: 1.8 }}>
                    {concept.intro}
                    <br /><br />
                    {concept.points.map(([bold, rest], i) => (
                      <div key={i}>• <span style={{ color: "#F0F0FF" }}>{bold}</span>{rest}</div>
                    ))}
                  </div>

                  {concept.showAIArchitecture && (
                    <div style={{ marginTop: 16, background: "#0D0D1A", borderRadius: 12, padding: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#F0F0FF", marginBottom: 10 }}>Underlying AI Architecture</div>
                      <div style={{ fontSize: 13, color: "#A0A0C0", lineHeight: 1.8 }}>
                        The AI models we use are based on <span style={{ color: "#A78BFA" }}>Transformer architecture</span> with <span style={{ color: "#A78BFA" }}>Self-Attention mechanism</span>. We use them as pre-trained black-box models via API — we did not train the model from scratch.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Steps tab */}
              {activeTab === "steps" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F0FF", marginBottom: 16 }}>Step by Step Process</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.steps.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#0D0D1A", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${data.color}20`, color: data.color, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div style={{ fontSize: 13, color: "#A0A0C0", lineHeight: 1.6, paddingTop: 4 }}>{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tech tab */}
              {activeTab === "tech" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F0FF", marginBottom: 16 }}>Technologies Used</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {data.tech.map((t, i) => (
                      <div key={i} style={{ background: "#0D0D1A", border: `1px solid ${data.color}30`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#F0F0FF", fontWeight: 500 }}>
                        {t}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 24, background: "#0D0D1A", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#F0F0FF", marginBottom: 14 }}>Overall Tech Stack</div>
                    {[
                      { layer: "Frontend", tech: "React.js (Vite), JavaScript, HTML, CSS", color: "#6C63FF" },
                      { layer: "Backend", tech: "Node.js, Express.js, REST API", color: "#F59E0B" },
                      { layer: "Database", tech: "Firebase Firestore + Firebase Storage", color: "#EF4444" },
                      { layer: "Auth", tech: "Firebase Authentication (Email + Google)", color: "#06B6D4" },
                      { layer: "AI", tech: "Pre-trained LLM via API (Prompt Engineering)", color: "#A855F7" },
                    ].map(row => (
                      <div key={row.layer} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #2A2A3E" }}>
                        <div style={{ width: 80, fontSize: 12, fontWeight: 600, color: row.color, flexShrink: 0 }}>{row.layer}</div>
                        <div style={{ fontSize: 12, color: "#A0A0C0" }}>{row.tech}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Viva Q&A tab */}
              {activeTab === "viva" && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#F0F0FF", marginBottom: 16 }}>Expected Viva Questions & Answers</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {data.viva.map((item, i) => (
                      <div key={i} style={{ background: "#0D0D1A", borderRadius: 12, padding: 18 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: data.color, marginBottom: 8 }}>Q: {item.q}</div>
                        <div style={{ fontSize: 13, color: "#A0A0C0", lineHeight: 1.7 }}>A: {item.a}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}