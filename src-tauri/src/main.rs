#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scan;

use scan::{
  run_scan, run_scan_codex, run_scan_gemini, read_skill_dir_structure, 
  ScanOptions, ScanResult, FileNode, DiscoveredSkill, discover_remote_repo, find_skills_repo_path, install_local_skill as install_local_skill_impl, ensure_runtime_log_exists, log_runtime_event, conduct_repo_config_path
};
use log::LevelFilter;
use std::fs;
use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};
use tauri_plugin_log::LogTarget;

const DEFAULT_SKILLS_REPO_JSON: &str = r#"{
  "repositories": [
    {
      "name": "anthropics/skills",
      "url": "https://github.com/anthropics/skills.git",
      "description": "Official collection of skills by Anthropic"
    },
    {
      "name": "obra/superpowers",
      "url": "https://github.com/obra/superpowers.git",
      "description": "Superpowers: website builder and editor"
    },
    {
      "name": "composiohq/awesome-claude-skills",
      "url": "https://github.com/composiohq/awesome-claude-skills.git",
      "description": "Curated list of Claude skills"
    }
  ]
}
"#;

#[tauri::command]
async fn scan_skills(options: Option<ScanOptions>) -> Result<ScanResult, String> {
  let options = options.unwrap_or_default();
  tauri::async_runtime::spawn_blocking(move || run_scan(options))
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
#[allow(dead_code)]
async fn discover_skills(repo_url: String) -> Result<Vec<DiscoveredSkill>, String> {
  tauri::async_runtime::spawn_blocking(move || discover_remote_repo(repo_url))
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn get_skill_files(path: String) -> Result<Vec<FileNode>, String> {
  tauri::async_runtime::spawn_blocking(move || read_skill_dir_structure(path))
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn scan_codex_skills(options: Option<ScanOptions>) -> Result<ScanResult, String> {
  let options = options.unwrap_or_default();
  tauri::async_runtime::spawn_blocking(move || run_scan_codex(options))
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn scan_gemini_skills(options: Option<ScanOptions>) -> Result<ScanResult, String> {
  let options = options.unwrap_or_default();
  tauri::async_runtime::spawn_blocking(move || run_scan_gemini(options))
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn install_skill(platform: String, url: String) -> Result<(), String> {
  tauri::async_runtime::spawn_blocking(move || scan::install_skill(platform, url))
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn fetch_marketplace_skills() -> Result<Vec<scan::MarketplaceSkill>, String> {
  tauri::async_runtime::spawn_blocking(|| scan::fetch_marketplace_skills())
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn read_marketplace_cache() -> Result<Vec<scan::MarketplaceSkill>, String> {
  tauri::async_runtime::spawn_blocking(|| scan::read_marketplace_cache())
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
fn open_in_editor(path: String) -> Result<(), String> {
  open::that(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn show_in_finder(path: String) -> Result<(), String> {
  let target = std::path::Path::new(&path)
    .parent()
    .unwrap_or(std::path::Path::new(&path))
    .to_path_buf();
  open::that(target).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_skills_repo_path(app: tauri::AppHandle) -> Option<String> {
  if let Some(path) = find_skills_repo_path() {
    if let Ok(abs) = path.canonicalize() {
      return Some(abs.to_string_lossy().to_string());
    }
    return Some(path.to_string_lossy().to_string());
  }
  let resource_dir = app.path_resolver().resource_dir()?;
  let candidate = resource_dir.join("skills_repo.json");
  if candidate.exists() {
    if let Ok(abs) = candidate.canonicalize() {
      return Some(abs.to_string_lossy().to_string());
    }
    return Some(candidate.to_string_lossy().to_string());
  }
  None
}

fn ensure_skills_repo_config(app: &tauri::App) {
  let Some(target_path) = conduct_repo_config_path() else {
    log_runtime_event("marketplace repo_config home_missing");
    return;
  };

  if let Some(parent) = target_path.parent() {
    if fs::create_dir_all(parent).is_err() {
      log_runtime_event("marketplace repo_config mkdir_failed");
      return;
    }
  }

  if target_path.exists() {
    std::env::set_var("CONDUCT_SKILLS_REPO_PATH", &target_path);
    log_runtime_event(&format!(
      "marketplace repo_config exists path={}",
      target_path.to_string_lossy()
    ));
    return;
  }

  let mut wrote = false;
  if let Some(resource_dir) = app.path_resolver().resource_dir() {
    let candidate = resource_dir.join("skills_repo.json");
    if candidate.exists() {
      if fs::copy(&candidate, &target_path).is_ok() {
        wrote = true;
        log_runtime_event(&format!(
          "marketplace repo_config copied_from_resources path={}",
          target_path.to_string_lossy()
        ));
      } else {
        log_runtime_event("marketplace repo_config copy_failed");
      }
    }
  }

  if !wrote {
    if fs::write(&target_path, DEFAULT_SKILLS_REPO_JSON).is_ok() {
      log_runtime_event(&format!(
        "marketplace repo_config default_written path={}",
        target_path.to_string_lossy()
      ));
    } else {
      log_runtime_event("marketplace repo_config default_write_failed");
      return;
    }
  }

  std::env::set_var("CONDUCT_SKILLS_REPO_PATH", &target_path);
}

#[tauri::command]
fn install_local_skill(platform: String, source_path: String) -> Result<(), String> {
  log_runtime_event(&format!(
    "replicate command platform={} source_path={}",
    platform, source_path
  ));
  match install_local_skill_impl(platform, source_path) {
    Ok(()) => {
      log_runtime_event("replicate command success");
      Ok(())
    }
    Err(error) => {
      log_runtime_event(&format!("replicate command error={}", error));
      Err(error)
    }
  }
}

fn main() {
  ensure_runtime_log_exists();
  log_runtime_event("app initialized");
  let tray_menu = SystemTrayMenu::new()
    .add_item(CustomMenuItem::new("show".to_string(), "Show"))
    .add_item(CustomMenuItem::new("quit".to_string(), "Quit"));
  let tray = SystemTray::new().with_menu(tray_menu);

  tauri::Builder::default()
    .setup(|app| {
      ensure_skills_repo_config(app);
      Ok(())
    })
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(LevelFilter::Info)
        .targets([LogTarget::LogDir, LogTarget::Stdout])
        .build()
    )
    .system_tray(tray)
    .on_system_tray_event(|app, event| {
      if let SystemTrayEvent::MenuItemClick { id, .. } = event {
        match id.as_str() {
          "show" => {
            if let Some(window) = app.get_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "quit" => {
            app.exit(0);
          }
          _ => {}
        }
      }
    })
    .invoke_handler(tauri::generate_handler![
      scan_skills,
      scan_codex_skills,
      scan_gemini_skills,
      install_skill,
      get_skill_files,
      fetch_marketplace_skills,
      read_marketplace_cache,
      get_skills_repo_path,
      install_local_skill,
      open_in_editor,
      show_in_finder
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
