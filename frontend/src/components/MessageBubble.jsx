import { useState } from "react";

// Very lightweight markdown renderer (no external deps)
function renderMarkdown(text) {
  if (!text) return "";
  let html = text
    // Code blocks
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre data-lang="${lang || ""}" style="background:rgba(0,245,160,0.04);border:1px solid rgba(0,245,160,0.1);border-radius:8px;padding:12px 14px;overflow-x:auto;margin:8px 0;font-size:12px;line-height:1.6;color:#a8edca;font-family:'IBM Plex Mono',monospace">${escHtml(code.trim())}</pre>`
    )
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,245,160,0.07);border:1px solid rgba(0,245,160,0.12);border-radius:4px;padding:1px 5px;font-size:12px;color:#00f5a0;font-family:\'IBM Plex Mono\',monospace">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8eaf6;font-weight:600">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em style="color:#a0aec0">$1</em>')
    // Headings h1-h3
    .replace(/^### (.+)$/gm, '<div style="font-size:13px;font-weight:700;color:#00f5a0;margin:12px 0 4px;letter-spacing:0.04em">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:14px;font-weight:700;color:#00f5a0;margin:14px 0 5px;letter-spacing:0.03em">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-size:16px;font-weight:700;color:#00f5a0;margin:16px 0 6px;letter-spacing:0.02em">$1</div>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(0,245,160,0.1);margin:12px 0"/>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<div style="display:flex;gap:8px;margin:2px 0"><span style="color:#00f5a0;flex-shrink:0;margin-top:1px">▸</span><span>$1</span></div>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, (_, item, offset, str) => {
      const num = str.slice(0, offset).split('\n').filter(l => /^\d+\. /.test(l)).length + 1;
      return `<div style="display:flex;gap:8px;margin:2px 0"><span style="color:#00f5a0;flex-shrink:0;min-width:16px;text-align:right;margin-top:1px">${num}.</span><span>${item}</span></div>`;
    })
    // Links
    .replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#00d9f5;text-decoration:underline;text-underline-offset:2px">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, "<br/>");

  return html;
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Streaming cursor blink
function StreamingCursor() {
  return (
    <span style={{
      display: "inline-block", width: 2, height: "1em",
      background: "#00f5a0", marginLeft: 2, verticalAlign: "text-bottom",
      animation: "blink 0.8s step-end infinite",
    }} />
  );
}

export default function MessageBubble({ msg, onSpeak }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";
  const isStreaming = msg.streaming;

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 10, marginBottom: 16,
      animation: "fadeSlideIn 0.25s ease",
    }}>
      {/* Avatar dot */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
        background: isUser
          ? "linear-gradient(135deg, #667eea, #764ba2)"
          : "linear-gradient(135deg, #00f5a0, #00d9f5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: "#000",
        boxShadow: isUser ? "0 2px 10px rgba(102,126,234,0.3)" : "0 2px 10px rgba(0,245,160,0.25)",
      }}>
        {isUser ? "U" : "◈"}
      </div>

      <div style={{ maxWidth: "75%", minWidth: 60 }}>
        {/* File attachments */}
        {msg.fileRefs?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6, justifyContent: isUser ? "flex-end" : "flex-start" }}>
            {msg.fileRefs.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 9px", borderRadius: 7, fontSize: 10,
                background: "rgba(0,217,245,0.07)", border: "1px solid rgba(0,217,245,0.15)",
                color: "#00d9f5", fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {f.preview ? (
                  <img src={f.preview} alt={f.name} style={{ width: 20, height: 20, borderRadius: 3, objectFit: "cover" }} />
                ) : (
                  <span>📎</span>
                )}
                <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          padding: "10px 14px", borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
          background: isUser
            ? "linear-gradient(135deg, rgba(102,126,234,0.18), rgba(118,75,162,0.14))"
            : "rgba(255,255,255,0.03)",
          border: isUser
            ? "1px solid rgba(102,126,234,0.2)"
            : isStreaming ? "1px solid rgba(0,245,160,0.15)" : "1px solid rgba(255,255,255,0.06)",
          fontSize: 13, lineHeight: 1.7, color: "#e8eaf6",
          fontFamily: "'IBM Plex Mono', monospace",
          boxShadow: isStreaming ? "0 0 12px rgba(0,245,160,0.06)" : "none",
          transition: "border-color 0.3s",
          position: "relative",
        }}>
          {isUser ? (
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {msg.content}
            </div>
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || "") + (isStreaming ? "" : "") }}
              style={{ wordBreak: "break-word" }}
            />
          )}
          {isStreaming && <StreamingCursor />}
        </div>

        {/* Action bar */}
        {!isStreaming && msg.content && (
          <div style={{
            display: "flex", gap: 5, marginTop: 4,
            justifyContent: isUser ? "flex-end" : "flex-start",
          }}>
            {[
              { label: copied ? "✓ COPIED" : "COPY", onClick: handleCopy, active: copied },
              !isUser && onSpeak ? { label: "SPEAK", onClick: () => onSpeak(msg.content) } : null,
            ].filter(Boolean).map(({ label, onClick, active }) => (
              <button key={label} onClick={onClick} style={{
                padding: "2px 8px", borderRadius: 4, fontSize: 8,
                fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.07em",
                background: active ? "rgba(0,245,160,0.1)" : "rgba(255,255,255,0.02)",
                border: active ? "1px solid rgba(0,245,160,0.2)" : "1px solid rgba(255,255,255,0.05)",
                color: active ? "#00f5a0" : "#2d3748",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}