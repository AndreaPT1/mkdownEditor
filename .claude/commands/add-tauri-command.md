Add a new Tauri command that bridges the Rust backend and the JS frontend.

The user wants to add a new Tauri command: $ARGUMENTS

Follow these steps:

1. **Read `src-tauri/src/lib.rs`** to understand existing commands and patterns.

2. **Add the Rust function** in `lib.rs`:
   ```rust
   #[tauri::command]
   fn my_command(param: FilePath) -> CommandResult<ReturnType> {
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

5. **Add a JS wrapper** near the existing Tauri command wrappers:
   ```js
   function myCommand(param) {
     return invoke(TAURI_COMMANDS.MY_COMMAND, { param });
   }
   ```

6. Wire up any UI elements if needed.

Keep error handling consistent: Rust returns `CommandResult<T>`, JS uses
try/catch at user-facing boundaries and calls `setStatus("...", "dirty")` on
visible failures.
