import { useState, useEffect } from "react";

function renderMarkdown(text) {
  if (!text) return "";
  function escHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  return text
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre data-lang="${lang || ""}" style="background:rgba(0,245,160,0.04);border:1px solid rgba(0,245,160,0.1);border-radius:8px;padding:10px 12px;overflow-x:auto;margin:8px 0;font-size:11px;line-height:1.6;color:#a8edca;font-family:'IBM Plex Mono',monospace;max-width:100%;white-space:pre-wrap;word-break:break-all">${escHtml(code.trim())}</pre>`
    )
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,245,160,0.07);border:1px solid rgba(0,245,160,0.12);border-radius:4px;padding:1px 5px;font-size:11px;color:#00f5a0;font-family:\'IBM Plex Mono\',monospace;word-break:break-word">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8eaf6;font-weight:600">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#a0aec0">$1</em>')
    .replace(/^### (.+)$/gm, '<div style="font-size:13px;font-weight:700;color:#00f5a0;margin:12px 0 4px;letter-spacing:0.04em">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:14px;font-weight:700;color:#00f5a0;margin:14px 0 5px;letter-spacing:0.03em">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-size:16px;font-weight:700;color:#00f5a0;margin:16px 0 6px;letter-spacing:0.02em">$1</div>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(0,245,160,0.1);margin:12px 0"/>')
    .replace(/^[-*] (.+)$/gm, '<div style="display:flex;gap:8px;margin:2px 0"><span style="color:#00f5a0;flex-shrink:0;margin-top:1px">▸</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, (_, item, offset, str) => {
      const num = str.slice(0, offset).split('\n').filter(l => /^\d+\. /.test(l)).length + 1;
      return `<div style="display:flex;gap:8px;margin:2px 0"><span style="color:#00f5a0;flex-shrink:0;min-width:16px;text-align:right;margin-top:1px">${num}.</span><span>${item}</span></div>`;
    })
    .replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#00d9f5;text-decoration:underline;text-underline-offset:2px;word-break:break-all">$1</a>')
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, "<br/>");
}

function StreamingCursor() {
  return (
    <span style={{
      display: "inline-block", width: 2, height: "1em",
      background: "#00f5a0", marginLeft: 2, verticalAlign: "text-bottom",
      animation: "blink 0.8s step-end infinite",
    }} />
  );
}

function useBreakpoint() {
  const get = () => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    if (w < 400) return "xs";
    if (w < 600) return "sm";
    if (w < 900) return "md";
    return "lg";
  };
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const h = () => setBp(get());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}

export default function MessageBubble({ msg, onSpeak }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";
  const isStreaming = msg.streaming;
  const bp = useBreakpoint();

  const isXs = bp === "xs";
  const isSm = bp === "sm" || bp === "xs";

  // Responsive sizing
  const avatarSize = isXs ? 22 : isSm ? 24 : 28;
  const avatarRadius = isXs ? 6 : 8;
  const avatarFontSize = isXs ? 9 : 11;
  const gap = isXs ? 6 : isSm ? 8 : 10;
  const mb = isXs ? 12 : 16;

  // Bubble max-width: wider on small screens (more of the available space)
  const bubbleMaxWidth = isXs ? "88%" : isSm ? "82%" : "75%";
  const bubblePadding = isXs ? "8px 10px" : isSm ? "9px 12px" : "10px 14px";
  const bubbleFontSize = isXs ? 12 : 13;
  const bubbleLineHeight = isXs ? 1.6 : 1.7;

  // File attachment chips
  const chipFontSize = isXs ? 9 : 10;
  const chipMaxWidth = isXs ? 70 : isSm ? 85 : 100;

  // Action bar
  const actionFontSize = isXs ? 7 : 8;
  const actionPadding = isXs ? "2px 6px" : "2px 8px";

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap,
      marginBottom: mb,
      animation: "fadeSlideIn 0.25s ease",
      width: "100%",
      boxSizing: "border-box",
    }}>
      {/* Avatar */}
      <div style={{
        width: avatarSize,
        height: avatarSize,
        minWidth: avatarSize,
        borderRadius: avatarRadius,
        flexShrink: 0,
        marginTop: 2,
        background: isUser
          ? "linear-gradient(135deg, #667eea, #764ba2)"
          : "linear-gradient(135deg, #00f5a0, #00d9f5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: avatarFontSize,
        fontWeight: 700,
        color: "#000",
        boxShadow: isUser
          ? "0 2px 10px rgba(102,126,234,0.3)"
          : "0 2px 10px rgba(0,245,160,0.25)",
      }}>
        {isUser ? "U" : "◈"}
      </div>

      <div style={{
        maxWidth: bubbleMaxWidth,
        minWidth: 60,
        minWidth: 0, // allow shrink
        display: "flex",
        flexDirection: "column",
      }}>
        {/* File attachments */}
        {msg.fileRefs?.length > 0 && (
          <div style={{
            display: "flex",
            gap: isXs ? 4 : 6,
            flexWrap: "wrap",
            marginBottom: isXs ? 4 : 6,
            justifyContent: isUser ? "flex-end" : "flex-start",
          }}>
            {msg.fileRefs.map((f, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: isXs ? "3px 7px" : "4px 9px",
                borderRadius: 7,
                fontSize: chipFontSize,
                background: "rgba(0,217,245,0.07)",
                border: "1px solid rgba(0,217,245,0.15)",
                color: "#00d9f5",
                fontFamily: "'IBM Plex Mono', monospace",
                minWidth: 0,
              }}>
                {f.preview ? (
                  <img
                    src={f.preview}
                    alt={f.name}
                    style={{ width: isXs ? 16 : 20, height: isXs ? 16 : 20, borderRadius: 3, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <span style={{ fontSize: chipFontSize + 1 }}>📎</span>
                )}
                <span style={{
                  maxWidth: chipMaxWidth,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {f.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          padding: bubblePadding,
          borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
          background: isUser
            ? "linear-gradient(135deg, rgba(102,126,234,0.18), rgba(118,75,162,0.14))"
            : "rgba(255,255,255,0.03)",
          border: isUser
            ? "1px solid rgba(102,126,234,0.2)"
            : isStreaming
            ? "1px solid rgba(0,245,160,0.15)"
            : "1px solid rgba(255,255,255,0.06)",
          fontSize: bubbleFontSize,
          lineHeight: bubbleLineHeight,
          color: "#e8eaf6",
          fontFamily: "'IBM Plex Mono', monospace",
          boxShadow: isStreaming ? "0 0 12px rgba(0,245,160,0.06)" : "none",
          transition: "border-color 0.3s",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          minWidth: 0,
        }}>
          {isUser ? (
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {msg.content}
            </div>
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || "") }}
              style={{ wordBreak: "break-word", minWidth: 0 }}
            />
          )}
          {isStreaming && <StreamingCursor />}
        </div>

        {/* Action bar */}
        {!isStreaming && msg.content && (
          <div style={{
            display: "flex",
            gap: isXs ? 4 : 5,
            marginTop: isXs ? 3 : 4,
            justifyContent: isUser ? "flex-end" : "flex-start",
            flexWrap: "wrap",
          }}>
            {[
              { label: copied ? "✓ COPIED" : "COPY", onClick: handleCopy, active: copied },
              !isUser && onSpeak ? { label: "SPEAK", onClick: () => onSpeak(msg.content) } : null,
            ].filter(Boolean).map(({ label, onClick, active }) => (
              <button
                key={label}
                onClick={onClick}
                style={{
                  padding: actionPadding,
                  borderRadius: 4,
                  fontSize: actionFontSize,
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.07em",
                  background: active ? "rgba(0,245,160,0.1)" : "rgba(255,255,255,0.02)",
                  border: active ? "1px solid rgba(0,245,160,0.2)" : "1px solid rgba(255,255,255,0.05)",
                  color: active ? "#00f5a0" : "#2d3748",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  minHeight: 28, // tap target
                  minWidth: 36,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}