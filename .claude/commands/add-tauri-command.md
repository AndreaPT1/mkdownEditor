Add a new Tauri command that bridges the Rust backend and the JS frontend.

The user wants to add a new Tauri command: $ARGUMENTS

Follow these steps:

1. **Read `src-tauri/src/lib.rs`** to understand existing commands and patterns.

2. **Add the Rust function** in `lib.rs`:
   ```rust
   #[tauri::command]
   fn my_command(param: String) -> Result<ReturnType, String> {
       // implementation
       Ok(result)
   }
   ```

3. **Register it** in the `invoke_handler!` macro in `lib.rs`:
   ```rust
   .invoke_handler(tauri::generate_handler![
       read_file,
       write_file,
       load_recent_files,
       save_recent_files,
       my_command,  // add here
   ])
   ```

4. **Read `src/main.js`** to find the right place to add the JS call.

5. **Add the JS call** using `invoke`:
   ```js
   import { invoke } from "@tauri-apps/api/core";
   const result = await invoke("my_command", { param: value });
   ```

6. Wire up any UI elements if needed.

Keep error handling consistent: Rust returns `Result<T, String>`, JS uses try/catch and calls `setStatus("...", "dirty")` on error.
