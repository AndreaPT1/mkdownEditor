# mkdownEditor

A minimal, native Markdown editor for macOS, Windows, and Linux — built with [Tauri 2](https://tauri.app), vanilla JS, and Rust.

![mkdownEditor](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey) ![version](https://img.shields.io/badge/version-0.3.0-orange)

---

## Download

Grab the latest release from the [Releases](../../releases) page.

| Platform | File | Notes |
|----------|------|-------|
| macOS (Apple Silicon) | `mkdownEditor_*_aarch64.dmg` | Drag the app to Applications |
| macOS (Intel) | `mkdownEditor_*_x64.dmg` | Drag the app to Applications |
| Windows | `mkdownEditor_*_x64-setup.exe` | Run the installer and follow the prompts |
| Linux | `mkdownEditor_*_amd64.AppImage` | `chmod +x` then run |

> **macOS:** at first launch, right-click the app → Open to bypass Gatekeeper.

## Features

- Open, edit, and save `.md` files
- Formatting toolbar — bold, italic, headings, links, unordered list, numbered list, inline code
- **Dark mode** — toggle with sun/moon button, persisted across sessions
- **Split screen** — side-by-side WYSIWYG and raw Markdown source, live sync
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
