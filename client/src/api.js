const SERVER = "http://localhost:5000/api";

// One helper for every call: throws a readable Error on any failure
const post = async (path, body) => {
  let res;
  try {
    res = await fetch(`${SERVER}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running on port 5000?");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned an invalid response (${res.status}).`);
  }

  if (!res.ok || data.error) throw new Error(data.error || `Server error (${res.status})`);
  return data;
};

export const analyzeResume = (resumeText) => post("/resume/analyze", { resumeText });

export const generateAptitude = (topic, difficulty, count = 10) =>
  post("/aptitude/generate", { topic, difficulty, count });

export const generateCoding = (topic, difficulty, count = 1) =>
  post("/coding/generate", { topic, difficulty, count });

export const evaluateCoding = (problem, code, language) =>
  post("/coding/evaluate", { problem, code, language });

export const getCodeHint = (problem, code) => post("/coding/hint", { problem, code });

export const generateInterviewQuestions = (jobRole, name, skills, totalQuestions) =>
  post("/interview/questions", { jobRole, name, skills, total: totalQuestions });

export const getLiveFeedback = (question, answer) =>
  post("/interview/live-feedback", { question, answer });

export const getFinalFeedback = (jobRole, answers, questions) =>
  post("/interview/feedback", { jobRole, answers, questions });