fn main() {
    #[cfg(target_os = "macos")]
    compile_error!(
        "The Tauri macOS build path has been retired. Use macos-native/ for the Swift-native Apple Silicon app."
    );

    tauri_build::build()
}
