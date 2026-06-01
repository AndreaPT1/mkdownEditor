import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { basename, dirname, isAbsolute, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { marked } from "marked";
import TurndownService from "turndown";

/**
 * @typedef {string} FilePath
 * @typedef {string} MarkdownText
 * @typedef {string} DataUrl
 * @typedef {"idle" | "saved" | "dirty"} StatusState
 * @typedef {"editor" | "source"} ActivePane
 * @typedef {"light" | "dark"} ThemeName
 * @typedef {"bold" | "italic" | "formatBlock" | "insertUnorderedList" | "insertOrderedList"} EditorCommand
 * @typedef {{ name: string, extensions: readonly string[] }} DialogFilter
 */

function missingElementError(selector, expectedType) {
  return new Error(`Expected ${selector} to be a ${expectedType}`);
}

function requireHtmlElement(selector) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw missingElementError(selector, "HTML element");
  }

  return element;
}

function requireButtonElement(selector) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLButtonElement)) {
    throw missingElementError(selector, "button");
  }

  return element;
}

function requireSelectElement(selector) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLSelectElement)) {
    throw missingElementError(selector, "select");
  }

  return element;
}

function requireTextAreaElement(selector) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLTextAreaElement)) {
    throw missingElementError(selector, "textarea");
  }

  return element;
}

const editor = requireHtmlElement("#editor");
const statusEl = requireHtmlElement("#status");
const statusDot = requireHtmlElement(".status-dot");
const fileNameEl = requireHtmlElement("#file-name");
const openButton = requireButtonElement("#open-button");
const saveButton = requireButtonElement("#save-button");
const saveAsButton = requireButtonElement("#save-as-button");
const recentSelect = requireSelectElement("#recent-select");
const fmtBoldButton = requireButtonElement("#fmt-bold");
const fmtItalicButton = requireButtonElement("#fmt-italic");
const fmtHeadingButton = requireButtonElement("#fmt-heading");
const fmtLinkButton = requireButtonElement("#fmt-link");
const fmtImageButton = requireButtonElement("#fmt-image");
const fmtListButton = requireButtonElement("#fmt-list");
const fmtOrderedListButton = requireButtonElement("#fmt-ordered-list");
const fmtCodeButton = requireButtonElement("#fmt-code");
const toggleSplitBtn = requireButtonElement("#toggle-split");
const toggleThemeBtn = requireButtonElement("#toggle-theme");
const sourceEditor = requireTextAreaElement("#source");
const editorWrap = requireHtmlElement(".editor-wrap");

