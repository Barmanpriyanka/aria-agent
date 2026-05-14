import { useState, useRef, useCallback, useEffect } from "react";

const ACCEPTED_EXT =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.webp,.svg,.py,.js,.ts,.jsx,.tsx,.html,.css,.yaml,.yml,.xml,.sh";

const MAX_FILE_MB = 20;

function getFileIcon(file) {
  const t = file.type || "";
  const n = file.name || "";
  if (t.includes("pdf") || n.endsWith(".pdf")) return { icon: "📋", color: "#f56565", label: "PDF" };
  if (t.startsWith("image/")) return { icon: "🖼️", color: "#00d9f5", label: "IMAGE" };
  if (t.includes("word") || n.endsWith(".docx") || n.endsWith(".doc")) return { icon: "📄", color: "#4299e1", label: "WORD" };
  if (t.includes("sheet") || n.endsWith(".xlsx") || n.endsWith(".csv")) return { icon: "📊", color: "#48bb78", label: "SHEET" };
  if (n.match(/\.(py|js|ts|jsx|tsx|html|css|json|yaml|yml|xml|sh)$/)) return { icon: "💻", color: "#b794f4", label: "CODE" };
  return { icon: "📝", color: "#00f5a0", label: "TEXT" };
}

const BADGES = [
  { icon: "📋", label: "PDF",  color: "#f56565", priority: 1 },
  { icon: "📄", label: "DOCX", color: "#4299e1", priority: 1 },
  { icon: "📊", label: "XLSX", color: "#48bb78", priority: 1 },
  { icon: "🖼️", label: "IMG",  color: "#00d9f5", priority: 2 },
  { icon: "💻", label: "CODE", color: "#b794f4", priority: 2 },
  { icon: "📝", label: "TXT",  color: "#00f5a0", priority: 3 },
];

function useBreakpoint() {
  const getSize = () => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    if (w < 400) return "xs";
    if (w < 600) return "sm";
    if (w < 900) return "md";
    return "lg";
  };
  const [size, setSize] = useState(getSize);
  useEffect(() => {
    const handler = () => setSize(getSize());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return size;
}

export default function FileUploadZone({ onFiles, onClose, uploading }) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);
  const bp = useBreakpoint();

  const validateAndAdd = useCallback(
    (files) => {
      const valid = [];
      const errs = [];
      for (const file of files) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          errs.push(`${file.name} exceeds ${MAX_FILE_MB}MB limit`);
          continue;
        }
        valid.push(file);
      }
      setErrors(errs);
      if (valid.length > 0) onFiles(valid);
    },
    [onFiles]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      validateAndAdd(Array.from(e.dataTransfer.files));
    },
    [validateAndAdd]
  );

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleInput = (e) => validateAndAdd(Array.from(e.target.files));

  // Responsive values
  const isXs = bp === "xs";
  const isSm = bp === "sm" || bp === "xs";
  const zonePadding = isXs ? "12px 10px" : isSm ? "16px 12px" : "20px 16px";
  const iconSize = isXs ? 22 : isSm ? 24 : 28;
  const labelFontSize = isXs ? 10 : isSm ? 11 : 12;
  const hintFontSize = isXs ? 8 : 9;
  const badgeMinPriority = isXs ? 1 : isSm ? 2 : 3; // show fewer badges on small screens
  const visibleBadges = BADGES.filter((b) => b.priority <= badgeMinPriority);
  const badgePadding = isXs ? "2px 6px" : "3px 8px";
  const badgeFontSize = isXs ? 8 : 9;

  return (
    <div
      style={{
        borderTop: "1px solid rgba(0,245,160,0.08)",
        padding: isXs ? "8px 10px" : isSm ? "10px 12px" : "12px 16px",
        background: "rgba(8,12,20,0.98)",
        flexShrink: 0,
        animation: "slideUp 0.2s ease",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spinDot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(0.4);opacity:0.3} }
      `}</style>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload files — click or drag and drop"
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${isDragging ? "rgba(0,245,160,0.6)" : "rgba(0,245,160,0.15)"}`,
          borderRadius: 12,
          padding: zonePadding,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isXs ? 6 : 8,
          cursor: "pointer",
          background: isDragging ? "rgba(0,245,160,0.04)" : "rgba(255,255,255,0.01)",
          transition: "all 0.2s",
          userSelect: "none",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXT}
          onChange={handleInput}
          style={{ display: "none" }}
        />

        {uploading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#00f5a0",
                  animation: `spinDot 1s ease ${i * 0.2}s infinite`,
                }}
              />
            ))}
            <span
              style={{
                fontSize: labelFontSize,
                color: "#00f5a0",
                letterSpacing: "0.1em",
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              PROCESSING…
            </span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: iconSize, opacity: 0.5, lineHeight: 1 }}>📁</div>

            <div
              style={{
                fontSize: labelFontSize,
                color: isDragging ? "#00f5a0" : "#4a5568",
                letterSpacing: "0.08em",
                fontFamily: "'IBM Plex Mono', monospace",
                textAlign: "center",
              }}
            >
              {isDragging
                ? "DROP TO ATTACH"
                : isSm
                ? "TAP TO BROWSE FILES"
                : "DRAG FILES HERE  ·  OR CLICK TO BROWSE"}
            </div>

            <div
              style={{
                fontSize: hintFontSize,
                color: "#2d3748",
                letterSpacing: "0.07em",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {isXs
                ? `Max ${MAX_FILE_MB}MB per file`
                : `PDF · DOCX · XLSX · CSV · Images · Code · Text  ·  Max ${MAX_FILE_MB}MB`}
            </div>

            {/* Badges */}
            <div
              style={{
                display: "flex",
                gap: isXs ? 4 : 5,
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: isXs ? 2 : 4,
              }}
            >
              {visibleBadges.map(({ icon, label, color }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: badgePadding,
                    borderRadius: 5,
                    fontSize: badgeFontSize,
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${color}22`,
                    color,
                    fontFamily: "'IBM Plex Mono', monospace",
                    letterSpacing: "0.06em",
                  }}
                >
                  <span style={{ fontSize: badgeFontSize + 2 }}>{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {errors.map((e, i) => (
            <div
              key={i}
              style={{
                fontSize: isXs ? 9 : 10,
                color: "#f56565",
                padding: "4px 8px",
                background: "rgba(245,101,101,0.06)",
                borderRadius: 6,
                fontFamily: "'IBM Plex Mono', monospace",
                marginTop: 4,
                wordBreak: "break-word",
              }}
            >
              ⚠ {e}
            </div>
          ))}
        </div>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          display: "block",
          margin: `${isXs ? 6 : 8}px auto 0`,
          fontSize: isXs ? 8 : 9,
          color: "#2d3748",
          background: "none",
          border: "none",
          cursor: "pointer",
          letterSpacing: "0.1em",
          fontFamily: "'IBM Plex Mono', monospace",
          padding: "4px 8px",
          minHeight: 32, // tap target
        }}
      >
        ✕ CLOSE
      </button>
    </div>
  );
}