const express = require("express");
const router = express.Router();
const { askAIJSON } = require("../gemini");

router.post("/generate", async (req, res) => {
  try {
    const { topic, difficulty = "Medium", count = 10 } = req.body;
    const n = Math.min(Math.max(parseInt(count) || 10, 1), 15);

    const parsed = await askAIJSON(
      `Generate EXACTLY ${n} multiple choice aptitude questions on: "${topic}".
Difficulty: ${difficulty}. For engineering campus placement.
Each question must have exactly 4 options labelled "A) ...", "B) ...", "C) ...", "D) ...".
"correct" must be a single letter A, B, C or D. Keep each explanation under 30 words.
For Reading Comprehension, put the short passage inside the question text.
Respond ONLY in this exact JSON format (no markdown, no backticks):
{"questions":[{"id":1,"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","explanation":"..."}]}`,
      Math.min(8000, n * 450 + 600)
    );

    const raw = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(raw)) throw new Error("AI returned an invalid question list");

    const questions = raw
      .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2)
      .map((q, i) => ({
        id: i + 1,
        question: String(q.question),
        options: q.options.map(String),
        correct: String(q.correct || "A").trim().charAt(0).toUpperCase(),
        explanation: String(q.explanation || ""),
      }));

    if (!questions.length) throw new Error("AI returned no usable questions");
    res.json({ questions });
  } catch (err) {
    console.error("Aptitude generate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;