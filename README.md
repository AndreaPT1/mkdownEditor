# mkdownEditor

A minimal, native Markdown editor for macOS — built with [Tauri 2](https://tauri.app), vanilla JS, and Rust.

![mkdownEditor](https://img.shields.io/badge/platform-macOS-lightgrey) ![version](https://img.shields.io/badge/version-0.1.0-orange)

---

## Download

Grab the latest `.dmg` from the [Releases](../../releases) page and drag the app to your Applications folder.

## Features

- Open, edit, and save `.md` files
- Formatting toolbar — bold, italic, headings, links, lists, inline code
- Recent files dropdown
- Unsaved-changes indicator in the status bar
- Drag-and-drop file support
- Clean, distraction-free interface

## Build from source

**Requirements:** [Rust](https://rustup.rs), [Node.js](https://nodejs.org) (v18+), [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/)

```bash
git clone https://github.com/AndreaPT1/mkdownEditor.git
cd mkdownEditor
npm install
npm run tauri build
```

The app bundle and `.dmg` will be in `src-tauri/target/release/bundle/`.

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
