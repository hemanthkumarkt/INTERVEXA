const express = require("express");
const router = express.Router();
const { askAI, askAIJSON } = require("../gemini");

const DEFAULT_STARTER = {
  Python: "# Write your solution here\n",
  Java: "public class Solution {\n    public static void main(String[] args) {\n    }\n}",
  "C++": "#include<bits/stdc++.h>\nusing namespace std;\nint main(){\n    return 0;\n}",
  JavaScript: "function solution() {\n}",
};

// ── Generate problems ───────────────────────────────────────────────────────
router.post("/generate", async (req, res) => {
  try {
    const { topic, difficulty = "Medium", count = 1 } = req.body;
    const n = Math.min(Math.max(parseInt(count) || 1, 1), 4);

    const topicPrompt =
      topic === "Random" ? "a random mix of Arrays, Strings, Trees, DP" : `"${topic}"`;

    const diffPrompt =
      difficulty === "Mixed" && n === 4
        ? "in this exact order: 1 Easy, 2 Medium, 1 Hard"
        : `all ${difficulty === "Mixed" ? "Medium" : difficulty}`;

    const parsed = await askAIJSON(
      `Generate exactly ${n} coding problem(s) on ${topicPrompt} for engineering placement. Difficulty: ${diffPrompt}.
Keep descriptions concise. Give exactly 2 test_cases and 1 example per problem.
Respond ONLY in this exact JSON (no markdown, no backticks):
{"problems":[{"id":1,"title":"...","difficulty":"Easy or Medium or Hard","topic":"...","description":"...","input_format":"...","output_format":"...","examples":[{"input":"...","output":"...","explanation":"..."}],"constraints":["..."],"test_cases":[{"input":"...","expected":"..."},{"input":"...","expected":"..."}],"starter_code":{"Python":"# Write here\\n","Java":"public class Solution {\\n    public static void main(String[] args) {\\n    }\\n}","C++":"#include<bits/stdc++.h>\\nusing namespace std;\\nint main(){\\n    return 0;\\n}","JavaScript":"function solution() {\\n}"},"time_complexity":"O(?)","space_complexity":"O(?)"}]}`,
      Math.min(9000, n * 1800 + 500)
    );

    const raw = parsed.problems || (parsed.title ? [parsed] : null);
    if (!Array.isArray(raw) || !raw.length) throw new Error("AI returned no problems");

    const problems = raw.map((p, i) => ({
      ...p,
      id: i + 1,
      title: p.title || `Problem ${i + 1}`,
      difficulty: ["Easy", "Medium", "Hard"].includes(p.difficulty) ? p.difficulty : "Medium",
      topic: p.topic || topic,
      examples: Array.isArray(p.examples) ? p.examples : [],
      constraints: Array.isArray(p.constraints) ? p.constraints : [],
      test_cases: Array.isArray(p.test_cases) ? p.test_cases : [],
      starter_code: { ...DEFAULT_STARTER, ...(p.starter_code || {}) },
    }));

    res.json({ problems });
  } catch (err) {
    console.error("Coding generate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Evaluate code ───────────────────────────────────────────────────────────
router.post("/evaluate", async (req, res) => {
  try {
    const { code, language, problem } = req.body;

    if (!code || code.trim() === "") {
      return res.json({
        test_results: [], passed: 0, total: 0, score: 0, verdict: "No Submission",
        feedback: "Please write your code before submitting.",
        time_complexity: "N/A", space_complexity: "N/A", optimized_hint: "",
      });
    }

    const tcs = problem.test_cases || [];
    const testCases = tcs
      .map((tc, i) => `Test ${i + 1}: Input: ${tc.input} | Expected: ${tc.expected}`)
      .join("\n");

    const parsed = await askAIJSON(
      `You are a code evaluator. Mentally run this ${language} code against each test case for the problem: "${problem.title}".

Problem: ${problem.description}

Student's code:
${code}

Test cases:
${testCases}

Respond ONLY in this exact JSON (no markdown):
{"test_results":[{"test":1,"input":"...","expected":"...","got":"...","passed":true}],"time_complexity":"O(?)","space_complexity":"O(?)","feedback":"2-3 lines on the approach","optimized_hint":"one line optimization hint"}`,
      2500
    );

    // Compute score/verdict ourselves instead of trusting the model's arithmetic
    const test_results = Array.isArray(parsed.test_results) ? parsed.test_results : [];
    const total = test_results.length || tcs.length;
    const passed = test_results.filter((t) => t.passed === true).length;
    const score = total ? Math.round((passed / total) * 100) : 0;
    const verdict = total && passed === total ? "Accepted" : passed > 0 ? "Partial" : "Wrong Answer";

    res.json({
      test_results, passed, total, score, verdict,
      time_complexity: parsed.time_complexity || "N/A",
      space_complexity: parsed.space_complexity || "N/A",
      feedback: parsed.feedback || "",
      optimized_hint: parsed.optimized_hint || "",
    });
  } catch (err) {
    console.error("Coding evaluate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Hint ────────────────────────────────────────────────────────────────────
router.post("/hint", async (req, res) => {
  try {
    const { problem, code } = req.body;
    const text = await askAI(
      `Give a short hint (2-3 lines, NO full solution) for this problem:
"${problem.title}: ${problem.description}"
Current code: ${code || "not started yet"}
Just a nudge in the right direction.`,
      500
    );
    res.json({ hint: text.trim() });
  } catch (err) {
    console.error("Coding hint error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;