// ✅ Strict resume validation
// Notes/assignments/textbooks often have "skills" or "experience" mentioned once
// A real resume has MULTIPLE resume-specific sections and patterns

const STRONG_RESUME_KEYWORDS = [
  "work experience", "education", "technical skills", "professional summary",
  "career objective", "internship", "projects", "certifications",
  "achievements", "responsibilities", "bachelor", "master", "b.tech", "b.e",
  "m.tech", "b.sc", "mba", "gpa", "cgpa", "resume", "curriculum vitae",
  "contact", "phone", "email", "linkedin", "github", "references",
  "volunteer", "extracurricular", "hobbies", "languages known",
];

const WEAK_RESUME_KEYWORDS = [
  "experience", "skills", "education", "project", "objective", "summary",
  "profile", "qualification", "degree", "university", "college",
  "employment", "career", "developed", "implemented", "managed",
];

const NON_RESUME_INDICATORS = [
  "chapter", "theorem", "definition", "exercise", "solution", "question",
  "answer", "marks", "unit", "module", "textbook", "notes", "lecture",
  "assignment", "problem set", "worksheet", "exam paper", "test paper",
  "roll no", "class:", "subject:", "topic:", "index", "table of contents",
  "abstract", "introduction", "conclusion", "bibliography", "references\n",
  "figure", "equation", "formula", "hypothesis", "methodology",
];

export const isResumePDF = (text) => {
  const lower = text.toLowerCase();

  // ❌ Reject if it has too many non-resume indicators (notes/textbook/paper)
  const nonResumeCount = NON_RESUME_INDICATORS.filter(kw => lower.includes(kw)).length;
  if (nonResumeCount >= 3) {
    return { valid: false, reason: "This looks like study notes, a textbook, or an assignment — not a resume." };
  }

  // ✅ Check for strong resume keywords (section headers)
  const strongMatches = STRONG_RESUME_KEYWORDS.filter(kw => lower.includes(kw));
  const weakMatches   = WEAK_RESUME_KEYWORDS.filter(kw => lower.includes(kw));

  // A resume needs at least 2 strong keywords OR 5 weak keywords
  if (strongMatches.length >= 2 || weakMatches.length >= 5) {
    return { valid: true };
  }

  // Check for name + contact pattern (common in resumes)
  const hasEmail   = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone   = /(\+91|0)?[6-9]\d{9}|(\d{3}[-.\s]??\d{3}[-.\s]??\d{4})/.test(text);
  const hasContact = hasEmail || hasPhone;

  if (hasContact && weakMatches.length >= 2) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: "This doesn't look like a resume. Please upload your actual resume PDF with sections like Education, Skills, and Experience.",
  };
};