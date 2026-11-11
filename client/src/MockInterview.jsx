import { useState, useEffect, useRef } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { generateInterviewQuestions, getLiveFeedback, getFinalFeedback } from "./api";

const DID_KEY = import.meta.env.VITE_DID_KEY;

const JOB_ROLES = [
  "Software Engineer", "Data Analyst", "Java Developer",
  "Frontend Developer", "Data Scientist", "Backend Developer",
  "Full Stack Developer", "DevOps Engineer", "ML Engineer",
  "Android Developer", "iOS Developer", "Cloud Engineer",
  "Cybersecurity Analyst", "Database Administrator", "QA Engineer"
];

const TOTAL_QUESTIONS = 7;
const TIME_PER_QUESTION = 60;

const AVATARS = [
  {
    id: "male1", label: "Arjun", role: "Senior Engineer", gender: "male",
    source_url: "https://clips-presenters.d-id.com/daniel/image.png",
    voice_id: "en-US-GuyNeural",
    fallback_pitch: 0.85, fallback_rate: 0.9,
    emoji: "👨‍💼",
  },
  {
    id: "male2", label: "David", role: "HR Manager", gender: "male",
    source_url: "https://clips-presenters.d-id.com/alex/image.png",
    voice_id: "en-US-ChristopherNeural",
    fallback_pitch: 1.0, fallback_rate: 0.95,
    emoji: "👨‍💻",
  },
  {
    id: "female1", label: "Priya", role: "Tech Lead", gender: "female",
    source_url: "https://clips-presenters.d-id.com/amy/image.png",
    voice_id: "en-US-JennyNeural",
    fallback_pitch: 1.15, fallback_rate: 0.9,
    emoji: "👩‍💼",
  },
  {
    id: "female2", label: "Sarah", role: "Recruiting Manager", gender: "female",
    source_url: "https://clips-presenters.d-id.com/anna/image.png",
    voice_id: "en-US-AriaNeural",
    fallback_pitch: 1.05, fallback_rate: 0.93,
    emoji: "👩‍💻",
  },
];

const LAYOUTS = [
  { id: "ai-focus",   label: "AI Focus",   desc: "AI full screen · you at bottom", icon: "🤖" },
  { id: "split",      label: "Split View", desc: "Both equally sharing screen",    icon: "⚡" },
  { id: "user-focus", label: "Your View",  desc: "You full screen · AI at bottom", icon: "📹" },
];

