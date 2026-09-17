import React, { useEffect, useRef, useState } from "react";
import { callClaude } from "../utils/api";

const MODES = [
  { id: "explain", label: "Explain a topic", icon: "i" },
  { id: "roadmap", label: "Create a career roadmap", icon: "R" },
  { id: "placement_mode", label: "Find internships", icon: "J" },
  { id: "plan", label: "Build a study plan", icon: "P" },
];

const SYSTEM_PROMPTS = {
  explain: `You are an AI study assistant for Indian B.Tech students. Explain the given topic simply with examples and 3 practice questions. Use clear headings and bullet points. Keep it concise.`,
  mock_test: `You are creating a mock test for Indian B.Tech students. Generate 3 MCQ questions from the given topic. Format: Q) question\nA) option\nB) option\nC) option\nD) option\nAnswer: X\nExplanation: ...`,
  daily_coach: `You are a motivational study coach for Indian students. Give personalized motivation, study tips, and an action plan based on what the student says. Keep it energetic and friendly.`,
  flashcards: `Create 5 flashcards in Q&A format for the given topic. Format: Q: question\nA: answer\n---`,
  debug: `You are a coding expert. Explain the error/code issue and provide the corrected code with explanation.`,
  roadmap: `Create a step-by-step career roadmap for an Indian engineering student. Include skills to learn, resources, and timeline.`,
  weakness_killer: `Analyze the weak topics and create a focused improvement plan with specific daily tasks and resources.`,
  exam_readiness: `Analyze exam readiness for the given subject. Provide preparation percentage estimate, key topics to focus on, and last-minute tips.`,
  placement_mode: `You are a placement preparation expert. Help with DSA, aptitude, and interview preparation for Indian tech companies.`,
  summarize: `Summarize the given content into clear, concise bullet points that a student can quickly review.`,
  plan: `Create a practical study plan for an Indian engineering student. Include a realistic schedule, priorities, and checkpoints.`,
};

const DEFAULT_MESSAGES = [
  {
    id: "welcome",
    role: "bot",
    text: "Welcome. I can help you understand concepts, plan your study time, prepare for placements, and debug code.",
  },
];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function renderInline(text) {
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
    .map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={index}>{part.slice(1, -1)}</code>;
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link)
        return (
          <a key={index} href={link[2]} target="_blank" rel="noreferrer">
            {link[1]}
          </a>
        );
      return part;
    });
}

