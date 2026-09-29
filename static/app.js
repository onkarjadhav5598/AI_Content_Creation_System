// AI Content System - ChatGPT/Gemini Style Frontend
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// DOM Elements
const chatViewport = $(".chat-viewport");
const welcomeScreen = $("#welcome-screen");
const messageFeed = $("#message-feed");
const assistantTyping = $("#assistant-typing");
const typingStatusText = $("#typing-status-text");
const promptInput = $("#prompt-input");
const btnSend = $("#btn-send");
const actionBoxes = $$(".action-box");
const btnClear = $("#btn-clear-chat");
const btnToggleBlueprint = $("#btn-toggle-blueprint");
const btnCloseBlueprint = $("#btn-close-blueprint");
const blueprintDrawer = $("#blueprint-drawer");
const toastEl = $("#toast");

// State
let currentAction = "story"; // "story" | "poem" | "post" | "podcast" | "analyze" | "compare"
let isGenerating = false;
let lastRequest = null; // Store last request for regeneration

// Action Metadata & Prompt Blueprint Definitions (Assignment 8 Requirements)
const ACTION_CONFIG = {
  story: {
    label: "Story",
    icon: "📖",
    placeholder: "Enter a topic for your story (e.g. 'A time traveler trapped in ancient Rome')…",
    typingText: "Groq is crafting your story…",
    endpoint: "/api/generate",
    role: "You are a creative fiction writer.",
    context: "The audience is general readers interested in the given topic.",
    task: (t) => `Write a short, engaging story (150-200 words) about '${t}'.`,
    constraints: "Keep the tone positive, avoid offensive language, and stay within 150-200 words.",
    format: "Return only the final story content, no extra commentary.",
  },
  poem: {
    label: "Poem",
    icon: "✒️",
    placeholder: "Enter a topic for your poem (e.g. 'A lighthouse standing in midnight rain')…",
    typingText: "Groq is composing your poem…",
    endpoint: "/api/generate",
    role: "You are an award-winning poet.",
    context: "The audience is poetry lovers interested in the given topic.",
    task: (t) => `Write a 4-stanza rhyming poem about '${t}'.`,
    constraints: "Rhyme scheme (AABB or ABAB), evocative imagery, avoid offensive language.",
    format: "Return only the 4 stanzas of poetry.",
  },
  post: {
    label: "Social Post",
    icon: "📱",
    placeholder: "Enter a topic or product to announce (e.g. 'AI smart coffee mug')…",
    typingText: "Groq is generating social copy…",
    endpoint: "/api/generate",
    role: "You are a professional social-media content creator.",
    context: "The audience is social media followers on LinkedIn / X / Instagram.",
    task: (t) => `Write an engaging social media post (under 60 words, with 3 relevant hashtags) about '${t}'.`,
    constraints: "Under 60 words, catchy hook, exactly 3 relevant hashtags.",
    format: "Return only the post text.",
  },
  podcast: {
    label: "Podcast Plan",
    icon: "🎙️",
    placeholder: "Enter a podcast episode topic (e.g. 'The Future of Renewable Energy')…",
    typingText: "Groq is structuring the podcast blueprint…",
    endpoint: "/api/podcast",
    role: "You are an experienced podcast producer and content strategist.",
    context: "Planning a high-impact podcast episode on the given topic.",
    task: (t) => `Generate: 1) catchy title, 2) 2-3 line description, 3) ideal guest, 4) 5 interview questions for '${t}'.`,
    constraints: "Title under 10 words. Questions open-ended, non-binary.",
    format: "JSON with keys: title, description, guest_type, questions.",
  },
  analyze: {
    label: "Text Analysis",
    icon: "🔍",
    placeholder: "Paste or type text to analyze sentiment & keywords (e.g. customer feedback or an essay)…",
    typingText: "Groq NLP engine is analyzing sentiment & keywords…",
    endpoint: "/api/analyze",
    role: "You are a Natural Language Processing (NLP) analysis engine.",
    context: "Analyzing user-submitted text for objective sentiment and key phrase extraction.",
    task: () => "Determine overall sentiment (Positive / Negative / Neutral) with confidence score (0-1), and extract top 5 keywords.",
    constraints: "Be objective and base analysis strictly on the supplied text.",
    format: "JSON with keys: sentiment, confidence, keywords.",
  },
  compare: {
    label: "Parameters",
    icon: "🧪",
    placeholder: "Enter a topic to compare outputs across 4 temperature & top-p combinations…",
    typingText: "Running 4 comparative LLM calls across parameter settings…",
    endpoint: "/api/compare",
    role: "You are a professional content creator testing model parameters.",
    context: "Prompt parameter experimentation on the given topic.",
    task: (t) => `Write a short post (under 40 words) about '${t}' under 4 different temperature / top-p settings.`,
    constraints: "Keep tone positive and test deterministic vs creative outputs.",
    format: "4 outputs at Temp 0.2, Temp 0.7, Temp 1.0, and Top-p 0.3.",
  },
};

