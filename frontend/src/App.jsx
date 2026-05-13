import { useState, useRef, useEffect, useCallback } from "react";
import AIAvatar from "./AIAvatar";

const API_BASE = "http://localhost:8000";

const MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", tag: "POWERFUL" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", tag: "FAST" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", tag: "LONG CTX" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B", tag: "EFFICIENT" },
];

// ─── Typing Indicator ─────────────────────────────────────────────────────
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

// ─── Message Bubble ───────────────────────────────────────────────────────
function MessageBubble({ msg, onSpeak }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", flexDirection: isUser ? "row-reverse" : "row",
      gap: 12, marginBottom: 24, alignItems: "flex-start",
      animation: "fadeSlideIn 0.3s ease-out",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: isUser ? "10px" : "50%",
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 700,
        background: isUser ? "linear-gradient(135deg, #667eea, #764ba2)" : "linear-gradient(135deg, #00f5a0, #00d9f5)",
        color: isUser ? "#fff" : "#000",
        boxShadow: isUser ? "0 4px 15px rgba(102,126,234,0.4)" : "0 4px 15px rgba(0,245,160,0.35)",
      }}>
        {isUser ? "U" : "A"}
      </div>

      <div style={{ maxWidth: "70%", position: "relative" }}>
        <div style={{
          padding: "14px 18px",
          borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
          background: isUser ? "linear-gradient(135deg, #667eea22, #764ba222)" : "rgba(255,255,255,0.04)",
          border: isUser ? "1px solid rgba(102,126,234,0.3)" : "1px solid rgba(0,245,160,0.15)",
          color: "#e8eaf6", fontSize: 14.5, lineHeight: 1.7,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
          fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.01em",
        }}>
          {msg.content}
          {msg.streaming && (
            <span style={{
              display: "inline-block", width: 8, height: 14, background: "#00f5a0",
              marginLeft: 3, verticalAlign: "middle", animation: "blink 0.7s step-end infinite",
            }} />
          )}
        </div>
        {!isUser && !msg.streaming && msg.content && (
          <button onClick={() => onSpeak(msg.content)} style={{
            position: "absolute", bottom: -8, right: 8,
            padding: "2px 8px", borderRadius: 5, fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em",
            background: "rgba(0,245,160,0.1)", color: "#00f5a0",
            border: "1px solid rgba(0,245,160,0.25)", cursor: "pointer",
          }}>
            ▶ SPEAK
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [streaming, setStreaming] = useState(true);
  const [status, setStatus] = useState("idle");
  const [tokenCount, setTokenCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showAvatar, setShowAvatar] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // ── FIX: use a ref to always hold the latest input value ──────────────────
  // This solves the voice bug: sendMessage() reads inputRef.current instead of
  // the stale closure value of `input`.
  const inputValueRef = useRef(input);
  useEffect(() => { inputValueRef.current = input; }, [input]);

  // ── FIX: separate flag so voice send fires after state settles ────────────
  const pendingVoiceSend = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Text-to-Speech ──────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const clean = text
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "").replace(/\*/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "code snippet")
      .replace(/https?:\/\/\S+/g, "link")
      .substring(0, 600);

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Enhanced")
    ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, [voiceEnabled]);

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  // ── Send Message ──────────────────────────────────────────────────────────
  // FIX: Accept optional `overrideText` so voice can pass the transcript
  // directly instead of relying on React state having updated already.
  const sendMessage = useCallback(async (overrideText) => {
    const text = (overrideText ?? inputValueRef.current).trim();
    if (!text || loading) return;
    stopSpeaking();

    const userMsg = { role: "user", content: text };
    setMessages(prev => {
      const newMessages = [...prev, userMsg];
      return newMessages;
    });
    setInput("");
    inputValueRef.current = "";
    setLoading(true);
    setStatus("connecting");

    // Capture messages snapshot for API call
    const messagesSnapshot = [...messages, userMsg];

    if (streaming) {
      const assistantMsg = { role: "assistant", content: "", streaming: true };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        abortRef.current = new AbortController();
        const res = await fetch(`${API_BASE}/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesSnapshot.map(({ role, content }) => ({ role, content })),
            model: selectedModel,
          }),
          signal: abortRef.current.signal,
        });

        setStatus("streaming");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) throw new Error(data.error);
                if (data.token) {
                  accumulated += data.token;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant", content: accumulated, streaming: !data.done,
                    };
                    return updated;
                  });
                }
                if (data.done) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant", content: accumulated, streaming: false,
                    };
                    return updated;
                  });
                  if (voiceEnabled) speak(accumulated);
                }
              } catch (_) {}
            }
          }
        }
        setStatus("idle");
      } catch (e) {
        if (e.name !== "AbortError") {
          setStatus("error");
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant", content: `⚠️ Error: ${e.message}`, streaming: false,
            };
            return updated;
          });
        }
      }
    } else {
      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesSnapshot.map(({ role, content }) => ({ role, content })),
            model: selectedModel,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Unknown error");
        const reply = data.message;
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setTokenCount((t) => t + (data.usage?.total_tokens || 0));
        setStatus("idle");
        if (voiceEnabled) speak(reply);
      } catch (e) {
        setStatus("error");
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Error: ${e.message}` }]);
      }
    }

    setLoading(false);
    inputRef.current?.focus();
  }, [loading, messages, selectedModel, streaming, voiceEnabled, speak]);

  // ── Speech Recognition (STT) ─────────────────────────────────────────────
  // FIX: on recognition end, grab the final transcript from the ref and send.
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }
    stopSpeaking();
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      // Show combined interim + final in the textarea while speaking
      setInput(finalTranscript + interim);
      inputValueRef.current = finalTranscript + interim;
    };

    recognition.onend = () => {
      setIsListening(false);
      // FIX: use the captured finalTranscript (or whatever is in the input ref)
      // to send immediately — no stale closure issue.
      const toSend = finalTranscript.trim() || inputValueRef.current.trim();
      if (toSend) {
        sendMessage(toSend);
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sendMessage]);

  const stopListening = () => {
    // Stopping will trigger onend which fires sendMessage automatically
    recognitionRef.current?.stop();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    stopSpeaking();
    setMessages([]);
    setTokenCount(0);
    setStatus("idle");
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    setLoading(false);
    setStatus("idle");
  };

  const isThinking = loading && !isSpeaking;

  return (
    <div style={{
      minHeight: "100vh", background: "#080c14", color: "#e8eaf6",
      fontFamily: "'IBM Plex Mono', monospace", display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080c14; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,245,160,0.3); border-radius: 2px; }
        @keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes ringPulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.08);opacity:1} }
        @keyframes waveBar { from{transform:scaleY(0.4)} to{transform:scaleY(1)} }
        @keyframes micPulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,101,101,0.4)} 50%{box-shadow:0 0 0 8px rgba(245,101,101,0)} }
        textarea:focus { outline: none; }
        button { cursor: pointer; border: none; }
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom: "1px solid rgba(0,245,160,0.1)", padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(8,12,20,0.95)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "12px",
            background: "linear-gradient(135deg, #00f5a0, #00d9f5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: "0 0 20px rgba(0,245,160,0.4)",
          }}>◈</div>
          <div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              background: "linear-gradient(90deg, #00f5a0, #00d9f5)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em",
            }}>ARIA</div>
            <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: "0.15em" }}>
              ADVANCED REASONING INTELLIGENCE AGENT
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: status === "streaming" ? "#00f5a0" : status === "error" ? "#f56565"
                : status === "connecting" ? "#f6ad55" : "#4a5568",
              animation: status !== "idle" ? "pulse 1s infinite" : "none",
              boxShadow: status === "streaming" ? "0 0 8px rgba(0,245,160,0.8)" : "none",
            }} />
            <span style={{ fontSize: 11, color: "#4a5568", letterSpacing: "0.1em" }}>
              {isSpeaking ? "SPEAKING" : status.toUpperCase()}
            </span>
          </div>

          {tokenCount > 0 && (
            <span style={{ fontSize: 11, color: "#4a5568" }}>{tokenCount.toLocaleString()} tokens</span>
          )}

          <button onClick={() => { setVoiceEnabled(v => !v); if (isSpeaking) stopSpeaking(); }}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em",
              background: voiceEnabled ? "rgba(0,245,160,0.1)" : "rgba(255,255,255,0.05)",
              color: voiceEnabled ? "#00f5a0" : "#4a5568",
              border: voiceEnabled ? "1px solid rgba(0,245,160,0.3)" : "1px solid rgba(255,255,255,0.08)",
              transition: "all 0.2s",
            }}>
            {voiceEnabled ? "🔊 VOICE ON" : "🔇 VOICE OFF"}
          </button>

          <button onClick={() => setShowAvatar(s => !s)}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em",
              background: showAvatar ? "rgba(0,217,245,0.1)" : "rgba(255,255,255,0.05)",
              color: showAvatar ? "#00d9f5" : "#4a5568",
              border: showAvatar ? "1px solid rgba(0,217,245,0.3)" : "1px solid rgba(255,255,255,0.08)",
              transition: "all 0.2s",
            }}>
            AVATAR
          </button>

          <button onClick={() => setStreaming(s => !s)}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em",
              background: streaming ? "rgba(0,245,160,0.1)" : "rgba(255,255,255,0.05)",
              color: streaming ? "#00f5a0" : "#4a5568",
              border: streaming ? "1px solid rgba(0,245,160,0.3)" : "1px solid rgba(255,255,255,0.08)",
              transition: "all 0.2s",
            }}>
            {streaming ? "STREAM ON" : "STREAM OFF"}
          </button>

          {isSpeaking && (
            <button onClick={stopSpeaking} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em",
              background: "rgba(245,101,101,0.12)", color: "#f56565",
              border: "1px solid rgba(245,101,101,0.3)", animation: "pulse 1s infinite",
            }}>■ STOP</button>
          )}

          <button onClick={clearChat} style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            background: "rgba(255,255,255,0.04)", color: "#4a5568",
            border: "1px solid rgba(255,255,255,0.07)", letterSpacing: "0.08em",
          }}>CLEAR</button>
        </div>
      </header>

      {/* Model selector */}
      <div style={{
        padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", gap: 8, overflowX: "auto",
      }}>
        {MODELS.map((m) => (
          <button key={m.id} onClick={() => setSelectedModel(m.id)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
            background: selectedModel === m.id
              ? "linear-gradient(135deg, rgba(0,245,160,0.15), rgba(0,217,245,0.1))"
              : "rgba(255,255,255,0.03)",
            border: selectedModel === m.id ? "1px solid rgba(0,245,160,0.4)" : "1px solid rgba(255,255,255,0.07)",
            color: selectedModel === m.id ? "#00f5a0" : "#4a5568",
          }}>
            {m.name}
            <span style={{
              fontSize: 9, padding: "1px 5px", borderRadius: 4,
              background: selectedModel === m.id ? "rgba(0,245,160,0.2)" : "rgba(255,255,255,0.05)",
              color: selectedModel === m.id ? "#00f5a0" : "#2d3748", letterSpacing: "0.05em",
            }}>{m.tag}</span>
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Messages area — always full width, avatar floats on top */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "24px",
          // FIX: leave right margin so messages don't go under the floating avatar
          paddingRight: showAvatar ? "196px" : "24px",
        }}>
          {messages.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", minHeight: 400, gap: 16,
              color: "#2d3748", textAlign: "center",
            }}>
              <div style={{ fontSize: 64, opacity: 0.3 }}>◈</div>
              <div style={{
                fontSize: 22, fontFamily: "'Space Mono', monospace",
                background: "linear-gradient(90deg, #00f5a0, #00d9f5)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.6,
              }}>ARIA ONLINE</div>
              <div style={{ fontSize: 12, letterSpacing: "0.12em", color: "#2d3748" }}>
                TYPE OR SPEAK TO START
              </div>
              <div style={{
                marginTop: 24, display: "grid",
                gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 480,
              }}>
                {[
                  "Explain quantum entanglement",
                  "Write a Python web scraper",
                  "Summarize the key ideas in Stoicism",
                  "Debug this React component",
                ].map((prompt) => (
                  <button key={prompt} onClick={() => setInput(prompt)} style={{
                    padding: "10px 14px", borderRadius: 10, fontSize: 12,
                    fontFamily: "'IBM Plex Mono', monospace", textAlign: "left",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,245,160,0.1)",
                    color: "#4a5568", transition: "all 0.2s", lineHeight: 1.5,
                  }}
                    onMouseEnter={(e) => { e.target.style.background = "rgba(0,245,160,0.05)"; e.target.style.color = "#00f5a0"; e.target.style.borderColor = "rgba(0,245,160,0.25)"; }}
                    onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.03)"; e.target.style.color = "#4a5568"; e.target.style.borderColor = "rgba(0,245,160,0.1)"; }}
                  >{prompt}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} onSpeak={speak} />
            ))
          )}
          {loading && !streaming && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* ── FIX: Avatar is now position:fixed so it stays visible at all times ── */}
        {showAvatar && (
          <div style={{
            position: "fixed",
            // Sit in the bottom-right corner, just above the input bar
            right: 24,
            bottom: 110,
            width: 160,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "16px 12px 12px",
            background: "rgba(8,12,20,0.85)",
            backdropFilter: "blur(16px)",
            borderRadius: 20,
            border: "1px solid rgba(0,245,160,0.12)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}>
            <AIAvatar isSpeaking={isSpeaking} isThinking={isThinking} />
            <div style={{ marginTop: 12, fontSize: 9, color: "#2d3748", textAlign: "center", letterSpacing: "0.1em" }}>
              BROWSER TTS<br />VOICE ENGINE
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        borderTop: "1px solid rgba(0,245,160,0.08)",
        padding: "16px 24px 20px",
        background: "rgba(8,12,20,0.95)", backdropFilter: "blur(20px)",
        position: "sticky", bottom: 0, zIndex: 60,
      }}>
        <div style={{
          maxWidth: 860, margin: "0 auto",
          display: "flex", gap: 10, alignItems: "flex-end",
        }}>
          {/* Mic button */}
          <button
            onClick={isListening ? stopListening : startListening}
            title={isListening ? "Stop listening (will auto-send)" : "Start voice input"}
            style={{
              width: 48, height: 48, borderRadius: 12, fontSize: 18,
              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: isListening ? "rgba(245,101,101,0.15)" : "rgba(255,255,255,0.04)",
              border: isListening ? "1px solid rgba(245,101,101,0.4)" : "1px solid rgba(255,255,255,0.08)",
              color: isListening ? "#f56565" : "#4a5568",
              animation: isListening ? "micPulse 1s infinite" : "none",
              transition: "all 0.2s",
            }}>
            {isListening ? "⏹" : "🎙"}
          </button>

          {/* Text input */}
          <div style={{
            flex: 1, position: "relative", borderRadius: 14,
            background: isListening ? "rgba(245,101,101,0.04)" : "rgba(255,255,255,0.03)",
            border: isListening ? "1px solid rgba(245,101,101,0.3)" : "1px solid rgba(0,245,160,0.15)",
            transition: "all 0.3s",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening... speak now (stops & sends automatically)" : "Message ARIA... (Enter to send, Shift+Enter for newline)"}
              rows={1}
              style={{
                width: "100%", padding: "14px 18px",
                background: "transparent", border: "none",
                color: isListening ? "#f56565" : "#e8eaf6",
                fontSize: 14, fontFamily: "'IBM Plex Mono', monospace",
                resize: "none", maxHeight: 140, overflowY: "auto", lineHeight: 1.6,
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
            />
          </div>

          {/* Send / Stop button */}
          <button
            onClick={loading ? stopGeneration : sendMessage}
            disabled={!loading && !input.trim()}
            style={{
              width: 48, height: 48, borderRadius: 12, fontSize: 18, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              background: loading ? "rgba(245,101,101,0.15)"
                : input.trim() ? "linear-gradient(135deg, #00f5a0, #00d9f5)" : "rgba(255,255,255,0.04)",
              border: loading ? "1px solid rgba(245,101,101,0.3)" : "none",
              color: loading ? "#f56565" : input.trim() ? "#000" : "#2d3748",
              boxShadow: !loading && input.trim() ? "0 4px 20px rgba(0,245,160,0.35)" : "none",
            }}>
            {loading ? "■" : "↑"}
          </button>
        </div>

        <div style={{
          maxWidth: 860, margin: "8px auto 0",
          fontSize: 10, color: "#2d3748", letterSpacing: "0.08em", textAlign: "center",
        }}>
          POWERED BY GROQ · {MODELS.find((m) => m.id === selectedModel)?.name}
          {" · "}
          <span style={{ color: isListening ? "#f56565" : voiceEnabled ? "#00f5a0" : "#2d3748" }}>
            {isListening ? "🎙 LISTENING — WILL AUTO-SEND WHEN DONE" : voiceEnabled ? "🔊 AUTO-SPEAK ON" : "🔇 VOICE OFF"}
          </span>
        </div>
      </div>
    </div>
  );
}