const MAX_RECENTS = 10;
const TAURI_COMMANDS = Object.freeze({
  READ_FILE: "read_file",
  WRITE_FILE: "write_file",
  READ_IMAGE_DATA_URL: "read_image_data_url",
  LOAD_RECENT_FILES: "load_recent_files",
  SAVE_RECENT_FILES: "save_recent_files"
});
const DATA_ATTRIBUTES = Object.freeze({
  MARKDOWN_SRC: "data-markdown-src",
  PREVIEW_SRC: "data-preview-src",
  THEME: "data-theme"
});
const STORAGE_KEYS = Object.freeze({
  THEME: "mkdown-theme"
});
const MARKDOWN_DIALOG_EXTENSIONS = Object.freeze(["md", "markdown", "txt"]);
const MARKDOWN_SAVE_EXTENSIONS = Object.freeze(["md", "markdown"]);
const IMAGE_DIALOG_EXTENSIONS = Object.freeze(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif", "apng"]);
const DIALOG_FILTERS = Object.freeze({
  MARKDOWN_OPEN: Object.freeze({ name: "Markdown", extensions: MARKDOWN_DIALOG_EXTENSIONS }),
  MARKDOWN_SAVE: Object.freeze({ name: "Markdown", extensions: MARKDOWN_SAVE_EXTENSIONS }),
  IMAGE_OPEN: Object.freeze({ name: "Images", extensions: IMAGE_DIALOG_EXTENSIONS })
});

/** @type {FilePath | null} */
let currentPath = null;
let isDirty = false;
/** @type {FilePath[]} */
let recents = [];
/** @type {Date | null} */
let lastSavedAt = null;
let isSplitView = false;
/** @type {ActivePane} */
let activePane = "editor";
let isSyncing = false;
const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
const IMAGE_EXTENSIONS = new Set(IMAGE_DIALOG_EXTENSIONS.map((extension) => `.${extension}`));
const MARKDOWN_EXTENSIONS = new Set(MARKDOWN_DIALOG_EXTENSIONS.map((extension) => `.${extension}`));
let imagePreviewVersion = 0;

marked.setOptions({ breaks: true, gfm: true });

turndown.addRule("markdownImage", {
  filter: "img",
  replacement(_content, node) {
    if (!(node instanceof HTMLImageElement)) {
      return "";
    }

    const src = getImageMarkdownSource(node);
    if (!src) return "";

    const alt = escapeMarkdownAlt(node.getAttribute("alt") || "");
    const title = node.getAttribute("title");
    const titlePart = title ? ` "${escapeMarkdownTitle(title)}"` : "";
    return `![${alt}](${formatMarkdownDestination(src)}${titlePart})`;
  }
});

/**
 * @param {DialogFilter} filter
 * @returns {{ name: string, extensions: string[] }}
 */
function createDialogFilter(filter) {
  return { name: filter.name, extensions: [...filter.extensions] };
}

/**
 * @param {FilePath} path
 * @returns {Promise<MarkdownText>}
 */
function readMarkdownFile(path) {
  return invoke(TAURI_COMMANDS.READ_FILE, { path });
}

/**
 * @param {FilePath} path
 * @param {MarkdownText} content
 * @returns {Promise<void>}
 */
function writeMarkdownFile(path, content) {
  return invoke(TAURI_COMMANDS.WRITE_FILE, { path, content });
}

/**
 * @param {FilePath} path
 * @returns {Promise<DataUrl>}
 */
function readImageDataUrl(path) {
  return invoke(TAURI_COMMANDS.READ_IMAGE_DATA_URL, { path });
}

/**
 * @returns {Promise<FilePath[]>}
 */
async function loadRecentFilesFromDisk() {
  const response = await invoke(TAURI_COMMANDS.LOAD_RECENT_FILES);
  return parseRecentFiles(response);
}

/**
 * @param {FilePath[]} files
 * @returns {Promise<void>}
 */
function saveRecentFilesToDisk(files) {
  return invoke(TAURI_COMMANDS.SAVE_RECENT_FILES, { files });
}

function getImageMarkdownSource(image) {
  if (!(image instanceof HTMLImageElement)) {
    return "";
  }

  return image.getAttribute(DATA_ATTRIBUTES.MARKDOWN_SRC) || image.getAttribute("src") || "";
}

function setImageMarkdownSource(image, src) {
  image.setAttribute(DATA_ATTRIBUTES.MARKDOWN_SRC, src);
}

function setImagePreviewSource(image, src) {
  image.setAttribute(DATA_ATTRIBUTES.PREVIEW_SRC, src);
}

function createMarkdownImageHtml(markdownPath, alt) {
  const escapedPath = escapeHtmlAttribute(markdownPath);
  const escapedAlt = escapeHtmlAttribute(alt);
  return `<img src="${escapedPath}" ${DATA_ATTRIBUTES.MARKDOWN_SRC}="${escapedPath}" alt="${escapedAlt}">`;
}

/**
 * @param {string} text
 * @param {StatusState} [state]
 */
function setStatus(text, state = "idle") {
  statusEl.textContent = text;
  const colors = { idle: "#FB923C", saved: "#22C55E", dirty: "#EF4444" };
  statusDot.style.background = colors[state] || colors.idle;
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
  void updateTitle().catch(reportAsyncError);
  if (isDirty) {
    setStatus("Unsaved changes", "dirty");
  } else if (lastSavedAt) {
    setStatus(`Saved at ${formatSavedAt(lastSavedAt)}`, "saved");
  } else {
    setStatus("Ready", "idle");
  }
}

async function persistRecents() {
  await saveRecentFilesToDisk(recents);
}

function reportAsyncError(error) {
  console.error(error);
}

function parseRecentFiles(value) {
  if (!Array.isArray(value) || !value.every((path) => typeof path === "string")) {
    throw new TypeError("Recent files response must be an array of file paths");
  }

  return value;
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

function getPathExtension(path) {
  const cleanPath = path.split(/[?#]/)[0].toLowerCase();
  const match = cleanPath.match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function isImageFilePath(path) {
  return IMAGE_EXTENSIONS.has(getPathExtension(path));
}

function isMarkdownFilePath(path) {
  return MARKDOWN_EXTENSIONS.has(getPathExtension(path));
}

function isExternalImageSource(src) {
  return /^(?:https?:|data:|blob:|asset:|about:|#)/i.test(src);
}

function escapeHtmlAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeMarkdownAlt(value) {
  return value.replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
}

function escapeMarkdownTitle(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatMarkdownDestination(src) {
  const cleanSrc = src.trim().replace(/\n/g, " ");
  if (/[\s()<>]/.test(cleanSrc)) {
    return `<${cleanSrc.replace(/>/g, "%3E")}>`;
  }

  return cleanSrc;
}

function normalizeMarkdownPath(path) {
  return path.replace(/\\/g, "/");
}

function decodeLocalImageSource(src) {
  const pathOnly = src.split(/[?#]/)[0];

  try {
    return decodeURIComponent(pathOnly);
  } catch {
    return pathOnly;
  }
}

async function resolveMarkdownImagePath(src) {
  if (!src || isExternalImageSource(src)) {
    return null;
  }

  if (src.startsWith("file://")) {
    const url = new URL(src);
    const decodedPath = decodeURIComponent(url.pathname);
    return decodedPath.match(/^\/[A-Za-z]:\//) ? decodedPath.slice(1) : decodedPath;
  }

  const localSrc = decodeLocalImageSource(src);
  if (await isAbsolute(localSrc)) {
    return localSrc;
  }

  if (!currentPath) {
    return null;
  }

  const currentDir = await dirname(currentPath);
  return join(currentDir, localSrc);
}

async function createMarkdownPathForImage(imagePath) {
  return normalizeMarkdownPath(imagePath);
}

async function getDefaultImageAlt(imagePath) {
  const name = await basename(imagePath);
  return name.replace(/\.[^.]+$/, "") || "image";
}

async function updateImagePreviews() {
  const version = ++imagePreviewVersion;
  const images = Array.from(editor.querySelectorAll("img"));

  for (const image of images) {
    const originalSrc = getImageMarkdownSource(image);
    if (!originalSrc) continue;

    setImageMarkdownSource(image, originalSrc);
    image.classList.remove("image-preview-missing");

    if (!isImageFilePath(originalSrc) || isExternalImageSource(originalSrc)) {
      continue;
    }

    try {
      const resolvedPath = await resolveMarkdownImagePath(originalSrc);
      if (!resolvedPath) {
        continue;
      }

      const dataUrl = await readImageDataUrl(resolvedPath);
      if (version !== imagePreviewVersion || getImageMarkdownSource(image) !== originalSrc) {
        continue;
      }

      image.setAttribute("src", dataUrl);
      setImagePreviewSource(image, resolvedPath);
    } catch (error) {
      reportAsyncError(error);
      if (version === imagePreviewVersion) {
        image.classList.add("image-preview-missing");
        image.title = `Could not preview ${originalSrc}`;
      }
    }
  }
}

async function pushRecent(path) {
  recents = [path, ...recents.filter((item) => item !== path)].slice(0, MAX_RECENTS);
  renderRecents();
  await persistRecents();
}

async function markSaved(path) {
  currentPath = path;
  lastSavedAt = new Date();
  setDirty(false);
  await pushRecent(path);
}

async function loadRecents() {
  try {
    recents = await loadRecentFilesFromDisk();
    renderRecents();
  } catch (error) {
    reportAsyncError(error);
    setStatus("Could not load recent files", "dirty");
  }
}

async function openPath(path) {
  const content = await readMarkdownFile(path);
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
      filters: [createDialogFilter(DIALOG_FILTERS.MARKDOWN_OPEN)],
      multiple: false
    });

    if (!selected || typeof selected !== "string") {
      return;
    }

    await openPath(selected);
  } catch (error) {
    reportAsyncError(error);
    setStatus("Open failed", "dirty");
  }
}

async function handleSaveAs() {
  try {
    const selectedPath = await save({
      title: "Save Markdown File",
      defaultPath: currentPath ?? "untitled.md",
      filters: [createDialogFilter(DIALOG_FILTERS.MARKDOWN_SAVE)]
    });

    if (!selectedPath) {
      return false;
    }

    await writeMarkdownFile(selectedPath, getEditorMarkdown());
    await markSaved(selectedPath);
    return true;
  } catch (error) {
    reportAsyncError(error);
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
    await writeMarkdownFile(currentPath, getEditorMarkdown());
    await markSaved(currentPath);
  } catch (error) {
    reportAsyncError(error);
    setStatus("Save failed", "dirty");
  }
}

function isEditorVisiblyEmpty() {
  return (editor.textContent ?? "").trim().length === 0;
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

function renderEditorMarkdown(markdown) {
  const raw = markdown.trim();
  editor.innerHTML = raw ? marked.parse(raw, { async: false }) : "";
  void updateImagePreviews();
  return raw;
}

function setEditorFromMarkdown(markdown) {
  const raw = renderEditorMarkdown(markdown);
  if (isSplitView) sourceEditor.value = raw;
}

function syncSourceFromEditor() {
  if (!isSplitView || activePane !== "editor" || isSyncing) {
    return;
  }

  isSyncing = true;
  sourceEditor.value = getEditorMarkdown();
  isSyncing = false;
}

/**
 * @param {EditorCommand} command
 * @param {string | null} [value]
 */
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

function insertMarkdownIntoSource(markdown) {
  const start = sourceEditor.selectionStart ?? sourceEditor.value.length;
  const end = sourceEditor.selectionEnd ?? start;
  const prefix = sourceEditor.value.slice(0, start);
  const suffix = sourceEditor.value.slice(end);
  const before = prefix && !prefix.endsWith("\n") ? "\n" : "";
  const after = suffix && !suffix.startsWith("\n") ? "\n" : "";
  const inserted = `${before}${markdown}${after}`;

  sourceEditor.value = `${prefix}${inserted}${suffix}`;
  const nextPosition = start + inserted.length;
  setEditorFromMarkdown(sourceEditor.value);
  sourceEditor.setSelectionRange(nextPosition, nextPosition);
  setDirty(true);
}

async function insertImageReference(imagePath, altText = null) {
  const markdownPath = await createMarkdownPathForImage(imagePath);
  const alt = altText ?? await getDefaultImageAlt(imagePath);
  const markdown = `![${escapeMarkdownAlt(alt)}](${formatMarkdownDestination(markdownPath)})`;

  if (isSplitView && activePane === "source") {
    insertMarkdownIntoSource(markdown);
    sourceEditor.focus();
    return;
  }

  editor.focus();
  document.execCommand("insertHTML", false, createMarkdownImageHtml(markdownPath, alt));
  setDirty(true);
  syncSourceFromEditor();
  void updateImagePreviews();
}

async function insertDroppedImages(paths) {
  for (const path of paths) {
    if (isImageFilePath(path)) {
      await insertImageReference(path);
    }
  }
}

async function insertImageFromDialog() {
  try {
    const selected = await open({
      title: "Insert Image",
      filters: [createDialogFilter(DIALOG_FILTERS.IMAGE_OPEN)],
      multiple: false
    });

    if (!selected || typeof selected !== "string") {
      return;
    }

    const defaultAlt = await getDefaultImageAlt(selected);
    const alt = window.prompt("Image description", defaultAlt);
    if (alt === null) {
      return;
    }

    await insertImageReference(selected, alt);
  } catch (error) {
    reportAsyncError(error);
    setStatus("Image insert failed", "dirty");
  }
}

editor.addEventListener("input", () => {
  setDirty(true);
  if (isSplitView && activePane === "editor" && !isSyncing) {
    isSyncing = true;
    sourceEditor.value = getEditorMarkdown();
    isSyncing = false;
  }
  void updateImagePreviews();
});

openButton.addEventListener("click", () => void handleOpen());
saveButton.addEventListener("click", () => void handleSave());
saveAsButton.addEventListener("click", () => void handleSaveAs());

recentSelect.addEventListener("change", async () => {
  const path = recentSelect.value;
  if (!path) {
    return;
  }

  try {
    await openPath(path);
    recentSelect.value = "";
  } catch (error) {
    reportAsyncError(error);
    setStatus("Could not open recent file", "dirty");
  }
});

/** @type {Array<[HTMLButtonElement, EditorCommand, string?]>} */
const formattingCommands = [
  [fmtBoldButton, "bold"],
  [fmtItalicButton, "italic"],
  [fmtHeadingButton, "formatBlock", "h2"],
  [fmtListButton, "insertUnorderedList"],
  [fmtOrderedListButton, "insertOrderedList"]
];

formattingCommands.forEach(([button, command, value]) => {
  button.addEventListener("click", () => applyCommand(command, value));
});

fmtLinkButton.addEventListener("click", insertLink);
fmtImageButton.addEventListener("click", () => void insertImageFromDialog());
fmtCodeButton.addEventListener("click", toggleInlineCode);

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
      if (paths.every((path) => isImageFilePath(path))) {
        await insertDroppedImages(paths);
        return;
      }

      await openPath(firstPath);

      if (paths.length > 1) {
        for (const extraPath of paths.slice(1)) {
          if (isMarkdownFilePath(extraPath)) {
            await pushRecent(extraPath);
          }
        }
      }
    } catch (error) {
      reportAsyncError(error);
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

/**
 * @param {ThemeName} theme
 */
function updateThemeIcon(theme) {
  toggleThemeBtn.innerHTML = theme === "dark" ? sunIcon : moonIcon;
  toggleThemeBtn.title = theme === "dark" ? "Light Mode" : "Dark Mode";
}

function isThemeName(value) {
  return value === "light" || value === "dark";
}

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME);
  if (isThemeName(saved)) {
    document.documentElement.setAttribute(DATA_ATTRIBUTES.THEME, saved);
    updateThemeIcon(saved);
  }
}

function toggleTheme() {
  const savedTheme = document.documentElement.getAttribute(DATA_ATTRIBUTES.THEME);
  const current = isThemeName(savedTheme) ? savedTheme : "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute(DATA_ATTRIBUTES.THEME, next);
  localStorage.setItem(STORAGE_KEYS.THEME, next);
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
    renderEditorMarkdown(sourceEditor.value);
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

void init().catch((error) => {
  reportAsyncError(error);
  setStatus("Startup failed", "dirty");
});