// Utilities
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function countWords(str) {
  if (!str || typeof str !== "string") return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function showToast(message, type = "info") {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`;
  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3500);
}

function scrollToBottom() {
  setTimeout(() => {
    chatViewport.scrollTop = chatViewport.scrollHeight;
  }, 40);
}

// Logging for Assignment evaluation
function logIO(action, input, output) {
  console.group(`[Groq AI Studio] ${action}`);
  console.log("INPUT:", input);
  console.log("OUTPUT:", output);
  console.groupEnd();
}

// API Post Request
async function postApi(url, body, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Server returned an invalid response. Is the Flask server running?");
    }
    if (!res.ok) {
      throw new Error(data.error || "Request failed with status " + res.status);
    }
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again or use a shorter prompt.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Action Box Selection
function setAction(action) {
  if (!ACTION_CONFIG[action]) return;
  currentAction = action;

  actionBoxes.forEach((box) => {
    if (box.dataset.action === action) {
      box.classList.add("active");
    } else {
      box.classList.remove("active");
    }
  });

  const cfg = ACTION_CONFIG[action];
  promptInput.placeholder = cfg.placeholder;
  updateBlueprintView();
}

actionBoxes.forEach((box) => {
  box.addEventListener("click", () => {
    const chosen = box.dataset.action;
    setAction(chosen);
    promptInput.focus();
  });
});

// Update Blueprint Drawer
function updateBlueprintView() {
  const cfg = ACTION_CONFIG[currentAction];
  const topic = promptInput.value.trim() || "<your topic>";
  $("#bp-role").textContent = cfg.role;
  $("#bp-context").textContent = cfg.context;
  $("#bp-task").textContent = typeof cfg.task === "function" ? cfg.task(topic) : cfg.task;
  $("#bp-constraints").textContent = cfg.constraints;
  $("#bp-format").textContent = cfg.format;
}

// Blueprint Drawer Toggle
btnToggleBlueprint.addEventListener("click", () => {
  updateBlueprintView();
  blueprintDrawer.hidden = !blueprintDrawer.hidden;
});

btnCloseBlueprint.addEventListener("click", () => {
  blueprintDrawer.hidden = true;
});

// Auto-resizing Textarea
promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";
  const newHeight = Math.min(promptInput.scrollHeight, 160);
  promptInput.style.height = `${newHeight}px`;
  updateBlueprintView();
});

// Keyboard handling: Enter to send, Shift+Enter for newline
promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

btnSend.addEventListener("click", handleSend);

// Quick Prompts on Welcome Screen
$$(".quick-prompt-card").forEach((card) => {
  card.addEventListener("click", () => {
    const topic = card.dataset.topic;
    const action = card.dataset.action;
    setAction(action);
    promptInput.value = topic;
    handleSend();
  });
});

// Clear Chat
btnClear.addEventListener("click", () => {
  messageFeed.innerHTML = "";
  welcomeScreen.hidden = false;
  lastRequest = null;
  showToast("Chat cleared", "info");
});

// Copy Helper
async function copyToClipboard(text, btnElement) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (btnElement) {
      const originalHtml = btnElement.innerHTML;
      btnElement.innerHTML = `<span>✔</span> <span>Copied!</span>`;
      btnElement.classList.add("copied");
      setTimeout(() => {
        btnElement.innerHTML = originalHtml;
        btnElement.classList.remove("copied");
      }, 2000);
    }
    showToast("Copied to clipboard!", "success");
  } catch {
    showToast("Could not copy — please copy manually.", "error");
  }
}

// Render User Message
function appendUserMessage(text, actionKey) {
  welcomeScreen.hidden = true;
  const cfg = ACTION_CONFIG[actionKey] || ACTION_CONFIG.story;

  const row = document.createElement("div");
  row.className = "message-row user";
  row.innerHTML = `
    <div class="user-bubble">
      <div class="user-bubble-header">
        <span class="user-role-badge">You</span>
        <span class="user-action-tag">${cfg.icon} ${cfg.label}</span>
      </div>
      <div class="user-bubble-text">${escapeHtml(text)}</div>
    </div>
  `;
  messageFeed.appendChild(row);
  scrollToBottom();
}

// Render Assistant Response (ChatGPT Format)
function appendAssistantMessage(actionKey, rawData, textToCopy) {
  const cfg = ACTION_CONFIG[actionKey] || ACTION_CONFIG.story;
  const timeStr = formatTime();

  let bodyHtml = "";
  let fullCopyText = textToCopy || "";

  if (actionKey === "story") {
    const storyText = rawData.content || "";
    fullCopyText = storyText;
    const paras = storyText.split(/\n\n+/).filter(Boolean);
    const paraHtml = paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
    bodyHtml = `<div class="assistant-content-body format-story">${paraHtml || escapeHtml(storyText)}</div>`;
  } else if (actionKey === "poem") {
    const poemText = rawData.content || "";
    fullCopyText = poemText;
    bodyHtml = `<div class="assistant-content-body format-poem">${escapeHtml(poemText)}</div>`;
  } else if (actionKey === "post") {
    const postText = rawData.content || "";
    fullCopyText = postText;
    const safe = escapeHtml(postText);
    const highlighted = safe.replace(/(#\w+)/g, '<span class="hashtag">$1</span>');
    bodyHtml = `<div class="assistant-content-body format-post">${highlighted}</div>`;
  } else if (actionKey === "podcast") {
    const p = rawData;
    fullCopyText = `Podcast Title: ${p.title || ""}\n\nDescription: ${p.description || ""}\n\nIdeal Guest: ${p.guest_type || ""}\n\nInterview Questions:\n` +
      ((p.questions || []).map((q, i) => `${i + 1}. ${q}`).join("\n"));

    const qList = (p.questions || [])
      .map(
        (q, i) => `
        <div class="podcast-question-item">
          <span class="q-num">Q${i + 1}</span>
          <span>${escapeHtml(q)}</span>
        </div>`
      )
      .join("");

    bodyHtml = `
      <div class="podcast-visual-card">
        <div class="podcast-hero">
          <div class="podcast-badge">🎧 Episode Blueprint</div>
          <h3 class="podcast-title">${escapeHtml(p.title || "Untitled Episode")}</h3>
          <p class="podcast-desc">${escapeHtml(p.description || "")}</p>
        </div>
        <div class="podcast-guest">
          <strong>🎙 Ideal Guest:</strong>
          <span>${escapeHtml(p.guest_type || "Subject matter expert")}</span>
        </div>
        <div class="podcast-questions-list">
          <h4>Interview Questions (${(p.questions || []).length})</h4>
          ${qList}
        </div>
        <details class="raw-json-details">
          <summary>View Raw JSON</summary>
          <pre class="raw-json-pre">${escapeHtml(JSON.stringify(p, null, 2))}</pre>
        </details>
      </div>
    `;
  } else if (actionKey === "analyze") {
    const a = rawData;
    fullCopyText = `Sentiment: ${a.sentiment} (Confidence: ${Math.round((a.confidence || 0) * 100)}%)\nKeywords: ${(a.keywords || []).join(", ")}`;

    const sent = (a.sentiment || "Neutral").toLowerCase();
    const confPct = Math.round((a.confidence || 0) * 100);
    const keywordsHtml = (a.keywords || [])
      .map((k) => `<span class="keyword-badge"># ${escapeHtml(k)}</span>`)
      .join("");

    bodyHtml = `
      <div class="analysis-visual-card">
        <div class="analysis-sentiment-row">
          <div class="sentiment-pill ${sent}">
            <span>${sent === "positive" ? "▲" : sent === "negative" ? "▼" : "●"}</span>
            <span>${escapeHtml(a.sentiment || "Neutral")}</span>
          </div>
          <div class="confidence-meter">
            <div class="conf-labels">
              <span>Confidence Score</span>
              <strong>${confPct}%</strong>
            </div>
            <div class="conf-bar-bg">
              <div class="conf-bar-fill" style="width: ${confPct}%"></div>
            </div>
          </div>
        </div>
        <div class="keywords-section">
          <h4>Extracted Keywords</h4>
          <div class="keywords-wrap">
            ${keywordsHtml || '<span class="keyword-badge">None extracted</span>'}
          </div>
        </div>
        <details class="raw-json-details">
          <summary>View Raw JSON</summary>
          <pre class="raw-json-pre">${escapeHtml(JSON.stringify(a, null, 2))}</pre>
        </details>
      </div>
    `;
  } else if (actionKey === "compare") {
    const list = rawData.comparisons || [];
    fullCopyText = list.map((c) => `[${c.setting}]\n${c.output}`).join("\n\n");

    const cardsHtml = list
      .map(
        (c, idx) => `
        <div class="compare-card-mini">
          <div class="compare-card-header">
            <span>${escapeHtml(c.setting)}</span>
            <button type="button" class="action-btn-pill copy-card-btn" data-text="${encodeURIComponent(c.output)}">
              📋
            </button>
          </div>
          <div class="compare-card-body">${escapeHtml(c.output)}</div>
        </div>`
      )
      .join("");

    bodyHtml = `
      <div class="compare-results-grid">
        ${cardsHtml}
      </div>
    `;
  }

  const wordCount = countWords(fullCopyText);

  const row = document.createElement("div");
  row.className = "message-row assistant";
  row.innerHTML = `
    <div class="assistant-avatar">✦</div>
    <div class="assistant-card">
      <div class="assistant-card-header">
        <div class="assistant-meta">
          <span class="assistant-title">AI Assistant</span>
          <span class="type-pill">${cfg.icon} ${cfg.label}</span>
        </div>
        <span class="timestamp">${timeStr}</span>
      </div>

      ${bodyHtml}

      <div class="assistant-card-footer">
        <div class="footer-actions">
          <button type="button" class="action-btn-pill btn-copy-response">
            <span>📋</span>
            <span>Copy</span>
          </button>
          <button type="button" class="action-btn-pill btn-regen-response">
            <span>🔄</span>
            <span>Regenerate</span>
          </button>
        </div>
        <span class="word-count-badge">${wordCount} words</span>
      </div>
    </div>
  `;

  // Attach copy event to footer copy button
  const copyBtn = row.querySelector(".btn-copy-response");
  copyBtn.addEventListener("click", () => {
    copyToClipboard(fullCopyText, copyBtn);
  });

  // Attach copy event to individual comparison cards if any
  row.querySelectorAll(".copy-card-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const decoded = decodeURIComponent(b.dataset.text || "");
      copyToClipboard(decoded, b);
    });
  });

  // Attach regenerate event
  const regenBtn = row.querySelector(".btn-regen-response");
  regenBtn.addEventListener("click", () => {
    if (lastRequest) {
      executeRequest(lastRequest.action, lastRequest.input);
    }
  });

  messageFeed.appendChild(row);
  scrollToBottom();
}

