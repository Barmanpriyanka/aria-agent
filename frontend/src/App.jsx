import { useState, useRef, useEffect, useCallback } from "react";
import AIAvatar from "./components/AIAvatar";
import Sidebar from "./components/Sidebar";
import FileUploadZone from "./components/FileUploadZone";
import MessageBubble from "./components/MessageBubble";
import { useChatMemory } from "./hooks/useChatMemory";
import { extractFileText } from "./utils/fileExtractor";

const API_BASE = import.meta.env.VITE_API_URL;

const MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", tag: "POWERFUL" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", tag: "FAST" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", tag: "LONG CTX" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B", tag: "EFFICIENT" },
];

// ── Auth helpers ──────────────────────────────────────────────────────────────
const AUTH_KEY = "aria_users";
const SESSION_KEY = "aria_current_user";

function getUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "{}"); } catch { return {}; }
}
function saveUsers(users) { localStorage.setItem(AUTH_KEY, JSON.stringify(users)); }
function getCurrentUser() { return localStorage.getItem(SESSION_KEY) || null; }
function setCurrentUser(username) {
  if (username) localStorage.setItem(SESSION_KEY, username);
  else localStorage.removeItem(SESSION_KEY);
}
function chatStorageKey(username) { return `aria_chats_${username}`; }
function loadUserChats(username) {
  try { return JSON.parse(localStorage.getItem(chatStorageKey(username)) || "[]"); } catch { return []; }
}
function saveUserChats(username, sessions) {
  localStorage.setItem(chatStorageKey(username), JSON.stringify(sessions));
}

// ── Responsive hook ───────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    const w = window.innerWidth;
    if (w < 600) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  });
  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      if (w < 600) setBp("mobile");
      else if (w < 1024) setBp("tablet");
      else setBp("desktop");
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return bp;
}

