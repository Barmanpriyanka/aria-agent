import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "aria_chat_sessions";
const MAX_SESSIONS = 50;

function generateId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveToStorage(sessions) {
  try {
    // Keep only the most recent MAX_SESSIONS
    const trimmed = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Could not save sessions to localStorage:", e);
  }
}

export function useChatMemory() {
  const [sessions, setSessions] = useState(() => loadFromStorage());
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const loaded = loadFromStorage();
    return loaded.length > 0 ? loaded[0].id : null;
  });

  // Persist whenever sessions change
  useEffect(() => {
    saveToStorage(sessions);
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Create a new session and make it active
  const createSession = useCallback((title = "New Chat") => {
    const id = generateId();
    const newSession = {
      id,
      title: title.slice(0, 60),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(id);
    return id;
  }, []);

  // Switch active session
  const selectSession = useCallback((id) => {
    setActiveSessionId(id);
  }, []);

  // Update a session — accepts a partial object or an updater function
  const updateSession = useCallback((id, updaterOrPatch) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const patch =
          typeof updaterOrPatch === "function" ? updaterOrPatch(s) : updaterOrPatch;
        return { ...s, ...patch, id }; // id is immutable
      })
    );
  }, []);

  // Delete a session; auto-select the next one
  const deleteSession = useCallback(
    (id) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (activeSessionId === id) {
          setActiveSessionId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [activeSessionId]
  );

  // Rename a session
  const renameSession = useCallback((id, newTitle) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, title: newTitle.slice(0, 60), updatedAt: Date.now() } : s
      )
    );
  }, []);

  // Clear all sessions
  const clearAllSessions = useCallback(() => {
    setSessions([]);
    setActiveSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    sessions,
    activeSessionId,
    activeSession,
    createSession,
    selectSession,
    updateSession,
    deleteSession,
    renameSession,
    clearAllSessions,
  };
}