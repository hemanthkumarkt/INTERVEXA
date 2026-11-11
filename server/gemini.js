const fetch = require("node-fetch");

const OMNI_URL = process.env.OMNI_URL || "http://localhost:20128/v1/chat/completions";

// ── Raw call to OmniRoute ───────────────────────────────────────────────────
const askAI = async (prompt, maxTokens = 4000) => {
  if (!process.env.OMNI_KEY) throw new Error("OMNI_KEY is missing in backend .env");
  console.log("🔄 Sending request to OmniRoute...");

  let res;
  try {
    res = await fetch(OMNI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OMNI_KEY}`,
      },
      body: JSON.stringify({
        model: "auto",
        max_tokens: maxTokens,
        stream: false,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (e) {
    throw new Error(`Cannot reach OmniRoute (${OMNI_URL}). Is it running? ${e.message}`);
  }

  const data = await res.json().catch(() => null);
  if (!data) throw new Error("OmniRoute returned a non-JSON response");
  if (!res.ok) throw new Error(data.error?.message || `OmniRoute error (${res.status})`);

  const choice = data.choices?.[0];
  const content = choice?.message?.content || "";
  console.log(`📥 model=${data.model} finish=${choice?.finish_reason} chars=${content.length}`);

  if (!content.trim()) throw new Error("AI returned an empty response");
  if (choice?.finish_reason === "length") {
    console.warn("⚠️  Response was cut off (max_tokens too low) — will try to repair JSON");
  }
  return content;
};

// ── JSON helpers ────────────────────────────────────────────────────────────
// Closes any open string / brackets so a truncated JSON can still parse
const repairJSON = (s) => {
  const stack = [];
  let inStr = false, esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = s;
  if (inStr) out += '"';
  out = out.replace(/[,:\s]+$/, "");
  while (stack.length) out += stack.pop() === "{" ? "}" : "]";
  return out;
};

const safeParseJSON = (text) => {
  let cleaned = String(text).replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("AI did not return JSON");
  cleaned = cleaned.slice(start);

  const end = cleaned.lastIndexOf("}");
  try {
    return JSON.parse(end !== -1 ? cleaned.slice(0, end + 1) : cleaned);
  } catch {}

  // Truncated output: close brackets, cutting back to earlier commas if needed
  let attempt = cleaned;
  for (let i = 0; i < 60; i++) {
    try { return JSON.parse(repairJSON(attempt)); } catch {}
    const cut = attempt.lastIndexOf(",");
    if (cut <= 0) break;
    attempt = attempt.slice(0, cut);
  }
  throw new Error("Invalid JSON from AI");
};

// Ask + parse, retry once if the model returned bad JSON
const askAIJSON = async (prompt, maxTokens = 4000) => {
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return safeParseJSON(await askAI(prompt, maxTokens));
    } catch (e) {
      lastErr = e;
      console.warn(`⚠️  AI attempt ${attempt} failed: ${e.message}`);
    }
  }
  throw lastErr;
};

module.exports = { askAI, askAIJSON, safeParseJSON };