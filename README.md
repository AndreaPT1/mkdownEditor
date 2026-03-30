# mkdownEditor

A minimal, native Markdown editor for macOS and Windows — built with [Tauri 2](https://tauri.app), vanilla JS, and Rust.

![mkdownEditor](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey) ![version](https://img.shields.io/badge/version-0.1.0-orange)

---

## Download

| Platform | File | Notes |
|----------|------|-------|
| macOS    | `.dmg` | Drag the app to Applications |
| Windows  | `.exe` (NSIS installer) | Run the installer and follow the prompts |

Grab the latest release from the [Releases](../../releases) page.

## Features

- Open, edit, and save `.md` files
- Formatting toolbar — bold, italic, headings, links, lists, inline code
- Recent files dropdown
- Unsaved-changes indicator in the status bar
- Drag-and-drop file support
- Clean, distraction-free interface
- Keyboard shortcuts: **Cmd** (macOS) / **Ctrl** (Windows) + **O** Open, **S** Save, **Shift+S** Save As

## Build from source

**Requirements:** [Rust](https://rustup.rs), [Node.js](https://nodejs.org) (v18+), [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/)

```bash
git clone https://github.com/AndreaPT1/mkdownEditor.git
cd mkdownEditor
npm install
npm run tauri build
```

The installers will be in `src-tauri/target/release/bundle/`:
- **macOS:** `.dmg` and `.app` in `bundle/dmg/` and `bundle/macos/`
- **Windows:** `.exe` (NSIS) and `.msi` in `bundle/nsis/` and `bundle/msi/`

## Dev mode

```bash
npm run tauri dev
```

## Stack

| Layer    | Technology                             |
|----------|----------------------------------------|
| Runtime  | Tauri 2                                |
| Frontend | Vanilla JS, HTML `contenteditable`     |
| Backend  | Rust                                   |
| Build    | Vite 7                                 |
| Parsing  | `marked` (MD → HTML), `turndown` (HTML → MD) |

## License

MIT
