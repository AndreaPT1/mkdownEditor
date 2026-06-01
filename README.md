# mkdownEditor

![platform](https://img.shields.io/badge/platform-macOS%20Apple%20Silicon%20%7C%20Windows%20%7C%20Linux-lightgrey)
![version](https://img.shields.io/badge/version-0.3.2-orange)
![license](https://img.shields.io/badge/license-MIT-blue)

mkdownEditor is a small desktop Markdown editor for people who want a calm place
to write, preview, and save plain `.md` files without opening a full IDE.

It is intentionally simple: native file dialogs, a focused editor, a formatting
toolbar, split Markdown/source view, recent files, drag-and-drop, and enough
polish to feel like an actual app instead of a demo window. macOS now uses a
Swift-native Apple Silicon app; Windows and Linux continue to use the Tauri app.

## Project Status

This is an early open source desktop app. It is usable, actively shaped, and
still pragmatic in the best sense: features are added when they make writing
Markdown easier, not because the app is trying to become a giant publishing
suite.

Expect a lightweight editor, not a replacement for Obsidian, VS Code, Typora, or
a full knowledge-base system. If you want a focused Markdown scratchpad with a
native macOS path and pragmatic Windows/Linux packages, you are in the right
place.

## What It Does

- Opens, edits, and saves `.md`, `.markdown`, and `.txt` files
- Gives you a clean rich-text writing surface backed by Markdown
- Lets you switch into a split view with the raw Markdown source beside the
  rendered editor
- Adds common formatting from the toolbar: bold, italic, headings, links, images,
  unordered lists, ordered lists, and inline code
- Tracks recent files so you can jump back into previous notes
- Shows unsaved changes clearly in the window title and status bar
- Supports drag-and-drop for Markdown files and local image references
- Persists dark mode across sessions
- Uses familiar shortcuts:
  - `Cmd/Ctrl + O` to open
  - `Cmd/Ctrl + S` to save
  - `Cmd/Ctrl + Shift + S` to save as

## Download

Prebuilt installers live on the [Releases](../../releases) page.

| Platform | File | Notes |
| --- | --- | --- |
| macOS Apple Silicon | `mkdownEditor_*_native-macos-arm64.zip` | Swift-native app; unsigned builds may require right-click → Open |
| Windows | `mkdownEditor_*_x64-setup.exe` | Unsigned builds may trigger SmartScreen |
| Linux | `mkdownEditor_*_amd64.AppImage` | Run `chmod +x` before launching |

The Tauri macOS release path has been retired. macOS releases are Swift-native
and Apple Silicon only. Intel Mac builds are no longer produced.

On Windows, Microsoft Defender SmartScreen may warn that the app is
unrecognized. That is expected for unsigned independent releases. Only install
builds downloaded from this repository's Releases page. Maintainer notes are in
[docs/windows-smartscreen.md](docs/windows-smartscreen.md).

## Quick Start: Native macOS

```bash
git clone https://github.com/AndreaPT1/mkdownEditor.git
cd mkdownEditor
cd macos-native
xcodegen generate
xcodebuild -project mkdownEditorNative.xcodeproj \
  -scheme mkdownEditorNative \
  -destination 'platform=macOS,arch=arm64' \
  build
```

## Quick Start: Windows And Linux

```bash
git clone https://github.com/AndreaPT1/mkdownEditor.git
cd mkdownEditor
npm install
npm run tauri dev
```

## Build From Source

Native macOS requirements:

- Apple Silicon Mac
- [Xcode](https://developer.apple.com/xcode/) 26 or newer
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) 2.45 or newer

Create a native macOS build:

```bash
cd macos-native
xcodegen generate
xcodebuild -project mkdownEditorNative.xcodeproj \
  -scheme mkdownEditorNative \
  -destination 'platform=macOS,arch=arm64' \
  build
```

Windows/Linux Tauri requirements:

- [Node.js](https://nodejs.org) 18 or newer
- [Rust](https://rustup.rs)
- The platform prerequisites for [Tauri 2](https://tauri.app/start/prerequisites/)

Create a Windows or Linux Tauri production build:

```bash
npm run tauri build
```

Installers are written to `src-tauri/target/release/bundle/`. The Tauri macOS
build path is intentionally disabled; use `macos-native/` for macOS.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Native macOS | SwiftUI, AppKit, XcodeGen |
| Windows/Linux shell | Tauri 2 |
| Windows/Linux frontend | Vanilla JavaScript, HTML, CSS |
| Windows/Linux backend | Rust |
| Windows/Linux build tool | Vite 7 |
| Markdown conversion | Native Swift preview on macOS; `marked` and `turndown` on Windows/Linux |

The app deliberately keeps the stack small. Most of the product lives in a plain
frontend with a Rust/Tauri bridge for native file access.

## Contributing

Issues and small pull requests are welcome. The best contributions are focused:
one bug fix, one editor improvement, one platform packaging fix, or one piece of
documentation at a time.

Before opening a larger PR, start with an issue so the direction is clear. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the project style, local commands, and
expectations.

## Support And Expectations

This project is maintained as an open source desktop experiment, not as a paid
support product. Bug reports are helpful when they include:

- Your operating system and version
- The mkdownEditor release or commit you used
- Steps to reproduce the problem
- What you expected to happen
- What happened instead

## License

MIT. See [LICENSE](LICENSE).