// Render Error Message
function appendErrorMessage(errText) {
  const row = document.createElement("div");
  row.className = "message-row assistant";
  row.innerHTML = `
    <div class="assistant-avatar" style="border-color: var(--danger); color: var(--danger);">✕</div>
    <div class="assistant-card" style="border-color: var(--danger);">
      <div class="assistant-card-header">
        <span class="assistant-title" style="color: var(--danger);">Error</span>
        <span class="timestamp">${formatTime()}</span>
      </div>
      <div class="assistant-content-body" style="color: #ff7b72;">
        ${escapeHtml(errText)}
      </div>
    </div>
  `;
  messageFeed.appendChild(row);
  scrollToBottom();
}

// Core Execution
async function executeRequest(action, input) {
  if (isGenerating) return;
  isGenerating = true;
  btnSend.disabled = true;

  const cfg = ACTION_CONFIG[action] || ACTION_CONFIG.story;
  typingStatusText.textContent = cfg.typingText;
  assistantTyping.hidden = false;
  scrollToBottom();

  lastRequest = { action, input };

  try {
    const data = await postApi(cfg.endpoint, input, action === "compare" ? 240000 : 120000);
    logIO(cfg.label, input, data);
    assistantTyping.hidden = true;
    appendAssistantMessage(action, data);
  } catch (err) {
    assistantTyping.hidden = true;
    appendErrorMessage(err.message || "An unexpected error occurred.");
    showToast(err.message, "error");
  } finally {
    isGenerating = false;
    btnSend.disabled = false;
    scrollToBottom();
  }
}

// Handle User Input Submission
function handleSend() {
  if (isGenerating) return;

  const text = promptInput.value.trim();
  if (!text) {
    showToast("Please enter a topic or text first.", "info");
    promptInput.focus();
    return;
  }

  const action = currentAction;
  let payload = {};

  if (action === "story" || action === "poem" || action === "post") {
    payload = { topic: text, content_type: action };
  } else if (action === "podcast") {
    payload = { topic: text };
  } else if (action === "analyze") {
    payload = { text: text };
  } else if (action === "compare") {
    payload = { topic: text };
  }

  // Display user bubble in conversation
  appendUserMessage(text, action);

  // Clear input
  promptInput.value = "";
  promptInput.style.height = "auto";

  // Execute
  executeRequest(action, payload);
}

// Initial setup
setAction("story");
console.info("[Groq AI Studio] UI Initialized with ChatGPT-style conversation layout.");
