const express = require("express");
const router = express.Router();
const { askAIJSON } = require("../gemini");

const asArray = (v) => (Array.isArray(v) ? v.map(String) : []);

// ── Questions ───────────────────────────────────────────────────────────────
router.post("/questions", async (req, res) => {
  try {
    const { jobRole, name, skills, total } = req.body;
    const n = Math.min(Math.max(parseInt(total) || 7, 1), 12);

    const parsed = await askAIJSON(
      `You are an interviewer for a ${jobRole} role at a top tech company.
Candidate: ${name || "candidate"}. Skills: ${(skills || []).join(", ") || "general programming"}.
Generate exactly ${n} interview questions — a mix of HR and technical. The first must be: "Tell me about yourself."
Respond ONLY in JSON (no markdown): {"questions":[{"id":1,"question":"Tell me about yourself.","type":"HR"},{"id":2,"question":"...","type":"Technical"}]}`,
      2000
    );

    const raw = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(raw) || !raw.length) throw new Error("AI returned no questions");

    const questions = raw
      .filter((q) => q && q.question)
      .map((q, i) => ({
        id: i + 1,
        question: String(q.question),
        type: q.type === "Technical" ? "Technical" : "HR",
      }));

    res.json({ questions });
  } catch (err) {
    console.error("Interview questions error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Live feedback (never fails — falls back to a generic line) ─────────────
router.post("/live-feedback", async (req, res) => {
  try {
    const { question, answer } = req.body;
    const parsed = await askAIJSON(
      `You are an interviewer giving quick verbal feedback.
Question: "${question}"
Answer: "${(answer || "(no answer given)").slice(0, 1500)}"
Give 1-2 sentence spoken feedback — encouraging but honest.
rating must be one of: Good, Average, Poor.
Respond ONLY in JSON: {"rating":"Good","spoken_feedback":"Great answer!"}`,
      400
    );
    res.json({
      rating: ["Good", "Average", "Poor"].includes(parsed.rating) ? parsed.rating : "Average",
      spoken_feedback: parsed.spoken_feedback || "Thank you. Let's move on.",
    });
  } catch (err) {
    console.error("Live feedback error:", err.message);
    res.json({ rating: "Average", spoken_feedback: "Thank you for your answer. Let's move on." });
  }
});

// ── Final feedback ──────────────────────────────────────────────────────────
router.post("/feedback", async (req, res) => {
  try {
    const { jobRole, answers = [], questions = [] } = req.body;
    const qa = questions
      .map((q, i) => `Q${i + 1} [${q.type}]: ${q.question}\nAnswer: ${(answers[i] || "(none)").slice(0, 1500)}`)
      .join("\n\n");

    const parsed = await askAIJSON(
      `You are an expert interview coach for a ${jobRole} role.
${qa}

Respond ONLY in JSON (no markdown, keep every comment short):
{"overall_score":<0-100>,"summary":"2-3 sentences","strengths":["s1","s2","s3"],"weaknesses":["w1","w2","w3"],"suggestions":["t1","t2","t3"],"question_feedback":[{"id":1,"rating":"Good or Average or Poor","comment":"short comment"}]}
Include one question_feedback entry for every question (ids 1 to ${questions.length}).`,
      3500
    );

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.overall_score) || 0)));
    res.json({
      overall_score: score,
      result: score > 65 ? "selected" : "rejected", // decided here so it always matches the score
      summary: parsed.summary || "",
      strengths: asArray(parsed.strengths),
      weaknesses: asArray(parsed.weaknesses),
      suggestions: asArray(parsed.suggestions),
      question_feedback: Array.isArray(parsed.question_feedback) ? parsed.question_feedback : [],
    });
  } catch (err) {
    console.error("Final feedback error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;