use serde_json;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|err| err.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|err| err.to_string())
}

fn recent_files_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_config_dir()
        .map_err(|err| format!("Failed to resolve app config directory: {err}"))?;

    if !base.exists() {
        fs::create_dir_all(&base).map_err(|err| format!("Failed to create config directory: {err}"))?;
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
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            load_recent_files,
            save_recent_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
