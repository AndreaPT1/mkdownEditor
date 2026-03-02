Build the Tauri app for production (creates a native binary + installer).

Run:

```bash
npm run tauri build
```

The output bundles will be in `src-tauri/target/release/bundle/`.

If the build fails:
- Run `npm run build` first to check if the Vite frontend build succeeds
- Check Rust compilation errors (`cargo build --release` inside `src-tauri/`)
- Report the exact error
