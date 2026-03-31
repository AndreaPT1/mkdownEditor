# CLAUDE.md — mkdownEditor Codebase Reference

## Project Overview

mkdownEditor is a minimal, native Markdown editor for macOS, Windows, and Linux built with **Tauri 2** (Rust backend + vanilla JavaScript frontend). It provides a distraction-free WYSIWYG editing experience using a `contenteditable` div, with Markdown parsed via `marked` and converted back via `turndown`.

**Version:** 0.2.0
**Identifier:** `com.andrea.mkdowneditor`
**License:** MIT

---

## Quick Commands

```bash
# Install dependencies
npm install

# Development (launches desktop app with hot-reload)
npm run tauri dev

# Production build (creates platform-specific installers)
npm run tauri build

# Frontend-only dev server (no Tauri shell)
npm run dev
```

There are **no test or lint commands** configured.

---

## Directory Structure

```
mkdownEditor/
├── src/                          # Frontend (vanilla JS + HTML + CSS)
│   ├── index.html                # App shell, toolbar, editor, status bar
│   ├── main.js                   # All frontend logic (348 lines)
│   └── styles.css                # Full app styling with CSS custom properties
├── src-tauri/                    # Rust backend (Tauri 2)
│   ├── src/
│   │   ├── lib.rs                # Tauri commands: file I/O + recent files
│   │   └── main.rs               # Entry point (calls lib::run)
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri app config (window, bundle, security)
│   ├── capabilities/default.json # Security permissions
│   ├── build.rs                  # Tauri build script
│   └── icons/                    # App icons for all platforms
├── dist/                         # Built frontend output (generated)
├── package.json                  # NPM scripts & JS dependencies
├── vite.config.js                # Vite config: root=src, port=1420, outDir=dist
└── README.md                     # User-facing documentation
```

---

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Framework | Tauri 2 | Native desktop shell (Rust) |
| Frontend | Vanilla JavaScript ES6 | No framework, plain DOM + `contenteditable` |
| Styling | CSS3 | Custom properties, flexbox, responsive |
| Build | Vite 7 | Frontend bundler, dev server on port 1420 |
| Markdown → HTML | marked v17 | GFM enabled, line breaks to `<br>` |
| HTML → Markdown | turndown v7 | ATX headings, dash bullet lists |
| Dialogs | @tauri-apps/plugin-dialog v2 | Native open/save file dialogs |
| Opener | tauri-plugin-opener v2 | Open URLs with system default |

---

## Architecture

### Frontend (`src/main.js`)

Single-file vanilla JS app. All state is module-level variables:

```
currentPath  — path of the open file (null if untitled)
isDirty      — whether editor has unsaved changes
recents      — array of recently opened file paths (max 10)
lastSavedAt  — Date of last save
```

**Key functions:**

| Function | Purpose |
|----------|---------|
| `openPath(path)` | Read file via Rust, parse markdown, load editor |
| `handleOpen()` | Show open dialog, call `openPath` |
| `handleSave()` | Save to `currentPath` (or delegate to Save As) |
| `handleSaveAs()` | Show save dialog, write file |
| `getEditorMarkdown()` | Convert editor HTML → markdown via turndown |
| `setEditorFromMarkdown(md)` | Convert markdown → HTML via marked, set editor |
| `applyCommand(cmd, val)` | Wrapper around `document.execCommand` |
| `toggleInlineCode()` | Insert/wrap `<code>` tags |
| `insertLink()` | Prompt for URL, create `<a>` tag |
| `setDirty(bool)` | Update dirty state, title, status bar |
| `loadRecents()` | Load recent files list from Rust backend |
| `pushRecent(path)` | Add path to recents, persist to backend |
| `setupDropHandling()` | Register drag-and-drop file opening |

**Keyboard shortcuts:**
- `Cmd/Ctrl + O` — Open file
- `Cmd/Ctrl + S` — Save
- `Cmd/Ctrl + Shift + S` — Save As

### Backend (`src-tauri/src/lib.rs`)

Four Tauri commands exposed to the frontend via `invoke()`:

| Command | Signature | Purpose |
|---------|-----------|---------|
| `read_file` | `(path: String) → Result<String, String>` | Read file contents |
| `write_file` | `(path: String, content: String) → Result<(), String>` | Write content to file |
| `load_recent_files` | `(app: AppHandle) → Result<Vec<String>, String>` | Load recent files from app config dir |
| `save_recent_files` | `(app: AppHandle, files: Vec<String>) → Result<(), String>` | Persist recent files list |

Recent files are stored as JSON at the platform's app config directory (e.g. `~/.config/mkdownEditor/recent_files.json`).

---

## Editor Features

- **Format toolbar:** Bold, Italic, Heading (h2), Link, Unordered List, Inline Code
- **File operations:** Open (`.md`, `.markdown`, `.txt`), Save, Save As
- **Recent files:** Dropdown of last 10 opened files, persisted across sessions
- **Drag-and-drop:** Drop `.md` files onto the window to open them
- **Status bar:** Colored dot indicator (orange=idle, green=saved, red=unsaved) + status text
- **Responsive:** Toolbar collapses at narrow widths (labels hide at ≤1000px, recents hide at ≤760px, toolbar hides at ≤520px)

---

## Code Conventions

**JavaScript:**
- `camelCase` for variables and functions
- `UPPER_CASE` for constants (`MAX_RECENTS`)
- `async/await` with try-catch for all Tauri invocations
- `void` prefix for fire-and-forget async calls (e.g. `void handleOpen()`)
- ES6 module imports, no default exports
- Minimal comments — code is self-documenting

**Rust:**
- `snake_case` for functions and variables
- `#[tauri::command]` macro on all exported functions
- `Result<T, String>` for error handling with `.map_err(|e| e.to_string())`
- Small focused functions (~10 lines)

**CSS:**
- Custom properties for design tokens (`--color-*`, `--radius-*`, `--shadow-*`)
- BEM-like naming (`.action-btn--primary`, `.status-dot`)
- Sections: reset → shell → toolbar → editor → status → responsive

**HTML:**
- Semantic elements (`<header>`, `<main>`, `<footer>`)
- Accessibility attributes (`aria-label`, `title`, `role`)

---

## Key Configuration

**`vite.config.js`:** Root is `src/`, dev server on port 1420 (strict), builds to `../dist`.

**`src-tauri/tauri.conf.json`:** Window defaults to 800×600 (min 520×380), drag-drop enabled, CSP disabled (`null`), bundles for all platforms.

**`src-tauri/capabilities/default.json`:** Grants `core:default`, `opener:default`, `dialog:default` permissions.

---

## Bundle Targets

- **macOS:** `.dmg` (Universal), `.app`
- **Windows:** `.exe` (NSIS, currentUser install), `.msi`
- **Linux:** `.AppImage`
