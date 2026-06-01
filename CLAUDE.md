# mkdownEditor Agent Reference

mkdownEditor is a small Tauri 2 desktop Markdown editor with a vanilla
JavaScript frontend and a Rust backend. Keep changes narrow and prefer the
existing plain-DOM, plain-CSS structure over adding frameworks or broad
abstractions.

## Current Shape

- `src/main.js` owns frontend state, formatting, Markdown conversion, dialogs,
  recent files, image references, drag-and-drop, split view, and theme handling.
- `src/index.html` is the app shell.
- `src/styles.css` contains the visual system and responsive toolbar behavior.
- `src-tauri/src/lib.rs` exposes Tauri commands for file I/O, image previews,
  and recent-file persistence.
- `src-tauri/src/main.rs` is only the desktop entry point.

## Commands

```bash
npm install
npm run dev
npm run build
npm run tauri dev
npm run tauri build
cargo check --manifest-path src-tauri/Cargo.toml
```

There is no dedicated test or lint script yet. Use `npm run build` and
`cargo check --manifest-path src-tauri/Cargo.toml` as the baseline verification
for code changes.

## Frontend Notes

- Keep the frontend vanilla JavaScript. Do not introduce React, Vue, or a
  component framework without a separate product decision.
- Use the existing DOM requirement helpers instead of raw `querySelector` when
  wiring new required elements.
- Use the existing Tauri command wrappers and dialog filter helpers in
  `src/main.js` instead of scattering raw command names or file-extension lists.
- Markdown rendering uses `marked`; Markdown serialization uses `turndown`.
- Formatting uses `document.execCommand`, which is an existing product choice
  for this compact editor.

## Backend Notes

- Tauri commands live in `src-tauri/src/lib.rs` and are registered in the
  `tauri::generate_handler!` list.
- Command boundaries use the local aliases in `lib.rs` such as `FilePath`,
  `MarkdownText`, `DataUrl`, `RecentFiles`, and `CommandResult<T>`.
- Keep release and signing behavior real. Do not add placeholder Windows
  certificate settings; see `docs/windows-smartscreen.md`.

## Documentation Notes

The README is the user-facing source of truth. Keep agent-facing notes short and
current; avoid line counts, duplicated architecture essays, or examples that
will drift from the code.