export default function MockInterview({ user, skills = [], name = "", targetRole = "" }) {
  const [stage, setStage]             = useState("setup");
  const [jobRole, setJobRole]         = useState(targetRole || "");
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [layout, setLayout]           = useState("split");
  const [questions, setQuestions]     = useState([]);
  const [currentQ, setCurrentQ]       = useState(0);
  const [answers, setAnswers]         = useState([]);
  const [transcript, setTranscript]   = useState("");
  const [isListening, setIsListening] = useState(false);
  const [avatarState, setAvatarState] = useState("idle");
  const [timer, setTimer]             = useState(TIME_PER_QUESTION);
  const [loading, setLoading]         = useState(false);
  const [loadingMsg, setLoadingMsg]   = useState("");
  const [feedback, setFeedback]       = useState(null);
  const [feedbackError, setFeedbackError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(null);
  const [avatarLoading, setAvatarLoading]   = useState(false);
  const [liveQFeedback, setLiveQFeedback]   = useState(null);
  const [showLiveFeedback, setShowLiveFeedback] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState({});

  const videoRef          = useRef(null);
  const avatarVideoRef    = useRef(null);
  const streamRef         = useRef(null);
  const recognitionRef    = useRef(null);
  const timerRef          = useRef(null);
  const currentQRef       = useRef(0);
  const questionsRef      = useRef([]);
  const answersRef        = useRef([]);
  const transcriptRef     = useRef("");
  const isListeningRef    = useRef(false);
  const handleNextRef     = useRef(null);   // always points at the latest handleNext
  const processingRef     = useRef(false);  // blocks double "Next" clicks / timer + click races
  const avatarResolveRef  = useRef(null);   // resolves the promise of the current avatar utterance
  const lastSpeechRef     = useRef(null);   // text+avatar of current utterance (for fallback voice)

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { currentQRef.current = currentQ; }, [currentQ]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // ── Camera ──────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setCameraError("");
      return true;
    } catch {
      setCameraError("Camera/mic access denied. Please allow and try again.");
      return false;
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // Safety net: re-attach the camera stream if the <video> element was recreated
  useEffect(() => {
    if (stage !== "interview") return;
    const interval = setInterval(() => {
      if (streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }, 500);
    return () => clearInterval(interval);
  }, [stage, layout]);

  // ── Avatar speech ────────────────────────────────────────────────────────
  // Called when an utterance ends (video ended OR browser voice ended)
  const finishAvatar = () => {
    setAvatarState("listening");
    const r = avatarResolveRef.current;
    avatarResolveRef.current = null;
    if (r) r();
  };

  // Browser text-to-speech fallback (used when D-ID is unavailable)
  const fallbackSpeak = (text, avatar, onDone) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    setAvatarState("talking");

    const speak = () => {
      const utter = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const isFemale = avatar?.gender === "female";

      const femaleVoices = voices.filter(v =>
        /female|zira|jenny|aria|samantha|susan|victoria|karen|moira|fiona/i.test(v.name) ||
        v.name.includes("Google UK English Female") ||
        v.name.includes("Microsoft Zira")
      );
      const maleVoices = voices.filter(v =>
        v.name.includes("Google UK English Male") ||
        v.name.includes("Microsoft David") ||
        v.name.includes("Microsoft Mark") ||
        /\bmale\b|david|guy|mark|christopher|daniel|oliver/i.test(v.name)
      );

      if (isFemale && femaleVoices.length > 0) {
        utter.voice = femaleVoices[avatar.id === "female1" ? 0 : Math.min(1, femaleVoices.length - 1)];
      } else if (!isFemale && maleVoices.length > 0) {
        utter.voice = maleVoices[avatar.id === "male1" ? 0 : Math.min(1, maleVoices.length - 1)];
      }

      utter.pitch = avatar?.fallback_pitch || 1.0;
      utter.rate  = avatar?.fallback_rate  || 0.92;
      utter.onend   = () => { if (onDone) onDone(); };
      utter.onerror = () => { if (onDone) onDone(); };
      synth.speak(utter);
    };

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = () => { synth.onvoiceschanged = null; speak(); };
      // Some browsers never fire voiceschanged — don't hang forever
      setTimeout(() => { if (synth.onvoiceschanged) { synth.onvoiceschanged = null; speak(); } }, 1000);
    } else {
      speak();
    }
  };

  // D-ID lip-sync video; falls back to browser voice on ANY problem
  const generateAvatarVideo = (text, avatar) => new Promise(async (resolve) => {
    avatarResolveRef.current = resolve;
    lastSpeechRef.current = { text, avatar };
    setAvatarLoading(true);
    setAvatarVideoUrl(null);
    setAvatarState("thinking");
    try {
      if (!DID_KEY) throw new Error("VITE_DID_KEY not set");

      const createRes = await fetch("https://api.d-id.com/talks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Basic ${DID_KEY}` },
        body: JSON.stringify({
          source_url: avatar.source_url,
          script: { type: "text", input: text, provider: { type: "microsoft", voice_id: avatar.voice_id } },
          config: { fluent: true, pad_audio: 0.0 },
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.description || "D-ID error");

      let videoUrl = null;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await fetch(`https://api.d-id.com/talks/${createData.id}`, {
          headers: { "Authorization": `Basic ${DID_KEY}` }
        });
        const pd = await poll.json();
        if (pd.status === "done") { videoUrl = pd.result_url; break; }
        if (pd.status === "error") throw new Error("D-ID render failed");
      }
      if (!videoUrl) throw new Error("D-ID timeout");

      setAvatarLoading(false);
      setAvatarState("talking");
      setAvatarVideoUrl(videoUrl); // <video src autoPlay onEnded={finishAvatar}> takes it from here

      // If the browser blocked autoplay, the video never ends → fall back to voice instead of hanging
      setTimeout(async () => {
        const el = avatarVideoRef.current;
        if (avatarResolveRef.current === resolve && el && el.paused && !el.ended) {
          try { await el.play(); }
          catch {
            setAvatarVideoUrl(null);
            fallbackSpeak(text, avatar, finishAvatar);
          }
        }
      }, 2500);
    } catch (err) {
      console.error("D-ID error:", err.message);
      setAvatarLoading(false);
      setAvatarVideoUrl(null);
      fallbackSpeak(text, avatar, finishAvatar);
    }
  });

  const handleAvatarVideoError = () => {
    if (!avatarVideoUrl) return;
    const s = lastSpeechRef.current;
    setAvatarVideoUrl(null);
    if (s) fallbackSpeak(s.text, s.avatar, finishAvatar);
    else finishAvatar();
  };

  // ── Speech recognition ───────────────────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    // Seed with what was already said so "Resume" doesn't wipe the transcript
    const finalRef = { current: transcriptRef.current ? transcriptRef.current + " " : "" };
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      const combined = (finalRef.current + interim).trim();
      setTranscript(combined);
      transcriptRef.current = combined;
    };
    r.onend = () => {
      if (isListeningRef.current) {
        try { r.start(); } catch (_) {}
      } else {
        setIsListening(false);
      }
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "audio-capture") {
        try { r.start(); } catch (_) {}
      }
    };
    recognitionRef.current = r;
    isListeningRef.current = true;
    try { r.start(); } catch (_) {}
    setIsListening(true);
  };

  const stopListening = () => {
    isListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // ── Timer ────────────────────────────────────────────────────────────────
  // Plain counter + interval (no side effects inside a state updater)
  const startTimer = () => {
    clearInterval(timerRef.current);
    let t = TIME_PER_QUESTION;
    setTimer(t);
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimer(t);
      if (t <= 0) {
        clearInterval(timerRef.current);
        handleNextRef.current && handleNextRef.current();
      }
    }, 1000);
  };

  // ── AI calls — all go through the backend now (no API keys in the browser) ──
  const generateQuestions = async () => {
    const data = await generateInterviewQuestions(jobRole, name || "candidate", skills, TOTAL_QUESTIONS);
    if (!Array.isArray(data.questions) || !data.questions.length) throw new Error("No questions returned");
    return data.questions;
  };

  const getLiveQFeedback = async (question, answer) => {
    try {
      return await getLiveFeedback(question, answer);
    } catch {
      return { rating: "Average", spoken_feedback: "Thank you for your answer. Let's move on." };
    }
  };

  const loadFeedback = async () => {
    setFeedbackError("");
    setLoading(true); setLoadingMsg("Preparing your detailed report…");
    try {
      const fb = await getFinalFeedback(jobRole, answersRef.current, questionsRef.current);
      setFeedback(fb);
      await addDoc(collection(db, "users", user.uid, "attempts"), {
        type: "interview", subtype: jobRole,
        score: fb.overall_score, result: fb.result, date: serverTimestamp(),
      }).catch(() => {});
    } catch (e) {
      setFeedbackError(e.message || "Could not generate feedback.");
    }
    setLoading(false);
  };

  // ── Start interview ──────────────────────────────────────────────────────
  const startInterview = async () => {
    setLoading(true); setLoadingMsg("Starting camera…");
    const ok = await startCamera();
    if (!ok) { setLoading(false); return; }

    setLoadingMsg("Generating your questions…");
    let qs;
    try { qs = await generateQuestions(); }
    catch (e) { alert("Failed to generate questions: " + e.message); setLoading(false); stopCamera(); return; }

    setQuestions(qs); questionsRef.current = qs;
    setCurrentQ(0); currentQRef.current = 0;
    setAnswers([]); answersRef.current = [];
    setTranscript(""); transcriptRef.current = "";
    setFeedback(null); setFeedbackError("");
    setLoading(false);
    setStage("interview");

    processingRef.current = true; // ignore "Next" clicks while the intro is playing
    await new Promise(r => setTimeout(r, 800));

    const greeting = `Hello ${name || "there"}! Welcome to your ${jobRole} mock interview. I'm ${selectedAvatar.label}. I'll ask you ${qs.length} questions — HR and technical. After each answer I'll give you quick feedback. Let's begin!`;
    await generateAvatarVideo(greeting, selectedAvatar);

    setTranscript(""); transcriptRef.current = "";
    await generateAvatarVideo(qs[0].question, selectedAvatar);
    processingRef.current = false;
    startListening();
    startTimer();
  };

  // ── Handle next question ─────────────────────────────────────────────────
  const handleNext = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    clearInterval(timerRef.current);
    stopListening();

    try {
      const savedAnswer = transcriptRef.current || "(no answer)";
      const updatedAnswers = [...answersRef.current, savedAnswer];
      answersRef.current = updatedAnswers;
      setAnswers(updatedAnswers);
      const qIdx = currentQRef.current;
      const currentQuestion = questionsRef.current[qIdx];

      // Live feedback
      setAvatarState("thinking");
      const liveFb = await getLiveQFeedback(currentQuestion.question, savedAnswer);
      setLiveQFeedback({ ...liveFb, qNum: qIdx + 1 });
      setShowLiveFeedback(true);
      await generateAvatarVideo(liveFb.spoken_feedback, selectedAvatar);
      setShowLiveFeedback(false);
      setLiveQFeedback(null);

      const nextIdx = qIdx + 1;
      if (nextIdx >= questionsRef.current.length) {
        await generateAvatarVideo(`That was the last question. Thank you ${name || ""}! I'll now prepare your detailed report.`, selectedAvatar);
        stopCamera();
        setLoading(true);       // set before stage change so the error panel never flashes
        setStage("feedback");
        processingRef.current = false;
        await loadFeedback();
      } else {
        setCurrentQ(nextIdx); currentQRef.current = nextIdx;
        setTranscript(""); transcriptRef.current = "";
        await generateAvatarVideo(questionsRef.current[nextIdx].question, selectedAvatar);
        processingRef.current = false;
        startListening();
        startTimer();
      }
    } finally {
      processingRef.current = false;
    }
  };
  handleNextRef.current = handleNext;

  // ── Download report ──────────────────────────────────────────────────────
  const downloadReport = () => {
    if (!feedback) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Intervexa Interview Report</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111}
