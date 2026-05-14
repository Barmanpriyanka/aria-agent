import { useState, useEffect } from "react";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

function AIAvatar({ isSpeaking, isThinking, size = "auto" }) {
  const isMobile = useIsMobile();

  // size: "auto" = scale based on screen, or pass "sm" / "md" / "lg" explicitly
  const scale = size === "sm" || (size === "auto" && isMobile) ? 0.62
    : size === "md" ? 0.82
    : 1;

  const svgW = Math.round(140 * scale);
  const svgH = Math.round(230 * scale);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? 6 : 10 }}>
      <style>{`
        @keyframes eyeBlink    { 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.05)} }
        @keyframes eyeGlow     { 0%,100%{opacity:0.7} 50%{opacity:1} }
        @keyframes eyeGlowFast { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes bodyFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes headBob     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1.5px)} }
        @keyframes antPulse    { 0%,100%{r:3;opacity:0.5} 50%{r:4.5;opacity:1} }
        @keyframes antFast     { 0%,100%{r:3;opacity:0.4} 50%{r:5;opacity:1} }
        @keyframes chestPulse  { 0%,100%{opacity:0.45} 50%{opacity:1} }
        @keyframes chestFast   { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes speakMouth  { 0%,100%{ry:2} 50%{ry:6} }
        @keyframes thinkPupil  { 0%,100%{transform:translateX(0)} 33%{transform:translateX(2px)} 66%{transform:translateX(-2px)} }
        @keyframes scanLine    { 0%{transform:translateY(-30px);opacity:0} 40%{opacity:0.5} 100%{transform:translateY(30px);opacity:0} }
        @keyframes waveBarRobot{ 0%{transform:scaleY(0.25)} 100%{transform:scaleY(1)} }
        @keyframes ringPulse   { 0%,100%{opacity:0.4} 50%{opacity:0.85} }
      `}</style>

      {/* Outer glow ring + SVG */}
      <div style={{
        position: "relative",
        width: svgW,
        height: svgH,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {/* Animated ring */}
        <div style={{
          position: "absolute",
          inset: isSpeaking ? -6 : -3,
          borderRadius: Math.round(24 * scale),
          border: `${scale < 0.8 ? 1 : 1.5}px solid ${
            isSpeaking  ? "rgba(0,245,160,0.55)"
            : isThinking ? "rgba(0,217,245,0.45)"
            : "rgba(255,255,255,0.06)"
          }`,
          animation: isSpeaking  ? "bodyFloat 0.8s ease-in-out infinite"
            : isThinking ? "bodyFloat 1.6s ease-in-out infinite"
            : "none",
          transition: "border-color 0.4s, inset 0.4s",
          pointerEvents: "none",
        }} />

        {/* The robot SVG — viewBox stays at 160×260, we control width/height */}
        <svg
          width={svgW}
          height={svgH}
          viewBox="0 0 160 260"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animation: "bodyFloat 3s ease-in-out infinite", display: "block" }}
        >
          <defs>
            <radialGradient id="rEye" cx="40%" cy="30%">
              <stop offset="0%" stopColor={isThinking ? "#00d9f5" : "#00f5a0"} />
              <stop offset="100%" stopColor={isThinking ? "#005a70" : "#00a060"} />
            </radialGradient>
            <radialGradient id="rChest" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#00d9f5" />
              <stop offset="100%" stopColor="#005a70" />
            </radialGradient>
            <linearGradient id="rBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e2d3d" />
              <stop offset="100%" stopColor="#0f1824" />
            </linearGradient>
            <linearGradient id="rHead" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#243447" />
              <stop offset="100%" stopColor="#111d28" />
            </linearGradient>
          </defs>

          {/* ── Antenna ── */}
          <line x1="80" y1="18" x2="80" y2="6" stroke="#334" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="80" cy="4" r="3" fill={isThinking ? "#00d9f5" : "#00f5a0"}
            style={{ animation: isThinking ? "antFast 0.5s ease-in-out infinite" : "antPulse 1.5s ease-in-out infinite" }} />

          {/* ── Head ── */}
          <g style={{ animation: "headBob 4s ease-in-out infinite" }}>
            <rect x="42" y="18" width="76" height="68" rx="14" fill="url(#rHead)" stroke="#1e3a4a" strokeWidth="1.5"/>
            {/* Ear pieces */}
            <rect x="34" y="30" width="10" height="20" rx="4" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1"/>
            <rect x="116" y="30" width="10" height="20" rx="4" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1"/>
            {/* Scan line */}
            <rect x="42" y="18" width="76" height="5" rx="0" fill="#00d9f518"
              style={{ animation: "scanLine 3s ease-in-out infinite" }} />

            {/* Eye sockets */}
            <ellipse cx="65" cy="50" rx="13" ry="12" fill="#060d14" stroke="#0a4060" strokeWidth="1.5"/>
            <ellipse cx="95" cy="50" rx="13" ry="12" fill="#060d14" stroke="#0a4060" strokeWidth="1.5"/>

            {/* Eyes */}
            <ellipse cx="65" cy="50" rx="9" ry="8.5" fill="url(#rEye)"
              style={{ animation: isSpeaking || isThinking ? "eyeGlowFast 0.5s ease-in-out infinite" : "eyeBlink 4s ease-in-out infinite, eyeGlow 2s ease-in-out infinite" }} />
            <ellipse cx="95" cy="50" rx="9" ry="8.5" fill="url(#rEye)"
              style={{ animation: isSpeaking || isThinking ? "eyeGlowFast 0.5s 0.1s ease-in-out infinite" : "eyeBlink 4s 0.1s ease-in-out infinite, eyeGlow 2s 0.3s ease-in-out infinite" }} />

            {/* Pupils */}
            <circle cx="65" cy="50" r="4" fill="#003322"
              style={{ animation: isThinking ? "thinkPupil 1.2s ease-in-out infinite" : "none" }} />
            <circle cx="95" cy="50" r="4" fill="#003322"
              style={{ animation: isThinking ? "thinkPupil 1.2s 0.3s ease-in-out infinite" : "none" }} />
            {/* Shine */}
            <circle cx="67" cy="48" r="2" fill="rgba(255,255,255,0.55)"/>
            <circle cx="97" cy="48" r="2" fill="rgba(255,255,255,0.55)"/>

            {/* Nose */}
            <rect x="78" y="58" width="4" height="6" rx="2" fill="#0a1a28"/>

            {/* Mouth */}
            <rect x="56" y="69" width="48" height="12" rx="6" fill="#060d14" stroke="#0a4060" strokeWidth="1"/>
            {!isSpeaking && (
              <path d={isThinking ? "M64 75 Q80 72 96 75" : "M62 75 Q80 79 98 75"}
                stroke={isThinking ? "#00d9f5" : "#00f5a0"} strokeWidth="1.5"
                fill="none" strokeLinecap="round"
                style={{ transition: "d 0.3s" }} />
            )}
            {isSpeaking && (
              <ellipse cx="80" cy="75" rx="10" ry="4" fill="#00f5a0"
                style={{ animation: "speakMouth 0.28s ease-in-out infinite" }} />
            )}

            {/* Forehead stripe */}
            <rect x="60" y="22" width="40" height="3" rx="1.5" fill="#00d9f510" stroke="#00d9f520" strokeWidth="0.5"/>
          </g>

          {/* ── Neck ── */}
          <rect x="70" y="86" width="20" height="12" rx="4" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1"/>
          <circle cx="74" cy="92" r="2" fill="#1e3a4a"/>
          <circle cx="86" cy="92" r="2" fill="#1e3a4a"/>

          {/* ── Torso ── */}
          <rect x="32" y="98" width="96" height="90" rx="12" fill="url(#rBody)" stroke="#1e3a4a" strokeWidth="1.5"/>
          <rect x="45" y="110" width="70" height="60" rx="8" fill="#0a1520" stroke="#0d2535" strokeWidth="1"/>

          {/* Chest core */}
          <ellipse cx="80" cy="135" rx="16" ry="16" fill="#06101a" stroke="#0a3040" strokeWidth="1.5"/>
          <ellipse cx="80" cy="135" rx="10" ry="10" fill="url(#rChest)"
            style={{ animation: isSpeaking ? "chestFast 0.4s ease-in-out infinite" : isThinking ? "chestFast 0.6s ease-in-out infinite" : "chestPulse 2s ease-in-out infinite" }} />
          <ellipse cx="80" cy="135" rx="5" ry="5" fill="#00d9f5" opacity="0.9"/>
          <ellipse cx="78" cy="133" rx="2" ry="2" fill="rgba(255,255,255,0.5)"/>

          {/* Side vents */}
          {[0, 7, 14].map(dy => (
            <g key={dy}>
              <rect x="36" y={115 + dy} width="8" height="4" rx="2" fill="#0a1520"/>
              <rect x="116" y={115 + dy} width="8" height="4" rx="2" fill="#0a1520"/>
            </g>
          ))}

          {/* Status dots */}
          {[0, 9, 18].map((dx, i) => (
            <circle key={dx} cx={57 + dx} cy="155" r="3"
              fill={i === 1 ? "#00d9f5" : "#00f5a0"} opacity="0.7"
              style={{ animation: `chestPulse 1.5s ${i * 0.3}s ease-in-out infinite` }} />
          ))}

          {/* Shoulder joints */}
          <ellipse cx="28" cy="110" rx="10" ry="10" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1.5"/>
          <ellipse cx="132" cy="110" rx="10" ry="10" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1.5"/>

          {/* Arms */}
          <rect x="8" y="116" width="18" height="62" rx="9" fill="url(#rBody)" stroke="#1e3a4a" strokeWidth="1"/>
          <rect x="11" y="130" width="12" height="20" rx="3" fill="#0a1520" stroke="#0d2535" strokeWidth="0.5"/>
          <rect x="134" y="116" width="18" height="62" rx="9" fill="url(#rBody)" stroke="#1e3a4a" strokeWidth="1"/>
          <rect x="137" y="130" width="12" height="20" rx="3" fill="#0a1520" stroke="#0d2535" strokeWidth="0.5"/>

          {/* Hands */}
          <rect x="6" y="178" width="22" height="16" rx="8" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1"/>
          <rect x="132" y="178" width="22" height="16" rx="8" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1"/>

          {/* Hips */}
          <rect x="45" y="186" width="70" height="14" rx="6" fill="#0d1f2e" stroke="#1e3a4a" strokeWidth="1"/>

          {/* Legs */}
          <rect x="46" y="198" width="28" height="54" rx="10" fill="url(#rBody)" stroke="#1e3a4a" strokeWidth="1"/>
          <rect x="86" y="198" width="28" height="54" rx="10" fill="url(#rBody)" stroke="#1e3a4a" strokeWidth="1"/>
          <ellipse cx="60" cy="226" rx="12" ry="8" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1"/>
          <ellipse cx="100" cy="226" rx="12" ry="8" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1"/>

          {/* Feet */}
          <rect x="40" y="248" width="38" height="12" rx="6" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1"/>
          <rect x="82" y="248" width="38" height="12" rx="6" fill="#0f1824" stroke="#1e3a4a" strokeWidth="1"/>
        </svg>
      </div>

      {/* Voice waveform bars */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 2 : 3, height: isMobile ? 16 : 24 }}>
        {isSpeaking
          ? [0.6, 1, 0.7, 1.2, 0.5, 1, 0.8, 0.4, 1.1, 0.6, 0.9, 0.5].map((h, i) => (
              <div key={i} style={{
                width: isMobile ? 2 : 3,
                borderRadius: 2,
                background: "linear-gradient(to top, #00f5a0, #00d9f5)",
                height: `${h * (isMobile ? 13 : 20)}px`,
                transformOrigin: "bottom",
                animation: `waveBarRobot ${0.35 + Math.random() * 0.3}s ease-in-out ${i * 0.06}s infinite alternate`,
              }} />
            ))
          : (
            <div style={{
              fontSize: isMobile ? 8 : 9,
              color: "#2d3748",
              letterSpacing: "0.14em",
              fontFamily: "monospace",
            }}>
              {isThinking ? "● ● ●" : "– – –"}
            </div>
          )
        }
      </div>

      {/* Status label */}
      <div style={{
        fontSize: isMobile ? 9 : 10,
        letterSpacing: "0.15em",
        fontFamily: "'IBM Plex Mono', monospace",
        color: isSpeaking ? "#00f5a0" : isThinking ? "#00d9f5" : "#2d3748",
        transition: "color 0.3s",
      }}>
        {isSpeaking ? "SPEAKING" : isThinking ? "THINKING..." : "ARIA"}
      </div>
    </div>
  );
}

export default AIAvatar;