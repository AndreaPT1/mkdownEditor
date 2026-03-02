# mkdownEditor

A minimal desktop Markdown editor built with **Tauri 2** + **Vite** (vanilla JS) and a **Rust** backend.

## Architecture

```
mkdownEditor/
├── src/                    # Frontend (vanilla JS + HTML + CSS)
│   ├── main.js             # All frontend logic: file ops, formatting, drag-drop
│   ├── index.html          # App shell: toolbar, editor, status bar
│   └── styles.css          # Pristine white theme, orange accents (#FB923C)
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs          # Tauri commands: read_file, write_file, load/save_recent_files
│   │   └── main.rs         # Entry point
│   ├── tauri.conf.json     # App config: identifier com.andrea.mkdowneditor
│   └── Cargo.toml
├── dist/                   # Vite build output (gitignored except index.html)
└── vite.config.js
```

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Runtime   | Tauri 2                                         |
| Frontend  | Vanilla JS (ES modules), HTML contenteditable   |
| Build     | Vite 7                                          |
| Backend   | Rust (Tauri commands)                           |
| Markdown  | `marked` (parse → HTML), `turndown` (HTML → MD) |
| Dialogs   | `@tauri-apps/plugin-dialog`                     |

## Key Patterns

### Tauri Commands (Rust → JS)
- Rust: `#[tauri::command] fn my_command(...) -> Result<T, String>` in `src-tauri/src/lib.rs`
- Register in `invoke_handler!(tauri::generate_handler![...])` in `lib.rs`
- JS: `await invoke("my_command", { param: value })`

### Editor Model
- Editor is a `contenteditable` div (`#editor`)
- Load: `markdown → marked.parse() → innerHTML`
- Save: `innerHTML → turndown.turndown() → markdown`
- Formatting uses `document.execCommand()` for bold/italic/lists/heading

### State
- `currentPath: string | null` — currently open file path
- `isDirty: boolean` — unsaved changes
- `recents: string[]` — recent file list (persisted via Tauri to `app_config_dir/recent_files.json`)

## Dev Commands

```bash
npm run dev       # Vite dev server only (port 1420)
npm run tauri dev  # Full Tauri app in dev mode
npm run build     # Vite production build
npm run tauri build  # Full Tauri app bundle
```

## Responsive Toolbar Breakpoints

The toolbar has three rigid sections that sum to ~640px+ of content; labels are hidden early to keep the format bar visible.

| Breakpoint | Behavior |
|---|---|
| > 1000px | Full toolbar with button labels |
| ≤ 1000px | Icon-only action buttons, tighter padding |
| ≤ 760px | Recent-files dropdown hidden |
| ≤ 520px | Format toolbar (`.toolbar-center`) hidden |

`minWidth: 520` / `minHeight: 380` are set in `tauri.conf.json`.

## Design Conventions

- Color palette: white background, orange accent `#FB923C`, red `#EF4444`, green `#22C55E`
- Status dot colors: idle=orange, saved=green, dirty=red
- No framework dependencies — keep it vanilla JS
- Avoid adding npm dependencies without good reason
