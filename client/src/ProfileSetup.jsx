import { useState, useEffect, useMemo, useRef } from "react";
import Logo from "./Logo";

const JOB_ROLES = [
  "Software Engineer", "Frontend Developer", "Backend Developer",
  "Full Stack Developer", "Data Analyst", "Data Scientist",
  "DevOps Engineer", "ML Engineer", "Android Developer",
  "iOS Developer", "Cloud Engineer", "QA Engineer",
];

const SKILL_OPTIONS = ["Java", "Python", "C++", "DSA", "React", "Node.js", "SQL", "JavaScript", "TypeScript", "MongoDB", "AWS", "Docker"];
const EXPERIENCE_LEVELS = ["Fresher", "1-2 years", "2+ years"];

const THIS_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 9 }, (_, i) => String(THIS_YEAR - 2 + i));

const MAX_IMAGE_MB = 2;
const MAX_SKILLS = 25;

// "https://www.github.com/foo/" → "foo"
const cleanGithub = (v = "") =>
  v.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "")
    .replace(/^github\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0];

// "https://linkedin.com/in/foo/" → "foo"
const cleanLinkedin = (v = "") =>
  v.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "")
    .replace(/^linkedin\.com\//i, "").replace(/^in\//i, "").replace(/^@/, "").split(/[/?#]/)[0];

export default function ProfileSetup({ user, onSave, onCancel, isEditing = false, existingData = {} }) {
  const [step, setStep] = useState(1); // 1 = basic, 2 = academic, 3 = career

  // Step 1 — Basic
  const [name, setName] = useState(existingData.name || "");
  const [college, setCollege] = useState(existingData.college || "");
  const [location, setLocation] = useState(existingData.location || "");
  const [dob, setDob] = useState(existingData.dob || "");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(existingData.imageUrl || "");

  // Step 2 — Academic
  const [gradYear, setGradYear] = useState(existingData.gradYear || "");
  const [cgpa, setCgpa] = useState(existingData.cgpa || "");
  const [branch, setBranch] = useState(existingData.branch || "");
  const [experience, setExperience] = useState(existingData.experience || "Fresher");

  // Step 3 — Career
  const [targetRole, setTargetRole] = useState(existingData.targetRole || "");
  const [skills, setSkills] = useState(existingData.skills || []);
  const [customSkill, setCustomSkill] = useState("");
  const [github, setGithub] = useState(existingData.github || "");
  const [linkedin, setLinkedin] = useState(existingData.linkedin || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // If existingData arrives AFTER mount (async load while editing), fill the form once
  const hydrated = useRef(Object.keys(existingData || {}).length > 0);
  useEffect(() => {
    if (hydrated.current || !existingData || !Object.keys(existingData).length) return;
    hydrated.current = true;
    setName(existingData.name || ""); setCollege(existingData.college || "");
    setLocation(existingData.location || ""); setDob(existingData.dob || "");
    setImageUrl(existingData.imageUrl || ""); setGradYear(existingData.gradYear || "");
    setCgpa(existingData.cgpa || ""); setBranch(existingData.branch || "");
    setExperience(existingData.experience || "Fresher"); setTargetRole(existingData.targetRole || "");
    setSkills(existingData.skills || []); setGithub(existingData.github || "");
    setLinkedin(existingData.linkedin || "");
  }, [existingData]);

  // One blob URL per selected file (previously a new one was created on every render → leak + flicker)
  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleImage = (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // lets the user re-pick the same file
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) { setError(`Image too large — max ${MAX_IMAGE_MB} MB.`); return; }
    setError("");
    setImageFile(f);
  };

  const removePhoto = () => { setImageFile(null); setImageUrl(""); };

  // ── Skills ───────────────────────────────────────────────────────────────
  const addSkills = (raw) => {
    const incoming = raw.split(",").map((s) => s.trim().slice(0, 30)).filter(Boolean);
    if (!incoming.length) return;
    setSkills((prev) => {
      const next = [...prev];
      incoming.forEach((s) => {
        if (next.length < MAX_SKILLS && !next.some((x) => x.toLowerCase() === s.toLowerCase())) next.push(s);
      });
      return next;
    });
    setCustomSkill("");
  };

  const toggleSkill = (skill) =>
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : prev.length < MAX_SKILLS ? [...prev, skill] : prev));

  // ── Validation ───────────────────────────────────────────────────────────
  const validateStep = (n) => {
    if (n === 1) {
      if (name.trim().length < 2) return "Please enter your full name.";
      if (dob) {
        const d = new Date(dob);
        if (isNaN(d) || d > new Date()) return "Date of birth can't be in the future.";
        if (d.getFullYear() < 1950) return "Please enter a valid date of birth.";
      }
    }
    if (n === 2 && cgpa.trim()) {
      const m = cgpa.trim().match(/^(\d+(?:\.\d+)?)\s*(cgpa|gpa|%)?$/i);
      if (!m) return "Enter CGPA like 8.5 or a percentage like 85%.";
      const val = parseFloat(m[1]);
      if (val <= 0 || val > 100) return "CGPA / percentage looks out of range.";
    }
    return "";
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => { setError(""); setStep((s) => Math.max(1, s - 1)); };

  const handleSave = async () => {
    for (const s of [1, 2]) {
      const err = validateStep(s);
      if (err) { setStep(s); setError(err); return; }
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(), college: college.trim(), location: location.trim(), dob, imageFile, imageUrl,
        gradYear, cgpa: cgpa.trim(), branch: branch.trim(), experience,
        targetRole, skills, github: cleanGithub(github), linkedin: cleanLinkedin(linkedin),
      });
    } catch (e) {
      setError(e?.message || "Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Enter = continue / save (the custom-skill box handles its own Enter)
  const onKeyDown = (e) => {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT" || e.target.type === "file" || e.target.dataset.noenter) return;
    e.preventDefault();
    if (step < 3) goNext(); else if (!saving) handleSave();
  };

  // ── Profile strength ─────────────────────────────────────────────────────
  const strength = useMemo(() => {
    const checks = [
      name.trim(), college.trim(), location.trim(), dob, imageFile || imageUrl,
      branch.trim(), gradYear, cgpa.trim(), targetRole, skills.length >= 3, github.trim(), linkedin.trim(),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [name, college, location, dob, imageFile, imageUrl, branch, gradYear, cgpa, targetRole, skills, github, linkedin]);

  const steps = [
    { num: 1, label: "Basic Info" },
    { num: 2, label: "Academic" },
    { num: 3, label: "Career" },
  ];

  const yearOptions = gradYear && !GRAD_YEARS.includes(String(gradYear)) ? [String(gradYear), ...GRAD_YEARS] : GRAD_YEARS;
  const customSkills = skills.filter((s) => !SKILL_OPTIONS.includes(s));
  const avatarSrc = previewUrl || imageUrl;

  return (
    <div className="ps-root" onKeyDown={onKeyDown} style={{
      minHeight: "100vh", background: "#09090f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', -apple-system, sans-serif", padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .ps-root, .ps-root * { box-sizing: border-box; }
        .p-input {
          width: 100%; padding: 11px 14px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: #fff; font-size: 13px; outline: none;
          transition: border-color 0.2s, background 0.2s; font-family: inherit;
        }
        .p-input::placeholder { color: rgba(255,255,255,0.2); }
        .p-input:focus { border-color: #7C6FFF; background: rgba(124,111,255,0.08); }
        select.p-input { color-scheme: dark; cursor: pointer; }
        select.p-input option { background: #13111f; color: #fff; }
        .p-label { font-size: 11px; color: rgba(255,255,255,0.3); display: block; margin-bottom: 6px; letter-spacing: 0.06em; }
        .chip {
          padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: 500;
          cursor: pointer; border: 1px solid; transition: all 0.15s; font-family: inherit; background: transparent;
        }
        .chip.active { background: rgba(124,111,255,0.2); border-color: #7C6FFF; color: #A78BFA; }
        .chip.inactive { border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.35); }
        .chip.inactive:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.6); }
        .primary-btn {
          padding: 12px 24px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #7C6FFF, #A855F7);
          color: #fff; font-size: 14px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: opacity 0.2s;
        }
        .primary-btn:hover { opacity: 0.9; }
        .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ghost-btn {
          padding: 12px 24px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent; color: rgba(255,255,255,0.5);
          font-size: 14px; cursor: pointer; font-family: inherit;
        }
        .ghost-btn:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7); }
        .role-card {
          padding: 10px 14px; border-radius: 10px; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.08); font-size: 12px;
          transition: all 0.15s; text-align: center; background: rgba(255,255,255,0.02);
          color: rgba(255,255,255,0.4);
        }
        .role-card.selected { background: rgba(124,111,255,0.15); border-color: rgba(124,111,255,0.4); color: #A78BFA; font-weight: 500; }
        .role-card:hover:not(.selected) { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 560,
        background: "#13111f", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "36px 36px",
        animation: "fadeUp 0.4s ease both",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <Logo size="sm" />
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
          {steps.map((s, i) => (
            <div key={s.num} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
              <div onClick={() => { if (s.num < step) { setError(""); setStep(s.num); } }}
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: s.num < step ? "pointer" : "default" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 600,
                  background: step > s.num ? "#7C6FFF" : step === s.num ? "rgba(124,111,255,0.3)" : "rgba(255,255,255,0.06)",
                  border: step >= s.num ? "1px solid #7C6FFF" : "1px solid rgba(255,255,255,0.1)",
                  color: step >= s.num ? "#fff" : "rgba(255,255,255,0.3)",
                }}>
                  {step > s.num ? "✓" : s.num}
                </div>
                <span style={{ fontSize: 12, color: step === s.num ? "#A78BFA" : "rgba(255,255,255,0.25)", fontWeight: step === s.num ? 500 : 400 }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                // was `step > s.num + 1` — the line stayed grey one step too long
                <div style={{ flex: 1, height: 1, background: step > s.num ? "#7C6FFF" : "rgba(255,255,255,0.08)", margin: "0 12px" }} />
              )}
            </div>
          ))}
        </div>

        {/* Profile strength */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
            <span>Profile strength</span>
            <span style={{ color: strength >= 75 ? "#34D399" : strength >= 40 ? "#F59E0B" : "rgba(255,255,255,0.4)" }}>{strength}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${strength}%`, borderRadius: 99, background: "linear-gradient(90deg,#7C6FFF,#A855F7)", transition: "width 0.3s ease" }} />
          </div>
        </div>

        {/* ── STEP 1: Basic Info ── */}
        {step === 1 && (
          <div style={{ animation: "slideIn 0.3s ease both" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Basic Information</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Tell us who you are</p>

            {/* Avatar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24, gap: 8 }}>
              <label style={{ cursor: "pointer", position: "relative" }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "rgba(124,111,255,0.1)", border: "2px solid rgba(124,111,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 26, fontWeight: 700, color: "#7C6FFF" }}>
                      {name.trim() ? name.trim()[0].toUpperCase() : "?"}
                    </span>
                  )}
                </div>
                <div style={{
                  position: "absolute", bottom: 0, right: 0, width: 24, height: 24,
                  borderRadius: "50%", background: "#7C6FFF", fontSize: 11,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #13111f",
                }}>📷</div>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImage} />
              </label>
              {avatarSrc && (
                <button type="button" onClick={removePhoto}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  Remove photo
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="p-label" htmlFor="ps-name">FULL NAME *</label>
                  <input id="ps-name" className="p-input" placeholder="Hemanth Kumar" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="p-label" htmlFor="ps-dob">DATE OF BIRTH</label>
                  <input id="ps-dob" className="p-input" type="date" value={dob} max={new Date().toISOString().split("T")[0]} onChange={(e) => setDob(e.target.value)} style={{ colorScheme: "dark" }} />
                </div>
              </div>
              <div>
                <label className="p-label" htmlFor="ps-college">COLLEGE / UNIVERSITY</label>
                <input id="ps-college" className="p-input" placeholder="Sapthagiri College of Engineering" maxLength={100} value={college} onChange={(e) => setCollege(e.target.value)} />
              </div>
              <div>
                <label className="p-label" htmlFor="ps-loc">LOCATION</label>
                <input id="ps-loc" className="p-input" placeholder="Bengaluru, Karnataka" maxLength={80} value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Academic ── */}
        {step === 2 && (
          <div style={{ animation: "slideIn 0.3s ease both" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Academic Details</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Your education background</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="p-label" htmlFor="ps-branch">BRANCH / DEPARTMENT</label>
                  <input id="ps-branch" className="p-input" placeholder="Information Science & Engineering" maxLength={80} value={branch} onChange={(e) => setBranch(e.target.value)} />
                </div>
                <div>
                  <label className="p-label" htmlFor="ps-year">GRADUATION YEAR</label>
                  <select id="ps-year" className="p-input" value={gradYear} onChange={(e) => setGradYear(e.target.value)}>
                    <option value="">Select year</option>
                    {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="p-label" htmlFor="ps-cgpa">CGPA / PERCENTAGE</label>
                <input id="ps-cgpa" className="p-input" placeholder="8.5 CGPA or 85%" maxLength={12} value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
              </div>

              <div>
                <label className="p-label">EXPERIENCE LEVEL</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <button type="button" key={level} className={`chip ${experience === level ? "active" : "inactive"}`}
                      onClick={() => setExperience(level)}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Career ── */}
        {step === 3 && (
          <div style={{ animation: "slideIn 0.3s ease both" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Career Goals</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>Help us personalize your prep</p>

            {/* Target role */}
            <div style={{ marginBottom: 20 }}>
              <label className="p-label">TARGET JOB ROLE</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 }}>
                {JOB_ROLES.map((role) => (
                  <div key={role} className={`role-card ${targetRole === role ? "selected" : ""}`}
                    onClick={() => setTargetRole(targetRole === role ? "" : role)}>
                    {role}
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div style={{ marginBottom: 20 }}>
              <label className="p-label">SKILLS <span style={{ opacity: 0.6 }}>({skills.length}/{MAX_SKILLS})</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 10 }}>
                {SKILL_OPTIONS.map((skill) => (
                  <button type="button" key={skill} className={`chip ${skills.includes(skill) ? "active" : "inactive"}`}
                    onClick={() => toggleSkill(skill)}>
                    {skills.includes(skill) ? "✓ " : ""}{skill}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input className="p-input" data-noenter="1" placeholder="Add custom skill (comma separated)…" maxLength={80}
                  value={customSkill} onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); addSkills(customSkill); }
                  }} style={{ flex: 1 }} />
                <button type="button" onClick={() => addSkills(customSkill)}
                  style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(124,111,255,0.3)", background: "rgba(124,111,255,0.1)", color: "#A78BFA", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  + Add
                </button>
              </div>

              {customSkills.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {customSkills.map((s) => (
                    <span key={s} style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 99,
                      background: "rgba(168,85,247,0.15)", color: "#C084FC",
                      border: "1px solid rgba(168,85,247,0.25)",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {s}
                      <span onClick={() => setSkills((prev) => prev.filter((sk) => sk !== s))}
                        style={{ cursor: "pointer", opacity: 0.6, fontSize: 10 }}>✕</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Links (moved here from step 2 — they belong with career info) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="p-label" htmlFor="ps-gh">GITHUB PROFILE</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "rgba(255,255,255,0.25)", pointerEvents: "none" }}>github.com/</span>
                  <input id="ps-gh" className="p-input" placeholder="yourusername (or paste the full link)" value={github} onChange={(e) => setGithub(e.target.value)} onBlur={() => setGithub(cleanGithub(github))} style={{ paddingLeft: 100 }} />
                </div>
              </div>
              <div>
                <label className="p-label" htmlFor="ps-li">LINKEDIN PROFILE</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "rgba(255,255,255,0.25)", pointerEvents: "none" }}>linkedin.com/in/</span>
                  <input id="ps-li" className="p-input" placeholder="yourusername (or paste the full link)" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} onBlur={() => setLinkedin(cleanLinkedin(linkedin))} style={{ paddingLeft: 120 }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 18, padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", fontSize: 12, color: "#F87171", lineHeight: 1.5 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, gap: 10 }}>
          {step > 1 ? (
            <button type="button" className="ghost-btn" onClick={goBack}>← Back</button>
          ) : isEditing && onCancel ? (
            <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
          ) : <div />}

          {step < 3 ? (
            <button type="button" className="primary-btn" onClick={goNext}>Continue →</button>
          ) : (
            <button type="button" className="primary-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : isEditing ? "Save changes" : "Start your prep →"}
            </button>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          Step {step} of 3
        </div>
      </div>
    </div>
  );
}