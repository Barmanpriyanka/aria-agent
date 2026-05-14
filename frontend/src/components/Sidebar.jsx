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

export default function Sidebar({
  sessions, activeSessionId,
  onSelect, onCreate, onDelete, onRename, onClose,
  // Optional: pass isOpen + onClose for mobile overlay mode
  isOpen = true,
}) {
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [hoveredId, setHoveredId] = useState(null);
  const renameRef = useRef(null);
  const bp = useBreakpoint();

  const isXs = bp === "xs";
  const isSm = bp === "sm" || bp === "xs";
  // On mobile (<600px): sidebar is a full-screen drawer overlay
  // On md (600–899px): sidebar is narrower (220px), still inline
  // On lg (900px+): full 260px sidebar
  const isMobileDrawer = isSm;

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

  // Widths
  const sidebarWidth = isXs ? "100vw" : isSm ? "100vw" : bp === "md" ? 220 : 260;
  const sidebarMaxWidth = isMobileDrawer ? "100%" : "none";

  // Spacing
  const headerPadding = isXs ? "12px 12px 8px" : "14px 14px 10px";
  const itemPadding = isXs ? "10px 10px" : "8px 10px";
  const itemFontSize = isXs ? 12 : 11;
  const previewFontSize = isXs ? 10 : 9;
  const metaFontSize = isXs ? 9 : 8;
  const labelFontSize = isXs ? 9 : 8;
  const actionBtnSize = isXs ? 26 : 18; // bigger tap targets on mobile
  const actionBtnFontSize = isXs ? 13 : 10;
  const footerFontSize = isXs ? 10 : 9;
  const searchFontSize = isXs ? 11 : 10;
  const searchPadding = isXs ? "8px 12px 8px 30px" : "6px 10px 6px 26px";

  // Overlay backdrop for mobile
  const showBackdrop = isMobileDrawer && isOpen;

  return (
    <>
      {/* Mobile backdrop */}
      {showBackdrop && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 99,
            animation: "fadeIn 0.2s ease",
          }}
        />
      )}

      <div style={{
        width: sidebarWidth,
        maxWidth: sidebarMaxWidth,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "rgba(6,9,16,0.99)",
        overflow: "hidden",
        fontFamily: "'IBM Plex Mono', monospace",
        // Mobile: fixed overlay drawer
        ...(isMobileDrawer ? {
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 100,
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.6)",
        } : {
          position: "relative",
          flexShrink: 0,
        }),
      }}>
        <style>{`
          @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
          @keyframes slideIn { from { transform:translateX(-100%) } to { transform:translateX(0) } }
          .sess-item:hover .sess-actions { opacity: 1 !important; }
          .sidebar-scroll::-webkit-scrollbar { width: 3px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
          .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(0,245,160,0.1); border-radius: 2px; }
        `}</style>

        {/* Header */}
        <div style={{
          padding: headerPadding,
          borderBottom: "1px solid rgba(0,245,160,0.06)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: isXs ? 12 : 10,
          }}>
            <div style={{
              fontSize: isXs ? 12 : 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              background: "linear-gradient(90deg, #00f5a0, #00d9f5)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              CONVERSATIONS
            </div>
            <button
              onClick={onClose}
              style={{
                width: isXs ? 32 : 22,
                height: isXs ? 32 : 22,
                borderRadius: 5,
                fontSize: isXs ? 14 : 11,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#4a5568",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              title="Close sidebar"
            >✕</button>
          </div>

          {/* New chat */}
          <button
            onClick={onCreate}
            style={{
              width: "100%",
              padding: isXs ? "11px 0" : "8px 0",
              borderRadius: 9,
              fontSize: isXs ? 12 : 11,
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.08em",
              background: "linear-gradient(135deg, rgba(0,245,160,0.12), rgba(0,217,245,0.08))",
              border: "1px solid rgba(0,245,160,0.2)",
              color: "#00f5a0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,245,160,0.18), rgba(0,217,245,0.12))"}
            onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,245,160,0.12), rgba(0,217,245,0.08))"}
          >
            <span style={{ fontSize: 16 }}>+</span> NEW CHAT
          </button>

          {/* Search */}
          <div style={{ position: "relative", marginTop: isXs ? 10 : 8 }}>
            <span style={{
              position: "absolute",
              left: isXs ? 10 : 9,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: isXs ? 13 : 11,
              color: "#2d3748",
              pointerEvents: "none",
            }}>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              style={{
                width: "100%",
                padding: searchPadding,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 7,
                color: "#e8eaf6",
                fontSize: searchFontSize,
                fontFamily: "'IBM Plex Mono', monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Session list */}
        <div
          className="sidebar-scroll"
          style={{ flex: 1, overflowY: "auto", padding: isXs ? "8px 10px 10px" : "6px 8px 8px" }}
        >
          {sessions.length === 0 ? (
            <div style={{
              padding: "40px 16px",
              textAlign: "center",
              fontSize: isXs ? 11 : 10,
              color: "#1a2030",
              letterSpacing: "0.1em",
            }}>
              NO CONVERSATIONS YET
              <span style={{ color: "#2d3748", marginTop: 6, display: "block", fontSize: isXs ? 10 : 9 }}>
                Start a new chat above
              </span>
            </div>
          ) : groups.length === 0 ? (
            <div style={{
              padding: "24px 12px",
              fontSize: isXs ? 11 : 10,
              color: "#2d3748",
              textAlign: "center",
            }}>
              No results for "{search}"
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label} style={{ marginBottom: 4 }}>
                <div style={{
                  fontSize: labelFontSize,
                  color: "#1a2030",
                  letterSpacing: "0.14em",
                  padding: isXs ? "10px 8px 5px" : "8px 8px 4px",
                  fontWeight: 600,
                }}>
                  {group.label}
                </div>

                {group.items.map(session => {
                  const isActive = session.id === activeSessionId;
                  const isRenaming = renamingId === session.id;
                  const lastMsg = session.messages?.[session.messages.length - 1];
                  // On mobile, always show action buttons (no hover)
                  const showActions = isMobileDrawer ? isActive : (hoveredId === session.id || isActive);

                  return (
                    <div
                      key={session.id}
                      className="sess-item"
                      onClick={() => !isRenaming && onSelect(session.id)}
                      onMouseEnter={() => !isMobileDrawer && setHoveredId(session.id)}
                      onMouseLeave={() => !isMobileDrawer && setHoveredId(null)}
                      style={{
                        padding: itemPadding,
                        borderRadius: 9,
                        cursor: "pointer",
                        marginBottom: isXs ? 3 : 2,
                        position: "relative",
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
                            width: "100%",
                            background: "rgba(0,245,160,0.05)",
                            border: "1px solid rgba(0,245,160,0.3)",
                            borderRadius: 5,
                            color: "#e8eaf6",
                            fontSize: isXs ? 13 : 11,
                            padding: isXs ? "6px 9px" : "3px 7px",
                            fontFamily: "'IBM Plex Mono', monospace",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      ) : (
                        <>
                          <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 4,
                          }}>
                            <div style={{
                              fontSize: itemFontSize,
                              color: isActive ? "#00f5a0" : "#a0aec0",
                              fontWeight: isActive ? 600 : 400,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              lineHeight: 1.4,
                              minWidth: 0,
                            }}>
                              {session.title || "New Chat"}
                            </div>

                            {/* Action buttons */}
                            <div
                              className="sess-actions"
                              style={{
                                display: "flex",
                                gap: isXs ? 5 : 3,
                                flexShrink: 0,
                                opacity: showActions ? 1 : 0,
                                transition: "opacity 0.15s",
                              }}
                            >
                              <button
                                onClick={e => startRename(session, e)}
                                title="Rename"
                                style={{
                                  width: actionBtnSize,
                                  height: actionBtnSize,
                                  borderRadius: isXs ? 6 : 4,
                                  fontSize: actionBtnFontSize,
                                  background: "rgba(255,255,255,0.05)",
                                  border: "none",
                                  color: "#4a5568",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >✎</button>
                              <button
                                onClick={e => { e.stopPropagation(); onDelete(session.id); }}
                                title="Delete"
                                style={{
                                  width: actionBtnSize,
                                  height: actionBtnSize,
                                  borderRadius: isXs ? 6 : 4,
                                  fontSize: actionBtnFontSize,
                                  background: "rgba(245,101,101,0.08)",
                                  border: "none",
                                  color: "#f56565",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >✕</button>
                            </div>
                          </div>

                          {/* Last message preview */}
                          {lastMsg && (
                            <div style={{
                              fontSize: previewFontSize,
                              color: "#2d3748",
                              marginTop: isXs ? 3 : 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              lineHeight: 1.4,
                            }}>
                              {lastMsg.role === "assistant" ? "◈ " : "↑ "}
                              {lastMsg.content?.slice(0, isXs ? 60 : 50) || "…"}
                            </div>
                          )}

                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: isXs ? 8 : 6,
                            marginTop: isXs ? 5 : 4,
                          }}>
                            <span style={{ fontSize: metaFontSize, color: "#1a2030" }}>
                              {timeAgo(session.updatedAt || session.createdAt)}
                            </span>
                            {msgCount(session) > 0 && (
                              <span style={{
                                fontSize: metaFontSize,
                                color: "#1a2030",
                                background: "rgba(255,255,255,0.03)",
                                padding: isXs ? "1px 6px" : "1px 5px",
                                borderRadius: 3,
                              }}>
                                {msgCount(session)} msg{msgCount(session) !== 1 ? "s" : ""}
                              </span>
                            )}
                            {session.messages?.some(m => m.fileRefs?.length > 0) && (
                              <span style={{ fontSize: metaFontSize, color: "#00d9f5" }}>📎</span>
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
          padding: isXs ? "12px 14px" : "10px 14px",
          borderTop: "1px solid rgba(0,245,160,0.05)",
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: footerFontSize,
            color: "#1a2030",
            letterSpacing: "0.08em",
            textAlign: "center",
          }}>
            {sessions.length} SESSION{sessions.length !== 1 ? "S" : ""} · STORED LOCALLY
          </div>
        </div>
      </div>
    </>
  );
}