use base64::{engine::general_purpose, Engine as _};
use serde_json;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[cfg(target_os = "linux")]
fn configure_linux_webkit_environment() {
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

#[cfg(not(target_os = "linux"))]
fn configure_linux_webkit_environment() {}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|err| err.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|err| err.to_string())
}

fn image_mime_type(path: &str) -> Option<&'static str> {
    let extension = PathBuf::from(path)
        .extension()
        .and_then(|extension| extension.to_str())?
        .to_ascii_lowercase();

    match extension.as_str() {
        "apng" => Some("image/apng"),
        "avif" => Some("image/avif"),
        "bmp" => Some("image/bmp"),
        "gif" => Some("image/gif"),
        "ico" => Some("image/x-icon"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "png" => Some("image/png"),
        "svg" => Some("image/svg+xml"),
        "webp" => Some("image/webp"),
        _ => None,
    }
}

#[tauri::command]
fn read_image_data_url(path: String) -> Result<String, String> {
    let mime_type = image_mime_type(&path).ok_or_else(|| "Unsupported image type".to_string())?;
    let bytes = fs::read(path).map_err(|err| err.to_string())?;
    let encoded = general_purpose::STANDARD.encode(bytes);

    Ok(format!("data:{mime_type};base64,{encoded}"))
}

fn recent_files_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_config_dir()
        .map_err(|err| format!("Failed to resolve app config directory: {err}"))?;

    if !base.exists() {
        fs::create_dir_all(&base)
            .map_err(|err| format!("Failed to create config directory: {err}"))?;
    }

    Ok(base.join("recent_files.json"))
}

#[tauri::command]
fn load_recent_files(app: AppHandle) -> Result<Vec<String>, String> {
    let path = recent_files_path(&app)?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(path).map_err(|err| err.to_string())?;
    serde_json::from_str::<Vec<String>>(&raw).map_err(|err| err.to_string())
}

#[tauri::command]
fn save_recent_files(app: AppHandle, files: Vec<String>) -> Result<(), String> {
    let path = recent_files_path(&app)?;
    let json = serde_json::to_string_pretty(&files).map_err(|err| err.to_string())?;
    fs::write(path, json).map_err(|err| err.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    configure_linux_webkit_environment();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            read_image_data_url,
            load_recent_files,
            save_recent_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