h1{font-size:24px;font-weight:700;margin-bottom:4px}.sub{color:#6B7280;font-size:14px;margin-bottom:32px}
.score{font-size:56px;font-weight:700;color:${feedback.overall_score>=80?"#16a34a":feedback.overall_score>=65?"#d97706":"#dc2626"}}
.badge{display:inline-block;padding:6px 18px;border-radius:99px;font-size:14px;font-weight:600;background:${feedback.result==="selected"?"#DCFCE7":"#FEE2E2"};color:${feedback.result==="selected"?"#166534":"#991B1B"};margin:8px 0 16px}
.summary{font-size:14px;color:#374151;line-height:1.7;margin-bottom:28px;padding:16px;background:#F9FAFB;border-radius:10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.card{padding:16px;border-radius:10px}.green{background:#F0FDF4;color:#166534}.red{background:#FEF2F2;color:#991B1B}.yellow{background:#FFFBEB;color:#92400E}
.card h3{font-size:14px;margin-bottom:10px}.card p{font-size:13px;margin-bottom:5px}
.q-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px}
.q{font-size:13px;font-weight:600;margin-bottom:4px}.ans{font-size:12px;color:#6B7280;font-style:italic;margin-bottom:4px}
.rating{font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;display:inline-block}
footer{margin-top:40px;font-size:12px;color:#9CA3AF;border-top:1px solid #e5e7eb;padding-top:16px}</style></head>
<body>
<h1>Intervexa Interview Report</h1>
<div class="sub">${name||"Candidate"} · ${jobRole} · ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>
<div class="score">${feedback.overall_score}%</div>
<div><span class="badge">${feedback.result==="selected"?"✅ Interview Passed":"❌ Needs Improvement"}</span></div>
<div class="summary">${feedback.summary}</div>
<div class="grid">
<div class="card green"><h3>💪 Strengths</h3>${feedback.strengths?.map(s=>`<p>✓ ${s}</p>`).join("")}</div>
<div class="card red"><h3>⚠️ Weaknesses</h3>${feedback.weaknesses?.map(w=>`<p>✗ ${w}</p>`).join("")}</div>
</div>
<div class="card yellow" style="margin-bottom:24px"><h3>💡 Suggestions</h3>${feedback.suggestions?.map((s,i)=>`<p>${i+1}. ${s}</p>`).join("")}</div>
<h2 style="font-size:16px;margin-bottom:12px">Question-wise Feedback</h2>
${questions.map((q,i)=>{
  const qf=feedback.question_feedback?.find(f=>f.id===q.id);
  const rc=qf?.rating==="Good"?"#166534":qf?.rating==="Average"?"#d97706":"#dc2626";
  const rbg=qf?.rating==="Good"?"#DCFCE7":qf?.rating==="Average"?"#FEF3C7":"#FEE2E2";
  return `<div class="q-card"><div class="q">Q${i+1} [${q.type}] ${q.question}</div>
<div class="ans">Your answer: ${answers[i]||"(no answer)"}</div>
<span class="rating" style="background:${rbg};color:${rc}">${qf?.rating||"—"}</span>
<p style="font-size:12px;color:#6B7280;margin-top:6px">${qf?.comment||""}</p></div>`;
}).join("")}
<footer>Generated by Intervexa · ${new Date().toLocaleString()}</footer>
</body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `Intervexa_Report_${(name||"candidate").replace(/ /g,"_")}_${jobRole.replace(/ /g,"_")}.html`;
    a.click();
  };

  useEffect(() => {
    return () => { stopCamera(); window.speechSynthesis?.cancel(); clearInterval(timerRef.current); recognitionRef.current?.stop(); };
  }, []);

  // ── SETUP SCREEN ─────────────────────────────────────────────────────────
  if (stage === "setup") return (
    <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>🎥 AI Mock Interview</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Choose your interviewer, layout and job role</div>
      </div>

      {/* Avatar selection */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 14 }}>CHOOSE YOUR AI INTERVIEWER</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {AVATARS.map(avatar => (
            <div key={avatar.id} onClick={() => setSelectedAvatar(avatar)}
              style={{ border: selectedAvatar?.id===avatar.id?"2px solid #7C6FFF":"1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, cursor: "pointer", background: selectedAvatar?.id===avatar.id?"rgba(124,111,255,0.12)":"rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}>
              {!avatarImgError[avatar.id] ? (
                <img src={avatar.source_url} alt={avatar.label}
                  style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: selectedAvatar?.id===avatar.id?"2px solid #7C6FFF":"2px solid rgba(255,255,255,0.1)", flexShrink: 0 }}
                  onError={() => setAvatarImgError(prev => ({ ...prev, [avatar.id]: true }))} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: avatar.gender==="female"?"rgba(236,72,153,0.2)":"rgba(124,111,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: selectedAvatar?.id===avatar.id?"2px solid #7C6FFF":"2px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                  {avatar.emoji}
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: selectedAvatar?.id===avatar.id?"#A78BFA":"rgba(255,255,255,0.8)" }}>{avatar.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{avatar.role}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{avatar.gender === "female" ? "👩 Female" : "👨 Male"} voice</div>
                {selectedAvatar?.id===avatar.id && <span style={{ fontSize: 10, background: "#7C6FFF", color: "#fff", padding: "1px 8px", borderRadius: 99, marginTop: 4, display: "inline-block" }}>Selected ✓</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 12 }}>SCREEN LAYOUT</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {LAYOUTS.map(l => (
            <div key={l.id} onClick={() => setLayout(l.id)}
              style={{ border: layout===l.id?"2px solid #7C6FFF":"1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 10px", cursor: "pointer", background: layout===l.id?"rgba(124,111,255,0.12)":"rgba(255,255,255,0.02)", textAlign: "center", transition: "all 0.15s" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{l.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: layout===l.id?"#A78BFA":"rgba(255,255,255,0.6)" }}>{l.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3, lineHeight: 1.4 }}>{l.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Job role */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 12 }}>SELECT JOB ROLE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {JOB_ROLES.map(role => (
            <div key={role} onClick={() => setJobRole(role)}
              style={{ padding: "9px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, border: jobRole===role?"2px solid #7C6FFF":"1px solid rgba(255,255,255,0.08)", background: jobRole===role?"rgba(124,111,255,0.12)":"rgba(255,255,255,0.02)", color: jobRole===role?"#A78BFA":"rgba(255,255,255,0.45)", fontWeight: jobRole===role?500:400, textAlign: "center", transition: "all 0.15s" }}>
              {role}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[["🤖","AI Avatar","D-ID lip sync"],["🎤","Voice Answers","Speak naturally"],["💬","Live Feedback","After each answer"],["📄","Download Report","Full report at end"]].map(([icon,label,sub]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 5 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{label}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {cameraError && <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#F87171", marginBottom: 12 }}>⚠️ {cameraError}</div>}

      <button onClick={startInterview} disabled={!jobRole || !selectedAvatar || loading}
        style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: jobRole&&selectedAvatar&&!loading?"linear-gradient(135deg,#7C6FFF,#A855F7)":"rgba(255,255,255,0.06)", color: jobRole&&selectedAvatar&&!loading?"#fff":"rgba(255,255,255,0.2)", fontSize: 14, fontWeight: 600, cursor: jobRole&&selectedAvatar&&!loading?"pointer":"not-allowed", fontFamily: "inherit" }}>
        {loading ? `⏳ ${loadingMsg}` : "Start Interview →"}
      </button>
    </div>
  );

  // ── INTERVIEW SCREEN ──────────────────────────────────────────────────────
  if (stage === "interview") {
    const q = questions[currentQ];
    const timerPct = (timer / TIME_PER_QUESTION) * 100;
    const timerColor = timer > 30 ? "#34D399" : timer > 10 ? "#F59E0B" : "#F87171";
    const mainH = layout === "split" ? 260 : 360;
    const pipH = 110, pipW = 160;

    // NOTE: these are plain functions called as {renderX(...)}, NOT <Components/>.
    // Defining components inside render made React remount the <video> elements on every
    // timer tick, which restarted the avatar video and blanked the camera.
    const renderAvatarPanel = ({ height, width, pip = false }) => (
      <div style={{ background: "#111827", borderRadius: pip?12:16, overflow: "hidden", height, width: width||"100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <video ref={avatarVideoRef} src={avatarVideoUrl || undefined} autoPlay playsInline
          onEnded={finishAvatar} onError={handleAvatarVideoError}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: avatarVideoUrl ? "block" : "none" }} />
        {!avatarVideoUrl && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {!avatarImgError[selectedAvatar?.id] ? (
              <img src={selectedAvatar?.source_url} alt={selectedAvatar?.label}
                style={{ width: pip?44:72, height: pip?44:72, borderRadius: "50%", objectFit: "cover", opacity: avatarLoading?0.5:1, border: "3px solid #7C6FFF" }}
                onError={() => setAvatarImgError(prev => ({ ...prev, [selectedAvatar?.id]: true }))} />
            ) : (
              <div style={{ width: pip?44:72, height: pip?44:72, borderRadius: "50%", background: selectedAvatar?.gender==="female"?"rgba(236,72,153,0.3)":"rgba(124,111,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: pip?24:36, border: "3px solid #7C6FFF" }}>
                {selectedAvatar?.emoji}
              </div>
            )}
            {avatarLoading && !pip && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Generating…</div>}
          </div>
        )}
        {!pip && <>
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.7)", padding: "3px 10px", borderRadius: 99, fontSize: 11, color: "#fff" }}>🤖 {selectedAvatar?.label}</div>
          <div style={{ position: "absolute", top: 10, right: 10, fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 500, background: avatarState==="talking"?"#7C6FFF":avatarState==="listening"?"#059669":"#374151", color: "#fff" }}>
            {avatarState==="talking"?"🔊 Speaking":avatarState==="listening"?"👂 Listening":"💭 Thinking"}
          </div>
          <div style={{ position: "absolute", top: 10, left: 10, background: q?.type==="HR"?"rgba(245,158,11,0.2)":"rgba(124,111,255,0.2)", color: q?.type==="HR"?"#F59E0B":"#A78BFA", fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 500 }}>{q?.type}</div>
        </>}
      </div>
    );

    const renderUserPanel = ({ height, width, pip = false }) => (
      <div style={{ background: "#111827", borderRadius: pip?12:16, overflow: "hidden", height, width: width||"100%", position: "relative", flexShrink: 0 }}>
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el && streamRef.current && el.srcObject !== streamRef.current) {
              el.srcObject = streamRef.current;
              el.play().catch(() => {});
            }
          }}
          autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
        {!pip && <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.6)", padding: "3px 10px", borderRadius: 99, fontSize: 11, color: "#fff" }}>📹 {name||"You"}</div>}
        {isListening && <div style={{ position: "absolute", top: pip?6:10, right: pip?6:10, background: "#DC2626", width: 9, height: 9, borderRadius: "50%" }} />}
      </div>
    );

    return (
      <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{jobRole} · {selectedAvatar?.label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Q{currentQ+1}/{questions.length}</div>
            {LAYOUTS.map(l => (
              <button key={l.id} onClick={() => setLayout(l.id)}
                style={{ padding: "4px 8px", borderRadius: 6, border: "none", fontSize: 14, cursor: "pointer", background: layout===l.id?"#7C6FFF":"rgba(255,255,255,0.06)", color: layout===l.id?"#fff":"rgba(255,255,255,0.4)" }}>
                {l.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
          {questions.map((_,i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i<currentQ?"#7C6FFF":i===currentQ?"#A78BFA":"rgba(255,255,255,0.08)" }} />)}
        </div>

        {/* Video panels */}
        {layout==="ai-focus" && (
          <div style={{ position: "relative", marginBottom: 12 }}>
            {renderAvatarPanel({ height: mainH })}
            <div style={{ position: "absolute", bottom: 12, right: 12 }}>{renderUserPanel({ height: pipH, width: pipW, pip: true })}</div>
          </div>
        )}
        {layout==="split" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {renderAvatarPanel({ height: mainH })}{renderUserPanel({ height: mainH })}
          </div>
        )}
        {layout==="user-focus" && (
          <div style={{ position: "relative", marginBottom: 12 }}>
            {renderUserPanel({ height: mainH })}
            <div style={{ position: "absolute", bottom: 12, right: 12 }}>{renderAvatarPanel({ height: pipH, width: pipW, pip: true })}</div>
          </div>
        )}

        {/* Live feedback */}
        {showLiveFeedback && liveQFeedback && (
          <div style={{ background: liveQFeedback.rating==="Good"?"rgba(52,211,153,0.08)":liveQFeedback.rating==="Average"?"rgba(245,158,11,0.08)":"rgba(248,113,113,0.08)", border: `1px solid ${liveQFeedback.rating==="Good"?"rgba(52,211,153,0.2)":liveQFeedback.rating==="Average"?"rgba(245,158,11,0.2)":"rgba(248,113,113,0.2)"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 20 }}>{liveQFeedback.rating==="Good"?"✅":liveQFeedback.rating==="Average"?"🟡":"❌"}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: liveQFeedback.rating==="Good"?"#34D399":liveQFeedback.rating==="Average"?"#F59E0B":"#F87171" }}>Q{liveQFeedback.qNum} · {liveQFeedback.rating}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{liveQFeedback.spoken_feedback}</div>
            </div>
          </div>
        )}

        {/* Question */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Q{currentQ+1} · {q?.type}</div>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>{q?.question}</div>
        </div>

        {/* Timer */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Time remaining</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: timerColor }}>{Math.max(0, timer)}s</div>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, background: timerColor, width: `${Math.max(0, timerPct)}%`, transition: "width 1s linear" }} />
          </div>
        </div>

        {/* Transcript */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, marginBottom: 12, minHeight: 60 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>🎤 Live transcript</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{transcript || (isListening ? "Start speaking…" : "Waiting…")}</div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleNext} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7C6FFF,#A855F7)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            {currentQ+1===questions.length ? "Finish Interview →" : "Next Question →"}
          </button>
          <button onClick={isListening ? stopListening : startListening}
            style={{ padding: "11px 20px", borderRadius: 10, fontSize: 13, border: "1px solid rgba(255,255,255,0.1)", background: isListening?"rgba(248,113,113,0.1)":"rgba(255,255,255,0.03)", color: isListening?"#F87171":"rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "inherit" }}>
            {isListening ? "⏸ Pause" : "🎤 Resume"}
          </button>
        </div>
      </div>
    );
  }

  // ── FEEDBACK LOADING ──────────────────────────────────────────────────────
  if (stage === "feedback" && loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 40 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: "#fff" }}>{loadingMsg}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Sit tight — almost done!</div>
    </div>
  );

  // ── FEEDBACK ERROR (with retry — your answers are kept) ───────────────────
  if (stage === "feedback" && !feedback) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 14, fontFamily: "Inter, sans-serif", textAlign: "center" }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>Couldn't generate your report</div>
      <div style={{ fontSize: 12, color: "#F87171", maxWidth: 420 }}>{feedbackError}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={loadFeedback} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7C6FFF,#A855F7)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Try again</button>
        <button onClick={() => { setStage("setup"); setFeedbackError(""); }} style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Back to setup</button>
      </div>
    </div>
  );

  // ── FEEDBACK SCREEN ───────────────────────────────────────────────────────
  if (stage === "feedback" && feedback) return (
    <div style={{ maxWidth: 680, margin: "0 auto", fontFamily: "Inter, sans-serif", paddingBottom: 40 }}>

      <div style={{ background: feedback.result==="selected"?"rgba(52,211,153,0.08)":"rgba(248,113,113,0.08)", border: `2px solid ${feedback.result==="selected"?"rgba(52,211,153,0.3)":"rgba(248,113,113,0.3)"}`, borderRadius: 16, padding: 28, marginBottom: 16, textAlign: "center" }}>
        {!avatarImgError[selectedAvatar?.id] ? (
          <img src={selectedAvatar?.source_url} alt={selectedAvatar?.label} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", marginBottom: 10, border: "2px solid rgba(255,255,255,0.1)" }}
            onError={() => setAvatarImgError(prev => ({ ...prev, [selectedAvatar?.id]: true }))} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(124,111,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 10px" }}>{selectedAvatar?.emoji}</div>
        )}
        <div style={{ fontSize: 44, fontWeight: 800, color: feedback.overall_score>=80?"#34D399":feedback.overall_score>=65?"#F59E0B":"#F87171", letterSpacing: "-0.03em" }}>{feedback.overall_score}%</div>
        <span style={{ display: "inline-block", marginTop: 8, padding: "5px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600, background: feedback.result==="selected"?"rgba(52,211,153,0.15)":"rgba(248,113,113,0.15)", color: feedback.result==="selected"?"#34D399":"#F87171", border: `1px solid ${feedback.result==="selected"?"rgba(52,211,153,0.3)":"rgba(248,113,113,0.3)"}` }}>
          {feedback.result==="selected" ? "✅ Interview Passed" : "❌ Needs Improvement"}
        </span>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 12, lineHeight: 1.6 }}>{feedback.summary}</div>
      </div>

      <button onClick={downloadReport} style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "1px solid rgba(124,111,255,0.3)", background: "rgba(124,111,255,0.1)", color: "#A78BFA", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        📥 Download Full Report
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#34D399", marginBottom: 10 }}>💪 Strengths</div>
          {feedback.strengths?.map((s,i) => <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "flex", gap: 6 }}><span style={{ color: "#34D399" }}>✓</span>{s}</div>)}
        </div>
        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#F87171", marginBottom: 10 }}>⚠️ Weaknesses</div>
          {feedback.weaknesses?.map((w,i) => <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "flex", gap: 6 }}><span style={{ color: "#F87171" }}>✗</span>{w}</div>)}
        </div>
      </div>

      <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B", marginBottom: 10 }}>💡 Suggestions</div>
        {feedback.suggestions?.map((s,i) => <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8, lineHeight: 1.5 }}>{i+1}. {s}</div>)}
      </div>

      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 12 }}>QUESTION-WISE FEEDBACK</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {questions.map((q,i) => {
          const qf = feedback.question_feedback?.find(f => f.id===q.id);
          const rc = qf?.rating==="Good"?"#34D399":qf?.rating==="Average"?"#F59E0B":"#F87171";
          return (
            <div key={q.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 500, flex: 1, marginRight: 10, color: "rgba(255,255,255,0.8)" }}>Q{i+1}. {q.question}</div>
                <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: rc+"15", color: rc, fontWeight: 500, whiteSpace: "nowrap", border: `1px solid ${rc}30` }}>{qf?.rating||"—"}</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{qf?.comment}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>Your answer: {answers[i]||"(no answer)"}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={downloadReport} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#059669,#10B981)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>📥 Download Report</button>
        <button onClick={() => { setStage("setup"); setFeedback(null); setFeedbackError(""); setQuestions([]); setAnswers([]); setAvatarVideoUrl(null); }}
          style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7C6FFF,#A855F7)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          Try Another Interview
        </button>
      </div>
    </div>
  );

  return null;
}