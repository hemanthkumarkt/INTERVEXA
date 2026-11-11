const express = require("express");
const router = express.Router();
const { askAIJSON } = require("../gemini");

const asArray = (v) => (Array.isArray(v) ? v.map(String) : []);

router.post("/analyze", async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ error: "Could not read any text from this resume." });
    }

    const parsed = await askAIJSON(
      `You are a strict ATS evaluator.
Analyze this resume and respond ONLY in JSON (no markdown, no backticks):
{"ats_score":<0-100>,"skills_found":["s1","s2"],"strengths":["s1","s2","s3"],"weaknesses":["w1","w2","w3"],"tips":["t1","t2","t3"]}
Keep every item under 20 words. List at most 12 skills.
Resume:
${resumeText.slice(0, 12000)}`,
      2500
    );

    // Decision is computed here so score and decision can never disagree
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.ats_score) || 0)));
    res.json({
      ats_score: score,
      decision: score >= 60 ? "selected" : "rejected",
      skills_found: asArray(parsed.skills_found),
      strengths: asArray(parsed.strengths),
      weaknesses: asArray(parsed.weaknesses),
      tips: asArray(parsed.tips),
    });
  } catch (err) {
    console.error("Resume analyze error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;