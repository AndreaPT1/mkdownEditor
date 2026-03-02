Start the Tauri app in development mode with hot-reload.

Run the following command and report any errors:

```bash
npm run tauri dev
```

If the command fails:
- Check that Rust/Cargo is installed (`cargo --version`)
- Check that Tauri CLI is available (`npx tauri --version`)
- Check `src-tauri/tauri.conf.json` for configuration issues
- Report the exact error from stderr