function MessageContent({ text }) {
  const lines = text.split("\n");
  const blocks = [];
  let list = null;
  let code = null;

  const flushList = () => {
    if (list) {
      blocks.push(<ul key={`list-${blocks.length}`}>{list}</ul>);
      list = null;
    }
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      flushList();
      if (code === null) code = [];
      else {
        blocks.push(
          <pre key={`code-${blocks.length}`}>
            <code>{code.join("\n")}</code>
          </pre>,
        );
        code = null;
      }
      return;
    }
    if (code !== null) {
      code.push(line);
      return;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      list = list || [];
      list.push(
        <li key={`${index}-${list.length}`}>
          {renderInline((bullet || numbered)[1])}
        </li>,
      );
      return;
    }
    flushList();
    if (!line.trim()) blocks.push(<span className="ai-break" key={index} />);
    else if (/^#{1,3}\s/.test(line))
      blocks.push(
        <h3 key={index}>{renderInline(line.replace(/^#{1,3}\s/, ""))}</h3>,
      );
    else blocks.push(<p key={index}>{renderInline(line)}</p>);
  });
  flushList();
  if (code !== null)
    blocks.push(
      <pre key={`code-${blocks.length}`}>
        <code>{code.join("\n")}</code>
      </pre>,
    );
  return <>{blocks}</>;
}

export default function AIAssistant({ isActive, setCurrentScreen, addXP }) {
  const [aiMode, setAiMode] = useState("explain");
  const [aiInput, setAiInput] = useState("");
  const [aiChat, setAiChat] = useState(() => {
    try {
      const saved = localStorage.getItem(
        `sp_ai_chat_${localStorage.getItem("sp_current") || "guest"}`,
      );
      return saved ? JSON.parse(saved) : DEFAULT_MESSAGES;
    } catch {
      return DEFAULT_MESSAGES;
    }
  });
  const [history, setHistory] = useState(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(
            `sp_ai_history_${localStorage.getItem("sp_current") || "guest"}`,
          ),
        ) || []
      );
    } catch {
      return [];
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);
  const lastPromptRef = useRef("");
  const requestIdRef = useRef(0);
  const isGeneratingRef = useRef(false);

  const scrollToBottom = (behavior = "smooth") =>
    chatEndRef.current?.scrollIntoView({ behavior, block: "end" });

  useEffect(() => {
    localStorage.setItem(
      `sp_ai_chat_${localStorage.getItem("sp_current") || "guest"}`,
      JSON.stringify(aiChat),
    );
    if (isActive) scrollToBottom();
  }, [aiChat, isActive]);

  useEffect(() => {
    if (!isActive) return undefined;
    const viewport = window.visualViewport;
    const keepComposerVisible = () => {
      document.documentElement.style.setProperty(
        "--ai-keyboard-offset",
        `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`,
      );
      window.setTimeout(() => scrollToBottom("auto"), 40);
    };
    viewport?.addEventListener("resize", keepComposerVisible);
    viewport?.addEventListener("scroll", keepComposerVisible);
    const timer = window.setTimeout(() => scrollToBottom("auto"), 50);
    return () => {
      window.clearTimeout(timer);
      viewport?.removeEventListener("resize", keepComposerVisible);
      viewport?.removeEventListener("scroll", keepComposerVisible);
      document.documentElement.style.removeProperty("--ai-keyboard-offset");
    };
  }, [isActive]);

  const startNewChat = () => {
    if (aiChat.length > 1) {
      const firstUser = aiChat.find((message) => message.role === "user");
      setHistory((previous) =>
        [
          {
            id: makeId(),
            title: firstUser?.text || "Study conversation",
            messages: aiChat,
          },
          ...previous,
        ].slice(0, 20),
      );
    }
    setAiChat(DEFAULT_MESSAGES);
    setAiInput("");
    setErrorMessage("");
    setDrawerOpen(false);
  };

  const loadConversation = (conversation) => {
    setAiChat(conversation.messages);
    setDrawerOpen(false);
  };

  useEffect(() => {
    localStorage.setItem(
      `sp_ai_history_${localStorage.getItem("sp_current") || "guest"}`,
      JSON.stringify(history),
    );
  }, [history]);

  const handleSendAIChat = async (prompt = aiInput) => {
    const text = prompt.trim();
    if (!text || isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    lastPromptRef.current = text;
    const requestId = ++requestIdRef.current;
    setAiInput("");
    setErrorMessage("");
    setIsGenerating(true);
    setAiChat((prev) => [
      ...prev,
      { id: makeId(), role: "user", text },
      { id: "loading", role: "bot", text: "", loading: true },
    ]);

    try {
      const resp = await callClaude(
        SYSTEM_PROMPTS[aiMode] || SYSTEM_PROMPTS.explain,
        text,
        800,
      );
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(
          data.message || data.error || "The AI service could not respond.",
        );
      }
      const reply = data.content[0].text;
      if (requestId !== requestIdRef.current) return;
      setAiChat((prev) => [
        ...prev.filter((message) => !message.loading),
        { id: makeId(), role: "bot", text: reply },
      ]);
      addXP(5);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setAiChat((prev) => prev.filter((message) => !message.loading));
      setErrorMessage(
        err.message?.includes("rate limit")
          ? "Too many requests. Please wait a moment and try again."
          : err.message ||
              "The assistant could not respond. Check that the backend is running.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        isGeneratingRef.current = false;
        setIsGenerating(false);
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendAIChat();
    }
  };

  const handleInput = (event) => {
    setAiInput(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;
  };

  const copyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* Clipboard may be unavailable in embedded browsers. */
    }
  };

  return (
    <div id="ai-screen" className={`screen ${isActive ? "active" : ""}`}>
      <div
        className={`ai-assistant-shell ${drawerOpen ? "drawer-is-open" : ""}`}
      >
        <header className="ai-header">
          <div className="ai-header-leading">
            <button
              className="ai-icon-btn"
              type="button"
              aria-label="Back to dashboard"
              onClick={() => setCurrentScreen("dashboard")}
            >
              ←
            </button>
            <button
              className="ai-icon-btn"
              type="button"
              aria-label="Open chat history"
              onClick={() => setDrawerOpen(true)}
            >
              ☰
            </button>
          </div>
          <div className="ai-header-title">
            <span className="ai-status-dot" /> <strong>AI Assistant</strong>
            <small>Study Planner Pro</small>
          </div>
          <div className="ai-header-actions">
            <button
              className="ai-icon-btn"
              type="button"
              aria-label="Start a new chat"
              onClick={startNewChat}
            >
              ＋
            </button>
            <button
              className="ai-icon-btn"
              type="button"
              aria-label="More options"
            >
              •••
            </button>
          </div>
        </header>

        <aside className="ai-history-drawer" aria-label="Chat history">
          <div className="ai-drawer-head">
            <strong>Conversations</strong>
            <button
              className="ai-icon-btn"
              type="button"
              aria-label="Close chat history"
              onClick={() => setDrawerOpen(false)}
            >
              ×
            </button>
          </div>
          <button className="ai-new-chat" type="button" onClick={startNewChat}>
            ＋ <span>New chat</span>
          </button>
          <label className="ai-search">
            <span>⌕</span>
            <input
              placeholder="Search conversations"
              aria-label="Search conversations"
            />
          </label>
          <div className="ai-history-list">
            <span className="ai-history-label">Recent chats</span>
            {history.length === 0 ? (
              <p className="ai-empty-history">
                Your saved chats will appear here.
              </p>
            ) : (
              history.map((conversation) => (
                <button
                  key={conversation.id}
                  className="ai-history-item"
                  type="button"
                  onClick={() => loadConversation(conversation)}
                >
                  {conversation.title}
                </button>
              ))
            )}
            {history.length > 0 && (
              <span className="ai-history-label">Older chats</span>
            )}
          </div>
        </aside>
        {drawerOpen && (
          <button
            className="ai-drawer-backdrop"
            type="button"
            aria-label="Close chat history"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        <main className="ai-chat" ref={chatRef} aria-live="polite">
          {aiChat.length === 1 && !aiChat[0].loading && (
            <section className="ai-welcome">
              <div className="ai-welcome-icon">✦</div>
              <h1>How can I help you?</h1>
              <p>
                Your study companion for clearer concepts, better plans, and
                confident preparation.
              </p>
              <div className="ai-suggestions">
                {MODES.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => {
                      setAiMode(suggestion.id);
                      if (suggestion.id === "plan")
                        setAiInput("Create a study plan for me");
                      else setAiInput(suggestion.label);
                      inputRef.current?.focus();
                    }}
                  >
                    <span>{suggestion.icon}</span>
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </section>
          )}
          <div className="ai-message-list">
            {aiChat.map((message) => (
              <article
                key={message.id}
                className={`ai-message ${message.role} ${message.loading ? "is-loading" : ""}`}
              >
                <div className="ai-message-avatar">
                  {message.role === "user" ? "You" : "✦"}
                </div>
                <div className="ai-message-body">
                  {message.loading ? (
                    <>
                      <span className="ai-typing">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="ai-loading-label">Thinking</span>
                    </>
                  ) : (
                    <MessageContent text={message.text} />
                  )}
                  {message.role === "bot" && !message.loading && (
                    <div className="ai-message-actions">
                      <button
                        type="button"
                        onClick={() => copyMessage(message.text)}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendAIChat(lastPromptRef.current)}
                        disabled={isGenerating}
                      >
                        Regenerate
                      </button>
                      <button type="button" aria-label="Helpful response">
                        ♡
                      </button>
                      <button type="button" aria-label="Unhelpful response">
                        ♧
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
            <div ref={chatEndRef} />
          </div>
        </main>

        <footer className="ai-composer-area">
          {errorMessage && (
            <div className="ai-error" role="alert">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => handleSendAIChat(lastPromptRef.current)}
                disabled={isGenerating}
              >
                Retry
              </button>
            </div>
          )}
          {isGenerating && (
            <button
              className="ai-stop"
              type="button"
              onClick={() => {
                requestIdRef.current += 1;
                isGeneratingRef.current = false;
                setIsGenerating(false);
                setAiChat((prev) => prev.filter((message) => !message.loading));
              }}
            >
              Stop generating
            </button>
          )}
          <div className="ai-mode-strip">
            {Object.keys(SYSTEM_PROMPTS)
              .slice(0, 5)
              .map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={aiMode === mode ? "active" : ""}
                  onClick={() => setAiMode(mode)}
                >
                  {mode.replaceAll("_", " ")}
                </button>
              ))}
          </div>
          <div className="ai-composer">
            <button
              className="ai-composer-btn"
              type="button"
              aria-label="Attach a file"
            >
              ＋
            </button>
            <textarea
              ref={inputRef}
              className="ai-inp"
              rows="1"
              value={aiInput}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() =>
                window.setTimeout(() => scrollToBottom("smooth"), 100)
              }
              placeholder="Message AI Assistant..."
            />
            <button
              className="ai-composer-btn ai-mic"
              type="button"
              aria-label="Voice input"
            >
              ◉
            </button>
            <button
              className="ai-send"
              type="button"
              onClick={() => handleSendAIChat()}
              disabled={!aiInput.trim() || isGenerating}
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
          <div className="ai-composer-note">
            Enter to send · Shift + Enter for a new line
          </div>
        </footer>
      </div>
    </div>
  );
}
