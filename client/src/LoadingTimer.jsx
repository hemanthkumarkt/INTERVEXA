import { useState, useEffect, useRef } from "react";

export default function LoadingTimer({ message, submessage, icon = "⏳" }) {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef(null);

  // ✅ Timer only starts when component MOUNTS (i.e. when loading=true shows it)
  // and stops when it UNMOUNTS (i.e. when loading=false hides it)
  useEffect(() => {
    setSeconds(0);
    ref.current = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(ref.current); // ✅ cleans up when loading ends
  }, []);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${String(sec).padStart(2,"0")}s` : `${sec}s`;
  };

  const dots = ".".repeat((seconds % 3) + 1);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 24px", textAlign: "center",
      borderRadius: 16, border: "1px solid rgba(124,111,255,0.15)",
      background: "rgba(124,111,255,0.04)",
    }}>
      <style>{`
        @keyframes timerSpin {
          from { stroke-dashoffset: 264; }
          to   { stroke-dashoffset: -264; }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>

      <div style={{ position: "relative", width: 100, height: 100, marginBottom: 24 }}>
        <svg width="100" height="100" style={{ position: "absolute", top: 0, left: 0 }}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(124,111,255,0.1)" strokeWidth="5"/>
          <circle cx="50" cy="50" r="42" fill="none" stroke="#7C6FFF" strokeWidth="5"
            strokeDasharray="264" strokeDashoffset="180"
            strokeLinecap="round" transform="rotate(-90 50 50)"
            style={{ animation: "timerSpin 1.5s linear infinite" }}/>
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 20 }}>{icon}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#A78BFA", marginTop: 2 }}>{fmt(seconds)}</div>
        </div>
      </div>

      <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>
        {message}{dots}
      </div>
      {submessage && (
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, maxWidth: 340 }}>
          {submessage}
        </div>
      )}

      <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.2)", animation: "pulse 2s ease-in-out infinite" }}>
        {seconds < 5 ? "Starting up…" : seconds < 15 ? "Processing your request…" : seconds < 30 ? "Almost there…" : "Taking a bit longer than usual…"}
      </div>
    </div>
  );
}