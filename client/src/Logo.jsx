// Intervexa Logo Component
// Usage: <Logo size="md" /> or <Logo size="sm" /> or <Logo size="lg" /> or <Logo iconOnly />

export default function Logo({ size = "md", iconOnly = false, light = false }) {
  const sizes = {
    sm: { icon: 28, font: 16, sub: 8, gap: 10 },
    md: { icon: 36, font: 22, sub: 10, gap: 12 },
    lg: { icon: 48, font: 30, sub: 11, gap: 16 },
  };
  const s = sizes[size] || sizes.md;
  const textColor = light ? "#1a0a3d" : "#ffffff";
  const subColor  = light ? "#8B7BAA" : "rgba(255,255,255,0.4)";
  const hexStroke = light ? "#7C6FFF" : "rgba(255,255,255,0.5)";
  const hexFill   = light ? "rgba(124,111,255,0.12)" : "rgba(255,255,255,0.08)";
  const lineColor = light ? "#6D28D9" : "#ffffff";
  const dotColor  = light ? "#7C6FFF" : "#C4B5FD";

  const hw = s.icon;
  const cx = hw / 2;
  // Hexagon points
  const hex = (r, cy2) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(`${cx + r * Math.cos(angle)},${cy2 + r * Math.sin(angle)}`);
    }
    return pts.join(" ");
  };
  const cy = hw / 2;
  const outerR = hw * 0.46;
  const innerR = hw * 0.36;
  const v1y1 = cy - hw * 0.22;
  const v1y2 = cy + hw * 0.12;
  const v2y1 = cy - hw * 0.06;
  const v2y2 = cy + hw * 0.18;
  const vx1 = cx - hw * 0.26;
  const vx2 = cx + hw * 0.26;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: s.gap, userSelect: "none" }}>
      {/* Icon */}
      <svg width={hw} height={hw} viewBox={`0 0 ${hw} ${hw}`} style={{ flexShrink: 0 }}>
        <polygon points={hex(outerR, cy)} fill={hexFill} />
        <polygon points={hex(innerR, cy)} fill="none" stroke={hexStroke} strokeWidth="1.2" />
        <polyline
          points={`${vx1},${v1y1} ${cx},${v1y2} ${vx2},${v1y1}`}
          fill="none" stroke={lineColor} strokeWidth={hw * 0.065}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <polyline
          points={`${vx1 + hw*0.1},${v2y1} ${cx},${v2y2} ${vx2 - hw*0.1},${v2y1}`}
          fill="none" stroke={hexStroke} strokeWidth={hw * 0.05}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx={cx} cy={cy} r={hw * 0.08} fill={dotColor} />
      </svg>

      {/* Wordmark */}
      {!iconOnly && (
        <div>
          <div style={{
            fontSize: s.font, fontWeight: 700, color: textColor,
            letterSpacing: "-0.03em", lineHeight: 1,
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}>
            Intervexa
          </div>
          <div style={{
            fontSize: s.sub, color: subColor, letterSpacing: "0.1em",
            marginTop: 3, fontFamily: "'Inter', -apple-system, sans-serif",
            fontWeight: 400,
          }}>
            AI-POWERED PLACEMENT PREP
          </div>
        </div>
      )}
    </div>
  );
}