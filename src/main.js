import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { basename } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { marked } from "marked";
import TurndownService from "turndown";

const editor = document.querySelector("#editor");
const statusEl = document.querySelector("#status");
const statusDot = document.querySelector(".status-dot");
const fileNameEl = document.querySelector("#file-name");
const openButton = document.querySelector("#open-button");
const saveButton = document.querySelector("#save-button");
const saveAsButton = document.querySelector("#save-as-button");
const recentSelect = document.querySelector("#recent-select");
const fmtBoldButton = document.querySelector("#fmt-bold");
const fmtItalicButton = document.querySelector("#fmt-italic");
const fmtHeadingButton = document.querySelector("#fmt-heading");
const fmtLinkButton = document.querySelector("#fmt-link");
const fmtListButton = document.querySelector("#fmt-list");
const fmtOrderedListButton = document.querySelector("#fmt-ordered-list");
const fmtCodeButton = document.querySelector("#fmt-code");
const toggleSplitBtn = document.querySelector("#toggle-split");
const toggleThemeBtn = document.querySelector("#toggle-theme");
const sourceEditor = document.querySelector("#source");
const editorWrap = document.querySelector(".editor-wrap");

const MAX_RECENTS = 10;

let currentPath = null;
let isDirty = false;
let recents = [];
let lastSavedAt = null;
let isSplitView = false;
let activePane = "editor";
let isSyncing = false;
const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

marked.setOptions({ breaks: true, gfm: true });

function setStatus(text, state = "idle") {
  statusEl.textContent = text;
  if (statusDot) {
    const colors = { idle: "#FB923C", saved: "#22C55E", dirty: "#EF4444" };
    statusDot.style.background = colors[state] || colors.idle;
  }
}

function formatSavedAt(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function updateTitle() {
  const appWindow = getCurrentWindow();
  const name = currentPath ? await basename(currentPath) : "Untitled";
  const dirtyMarker = isDirty ? " *" : "";
  fileNameEl.textContent = `${name}${dirtyMarker}`;
  await appWindow.setTitle(`mkdownEditor - ${name}${dirtyMarker}`);
}

function setDirty(nextDirty) {
  isDirty = nextDirty;
  void updateTitle();
  if (isDirty) {
    setStatus("Unsaved changes", "dirty");
  } else if (lastSavedAt) {
    setStatus(`Saved at ${formatSavedAt(lastSavedAt)}`, "saved");
  } else {
    setStatus("Ready", "idle");
  }
}

async function persistRecents() {
  await invoke("save_recent_files", { files: recents });
}

function renderRecents() {
  recentSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Recent Files";
  recentSelect.appendChild(placeholder);

  for (const path of recents) {
    const option = document.createElement("option");
    option.value = path;
    option.textContent = path;
    recentSelect.appendChild(option);
  }
}

async function pushRecent(path) {
  recents = [path, ...recents.filter((item) => item !== path)].slice(0, MAX_RECENTS);
  renderRecents();
  await persistRecents();
}

async function loadRecents() {
  try {
    const loaded = await invoke("load_recent_files");
    recents = Array.isArray(loaded) ? loaded : [];
    renderRecents();
  } catch (error) {
    console.error(error);
    setStatus("Could not load recent files", "dirty");
  }
}

async function openPath(path) {
  const content = await invoke("read_file", { path });
  currentPath = path;
  setEditorFromMarkdown(content);
  lastSavedAt = new Date();
  setDirty(false);
  await pushRecent(path);
}

async function handleOpen() {
  try {
    const selected = await open({
      title: "Open Markdown File",
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
      multiple: false
    });

    if (!selected || typeof selected !== "string") {
      return;
    }

    await openPath(selected);
  } catch (error) {
    console.error(error);
    setStatus("Open failed", "dirty");
  }
}

async function handleSaveAs() {
  try {
    const selectedPath = await save({
      title: "Save Markdown File",
      defaultPath: currentPath ?? "untitled.md",
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }]
    });

    if (!selectedPath) {
      return false;
    }

    await invoke("write_file", { path: selectedPath, content: getEditorMarkdown() });
    currentPath = selectedPath;
    lastSavedAt = new Date();
    setDirty(false);
    await pushRecent(selectedPath);
    return true;
  } catch (error) {
    console.error(error);
    setStatus("Save As failed", "dirty");
    return false;
  }
}

async function handleSave() {
  if (!currentPath) {
    await handleSaveAs();
    return;
  }

  try {
    await invoke("write_file", { path: currentPath, content: getEditorMarkdown() });
    lastSavedAt = new Date();
    setDirty(false);
    await pushRecent(currentPath);
  } catch (error) {
    console.error(error);
    setStatus("Save failed", "dirty");
  }
}

function isEditorVisiblyEmpty() {
  return editor.textContent.trim().length === 0;
}

function getEditorMarkdown() {
  if (isSplitView && activePane === "source") {
    return sourceEditor.value;
  }

  if (isEditorVisiblyEmpty()) {
    return "";
  }

  const markdown = turndown.turndown(editor.innerHTML);
  return markdown.replace(/\n{3,}/g, "\n\n");
}

