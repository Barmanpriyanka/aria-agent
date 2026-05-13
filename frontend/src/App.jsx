import { useState, useRef, useEffect, useCallback } from "react";
import AIAvatar from "./components/AIAvatar";
import Sidebar from "./components/Sidebar";
import FileUploadZone from "./components/FileUploadZone";
import MessageBubble from "./components/MessageBubble";
import { useChatMemory } from "./hooks/useChatMemory";
import { extractFileText } from "./utils/fileExtractor";

const API_BASE = "http://localhost:8000";

const MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", tag: "POWERFUL" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", tag: "FAST" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", tag: "LONG CTX" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B", tag: "EFFICIENT" },
];

// ── Auth helpers (localStorage-based, no backend needed) ─────────────────────
const AUTH_KEY = "aria_users";
const SESSION_KEY = "aria_current_user";

function getUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "{}"); } catch { return {}; }
}
function saveUsers(users) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(users));
}
function getCurrentUser() {
  return localStorage.getItem(SESSION_KEY) || null;
}
function setCurrentUser(username) {
  if (username) localStorage.setItem(SESSION_KEY, username);
  else localStorage.removeItem(SESSION_KEY);
}
// Per-user chat sessions key
function chatStorageKey(username) {
  return `aria_chats_${username}`;
}
function loadUserChats(username) {
  try { return JSON.parse(localStorage.getItem(chatStorageKey(username)) || "[]"); } catch { return []; }
}
function saveUserChats(username, sessions) {
  localStorage.setItem(chatStorageKey(username), JSON.stringify(sessions));
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = () => {
    setError(""); setSuccess("");
    const u = username.trim().toLowerCase();
    const p = password;
    if (!u || !p) { setError("Username and password are required."); return; }
    if (u.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (p.length < 4) { setError("Password must be at least 4 characters."); return; }

    const users = getUsers();

    if (mode === "register") {
      if (users[u]) { setError("Username already taken. Try logging in."); return; }
      users[u] = { passwordHash: btoa(p), createdAt: Date.now() };
      saveUsers(users);
      setCurrentUser(u);
      setSuccess("Account created! Welcome to ARIA.");
      setTimeout(() => onAuth(u), 700);
    } else {
      if (!users[u]) { setError("No account found. Register first."); return; }
      if (users[u].passwordHash !== btoa(p)) { setError("Incorrect password."); return; }
      setCurrentUser(u);
      onAuth(u);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{
      minHeight: "100vh", background: "#080c14", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .auth-input{
          width:100%;padding:11px 14px;border-radius:10px;font-size:13px;
          font-family:'IBM Plex Mono',monospace;
          background:rgba(255,255,255,0.04);border:1px solid rgba(0,245,160,0.15);
          color:#e8eaf6;outline:none;transition:border-color 0.2s,background 0.2s;
        }
        .auth-input::placeholder{color:#2d3748}
        .auth-input:focus{border-color:rgba(0,245,160,0.45);background:rgba(0,245,160,0.03)}
        .auth-btn{
          width:100%;padding:12px;border-radius:10px;font-size:12px;font-weight:700;
          font-family:'IBM Plex Mono',monospace;letter-spacing:0.1em;
          background:linear-gradient(135deg,#00f5a0,#00d9f5);color:#000;
          border:none;cursor:pointer;transition:opacity 0.2s,transform 0.1s;
          box-shadow:0 4px 20px rgba(0,245,160,0.25);
        }
        .auth-btn:hover{opacity:0.9;transform:translateY(-1px)}
        .auth-btn:active{transform:translateY(0)}
        .auth-link{background:none;border:none;color:rgba(0,245,160,0.5);
          font-size:11px;font-family:'IBM Plex Mono',monospace;
          cursor:pointer;text-decoration:underline;letter-spacing:0.05em}
        .auth-link:hover{color:#00f5a0}
      `}</style>

      <div style={{
        animation: "fadeUp 0.5s ease both",
        width: "100%", maxWidth: 380, padding: "0 20px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 14px",
            background: "linear-gradient(135deg,#00f5a0,#00d9f5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, boxShadow: "0 0 30px rgba(0,245,160,0.3)",
          }}>◈</div>
          <div style={{
            fontSize: 26, fontWeight: 700, fontFamily: "'Space Mono',monospace",
            background: "linear-gradient(90deg,#00f5a0,#00d9f5)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "0.1em", marginBottom: 6,
          }}>ARIA</div>
          <div style={{ fontSize: 9, color: "#2d3748", letterSpacing: "0.18em" }}>
            ADVANCED REASONING INTELLIGENCE AGENT
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,160,0.1)",
          borderRadius: 16, padding: "28px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          {/* Tab switcher */}
          <div style={{
            display: "flex", background: "rgba(0,0,0,0.3)",
            borderRadius: 9, padding: 3, marginBottom: 22, gap: 3,
          }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 7, border: "none",
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                  letterSpacing: "0.1em", fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s",
                  background: mode === m ? "rgba(0,245,160,0.12)" : "transparent",
                  color: mode === m ? "#00f5a0" : "#2d3748",
                  border: mode === m ? "1px solid rgba(0,245,160,0.25)" : "1px solid transparent",
                }}>
                {m === "login" ? "SIGN IN" : "REGISTER"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 9, color: "#2d3748", letterSpacing: "0.12em", display: "block", marginBottom: 5 }}>
                USERNAME
              </label>
              <input
                className="auth-input"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="username"
              />
            </div>
            <div>
              <label style={{ fontSize: 9, color: "#2d3748", letterSpacing: "0.12em", display: "block", marginBottom: 5 }}>
                PASSWORD
              </label>
              <input
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <div style={{
                fontSize: 11, color: "#f56565", padding: "8px 12px",
                background: "rgba(245,101,101,0.08)", borderRadius: 8,
                border: "1px solid rgba(245,101,101,0.2)", letterSpacing: "0.03em",
              }}>⚠ {error}</div>
            )}
            {success && (
              <div style={{
                fontSize: 11, color: "#00f5a0", padding: "8px 12px",
                background: "rgba(0,245,160,0.08)", borderRadius: 8,
                border: "1px solid rgba(0,245,160,0.2)", letterSpacing: "0.03em",
              }}>✓ {success}</div>
            )}

            <button className="auth-btn" onClick={handleSubmit} style={{ marginTop: 4 }}>
              {mode === "login" ? "SIGN IN →" : "CREATE ACCOUNT →"}
            </button>
          </div>

          <div style={{ marginTop: 16, textAlign: "center", fontSize: 10, color: "#2d3748" }}>
            {mode === "login" ? (
              <>No account? <button className="auth-link" onClick={() => { setMode("register"); setError(""); }}>Register here</button></>
            ) : (
              <>Already have one? <button className="auth-link" onClick={() => { setMode("login"); setError(""); }}>Sign in</button></>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 9, color: "#1a2030", letterSpacing: "0.1em" }}>
          YOUR CHATS ARE SAVED LOCALLY PER ACCOUNT
        </div>
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "12px 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%", background: "#00f5a0",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());

  const handleAuth = (username) => {
    setCurrentUserState(username);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
  };

  if (!currentUser) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  return <ChatApp currentUser={currentUser} onLogout={handleLogout} />;
}

// ── Chat App (shown after login) ──────────────────────────────────────────────
function ChatApp({ currentUser, onLogout }) {
  // Per-user sessions: load from localStorage on mount
  const [sessions, setSessions] = useState(() => loadUserChats(currentUser));
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const chats = loadUserChats(currentUser);
    return chats.length > 0 ? chats[0].id : null;
  });

  // Persist sessions to localStorage whenever they change
  useEffect(() => {
    saveUserChats(currentUser, sessions);
  }, [sessions, currentUser]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const createSession = (title = "New Chat") => {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newSession = { id, title, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(id);
    return id;
  };

  const selectSession = (id) => setActiveSessionId(id);

  const updateSession = (id, updater) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...(typeof updater === "function" ? updater(s) : updater) } : s));
  };

  const deleteSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setSessions(prev => {
        const remaining = prev.filter(s => s.id !== id);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
        return remaining;
      });
    }
  };

  const renameSession = (id, title) => updateSession(id, { title });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [streaming, setStreaming] = useState(true);
  const [status, setStatus] = useState("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showAvatar, setShowAvatar] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showFileZone, setShowFileZone] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const messages = activeSession?.messages || [];

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const inputValueRef = useRef(input);

  useEffect(() => { inputValueRef.current = input; }, [input]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = () => setShowUserMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showUserMenu]);

  // ── TTS ──────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const clean = text
      .replace(/#{1,6}\s/g, "").replace(/\*\*/g, "").replace(/\*/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "code snippet")
      .replace(/https?:\/\/\S+/g, "link").substring(0, 600);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05; utterance.pitch = 1.0; utterance.volume = 1.0;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.name.includes("Google") || v.name.includes("Natural"))
      || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [voiceEnabled]);

  const stopSpeaking = () => { synthRef.current?.cancel(); setIsSpeaking(false); };

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFilesAdded = useCallback(async (files) => {
    setUploadingFile(true);
    const processed = [];
    for (const file of files) {
      try {
        const result = await extractFileText(file);
        processed.push(result);
      } catch (e) {
        processed.push({ name: file.name, type: file.type, size: file.size, text: `[Could not read: ${e.message}]`, error: true });
      }
    }
    setAttachedFiles(prev => [...prev, ...processed]);
    setUploadingFile(false);
    setShowFileZone(false);
  }, []);

  const removeFile = (idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx));

  // ── Send Message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (overrideText) => {
    const text = (overrideText ?? inputValueRef.current).trim();
    if (!text || loading) return;
    stopSpeaking();

    let fileContext = "";
    if (attachedFiles.length > 0) {
      fileContext = "\n\n[ATTACHED FILES]\n" + attachedFiles.map(f =>
        `--- File: ${f.name} (${f.type}) ---\n${f.text}`
      ).join("\n\n");
    }

    const userContent = text + fileContext;
    const userMsg = { role: "user", content: text, fileRefs: attachedFiles.map(f => ({ name: f.name, type: f.type, size: f.size, preview: f.preview })) };

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createSession(text.slice(0, 50));
    }

    updateSession(sessionId, prev => ({
      messages: [...(prev.messages || []), userMsg],
      updatedAt: Date.now(),
      title: prev.title === "New Chat" ? text.slice(0, 40) : prev.title,
    }));

    setInput(""); inputValueRef.current = "";
    setAttachedFiles([]);
    setLoading(true); setStatus("connecting");

    const historyForApi = [...messages, userMsg].map(({ role, content, fileRefs }) => ({
      role,
      content: role === "user" && fileRefs?.length
        ? content + "\n\n[Files attached: " + fileRefs.map(f => f.name).join(", ") + "]"
        : content
    }));
    historyForApi[historyForApi.length - 1].content = userContent;

    if (streaming) {
      const assistantMsg = { role: "assistant", content: "", streaming: true };
      updateSession(sessionId, prev => ({ messages: [...(prev.messages || []).slice(0, -0), assistantMsg] }));
      updateSession(sessionId, prev => {
        const msgs = [...prev.messages];
        if (msgs[msgs.length - 1]?.streaming) return prev;
        return { messages: [...msgs, assistantMsg] };
      });

      try {
        abortRef.current = new AbortController();
        const res = await fetch(`${API_BASE}/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyForApi, model: selectedModel }),
          signal: abortRef.current.signal,
        });
        setStatus("streaming");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);
              if (data.token) {
                accumulated += data.token;
                updateSession(sessionId, prev => {
                  const msgs = [...prev.messages];
                  msgs[msgs.length - 1] = { role: "assistant", content: accumulated, streaming: !data.done };
                  return { messages: msgs };
                });
              }
              if (data.done) {
                updateSession(sessionId, prev => {
                  const msgs = [...prev.messages];
                  msgs[msgs.length - 1] = { role: "assistant", content: accumulated, streaming: false };
                  return { messages: msgs, updatedAt: Date.now() };
                });
                if (voiceEnabled) speak(accumulated);
              }
            } catch (_) {}
          }
        }
        setStatus("idle");
      } catch (e) {
        if (e.name !== "AbortError") {
          setStatus("error");
          updateSession(sessionId, prev => {
            const msgs = [...prev.messages];
            msgs[msgs.length - 1] = { role: "assistant", content: `⚠️ Error: ${e.message}`, streaming: false };
            return { messages: msgs };
          });
        }
      }
    } else {
      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyForApi, model: selectedModel }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Unknown error");
        const reply = data.message;
        updateSession(sessionId, prev => ({
          messages: [...prev.messages, { role: "assistant", content: reply }],
          updatedAt: Date.now(),
        }));
        setStatus("idle");
        if (voiceEnabled) speak(reply);
      } catch (e) {
        setStatus("error");
        updateSession(sessionId, prev => ({
          messages: [...prev.messages, { role: "assistant", content: `⚠️ Error: ${e.message}` }],
        }));
      }
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [loading, messages, activeSessionId, selectedModel, streaming, voiceEnabled, speak, attachedFiles, createSession, updateSession]);

  // ── STT ───────────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Try Chrome."); return; }
    stopSpeaking();
    const recognition = new SR();
    recognition.continuous = false; recognition.interimResults = true; recognition.lang = "en-US";
    let finalTranscript = "";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setInput(finalTranscript + interim);
      inputValueRef.current = finalTranscript + interim;
    };
    recognition.onend = () => {
      setIsListening(false);
      const toSend = finalTranscript.trim() || inputValueRef.current.trim();
      if (toSend) sendMessage(toSend);
    };
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [sendMessage]);

  const stopListening = () => recognitionRef.current?.stop();
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };
  const stopGeneration = () => { abortRef.current?.abort(); setLoading(false); setStatus("idle"); };

  const isThinking = loading && !isSpeaking;
  const sidebarW = sidebarOpen ? 260 : 0;

  // Avatar is hidden behind the file zone when showFileZone is open.
  // We float it above the file zone instead of inside the message area.
  const avatarVisible = showAvatar;

  return (
    <div style={{
      minHeight: "100vh", background: "#080c14", color: "#e8eaf6",
      fontFamily: "'IBM Plex Mono', monospace", display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#080c14;overflow:hidden}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,245,160,0.2);border-radius:2px}
        @keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,101,101,0.5)}50%{box-shadow:0 0 0 10px rgba(245,101,101,0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes shimmer{0%{background-position:-300% 0}100%{background-position:300% 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        textarea:focus{outline:none}
        button{cursor:pointer;border:none}
        .file-chip:hover .file-remove{opacity:1!important}
        .user-menu-item:hover{background:rgba(0,245,160,0.06)!important;color:#00f5a0!important}
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{
          width: sidebarW, flexShrink: 0, overflow: "hidden",
          transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)",
          borderRight: sidebarOpen ? "1px solid rgba(0,245,160,0.08)" : "none",
        }}>
          {sidebarOpen && (
            <Sidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelect={selectSession}
              onCreate={() => createSession("New Chat")}
              onDelete={deleteSession}
              onRename={renameSession}
              onClose={() => setSidebarOpen(false)}
            />
          )}
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Header */}
          <header style={{
            borderBottom: "1px solid rgba(0,245,160,0.08)", padding: "12px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(8,12,20,0.97)", backdropFilter: "blur(20px)",
            flexShrink: 0, gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setSidebarOpen(s => !s)} style={{
                width: 34, height: 34, borderRadius: 9, fontSize: 14,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                color: "#4a5568", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }} title="Toggle sidebar"
                onMouseEnter={e => { e.currentTarget.style.color = "#00f5a0"; e.currentTarget.style.borderColor = "rgba(0,245,160,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#4a5568"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}>
                ☰
              </button>

              <div style={{
                width: 36, height: 36, borderRadius: "10px",
                background: "linear-gradient(135deg, #00f5a0, #00d9f5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, boxShadow: "0 0 16px rgba(0,245,160,0.35)",
              }}>◈</div>
              <div>
                <div style={{
                  fontSize: 16, fontWeight: 700,
                  background: "linear-gradient(90deg, #00f5a0, #00d9f5)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em",
                }}>ARIA</div>
                <div style={{ fontSize: 9, color: "#2d3748", letterSpacing: "0.12em" }}>
                  {activeSession?.title || "ADVANCED REASONING INTELLIGENCE AGENT"}
                </div>
              </div>
            </div>

            {/* Right controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: status === "streaming" ? "#00f5a0" : status === "error" ? "#f56565" : status === "connecting" ? "#f6ad55" : "#2d3748",
                  animation: status !== "idle" ? "pulse 1s infinite" : "none",
                }} />
                <span style={{ fontSize: 10, color: "#2d3748", letterSpacing: "0.1em" }}>
                  {isSpeaking ? "SPEAKING" : status.toUpperCase()}
                </span>
              </div>

              {[
                { label: voiceEnabled ? "🔊 VOICE" : "🔇 VOICE", active: voiceEnabled, onClick: () => { setVoiceEnabled(v => !v); if (isSpeaking) stopSpeaking(); } },
                { label: "AVATAR", active: showAvatar, onClick: () => setShowAvatar(s => !s), activeColor: "#00d9f5", activeBorder: "rgba(0,217,245,0.3)", activeBg: "rgba(0,217,245,0.1)" },
                { label: streaming ? "STREAM ●" : "STREAM ○", active: streaming, onClick: () => setStreaming(s => !s) },
              ].map(({ label, active, onClick, activeColor, activeBorder, activeBg }) => (
                <button key={label} onClick={onClick} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.07em",
                  background: active ? (activeBg || "rgba(0,245,160,0.08)") : "rgba(255,255,255,0.03)",
                  color: active ? (activeColor || "#00f5a0") : "#2d3748",
                  border: active ? `1px solid ${activeBorder || "rgba(0,245,160,0.25)"}` : "1px solid rgba(255,255,255,0.06)",
                  transition: "all 0.2s",
                }}>{label}</button>
              ))}

              {isSpeaking && (
                <button onClick={stopSpeaking} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: "rgba(245,101,101,0.1)", color: "#f56565",
                  border: "1px solid rgba(245,101,101,0.25)", animation: "pulse 1s infinite",
                }}>■ STOP</button>
              )}

              {/* User account button */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowUserMenu(m => !m); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "5px 10px 5px 7px", borderRadius: 8,
                    background: showUserMenu ? "rgba(0,245,160,0.08)" : "rgba(255,255,255,0.03)",
                    border: showUserMenu ? "1px solid rgba(0,245,160,0.3)" : "1px solid rgba(255,255,255,0.07)",
                    transition: "all 0.2s",
                  }}
                  title="Account"
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "linear-gradient(135deg,#00f5a0,#00d9f5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "#000",
                  }}>
                    {currentUser[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: 10, color: "#00f5a0", letterSpacing: "0.07em", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {currentUser.toUpperCase()}
                  </span>
                </button>

                {showUserMenu && (
                  <div style={{
                    position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100,
                    background: "#0d1420", border: "1px solid rgba(0,245,160,0.15)",
                    borderRadius: 10, padding: "4px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
                    minWidth: 160, animation: "fadeIn 0.15s ease",
                  }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: "#00f5a0", fontWeight: 600 }}>{currentUser}</div>
                      <div style={{ fontSize: 9, color: "#2d3748", letterSpacing: "0.1em", marginTop: 1 }}>LOGGED IN</div>
                    </div>
                    <button
                      className="user-menu-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        if (window.confirm("Sign out of ARIA?")) {
                          stopSpeaking();
                          onLogout();
                        }
                      }}
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 7,
                        background: "transparent", border: "none",
                        color: "#4a5568", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace",
                        textAlign: "left", letterSpacing: "0.07em", transition: "all 0.15s",
                        display: "flex", alignItems: "center", gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 13 }}>⎋</span> SIGN OUT
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Model selector */}
          <div style={{
            padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)",
            display: "flex", gap: 6, overflowX: "auto", flexShrink: 0,
            background: "rgba(8,12,20,0.9)",
          }}>
            {MODELS.map((m) => (
              <button key={m.id} onClick={() => setSelectedModel(m.id)} style={{
                padding: "5px 12px", borderRadius: 7, fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                background: selectedModel === m.id ? "rgba(0,245,160,0.08)" : "rgba(255,255,255,0.02)",
                border: selectedModel === m.id ? "1px solid rgba(0,245,160,0.3)" : "1px solid rgba(255,255,255,0.05)",
                color: selectedModel === m.id ? "#00f5a0" : "#2d3748",
              }}>
                {m.name}
                <span style={{
                  fontSize: 8, padding: "1px 4px", borderRadius: 3,
                  background: selectedModel === m.id ? "rgba(0,245,160,0.15)" : "rgba(255,255,255,0.04)",
                  color: selectedModel === m.id ? "#00f5a0" : "#1a2030",
                }}>{m.tag}</span>
              </button>
            ))}
          </div>

          {/* Messages area — no avatar overlap, avatar is now OUTSIDE this scroll container */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

            {/* Scrollable messages */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "20px",
              // Only add right padding when avatar is visible AND file zone is closed
              paddingRight: avatarVisible && !showFileZone ? "188px" : "20px",
              transition: "padding-right 0.25s ease",
            }}>
              {messages.length === 0 ? (
                <EmptyState onPrompt={(p) => { setInput(p); inputRef.current?.focus(); }} />
              ) : (
                messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} onSpeak={speak} />
                ))
              )}
              {loading && !streaming && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Avatar — floats over message area, ABOVE file zone level */}
            {avatarVisible && (
              <div style={{
                position: "absolute",
                // When file zone is open, push avatar up so it sits above the file zone.
                // File zone is approximately 160px tall. We add an extra 8px margin.
                bottom: showFileZone ? 168 : 16,
                right: 16,
                width: 156, zIndex: 20,
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "14px 10px 10px",
                background: "rgba(8,12,20,0.92)", backdropFilter: "blur(20px)",
                borderRadius: 18, border: "1px solid rgba(0,245,160,0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                transition: "bottom 0.3s cubic-bezier(0.4,0,0.2,1)",
              }}>
                <AIAvatar isSpeaking={isSpeaking} isThinking={isThinking} />
                <div style={{ marginTop: 10, fontSize: 8, color: "#1a2030", textAlign: "center", letterSpacing: "0.1em" }}>
                  BROWSER TTS<br />VOICE ENGINE
                </div>
              </div>
            )}
          </div>

          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div style={{
              padding: "8px 16px", borderTop: "1px solid rgba(0,245,160,0.06)",
              background: "rgba(8,12,20,0.95)",
              display: "flex", gap: 8, overflowX: "auto", flexShrink: 0,
            }}>
              {attachedFiles.map((f, i) => (
                <FileChip key={i} file={f} onRemove={() => removeFile(i)} />
              ))}
            </div>
          )}

          {/* File upload zone */}
          {showFileZone && (
            <FileUploadZone
              onFiles={handleFilesAdded}
              onClose={() => setShowFileZone(false)}
              uploading={uploadingFile}
            />
          )}

          {/* Input area */}
          <div style={{
            borderTop: "1px solid rgba(0,245,160,0.07)",
            padding: "12px 16px 16px",
            background: "rgba(8,12,20,0.97)", backdropFilter: "blur(20px)",
            flexShrink: 0,
          }}>
            <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
              {/* Mic */}
              <button onClick={isListening ? stopListening : startListening} style={{
                width: 44, height: 44, borderRadius: 11, fontSize: 16, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isListening ? "rgba(245,101,101,0.12)" : "rgba(255,255,255,0.03)",
                border: isListening ? "1px solid rgba(245,101,101,0.4)" : "1px solid rgba(255,255,255,0.07)",
                color: isListening ? "#f56565" : "#2d3748",
                animation: isListening ? "micPulse 1s infinite" : "none",
                transition: "all 0.2s",
              }} title="Voice input">{isListening ? "⏹" : "🎙"}</button>

              {/* File attach */}
              <button onClick={() => setShowFileZone(s => !s)} style={{
                width: 44, height: 44, borderRadius: 11, fontSize: 16, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: showFileZone || attachedFiles.length > 0 ? "rgba(0,217,245,0.1)" : "rgba(255,255,255,0.03)",
                border: showFileZone || attachedFiles.length > 0 ? "1px solid rgba(0,217,245,0.35)" : "1px solid rgba(255,255,255,0.07)",
                color: showFileZone || attachedFiles.length > 0 ? "#00d9f5" : "#2d3748",
                transition: "all 0.2s", position: "relative",
              }} title="Attach files">
                📎
                {attachedFiles.length > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -4,
                    width: 16, height: 16, borderRadius: "50%", fontSize: 9,
                    background: "#00d9f5", color: "#000", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{attachedFiles.length}</span>
                )}
              </button>

              {/* Textarea */}
              <div style={{
                flex: 1, position: "relative", borderRadius: 13,
                background: isListening ? "rgba(245,101,101,0.04)" : "rgba(255,255,255,0.03)",
                border: isListening ? "1px solid rgba(245,101,101,0.3)" : "1px solid rgba(0,245,160,0.12)",
                transition: "all 0.3s",
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Listening... speak now" : "Message ARIA… (Enter to send, Shift+Enter newline)"}
                  rows={1}
                  style={{
                    width: "100%", padding: "12px 16px",
                    background: "transparent", border: "none",
                    color: isListening ? "#f56565" : "#e8eaf6",
                    fontSize: 13, fontFamily: "'IBM Plex Mono', monospace",
                    resize: "none", maxHeight: 120, overflowY: "auto", lineHeight: 1.6,
                  }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                />
              </div>

              {/* Send/Stop */}
              <button
                onClick={loading ? stopGeneration : sendMessage}
                disabled={!loading && !input.trim() && attachedFiles.length === 0}
                style={{
                  width: 44, height: 44, borderRadius: 11, fontSize: 17, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  background: loading ? "rgba(245,101,101,0.12)"
                    : (input.trim() || attachedFiles.length > 0) ? "linear-gradient(135deg, #00f5a0, #00d9f5)"
                    : "rgba(255,255,255,0.03)",
                  border: loading ? "1px solid rgba(245,101,101,0.3)" : "none",
                  color: loading ? "#f56565" : (input.trim() || attachedFiles.length > 0) ? "#000" : "#1a2030",
                  boxShadow: !loading && (input.trim() || attachedFiles.length > 0) ? "0 4px 18px rgba(0,245,160,0.3)" : "none",
                }}>
                {loading ? "■" : "↑"}
              </button>
            </div>

            <div style={{
              maxWidth: 900, margin: "6px auto 0",
              fontSize: 9, color: "#1a2030", letterSpacing: "0.07em", textAlign: "center",
            }}>
              GROQ · {MODELS.find(m => m.id === selectedModel)?.name}
              {" · "}
              <span style={{ color: isListening ? "#f56565" : voiceEnabled ? "#00f5a0" : "#1a2030" }}>
                {isListening ? "🎙 LISTENING" : voiceEnabled ? "🔊 AUTO-SPEAK" : "🔇 MUTED"}
              </span>
              {attachedFiles.length > 0 && <span style={{ color: "#00d9f5" }}> · {attachedFiles.length} FILE{attachedFiles.length > 1 ? "S" : ""} ATTACHED</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onPrompt }) {
  const prompts = [
    "Explain quantum entanglement", "Write a Python web scraper",
    "Summarize Stoicism's key ideas", "Analyze the uploaded document",
  ];
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "60vh", gap: 14, color: "#2d3748", textAlign: "center",
    }}>
      <div style={{ fontSize: 56, opacity: 0.2 }}>◈</div>
      <div style={{
        fontSize: 20, fontFamily: "'Space Mono', monospace",
        background: "linear-gradient(90deg, #00f5a0, #00d9f5)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.5,
      }}>ARIA ONLINE</div>
      <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#1a2030" }}>
        TYPE, SPEAK, OR UPLOAD A FILE TO BEGIN
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 440 }}>
        {prompts.map(p => (
          <button key={p} onClick={() => onPrompt(p)} style={{
            padding: "9px 12px", borderRadius: 9, fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace", textAlign: "left",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,160,0.08)",
            color: "#2d3748", transition: "all 0.2s", lineHeight: 1.5,
          }}
            onMouseEnter={e => { e.target.style.background = "rgba(0,245,160,0.04)"; e.target.style.color = "#00f5a0"; e.target.style.borderColor = "rgba(0,245,160,0.2)"; }}
            onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.02)"; e.target.style.color = "#2d3748"; e.target.style.borderColor = "rgba(0,245,160,0.08)"; }}
          >{p}</button>
        ))}
      </div>
    </div>
  );
}