// ── Visual viewport hook (tracks keyboard height on mobile) ──────────────────
function useVisualViewportHeight() {
  const [height, setHeight] = useState(() =>
    window.visualViewport ? window.visualViewport.height : window.innerHeight
  );
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => setHeight(vv.height);
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => {
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
    };
  }, []);
  return height;
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
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
      minHeight: "100vh",
      minHeight: "-webkit-fill-available",
      background: "#080c14", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'IBM Plex Mono', monospace", padding: "16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        html,body{height:100%;height:-webkit-fill-available}
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .auth-input{
          width:100%;padding:12px 14px;border-radius:10px;font-size:16px;
          font-family:'IBM Plex Mono',monospace;
          background:rgba(255,255,255,0.04);border:1px solid rgba(0,245,160,0.15);
          color:#e8eaf6;outline:none;transition:border-color 0.2s,background 0.2s;
          -webkit-appearance:none;
        }
        .auth-input::placeholder{color:#2d3748}
        .auth-input:focus{border-color:rgba(0,245,160,0.45);background:rgba(0,245,160,0.03)}
        .auth-btn{
          width:100%;padding:14px;border-radius:10px;font-size:13px;font-weight:700;
          font-family:'IBM Plex Mono',monospace;letter-spacing:0.1em;
          background:linear-gradient(135deg,#00f5a0,#00d9f5);color:#000;
          border:none;cursor:pointer;transition:opacity 0.2s,transform 0.1s;
          box-shadow:0 4px 20px rgba(0,245,160,0.25);
          -webkit-tap-highlight-color:transparent;touch-action:manipulation;
          min-height:48px;
        }
        .auth-btn:active{transform:scale(0.98)}
        .auth-link{background:none;border:none;color:rgba(0,245,160,0.5);
          font-size:13px;font-family:'IBM Plex Mono',monospace;
          cursor:pointer;text-decoration:underline;letter-spacing:0.05em;
          -webkit-tap-highlight-color:transparent;touch-action:manipulation;}
        .auth-link:hover{color:#00f5a0}
      `}</style>

      <div style={{ animation: "fadeUp 0.5s ease both", width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 14px",
            background: "linear-gradient(135deg,#00f5a0,#00d9f5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26,
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

        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,160,0.1)",
          borderRadius: 16, padding: "28px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            display: "flex", background: "rgba(0,0,0,0.3)",
            borderRadius: 9, padding: 3, marginBottom: 22, gap: 3,
          }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 7, border: "none",
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
                  letterSpacing: "0.1em", fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s",
                  background: mode === m ? "rgba(0,245,160,0.12)" : "transparent",
                  color: mode === m ? "#00f5a0" : "#2d3748",
                  border: mode === m ? "1px solid rgba(0,245,160,0.25)" : "1px solid transparent",
                  WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
                  minHeight: 40,
                }}>
                {m === "login" ? "SIGN IN" : "REGISTER"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: "#2d3748", letterSpacing: "0.12em", display: "block", marginBottom: 5 }}>USERNAME</label>
              <input className="auth-input" type="text" placeholder="your_username"
                value={username} onChange={e => setUsername(e.target.value)} onKeyDown={handleKey}
                autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck="false" />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#2d3748", letterSpacing: "0.12em", display: "block", marginBottom: 5 }}>PASSWORD</label>
              <input className="auth-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
                autoComplete={mode === "register" ? "new-password" : "current-password"} />
            </div>
            {error && (
              <div style={{ fontSize: 12, color: "#f56565", padding: "8px 12px", background: "rgba(245,101,101,0.08)", borderRadius: 8, border: "1px solid rgba(245,101,101,0.2)" }}>
                ⚠ {error}
              </div>
            )}
            {success && (
              <div style={{ fontSize: 12, color: "#00f5a0", padding: "8px 12px", background: "rgba(0,245,160,0.08)", borderRadius: 8, border: "1px solid rgba(0,245,160,0.2)" }}>
                ✓ {success}
              </div>
            )}
            <button className="auth-btn" onClick={handleSubmit} style={{ marginTop: 4 }}>
              {mode === "login" ? "SIGN IN →" : "CREATE ACCOUNT →"}
            </button>
          </div>

          <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "#2d3748" }}>
            {mode === "login"
              ? <><span>No account? </span><button className="auth-link" onClick={() => { setMode("register"); setError(""); }}>Register here</button></>
              : <><span>Already have one? </span><button className="auth-link" onClick={() => { setMode("login"); setError(""); }}>Sign in</button></>}
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
  const handleAuth = (username) => setCurrentUserState(username);
  const handleLogout = () => { setCurrentUser(null); setCurrentUserState(null); };

  if (!currentUser) return <AuthScreen onAuth={handleAuth} />;
  return <ChatApp currentUser={currentUser} onLogout={handleLogout} />;
}

// ── Chat App ──────────────────────────────────────────────────────────────────
function ChatApp({ currentUser, onLogout }) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const vpHeight = useVisualViewportHeight();

  const [sessions, setSessions] = useState(() => loadUserChats(currentUser));
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const chats = loadUserChats(currentUser);
    return chats.length > 0 ? chats[0].id : null;
  });

  useEffect(() => { saveUserChats(currentUser, sessions); }, [sessions, currentUser]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const createSession = (title = "New Chat") => {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newSession = { id, title, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(id);
    return id;
  };

  const selectSession = (id) => {
    setActiveSessionId(id);
    if (isMobile || isTablet) setSidebarOpen(false);
  };

  const updateSession = (id, updater) => {
    setSessions(prev => prev.map(s => s.id === id
      ? { ...s, ...(typeof updater === "function" ? updater(s) : updater) }
      : s
    ));
  };

  const deleteSession = (id) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (activeSessionId === id) setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      return remaining;
    });
  };

  const renameSession = (id, title) => updateSession(id, { title });

  const [input, setInput] = useState("");
  // FIX: ref to always hold the latest input value, avoiding stale closures
  const inputValueRef = useRef("");

  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [streaming, setStreaming] = useState(true);
  const [status, setStatus] = useState("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showAvatar, setShowAvatar] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showFileZone, setShowFileZone] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!isMobile && !isTablet) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isMobile, isTablet]);

  const messages = activeSession?.messages || [];
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = () => setShowUserMenu(false);
    document.addEventListener("click", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showUserMenu]);

  const handleOverlayClick = () => {
    if (isMobile || isTablet) setSidebarOpen(false);
  };

  // ── TTS ───────────────────────────────────────────────────────────────────
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
  // FIX: Read from inputValueRef instead of input state to avoid stale closure
  const sendMessage = useCallback(async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : inputValueRef.current).trim();
    if (!text || loading) return;
    stopSpeaking();

    if (isMobile) inputRef.current?.blur();

    let fileContext = "";
    if (attachedFiles.length > 0) {
      fileContext = "\n\n[ATTACHED FILES]\n" + attachedFiles.map(f =>
        `--- File: ${f.name} (${f.type}) ---\n${f.text}`
      ).join("\n\n");
    }

    const userContent = text + fileContext;
    const userMsg = {
      role: "user", content: text,
      fileRefs: attachedFiles.map(f => ({ name: f.name, type: f.type, size: f.size, preview: f.preview }))
    };

    let sessionId = activeSessionId;
    if (!sessionId) sessionId = createSession(text.slice(0, 50));

    updateSession(sessionId, prev => ({
      messages: [...(prev.messages || []), userMsg],
      updatedAt: Date.now(),
      title: prev.title === "New Chat" ? text.slice(0, 40) : prev.title,
    }));

    // FIX: Clear both the state and the ref
    setInput("");
    inputValueRef.current = "";
    setAttachedFiles([]);
    setLoading(true);
    setStatus("connecting");

    const historyForApi = [...messages, userMsg].map(({ role, content, fileRefs }) => ({
      role,
      content: role === "user" && fileRefs?.length
        ? content + "\n\n[Files attached: " + fileRefs.map(f => f.name).join(", ") + "]"
        : content
    }));
    historyForApi[historyForApi.length - 1].content = userContent;

    if (streaming) {
      const assistantMsg = { role: "assistant", content: "", streaming: true };
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
    if (!isMobile) inputRef.current?.focus();
  // FIX: removed `input` from deps — we use inputValueRef.current instead
  }, [loading, messages, activeSessionId, selectedModel, streaming, voiceEnabled, speak, attachedFiles, createSession, updateSession, isMobile]);

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
      if (finalTranscript.trim()) sendMessage(finalTranscript.trim());
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
  const sidebarIsOverlay = isMobile || isTablet;
  const sidebarW = (!sidebarIsOverlay && sidebarOpen) ? 260 : 0;

  const avatarVisible = showAvatar;

  return (
    <div style={{
      height: isMobile ? `${vpHeight}px` : "100vh",
      maxHeight: isMobile ? `${vpHeight}px` : "100vh",
      background: "#080c14", color: "#e8eaf6",
      fontFamily: "'IBM Plex Mono', monospace", display: "flex", flexDirection: "column",
      overflow: "hidden", position: "fixed", inset: 0,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        html,body{height:100%;height:-webkit-fill-available;overflow:hidden;overscroll-behavior:none}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,245,160,0.2);border-radius:2px}
        @keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,101,101,0.5)}50%{box-shadow:0 0 0 10px rgba(245,101,101,0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeInDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        textarea:focus{outline:none}
        button{cursor:pointer;border:none;-webkit-tap-highlight-color:transparent;}
        .file-chip:hover .file-remove{opacity:1!important}
        .user-menu-item:hover{background:rgba(0,245,160,0.06)!important;color:#00f5a0!important}
        .ctrl-btn{
          display:flex;align-items:center;justify-content:center;
          border-radius:9px;transition:all 0.2s;
          background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
          color:#2d3748;cursor:pointer;touch-action:manipulation;
        }
        .ctrl-btn:hover{color:#00f5a0;border-color:rgba(0,245,160,0.3)}
        .ctrl-btn:active{transform:scale(0.93)}
        * { -webkit-text-size-adjust: 100%; }
        .models-scroll::-webkit-scrollbar{display:none}
        .input-area-wrap{
          padding-bottom: max(14px, env(safe-area-inset-bottom));
        }
      `}</style>

      <div style={{ display: "flex", height: "100%", overflow: "hidden", position: "relative" }}>

        {/* Sidebar overlay backdrop (mobile/tablet) */}
        {sidebarIsOverlay && sidebarOpen && (
          <div
            onClick={handleOverlayClick}
            onTouchStart={handleOverlayClick}
            style={{
              position: "fixed", inset: 0, zIndex: 40,
              background: "rgba(0,0,0,0.65)", animation: "fadeIn 0.2s ease",
            }}
          />
        )}

        {/* Sidebar */}
        <div style={{
          position: sidebarIsOverlay ? "fixed" : "static",
          top: 0, left: 0, bottom: 0,
          width: sidebarIsOverlay
            ? (sidebarOpen ? "min(280px, 82vw)" : "0px")
            : `${sidebarW}px`,
          flexShrink: 0, overflow: "hidden",
          borderRight: sidebarOpen ? "1px solid rgba(0,245,160,0.08)" : "none",
          zIndex: sidebarIsOverlay ? 50 : 1,
          transform: sidebarIsOverlay
            ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)")
            : "none",
          transition: sidebarIsOverlay
            ? "transform 0.28s cubic-bezier(0.4,0,0.2,1)"
            : "width 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={selectSession}
            onCreate={() => { createSession("New Chat"); if (sidebarIsOverlay) setSidebarOpen(false); }}
            onDelete={deleteSession}
            onRename={renameSession}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Header */}
          <header style={{
            borderBottom: "1px solid rgba(0,245,160,0.08)",
            padding: isMobile ? "8px 12px" : "12px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(8,12,20,0.97)", backdropFilter: "blur(20px)",
            flexShrink: 0, gap: 8,
            paddingTop: isMobile ? "max(8px, env(safe-area-inset-top))" : "12px",
          }}>
            {/* Left: toggle + logo */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0, flex: 1 }}>
              <button
                className="ctrl-btn"
                onClick={() => setSidebarOpen(s => !s)}
                style={{ width: 40, height: 40, fontSize: 17, flexShrink: 0 }}
                title="Toggle sidebar"
              >☰</button>

              <div style={{
                width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: "10px",
                background: "linear-gradient(135deg, #00f5a0, #00d9f5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isMobile ? 15 : 17, flexShrink: 0,
              }}>◈</div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: isMobile ? 14 : 16, fontWeight: 700,
                  background: "linear-gradient(90deg, #00f5a0, #00d9f5)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em",
                }}>ARIA</div>
                {!isMobile && (
                  <div style={{
                    fontSize: 9, color: "#2d3748", letterSpacing: "0.12em",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: 200,
                  }}>
                    {activeSession?.title || "ADVANCED REASONING INTELLIGENCE AGENT"}
                  </div>
                )}
              </div>
            </div>

            {/* Right: controls */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, flexShrink: 0 }}>
              {/* Status dot */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: status === "streaming" ? "#00f5a0" : status === "error" ? "#f56565" : status === "connecting" ? "#f6ad55" : "#2d3748",
                  animation: status !== "idle" ? "pulse 1s infinite" : "none",
                }} />
                {!isMobile && (
                  <span style={{ fontSize: 9, color: "#2d3748", letterSpacing: "0.1em" }}>
                    {isSpeaking ? "SPEAKING" : status.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Voice toggle */}
              <button
                onClick={() => { setVoiceEnabled(v => !v); if (isSpeaking) stopSpeaking(); }}
                title={voiceEnabled ? "Mute voice" : "Enable voice"}
                style={{
                  padding: isMobile ? "7px 9px" : "4px 10px",
                  borderRadius: 6, fontSize: isMobile ? 15 : 10,
                  fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.07em",
                  background: voiceEnabled ? "rgba(0,245,160,0.08)" : "rgba(255,255,255,0.03)",
                  color: voiceEnabled ? "#00f5a0" : "#2d3748",
                  border: voiceEnabled ? "1px solid rgba(0,245,160,0.25)" : "1px solid rgba(255,255,255,0.06)",
                  transition: "all 0.2s", touchAction: "manipulation",
                  minHeight: 36, minWidth: 36,
                }}>
                {voiceEnabled ? (isMobile ? "🔊" : "🔊 VOICE") : (isMobile ? "🔇" : "🔇 VOICE")}
              </button>

              {/* Avatar + Stream toggles — desktop only */}
              {!isMobile && (
                <>
                  <button onClick={() => setShowAvatar(s => !s)} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 10,
                    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.07em",
                    background: showAvatar ? "rgba(0,217,245,0.1)" : "rgba(255,255,255,0.03)",
                    color: showAvatar ? "#00d9f5" : "#2d3748",
                    border: showAvatar ? "1px solid rgba(0,217,245,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.2s",
                  }}>AVATAR</button>

                  <button onClick={() => setStreaming(s => !s)} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 10,
                    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.07em",
                    background: streaming ? "rgba(0,245,160,0.08)" : "rgba(255,255,255,0.03)",
                    color: streaming ? "#00f5a0" : "#2d3748",
                    border: streaming ? "1px solid rgba(0,245,160,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.2s",
                  }}>{streaming ? "STREAM ●" : "STREAM ○"}</button>
                </>
              )}

              {/* Stop speaking */}
              {isSpeaking && (
                <button onClick={stopSpeaking} style={{
                  padding: isMobile ? "7px 9px" : "4px 10px", borderRadius: 6,
                  fontSize: isMobile ? 13 : 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: "rgba(245,101,101,0.1)", color: "#f56565",
                  border: "1px solid rgba(245,101,101,0.25)", animation: "pulse 1s infinite",
                  touchAction: "manipulation",
                }}>■ {!isMobile && "STOP"}</button>
              )}

              {/* User menu */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowUserMenu(m => !m); }}
                  style={{
                    display: "flex", alignItems: "center", gap: isMobile ? 0 : 7,
                    padding: isMobile ? "6px" : "5px 10px 5px 7px", borderRadius: 8,
                    background: showUserMenu ? "rgba(0,245,160,0.08)" : "rgba(255,255,255,0.03)",
                    border: showUserMenu ? "1px solid rgba(0,245,160,0.3)" : "1px solid rgba(255,255,255,0.07)",
                    transition: "all 0.2s", touchAction: "manipulation",
                    minHeight: 36, minWidth: 36,
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "linear-gradient(135deg,#00f5a0,#00d9f5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#000",
                  }}>
                    {currentUser[0].toUpperCase()}
                  </div>
                  {!isMobile && (
                    <span style={{ fontSize: 10, color: "#00f5a0", letterSpacing: "0.07em", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {currentUser.toUpperCase()}
                    </span>
                  )}
                </button>

                {showUserMenu && (
                  <div
                    onClick={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    style={{
                      position: "absolute", right: 0, zIndex: 100,
                      bottom: isMobile ? "calc(100% + 6px)" : "auto",
                      top: isMobile ? "auto" : "calc(100% + 6px)",
                      background: "#0d1420", border: "1px solid rgba(0,245,160,0.15)",
                      borderRadius: 10, padding: "4px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
                      minWidth: 170,
                      animation: isMobile ? "fadeInUp 0.15s ease" : "fadeInDown 0.15s ease",
                    }}>
                    <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: "#00f5a0", fontWeight: 600 }}>{currentUser}</div>
                      <div style={{ fontSize: 9, color: "#2d3748", letterSpacing: "0.1em", marginTop: 1 }}>LOGGED IN</div>
                    </div>
                    {/* Stream + Avatar controls in user menu on mobile */}
                    {isMobile && (
                      <>
                        <button className="user-menu-item"
                          onClick={() => { setShowUserMenu(false); setStreaming(s => !s); }}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 7, background: "transparent", border: "none", color: "#4a5568", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", textAlign: "left", letterSpacing: "0.07em", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
                          <span style={{ fontSize: 14 }}>⚡</span> {streaming ? "STREAM ON" : "STREAM OFF"}
                        </button>
                        <button className="user-menu-item"
                          onClick={() => { setShowUserMenu(false); setShowAvatar(s => !s); }}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 7, background: "transparent", border: "none", color: "#4a5568", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", textAlign: "left", letterSpacing: "0.07em", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
                          <span style={{ fontSize: 14 }}>◈</span> {showAvatar ? "HIDE AVATAR" : "SHOW AVATAR"}
                        </button>
                      </>
                    )}
                    <button
                      className="user-menu-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        if (window.confirm("Sign out of ARIA?")) { stopSpeaking(); onLogout(); }
                      }}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 7, background: "transparent", border: "none", color: "#4a5568", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", textAlign: "left", letterSpacing: "0.07em", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}
                    >
                      <span style={{ fontSize: 14 }}>⎋</span> SIGN OUT
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Model selector */}
          <div className="models-scroll" style={{
            padding: isMobile ? "6px 12px" : "8px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
            display: "flex", gap: 6, overflowX: "auto", flexShrink: 0,
            background: "rgba(8,12,20,0.9)",
            scrollbarWidth: "none", msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}>
            {MODELS.map((m) => (
              <button key={m.id} onClick={() => setSelectedModel(m.id)} style={{
                padding: isMobile ? "6px 10px" : "5px 12px",
                borderRadius: 7, fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.2s", flexShrink: 0,
                background: selectedModel === m.id ? "rgba(0,245,160,0.08)" : "rgba(255,255,255,0.02)",
                border: selectedModel === m.id ? "1px solid rgba(0,245,160,0.3)" : "1px solid rgba(255,255,255,0.05)",
                color: selectedModel === m.id ? "#00f5a0" : "#2d3748",
                touchAction: "manipulation", minHeight: 34,
              }}>
                {isMobile ? m.name.split(" ").slice(0, 2).join(" ") : m.name}
                <span style={{
                  fontSize: 7, padding: "1px 4px", borderRadius: 3,
                  background: selectedModel === m.id ? "rgba(0,245,160,0.15)" : "rgba(255,255,255,0.04)",
                  color: selectedModel === m.id ? "#00f5a0" : "#1a2030",
                }}>{m.tag}</span>
              </button>
            ))}
          </div>

          {/* Messages + avatar area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

            {/* Scrollable messages */}
            <div style={{
              flex: 1, overflowY: "auto",
              padding: isMobile ? "12px 12px 8px" : "20px",
              paddingRight: (avatarVisible && !isMobile && !isTablet) ? "188px" : (isMobile ? "12px" : "20px"),
              transition: "padding-right 0.25s ease",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}>
              {messages.length === 0 ? (
                <EmptyState
                  onPrompt={(p) => {
                    setInput(p);
                    inputValueRef.current = p;
                    if (!isMobile) inputRef.current?.focus();
                  }}
                  isMobile={isMobile}
                />
              ) : (
                messages.map((msg, i) => <MessageBubble key={i} msg={msg} onSpeak={speak} />)
              )}
              {loading && !streaming && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Avatar */}
            {avatarVisible && (
              <div style={{
                position: "absolute",
                top: isMobile ? 8 : (isTablet ? 10 : "auto"),
                bottom: (!isMobile && !isTablet) ? (showFileZone ? 168 : 16) : "auto",
                right: isMobile ? 8 : 16,
                width: isMobile ? 72 : (isTablet ? 110 : 156),
                zIndex: 20,
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: isMobile ? "6px 4px 4px" : "14px 10px 10px",
                background: "rgba(8,12,20,0.92)", backdropFilter: "blur(20px)",
                borderRadius: isMobile ? 12 : 18,
                border: "1px solid rgba(0,245,160,0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              }}>
                <AIAvatar
                  isSpeaking={isSpeaking}
                  isThinking={isThinking}
                  size={isMobile ? "sm" : isTablet ? "md" : "lg"}
                />
                {!isMobile && (
                  <div style={{ marginTop: 10, fontSize: 8, color: "#1a2030", textAlign: "center", letterSpacing: "0.1em" }}>
                    BROWSER TTS<br />VOICE ENGINE
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div style={{
              padding: isMobile ? "6px 12px" : "8px 16px",
              borderTop: "1px solid rgba(0,245,160,0.06)",
              background: "rgba(8,12,20,0.95)",
              display: "flex", gap: 8, overflowX: "auto", flexShrink: 0,
              flexWrap: "nowrap",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none", msOverflowStyle: "none",
              maxHeight: 70,
            }}>
              {attachedFiles.map((f, i) => (
                <FileChip key={i} file={f} onRemove={() => removeFile(i)} isMobile={isMobile} />
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
          <div
            className="input-area-wrap"
            style={{
              borderTop: "1px solid rgba(0,245,160,0.07)",
              padding: isMobile ? "10px 12px 12px" : "12px 16px 16px",
              background: "rgba(8,12,20,0.97)", backdropFilter: "blur(20px)",
              flexShrink: 0,
            }}
          >
            <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: isMobile ? 6 : 8, alignItems: "flex-end" }}>

              {/* Mic button */}
              <button
                onClick={isListening ? stopListening : startListening}
                style={{
                  width: 44, height: 44, borderRadius: 11, fontSize: 18, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isListening ? "rgba(245,101,101,0.12)" : "rgba(255,255,255,0.03)",
                  border: isListening ? "1px solid rgba(245,101,101,0.4)" : "1px solid rgba(255,255,255,0.07)",
                  color: isListening ? "#f56565" : "#2d3748",
                  animation: isListening ? "micPulse 1s infinite" : "none",
                  transition: "all 0.2s", touchAction: "manipulation",
                }}
                title="Voice input"
              >{isListening ? "⏹" : "🎙"}</button>

              {/* File attach button */}
              <button
                onClick={() => setShowFileZone(s => !s)}
                style={{
                  width: 44, height: 44, borderRadius: 11, fontSize: 18, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: showFileZone || attachedFiles.length > 0 ? "rgba(0,217,245,0.1)" : "rgba(255,255,255,0.03)",
                  border: showFileZone || attachedFiles.length > 0 ? "1px solid rgba(0,217,245,0.35)" : "1px solid rgba(255,255,255,0.07)",
                  color: showFileZone || attachedFiles.length > 0 ? "#00d9f5" : "#2d3748",
                  transition: "all 0.2s", position: "relative", touchAction: "manipulation",
                }}
                title="Attach files"
              >
                📎
                {attachedFiles.length > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -4,
                    width: 16, height: 16, borderRadius: "50%", fontSize: 9,
                    background: "#00d9f5", color: "#000", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                  }}>{attachedFiles.length}</span>
                )}
              </button>

              {/* Textarea wrapper */}
              <div style={{
                flex: 1, position: "relative", borderRadius: 13,
                background: isListening ? "rgba(245,101,101,0.04)" : "rgba(255,255,255,0.03)",
                border: isListening ? "1px solid rgba(245,101,101,0.3)" : "1px solid rgba(0,245,160,0.12)",
                transition: "all 0.3s",
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // FIX: keep ref in sync so sendMessage always reads latest value
                    inputValueRef.current = e.target.value;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Listening… speak now" : "Message ARIA…"}
                  rows={1}
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 14px" : "12px 16px",
                    background: "transparent", border: "none",
                    color: isListening ? "#f56565" : "#e8eaf6",
                    fontSize: isMobile ? 16 : 13,
                    fontFamily: "'IBM Plex Mono', monospace",
                    resize: "none",
                    maxHeight: isMobile ? 100 : 120,
                    overflowY: "auto",
                    lineHeight: 1.6,
                    WebkitAppearance: "none",
                  }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    const maxH = window.innerHeight < 600 ? 72 : (isMobile ? 100 : 120);
                    e.target.style.height = Math.min(e.target.scrollHeight, maxH) + "px";
                  }}
                />
              </div>

              {/* Send / Stop button */}
              <button
                onClick={loading ? stopGeneration : () => sendMessage()}
                disabled={!loading && !input.trim() && attachedFiles.length === 0}
                style={{
                  width: 44, height: 44, borderRadius: 11, fontSize: 20, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  background: loading
                    ? "rgba(245,101,101,0.12)"
                    : (input.trim() || attachedFiles.length > 0)
                    ? "linear-gradient(135deg, #00f5a0, #00d9f5)"
                    : "rgba(255,255,255,0.03)",
                  border: loading ? "1px solid rgba(245,101,101,0.3)" : "none",
                  color: loading
                    ? "#f56565"
                    : (input.trim() || attachedFiles.length > 0)
                    ? "#000"
                    : "#1a2030",
                  boxShadow: !loading && (input.trim() || attachedFiles.length > 0)
                    ? "0 4px 18px rgba(0,245,160,0.3)"
                    : "none",
                  touchAction: "manipulation",
                  pointerEvents: (!loading && !input.trim() && attachedFiles.length === 0) ? "none" : "auto",
                }}>
                {loading ? "■" : "↑"}
              </button>
            </div>

            {/* Status bar */}
            <div style={{
              maxWidth: 900, margin: "5px auto 0",
              fontSize: 9, color: "#1a2030", letterSpacing: "0.07em",
              textAlign: "center", display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap",
            }}>
              <span>GROQ · {MODELS.find(m => m.id === selectedModel)?.name}</span>
              <span style={{ color: isListening ? "#f56565" : voiceEnabled ? "#00f5a0" : "#1a2030" }}>
                {isListening ? "🎙 LISTENING" : voiceEnabled ? "🔊 AUTO-SPEAK" : "🔇 MUTED"}
              </span>
              {attachedFiles.length > 0 && (
                <span style={{ color: "#00d9f5" }}>
                  {attachedFiles.length} FILE{attachedFiles.length > 1 ? "S" : ""} ATTACHED
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onPrompt, isMobile }) {
  const prompts = [
    "Explain quantum entanglement",
    "Write a Python web scraper",
    "Summarize Stoicism's key ideas",
    "Analyze the uploaded document",
  ];
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "55vh", gap: 12,
      color: "#2d3748", textAlign: "center",
      padding: isMobile ? "0 8px" : "0",
    }}>
      <div style={{ fontSize: isMobile ? 38 : 56, opacity: 0.2 }}>◈</div>
      <div style={{
        fontSize: isMobile ? 16 : 20, fontFamily: "'Space Mono', monospace",
        background: "linear-gradient(90deg, #00f5a0, #00d9f5)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.5,
      }}>ARIA ONLINE</div>
      <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#1a2030" }}>
        TYPE, SPEAK, OR UPLOAD A FILE TO BEGIN
      </div>
      <div style={{
        marginTop: 12,
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 8, maxWidth: isMobile ? "100%" : 440, width: "100%",
      }}>
        {prompts.map(p => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            style={{
              padding: "11px 12px", borderRadius: 9, fontSize: isMobile ? 13 : 11,
              fontFamily: "'IBM Plex Mono', monospace", textAlign: "left",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,160,0.08)",
              color: "#2d3748", transition: "all 0.2s", lineHeight: 1.5,
              touchAction: "manipulation", minHeight: 44,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(0,245,160,0.04)";
              e.currentTarget.style.color = "#00f5a0";
              e.currentTarget.style.borderColor = "rgba(0,245,160,0.2)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              e.currentTarget.style.color = "#2d3748";
              e.currentTarget.style.borderColor = "rgba(0,245,160,0.08)";
            }}
          >{p}</button>
        ))}
      </div>
    </div>
  );
}

// ── File Chip ─────────────────────────────────────────────────────────────────
function FileChip({ file, onRemove, isMobile }) {
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
        <div style={{
          fontSize: 10, color: "#00d9f5", fontWeight: 500,
          maxWidth: isMobile ? 70 : 120,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{file.name}</div>
        <div style={{ fontSize: 9, color: "#2d3748" }}>{(file.size / 1024).toFixed(0)}KB</div>
      </div>
      <button
        className="file-remove"
        onClick={onRemove}
        style={{
          width: 20, height: 20, borderRadius: "50%", fontSize: 9,
          background: "rgba(245,101,101,0.2)", color: "#f56565",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: isMobile ? 1 : 0,
          transition: "opacity 0.15s", marginLeft: 2,
          touchAction: "manipulation", flexShrink: 0,
        }}
      >✕</button>
    </div>
  );
}