function setEditorFromMarkdown(markdown) {
  const raw = markdown.trim();
  if (!raw) {
    editor.innerHTML = "";
    if (isSplitView) sourceEditor.value = "";
    return;
  }

  editor.innerHTML = marked.parse(raw);
  if (isSplitView) sourceEditor.value = raw;
}

function applyCommand(command, value = null) {
  editor.focus();
  document.execCommand(command, false, value);
  setDirty(true);
}

function toggleInlineCode() {
  editor.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();
  const safeText = selectedText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = selectedText ? `<code>${safeText}</code>` : "<code>code</code>";

  range.deleteContents();
  document.execCommand("insertHTML", false, html);
  setDirty(true);
}

function insertLink() {
  editor.focus();
  const url = window.prompt("Enter URL");
  if (!url) {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) {
    document.execCommand("insertHTML", false, `<a href="${url}">${url}</a>`);
  } else {
    document.execCommand("createLink", false, url);
  }
  setDirty(true);
}

editor.addEventListener("input", () => {
  setDirty(true);
  if (isSplitView && activePane === "editor" && !isSyncing) {
    isSyncing = true;
    sourceEditor.value = isEditorVisiblyEmpty() ? "" : turndown.turndown(editor.innerHTML);
    isSyncing = false;
  }
});

openButton.addEventListener("click", () => {
  void handleOpen();
});

saveButton.addEventListener("click", () => {
  void handleSave();
});

saveAsButton.addEventListener("click", () => {
  void handleSaveAs();
});

recentSelect.addEventListener("change", async () => {
  const path = recentSelect.value;
  if (!path) {
    return;
  }

  try {
    await openPath(path);
    recentSelect.value = "";
  } catch (error) {
    console.error(error);
    setStatus("Could not open recent file", "dirty");
  }
});

fmtBoldButton.addEventListener("click", () => {
  applyCommand("bold");
});

fmtItalicButton.addEventListener("click", () => {
  applyCommand("italic");
});

fmtHeadingButton.addEventListener("click", () => {
  applyCommand("formatBlock", "h2");
});

fmtListButton.addEventListener("click", () => {
  applyCommand("insertUnorderedList");
});

fmtOrderedListButton.addEventListener("click", () => {
  applyCommand("insertOrderedList");
});

fmtLinkButton.addEventListener("click", () => {
  insertLink();
});

fmtCodeButton.addEventListener("click", () => {
  toggleInlineCode();
});

window.addEventListener("keydown", (event) => {
  if (!event.metaKey && !event.ctrlKey) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "o") {
    event.preventDefault();
    void handleOpen();
    return;
  }

  if (key === "s" && event.shiftKey) {
    event.preventDefault();
    void handleSaveAs();
    return;
  }

  if (key === "s") {
    event.preventDefault();
    void handleSave();
  }
});

async function setupDropHandling() {
  const appWindow = getCurrentWindow();

  await appWindow.onDragDropEvent(async (event) => {
    if (event.payload.type !== "drop") {
      return;
    }

    const paths = event.payload.paths ?? [];
    const firstPath = paths[0];
    if (!firstPath) {
      return;
    }

    try {
      await openPath(firstPath);

      if (paths.length > 1) {
        for (const extraPath of paths.slice(1)) {
          await pushRecent(extraPath);
        }
      }
    } catch (error) {
      console.error(error);
      setStatus("Drop open failed", "dirty");
    }
  });
}

/* ===== Dark Mode ===== */

const sunIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="5" />
  <line x1="12" y1="1" x2="12" y2="3" />
  <line x1="12" y1="21" x2="12" y2="23" />
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
  <line x1="1" y1="12" x2="3" y2="12" />
  <line x1="21" y1="12" x2="23" y2="12" />
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
</svg>`;

const moonIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
</svg>`;

function updateThemeIcon(theme) {
  toggleThemeBtn.innerHTML = theme === "dark" ? sunIcon : moonIcon;
  toggleThemeBtn.title = theme === "dark" ? "Light Mode" : "Dark Mode";
}

function initTheme() {
  const saved = localStorage.getItem("mkdown-theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcon(saved);
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("mkdown-theme", next);
  updateThemeIcon(next);
}

toggleThemeBtn.addEventListener("click", toggleTheme);

/* ===== Split View ===== */

function toggleSplitView() {
  isSplitView = !isSplitView;
  editorWrap.classList.toggle("split-view", isSplitView);
  toggleSplitBtn.classList.toggle("active", isSplitView);

  if (isSplitView) {
    sourceEditor.value = getEditorMarkdown();
    activePane = "editor";
  }
}

editor.addEventListener("focus", () => {
  activePane = "editor";
});

sourceEditor.addEventListener("focus", () => {
  activePane = "source";
});

sourceEditor.addEventListener("input", () => {
  if (isSyncing) return;
  setDirty(true);
  if (isSplitView && activePane === "source") {
    isSyncing = true;
    const md = sourceEditor.value.trim();
    editor.innerHTML = md ? marked.parse(md) : "";
    isSyncing = false;
  }
});

toggleSplitBtn.addEventListener("click", toggleSplitView);

async function init() {
  initTheme();
  await loadRecents();
  await updateTitle();
  await setupDropHandling();
}

void init();
