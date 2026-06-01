# mkdownEditor Native macOS

This directory contains the Swift-native macOS version of mkdownEditor. It is
the active macOS product path and is intentionally separate from the Tauri
Windows/Linux app in the repository root.

The native app is Apple Silicon only for now. It uses SwiftUI for the document
scene and app shell, AppKit for the Markdown editing surface, native menus,
native toolbar commands, system file handling, and a Markdown preview foundation.

## Requirements

- macOS on Apple Silicon
- Xcode 26 or newer
- XcodeGen 2.45 or newer

## Generate And Build

```bash
cd macos-native
xcodegen generate
xcodebuild -project mkdownEditorNative.xcodeproj \
  -scheme mkdownEditorNative \
  -destination 'platform=macOS,arch=arm64' \
  build
```

## Scope

This scaffold is not a web/Tauri port. It establishes the native document app
direction: Markdown files open through the system document model, editing uses a
native text view, formatting is exposed through native toolbar and menu commands,
and the preview is rendered with native SwiftUI text.

Signing and notarization are not configured. Release builds should not claim to
be Gatekeeper-ready until real Apple Developer signing material is available.
