import { useState, useEffect } from "react";
import { auth, db, storage } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import ProfileSetup from "./Profilesetup.jsx";
import ResumeAnalyzer from "./ResumeAnalyzer";
import AptitudeRound from "./AptitudeRound";
import CodingRound from "./CodingRound";
import MockInterview from "./MockInterview";
import ProgressPage from "./ProgressPage";

const EMPTY_PROFILE = {
  name: "", college: "", location: "", dob: "", skills: [], imageUrl: "",
  gradYear: "", cgpa: "", branch: "", experience: "Fresher",
  targetRole: "", github: "", linkedin: "",
};

// Firestore timestamp → millis (null = just written, not resolved yet)
const ms = (d) => (d === null ? Date.now() : d?.toMillis?.() ?? 0);

function App() {
  const [user, setUser]                         = useState(null);
  const [profile, setProfile]                   = useState(EMPTY_PROFILE);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [isEditing, setIsEditing]               = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [loadError, setLoadError]               = useState("");
  const [activePage, setActivePage]             = useState("Dashboard");
  const [history, setHistory]                   = useState([]);

  const { name, college, skills, imageUrl, targetRole } = profile;

  // ── Load profile (used on login and by the Retry button) ───────────────────
  const loadProfile = async (currentUser) => {
    setLoading(true);
    setLoadError("");
    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          ...EMPTY_PROFILE, ...data,
          skills: Array.isArray(data.skills) ? data.skills : [],
          experience: data.experience || "Fresher",
        });
        setProfileCompleted(true);
      } else {
        setProfile(EMPTY_PROFILE);
        setProfileCompleted(false);
      }
    } catch (err) {
      // Don't fall through to ProfileSetup here — saving would overwrite a real profile with blanks
      console.error("Profile load failed:", err);
      setLoadError(err.message || "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  };

  // ── Auth state ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadProfile(currentUser);
      } else {
        // Reset EVERYTHING so the next person who logs in never sees the previous user's data
        setUser(null);
        setProfile(EMPTY_PROFILE);
        setProfileCompleted(false);
        setIsEditing(false);
        setHistory([]);
        setActivePage("Dashboard");
        setLoadError("");
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // ── Live attempt history (updates the moment a module saves a result) ──────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "attempts"),
      (snap) => {
        setHistory(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.date) - ms(a.date))
        );
      },
      (err) => console.error("History listener failed:", err)
    );
    return unsub;
  }, [user?.uid]);

  // ── Save profile ───────────────────────────────────────────────────────────
  // Errors are re-thrown on purpose: ProfileSetup shows them inline and re-enables the button
  const handleSaveProfile = async (data) => {
    let finalImageUrl = data.imageUrl ?? profile.imageUrl ?? ""; // "" = user removed the photo

    if (data.imageFile) {
      const imageRef = ref(storage, `profileImages/${user.uid}`);
      await uploadBytes(imageRef, data.imageFile, { contentType: data.imageFile.type });
      finalImageUrl = await getDownloadURL(imageRef);
    }

    const profileData = {
      name:       data.name       || "",
      college:    data.college    || "",
      location:   data.location   || "",
      dob:        data.dob        || "",
      skills:     data.skills     || [],
      imageUrl:   finalImageUrl,
      gradYear:   data.gradYear   || "",
      cgpa:       data.cgpa       || "",
      branch:     data.branch     || "",
      experience: data.experience || "Fresher",
      targetRole: data.targetRole || "",
      github:     data.github     || "",
      linkedin:   data.linkedin   || "",
    };

    // merge: true keeps any other fields on the user document
    await setDoc(doc(db, "users", user.uid), { ...profileData, updatedAt: serverTimestamp() }, { merge: true });

    setProfile(profileData);
    setProfileCompleted(true);
    setIsEditing(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#09090f", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
        <div style={{ background: "linear-gradient(135deg, #7C6FFF, #A855F7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700, fontSize: 18 }}>
          Intervexa
        </div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 6 }}>Loading...</div>
      </div>
    </div>
  );

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!user) return <LoginPage />;

  // ── Profile couldn't be loaded (network / rules) — offer retry, don't show setup ──
  if (loadError) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#09090f", fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 380, padding: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Couldn't load your profile</div>
        <div style={{ fontSize: 12, color: "#F87171", marginBottom: 20, lineHeight: 1.6 }}>{loadError}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => loadProfile(user)} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7C6FFF,#A855F7)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Retry</button>
          <button onClick={() => signOut(auth)} style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer" }}>Sign out</button>
        </div>
      </div>
    </div>
  );

  // ── Profile setup ──────────────────────────────────────────────────────────
  if (!profileCompleted || isEditing) return (
    <ProfileSetup
      user={user}
      onSave={handleSaveProfile}
      onCancel={() => setIsEditing(false)}
      isEditing={isEditing}
      existingData={{ ...profile, name: profile.name || user.displayName || "" }}
    />
  );

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <Dashboard
      user={user}
      name={name}
      college={college}
      skills={skills}
      imageUrl={imageUrl}
      targetRole={targetRole}
      history={history}
      setHistory={setHistory}
      activePage={activePage}
      setActivePage={setActivePage}
      onEditProfile={() => setIsEditing(true)}
      onSignOut={() => signOut(auth)}
    >
      {/* activePage values must match the ones used in Dashboard.jsx */}
      {activePage === "Resume_active"    && <ResumeAnalyzer user={user} skills={skills} />}
      {activePage === "Aptitude_active"  && <AptitudeRound user={user} />}
      {activePage === "Coding_active"    && <CodingRound user={user} />}
      {activePage === "Interview_active" && <MockInterview user={user} skills={skills} name={name} targetRole={targetRole} />}
      {activePage === "Progress_active"  && <ProgressPage user={user} history={history} />}
    </Dashboard>
  );
}

export default App;