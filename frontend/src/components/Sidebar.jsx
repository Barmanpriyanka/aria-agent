import { useState, useRef, useEffect } from "react";

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function groupSessions(sessions) {
  const now = Date.now();
  const today = [], yesterday = [], week = [], older = [];
  for (const s of sessions) {
    const diff = now - (s.updatedAt || s.createdAt || 0);
    const days = diff / 86400000;
    if (days < 1) today.push(s);
    else if (days < 2) yesterday.push(s);
    else if (days < 7) week.push(s);
    else older.push(s);
  }
  return [
    { label: "TODAY", items: today },
    { label: "YESTERDAY", items: yesterday },
    { label: "LAST 7 DAYS", items: week },
    { label: "OLDER", items: older },
  ].filter(g => g.items.length > 0);
}

export default function Sidebar({
  sessions, activeSessionId,
  onSelect, onCreate, onDelete, onRename, onClose,
}) {
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [hoveredId, setHoveredId] = useState(null);
  const renameRef = useRef(null);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const filtered = search.trim()
    ? sessions.filter(s => s.title?.toLowerCase().includes(search.toLowerCase()))
    : sessions;

  const groups = groupSessions(filtered);

  const startRename = (s, e) => {
    e.stopPropagation();
    setRenamingId(s.id);
    setRenameValue(s.title || "New Chat");
  };

  const commitRename = (id) => {
    if (renameValue.trim()) onRename(id, renameValue.trim());
    setRenamingId(null);
  };

  const handleRenameKey = (e, id) => {
    if (e.key === "Enter") commitRename(id);
    if (e.key === "Escape") setRenamingId(null);
  };

  const msgCount = (s) => s.messages?.length || 0;

  return (
    <div style={{
      width: 260, height: "100vh", display: "flex", flexDirection: "column",
      background: "rgba(6,9,16,0.98)", overflow: "hidden",
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .sess-item:hover .sess-actions { opacity: 1 !important; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "14px 14px 10px",
        borderBottom: "1px solid rgba(0,245,160,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
            background: "linear-gradient(90deg, #00f5a0, #00d9f5)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            CONVERSATIONS
          </div>
          <button onClick={onClose} style={{
            width: 22, height: 22, borderRadius: 5, fontSize: 11,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            color: "#4a5568", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }} title="Close sidebar">✕</button>
        </div>

        {/* New chat button */}
        <button onClick={onCreate} style={{
          width: "100%", padding: "8px 0", borderRadius: 9, fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em",
          background: "linear-gradient(135deg, rgba(0,245,160,0.12), rgba(0,217,245,0.08))",
          border: "1px solid rgba(0,245,160,0.2)", color: "#00f5a0",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          transition: "all 0.2s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,245,160,0.18), rgba(0,217,245,0.12))"}
          onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,245,160,0.12), rgba(0,217,245,0.08))"}
        >
          <span style={{ fontSize: 14 }}>+</span> NEW CHAT
        </button>

        {/* Search */}
        <div style={{ position: "relative", marginTop: 8 }}>
          <span style={{
            position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
            fontSize: 11, color: "#2d3748", pointerEvents: "none",
          }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats…"
            style={{
              width: "100%", padding: "6px 10px 6px 26px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 7, color: "#e8eaf6", fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace", outline: "none",
            }}
          />
        </div>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px 8px" }}>
        {sessions.length === 0 ? (
          <div style={{
            padding: "32px 16px", textAlign: "center",
            fontSize: 10, color: "#1a2030", letterSpacing: "0.1em",
          }}>
            NO CONVERSATIONS YET<br />
            <span style={{ color: "#2d3748", marginTop: 4, display: "block" }}>
              Start a new chat above
            </span>
          </div>
        ) : groups.length === 0 ? (
          <div style={{ padding: "20px 12px", fontSize: 10, color: "#2d3748", textAlign: "center" }}>
            No results for "{search}"
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <div style={{
                fontSize: 8, color: "#1a2030", letterSpacing: "0.14em",
                padding: "8px 8px 4px", fontWeight: 600,
              }}>{group.label}</div>

              {group.items.map(session => {
                const isActive = session.id === activeSessionId;
                const isRenaming = renamingId === session.id;
                const lastMsg = session.messages?.[session.messages.length - 1];

                return (
                  <div
                    key={session.id}
                    className="sess-item"
                    onClick={() => !isRenaming && onSelect(session.id)}
                    onMouseEnter={() => setHoveredId(session.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      padding: "8px 10px", borderRadius: 9, cursor: "pointer",
                      marginBottom: 2, position: "relative",
                      background: isActive
                        ? "rgba(0,245,160,0.07)"
                        : hoveredId === session.id ? "rgba(255,255,255,0.03)" : "transparent",
                      border: isActive
                        ? "1px solid rgba(0,245,160,0.15)"
                        : "1px solid transparent",
                      transition: "all 0.15s",
                      animation: "fadeIn 0.2s ease",
                    }}
                  >
                    {isRenaming ? (
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(session.id)}
                        onKeyDown={e => handleRenameKey(e, session.id)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: "100%", background: "rgba(0,245,160,0.05)",
                          border: "1px solid rgba(0,245,160,0.3)", borderRadius: 5,
                          color: "#e8eaf6", fontSize: 11, padding: "3px 7px",
                          fontFamily: "'IBM Plex Mono', monospace", outline: "none",
                        }}
                      />
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                          <div style={{
                            fontSize: 11, color: isActive ? "#00f5a0" : "#a0aec0",
                            fontWeight: isActive ? 600 : 400,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            flex: 1, lineHeight: 1.4,
                          }}>
                            {session.title || "New Chat"}
                          </div>

                          {/* Action buttons — shown on hover */}
                          <div className="sess-actions" style={{
                            display: "flex", gap: 3, flexShrink: 0,
                            opacity: hoveredId === session.id || isActive ? 1 : 0,
                            transition: "opacity 0.15s",
                          }}>
                            <button
                              onClick={e => startRename(session, e)}
                              title="Rename"
                              style={{
                                width: 18, height: 18, borderRadius: 4, fontSize: 10,
                                background: "rgba(255,255,255,0.05)", border: "none",
                                color: "#4a5568", cursor: "pointer", display: "flex",
                                alignItems: "center", justifyContent: "center",
                              }}
                            >✎</button>
                            <button
                              onClick={e => { e.stopPropagation(); onDelete(session.id); }}
                              title="Delete"
                              style={{
                                width: 18, height: 18, borderRadius: 4, fontSize: 10,
                                background: "rgba(245,101,101,0.08)", border: "none",
                                color: "#f56565", cursor: "pointer", display: "flex",
                                alignItems: "center", justifyContent: "center",
                              }}
                            >✕</button>
                          </div>
                        </div>

                        {/* Preview of last message */}
                        {lastMsg && (
                          <div style={{
                            fontSize: 9, color: "#2d3748", marginTop: 2,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            lineHeight: 1.4,
                          }}>
                            {lastMsg.role === "assistant" ? "◈ " : "↑ "}
                            {lastMsg.content?.slice(0, 50) || "…"}
                          </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 8, color: "#1a2030" }}>
                            {timeAgo(session.updatedAt || session.createdAt)}
                          </span>
                          {msgCount(session) > 0 && (
                            <span style={{
                              fontSize: 8, color: "#1a2030",
                              background: "rgba(255,255,255,0.03)",
                              padding: "1px 5px", borderRadius: 3,
                            }}>
                              {msgCount(session)} msg{msgCount(session) !== 1 ? "s" : ""}
                            </span>
                          )}
                          {session.messages?.some(m => m.fileRefs?.length > 0) && (
                            <span style={{ fontSize: 8, color: "#00d9f5" }}>📎</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 14px",
        borderTop: "1px solid rgba(0,245,160,0.05)",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: "#1a2030", letterSpacing: "0.08em", textAlign: "center" }}>
          {sessions.length} SESSION{sessions.length !== 1 ? "S" : ""} · STORED LOCALLY
        </div>
      </div>
    </div>
  );
}