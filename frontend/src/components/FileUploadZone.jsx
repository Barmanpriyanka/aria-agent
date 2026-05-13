import { useState, useRef, useCallback } from "react";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const ACCEPTED_EXT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.webp,.svg,.py,.js,.ts,.jsx,.tsx,.html,.css,.yaml,.yml,.xml,.sh";

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

export default function FileUploadZone({ onFiles, onClose, uploading }) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  const validateAndAdd = useCallback((files) => {
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
  }, [onFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    validateAndAdd(files);
  }, [validateAndAdd]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleInput = (e) => validateAndAdd(Array.from(e.target.files));

  return (
    <div style={{
      borderTop: "1px solid rgba(0,245,160,0.08)",
      padding: "12px 16px",
      background: "rgba(8,12,20,0.98)",
      flexShrink: 0,
      animation: "slideUp 0.2s ease",
    }}>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spinDot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(0.4);opacity:0.3} }
      `}</style>

      {/* Drop area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${isDragging ? "rgba(0,245,160,0.6)" : "rgba(0,245,160,0.15)"}`,
          borderRadius: 12,
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          background: isDragging ? "rgba(0,245,160,0.04)" : "rgba(255,255,255,0.01)",
          transition: "all 0.2s",
          position: "relative",
          userSelect: "none",
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: "50%", background: "#00f5a0",
                animation: `spinDot 1s ease ${i * 0.2}s infinite`,
              }} />
            ))}
            <span style={{ fontSize: 11, color: "#00f5a0", letterSpacing: "0.1em" }}>PROCESSING FILES…</span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 28, opacity: 0.5 }}>📁</div>
            <div style={{ fontSize: 12, color: isDragging ? "#00f5a0" : "#4a5568", letterSpacing: "0.08em", fontFamily: "'IBM Plex Mono', monospace" }}>
              {isDragging ? "DROP TO ATTACH" : "DRAG FILES HERE  ·  OR CLICK TO BROWSE"}
            </div>
            <div style={{ fontSize: 9, color: "#2d3748", letterSpacing: "0.07em", textAlign: "center" }}>
              PDF · DOCX · XLSX · CSV · Images · Code · Text  ·  Max {MAX_FILE_MB}MB per file
            </div>

            {/* File type badges */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
              {[
                { icon: "📋", label: "PDF", color: "#f56565" },
                { icon: "📄", label: "DOCX", color: "#4299e1" },
                { icon: "📊", label: "XLSX", color: "#48bb78" },
                { icon: "🖼️", label: "IMG", color: "#00d9f5" },
                { icon: "💻", label: "CODE", color: "#b794f4" },
                { icon: "📝", label: "TXT", color: "#00f5a0" },
              ].map(({ icon, label, color }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 5, fontSize: 9,
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${color}22`,
                  color,
                  fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.06em",
                }}>
                  <span>{icon}</span>{label}
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
            <div key={i} style={{
              fontSize: 10, color: "#f56565", padding: "4px 8px",
              background: "rgba(245,101,101,0.06)", borderRadius: 6,
              fontFamily: "'IBM Plex Mono', monospace", marginTop: 4,
            }}>⚠ {e}</div>
          ))}
        </div>
      )}

      {/* Close */}
      <button onClick={onClose} style={{
        display: "block", margin: "8px auto 0",
        fontSize: 9, color: "#2d3748", background: "none",
        border: "none", cursor: "pointer", letterSpacing: "0.1em",
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        ✕ CLOSE
      </button>
    </div>
  );
}