import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { basename } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { marked } from "marked";
import TurndownService from "turndown";

const editor = document.querySelector("#editor");
const statusEl = document.querySelector("#status");
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
const fmtCodeButton = document.querySelector("#fmt-code");

const MAX_RECENTS = 10;

let currentPath = null;
let isDirty = false;
let recents = [];
let lastSavedAt = null;
const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

marked.setOptions({ breaks: true, gfm: true });

function setStatus(text) {
  statusEl.textContent = text;
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
    setStatus("Unsaved changes");
  } else if (lastSavedAt) {
    setStatus(`Saved at ${formatSavedAt(lastSavedAt)}`);
  } else {
    setStatus("Ready");
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
    setStatus("Could not load recent files");
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
    setStatus("Open failed");
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
    setStatus("Save As failed");
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
    setStatus("Save failed");
  }
}

function isEditorVisiblyEmpty() {
  return editor.textContent.trim().length === 0;
}

function getEditorMarkdown() {
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
    return;
  }

  editor.innerHTML = marked.parse(raw);
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
    setStatus("Could not open recent file");
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

fmtLinkButton.addEventListener("click", () => {
  insertLink();
});

fmtCodeButton.addEventListener("click", () => {
  toggleInlineCode();
});

window.addEventListener("keydown", (event) => {
  if (!event.metaKey) {
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
      setStatus("Drop open failed");
    }
  });
}

async function init() {
  await loadRecents();
  await updateTitle();
  await setupDropHandling();
}

void init();