// ── File Chip ─────────────────────────────────────────────────────────────────
function FileChip({ file, onRemove }) {
  const icons = { pdf: "📋", image: "🖼️", doc: "📄", csv: "📊", text: "📝", code: "💻" };
  const getIcon = (f) => {
    if (f.type?.includes("pdf")) return icons.pdf;
    if (f.type?.includes("image")) return icons.image;
    if (f.type?.includes("word") || f.name?.endsWith(".docx")) return icons.doc;
    if (f.name?.endsWith(".csv")) return icons.csv;
    if (f.name?.match(/\.(py|js|ts|jsx|tsx|html|css|json)$/)) return icons.code;
    return icons.text;
  };
  return (
    <div className="file-chip" style={{
      display: "flex", alignItems: "center", gap: 7, padding: "5px 10px",
      background: "rgba(0,217,245,0.06)", border: "1px solid rgba(0,217,245,0.15)",
      borderRadius: 8, flexShrink: 0, position: "relative", animation: "fadeSlideIn 0.25s ease",
    }}>
      <span style={{ fontSize: 13 }}>{getIcon(file)}</span>
      <div>
        <div style={{ fontSize: 10, color: "#00d9f5", fontWeight: 500, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
        <div style={{ fontSize: 9, color: "#2d3748" }}>{(file.size / 1024).toFixed(0)}KB</div>
      </div>
      <button className="file-remove" onClick={onRemove} style={{
        width: 16, height: 16, borderRadius: "50%", fontSize: 9,
        background: "rgba(245,101,101,0.2)", color: "#f56565",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: 0, transition: "opacity 0.15s", marginLeft: 2,
      }}>✕</button>
    </div>
  );
}