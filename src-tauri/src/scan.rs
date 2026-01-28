use glob::glob;
use log::{error, info, warn};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_yaml::Value;
use std::collections::HashMap;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static RUN_COUNTER: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Default, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanOptions {
  pub project_dir: Option<String>,
  pub include_global: Option<bool>,
  pub include_project: Option<bool>,
  pub include_plugin: Option<bool>,
  #[allow(dead_code)]
  pub verbose: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
  pub skills: Vec<ParsedSkill>,
  pub report: ScanReport,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
  pub name: String,
  pub path: String,
  #[serde(rename = "type")]
  pub file_type: String, // "file" or "directory"
  #[serde(skip_serializing_if = "Option::is_none")]
  pub children: Option<Vec<FileNode>>,
}

pub fn read_skill_dir_structure(path: String) -> Result<Vec<FileNode>, String> {
  let root_path = PathBuf::from(&path);
  if !directory_exists(&root_path) {
    return Err(format!("Directory not found: {}", path));
  }
  read_dir_recursive(&root_path)
}

fn read_dir_recursive(dir_path: &Path) -> Result<Vec<FileNode>, String> {
  let mut nodes = Vec::new();
  let entries = fs::read_dir(dir_path).map_err(|e| e.to_string())?;

  for entry in entries {
    let entry = entry.map_err(|e| e.to_string())?;
    let path = entry.path();
    let file_type = entry.file_type().map_err(|e| e.to_string())?;
    let name = entry.file_name().to_string_lossy().to_string();

    // Skip hidden files/dirs like .git
    if name.starts_with('.') {
      continue;
    }

    if file_type.is_dir() {
      let children = read_dir_recursive(&path)?;
      nodes.push(FileNode {
        name,
        path: path.to_string_lossy().to_string(),
        file_type: "directory".to_string(),
        children: Some(children),
      });
    } else {
      nodes.push(FileNode {
        name,
        path: path.to_string_lossy().to_string(),
        file_type: "file".to_string(),
        children: None,
      });
    }
  }

  // Sort: directories first, then files
  nodes.sort_by(|a, b| {
    if a.file_type == b.file_type {
      a.name.cmp(&b.name)
    } else if a.file_type == "directory" {
      std::cmp::Ordering::Less
    } else {
      std::cmp::Ordering::Greater
    }
  });

  Ok(nodes)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillLocation {
  pub platform: String,
  #[serde(rename = "type")]
  pub location_type: String,
  pub path: String,
  pub priority: u8,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillMetadata {
  pub name: String,
  pub description: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub version: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub license: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub allowed_tools: Option<Vec<String>>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub model: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub context: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub agent: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub hooks: Option<Hooks>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub user_invocable: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Hooks {
  #[serde(rename = "PreToolUse", skip_serializing_if = "Option::is_none")]
  pub pre_tool_use: Option<String>,
  #[serde(rename = "PostToolUse", skip_serializing_if = "Option::is_none")]
  pub post_tool_use: Option<String>,
  #[serde(rename = "Stop", skip_serializing_if = "Option::is_none")]
  pub stop: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationError {
  pub field: String,
  pub message: String,
  pub severity: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
  pub valid: bool,
  pub errors: Vec<ValidationError>,
  pub warnings: Vec<ValidationError>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedSkill {
  pub location: SkillLocation,
  pub skill_path: String,
  pub metadata: SkillMetadata,
  pub content: String,
  pub raw_yaml: String,
  pub supporting_files: Vec<String>,
  pub validation_result: ValidationResult,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub is_overridden: Option<bool>,
}

#[derive(Debug, Clone)]
pub struct SkillDirectory {
  pub location: SkillLocation,
  pub skill_path: String,
  #[allow(dead_code)]
  pub has_skill_md: bool,
  pub supporting_files: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillConflict {
  pub name: String,
  pub instances: Vec<ConflictInstance>,
  pub effective_skill: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictInstance {
  pub location: SkillLocation,
  pub path: String,
  pub active: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Statistics {
  pub total: usize,
  pub valid: usize,
  pub warnings: usize,
  pub errors: usize,
  pub by_location: LocationStats,
  pub conflicts: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationStats {
  pub enterprise: usize,
  pub personal: usize,
  pub project: usize,
  pub nested: usize,
  pub plugin: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillsByLocation {
  pub enterprise: Vec<ParsedSkill>,
  pub personal: Vec<ParsedSkill>,
  pub project: Vec<ParsedSkill>,
  pub nested: Vec<ParsedSkill>,
  pub plugin: Vec<ParsedSkill>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
  pub skill: String,
  pub errors: Vec<ValidationError>,
  pub warnings: Vec<ValidationError>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanReport {
  pub summary: Statistics,
  pub by_location: SkillsByLocation,
  pub validation_issues: Vec<ValidationIssue>,
  pub conflicts: Vec<SkillConflict>,
  pub recommendations: Vec<String>,
}

const VALID_TOOLS: &[&str] = &[
  "Read",
  "Write",
  "Edit",
  "Grep",
  "Glob",
  "Bash",
  "Task",
  "TodoWrite",
  "AskUserQuestion",
  "Skill",
  "WebFetch",
  "WebSearch",
  "EnterPlanMode",
  "ExitPlanMode",
];

const VALID_MODELS: &[&str] = &[
  "claude-sonnet-4",
  "claude-opus-4",
  "claude-haiku-4",
  "sonnet",
  "opus",
  "haiku",
];

pub fn run_scan(options: ScanOptions) -> Result<ScanResult, String> {
  let project_dir = options
    .project_dir
    .and_then(|value| if value.trim().is_empty() { None } else { Some(value) })
    .map(PathBuf::from)
    .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
  let include_global = options.include_global.unwrap_or(true);
  let include_project = options.include_project.unwrap_or(true);
  let include_plugin = options.include_plugin.unwrap_or(true);

  let locations = resolve_locations(&project_dir, include_global, include_project, include_plugin);
  let skill_dirs = scan_all_locations(&locations);
  let parsed = parse_all(skill_dirs);
  let validated = validate_all(parsed);
  let (conflicts, skills_with_overrides) = analyze_conflicts(validated);
  let report = generate_report(&skills_with_overrides, &conflicts);

  Ok(ScanResult {
    skills: skills_with_overrides,
    report,
  })
}

pub fn run_scan_codex(options: ScanOptions) -> Result<ScanResult, String> {
  let project_dir = options
    .project_dir
    .and_then(|value| if value.trim().is_empty() { None } else { Some(value) })
    .map(PathBuf::from)
    .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
  let locations = resolve_codex_locations(&project_dir);
  let skill_dirs = scan_all_locations(&locations);
  let parsed = parse_all(skill_dirs);
  let validated = validate_all(parsed);
  let (conflicts, skills_with_overrides) = analyze_conflicts(validated);
  let report = generate_report(&skills_with_overrides, &conflicts);

  Ok(ScanResult {
    skills: skills_with_overrides,
    report,
  })
}

pub fn run_scan_gemini(options: ScanOptions) -> Result<ScanResult, String> {
  let project_dir = options
    .project_dir
    .and_then(|value| if value.trim().is_empty() { None } else { Some(value) })
    .map(PathBuf::from)
    .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
  
  let mut locations = Vec::new();
  
  // 1. Personal Global
  let home = dirs::home_dir();
  if let Some(home_path) = home {
    let skills_path = home_path.join(".gemini").join("skills");
    if directory_exists(&skills_path) {
      locations.push(SkillLocation {
        platform: "gemini".to_string(),
        location_type: "personal".to_string(),
        path: skills_path.to_string_lossy().to_string(),
        priority: 2,
      });
    }
  }

  // 2. Project
  let project_skills = project_dir.join(".gemini").join("skills");
  if directory_exists(&project_skills) {
    locations.push(SkillLocation {
      platform: "gemini".to_string(),
      location_type: "project".to_string(),
      path: project_skills.to_string_lossy().to_string(),
      priority: 3,
    });
  }

  let skill_dirs = scan_all_locations(&locations);
  let parsed = parse_all(skill_dirs);
  let validated = validate_all(parsed);
  let (conflicts, skills_with_overrides) = analyze_conflicts(validated);
  let report = generate_report(&skills_with_overrides, &conflicts);

  Ok(ScanResult {
    skills: skills_with_overrides,
    report,
  })
}

pub fn install_skill(platform: String, url: String) -> Result<(), String> {
  let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
  
  let target_base_dir = match platform.as_str() {
    "claude" => home.join(".claude").join("skills"),
    "codex" => home.join(".codex").join("skills"),
    "gemini" => home.join(".gemini").join("skills"),
    _ => return Err(format!("Unknown platform: {}", platform)),
  };

  if !directory_exists(&target_base_dir) {
    fs::create_dir_all(&target_base_dir).map_err(|e| format!("Failed to create skills directory: {}", e))?;
  }

  // Parse URL to handle subdirectories
  let (repo_url, branch, subdir) = parse_git_url(&url);

  // Determine skill name
  let skill_name = if let Some(sub) = &subdir {
    sub.split('/').last().ok_or("Invalid subdirectory path")?
  } else {
    let name = repo_url.split('/').last().ok_or("Invalid URL")?;
    if name.ends_with(".git") {
      &name[..name.len() - 4]
    } else {
      name
    }
  };

  let install_path = target_base_dir.join(skill_name);

  if directory_exists(&install_path) {
    return Err(format!("Skill '{}' already exists at {:?}", skill_name, install_path));
  }

  if let Some(sub) = subdir {
    // Case 1: Installing a subdirectory from a repo
    let temp_dir = std::env::temp_dir().join(format!("conduct_install_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()));
    
    // Clone repo to temp dir
    let mut cmd = std::process::Command::new("git");
    cmd.arg("clone").arg("--depth").arg("1");
    
    if let Some(br) = branch {
      cmd.arg("--branch").arg(br);
    }
    
    cmd.arg(&repo_url).arg(&temp_dir);

    let output = cmd.output().map_err(|e| format!("Failed to execute git: {}", e))?;

    if !output.status.success() {
      let stderr = String::from_utf8_lossy(&output.stderr);
      return Err(format!("Git clone failed: {}", stderr));
    }

    // Copy subdirectory to target
    let source_path = temp_dir.join(sub);
    if !directory_exists(&source_path) {
      let _ = fs::remove_dir_all(&temp_dir);
      return Err(format!("Subdirectory '{}' not found in repository", source_path.display()));
    }

    if let Err(e) = copy_dir_all(&source_path, &install_path) {
      let _ = fs::remove_dir_all(&temp_dir);
      let _ = fs::remove_dir_all(&install_path); // Cleanup partial install
      return Err(format!("Failed to copy skill files: {}", e));
    }

    // Cleanup temp dir
    let _ = fs::remove_dir_all(&temp_dir);

  } else {
    // Case 2: Standard full repo clone
    let output = std::process::Command::new("git")
      .arg("clone")
      .arg(&repo_url)
      .arg(&install_path)
      .output()
      .map_err(|e| format!("Failed to execute git: {}", e))?;

    if !output.status.success() {
      let stderr = String::from_utf8_lossy(&output.stderr);
      return Err(format!("Git clone failed: {}", stderr));
    }
  }

  Ok(())
}

pub fn install_local_skill(platform: String, source_path: String) -> Result<(), String> {
  log_runtime_event(&format!(
    "replicate start platform={} source_path={}",
    platform, source_path
  ));
  let source_dir = PathBuf::from(&source_path);
  if !directory_exists(&source_dir) {
    let message = format!("Source skill directory not found: {}", source_path);
    log_runtime_event(&format!("replicate error platform={} reason={}", platform, message));
    return Err(message);
  }

  let metadata = match read_skill_metadata_from_path(&source_dir) {
    Ok(metadata) => metadata,
    Err(error) => {
      log_runtime_event(&format!("replicate error platform={} reason={}", platform, error));
      return Err(error);
    }
  };
  let normalized_name = metadata.name.trim().to_lowercase();

  let scan_result = match platform.as_str() {
    "claude" => run_scan(ScanOptions::default()),
    "codex" => run_scan_codex(ScanOptions::default()),
    "gemini" => run_scan_gemini(ScanOptions::default()),
    _ => {
      let message = format!("Unknown platform: {}", platform);
      log_runtime_event(&format!("replicate error platform={} reason={}", platform, message));
      return Err(message);
    }
  };
  let scan_result = match scan_result {
    Ok(result) => result,
    Err(error) => {
      log_runtime_event(&format!("replicate error platform={} reason={}", platform, error));
      return Err(error);
    }
  };

  if scan_result.skills.iter().any(|skill| {
    skill.metadata.name.trim().to_lowercase() == normalized_name
  }) {
    let message = format!("Skill '{}' already exists in target CLI", metadata.name);
    log_runtime_event(&format!("replicate error platform={} reason={}", platform, message));
    return Err(message);
  }

  let home = match dirs::home_dir() {
    Some(home) => home,
    None => {
      let message = "Cannot determine home directory".to_string();
      log_runtime_event(&format!("replicate error platform={} reason={}", platform, message));
      return Err(message);
    }
  };
  let target_base_dir = match platform.as_str() {
    "claude" => home.join(".claude").join("skills"),
    "codex" => home.join(".codex").join("skills"),
    "gemini" => home.join(".gemini").join("skills"),
    _ => return Err(format!("Unknown platform: {}", platform)),
  };

  if !directory_exists(&target_base_dir) {
    if let Err(error) = fs::create_dir_all(&target_base_dir) {
      let message = format!("Failed to create skills directory: {}", error);
      log_runtime_event(&format!("replicate error platform={} reason={}", platform, message));
      return Err(message);
    }
  }

  let folder_name = source_dir
    .file_name()
    .and_then(|name| name.to_str())
    .ok_or("Invalid source path")?;
  let install_path = target_base_dir.join(folder_name);

  if directory_exists(&install_path) {
    let message = format!("Skill '{}' already exists at {:?}", folder_name, install_path);
    log_runtime_event(&format!("replicate error platform={} reason={}", platform, message));
    return Err(message);
  }

  if let Err(error) = copy_dir_all(&source_dir, &install_path) {
    let message = format!("Failed to copy skill files: {}", error);
    log_runtime_event(&format!("replicate error platform={} reason={}", platform, message));
    return Err(message);
  }

  log_runtime_event(&format!(
    "replicate success platform={} skill={} target_path={}",
    platform,
    metadata.name,
    install_path.display()
  ));

  Ok(())
}

fn parse_git_url(url: &str) -> (String, Option<String>, Option<String>) {
  // Matches: https://github.com/owner/repo/tree/branch/path/to/dir
  let re = Regex::new(r"^(https?://(?:github|gitee)\.com/[^/]+/[^/]+)/tree/([^/]+)/(.*)$").unwrap();
  
  if let Some(caps) = re.captures(url) {
    let repo_url = caps[1].to_string();
    let branch = caps[2].to_string();
    let subdir = caps[3].to_string();
    return (repo_url, Some(branch), Some(subdir));
  }
  
  (url.to_string(), None, None)
}

#[derive(Debug, Serialize, Deserialize)]
struct RepoList {
  repositories: Vec<RepoConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct RepoConfig {
  #[allow(dead_code)]
  name: String,
  url: String,
  #[allow(dead_code)]
  description: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddRepoResult {
  pub skills: Vec<MarketplaceSkill>,
  pub added_repo: String,
  pub added_skills: usize,
  pub total_skills: usize,
  pub total_repos: usize,
}

fn marketplace_cache_path() -> PathBuf {
  if let Some(config_path) = find_skills_repo_path() {
    return config_path
      .parent()
      .unwrap_or_else(|| Path::new("."))
      .join("skills_list.json");
  }
  let candidates = ["skills_list.json", "../skills_list.json"];
  for name in candidates {
    let path = Path::new(name);
    if path.exists() {
      return path.to_path_buf();
    }
  }
  PathBuf::from("skills_list.json")
}

fn normalize_repo_url(url: &str) -> String {
  let mut value = url.trim().trim_end_matches('/').to_string();
  if value.ends_with(".git") {
    value = value.trim_end_matches(".git").to_string();
  }
  value.to_lowercase()
}

fn repo_name_from_url(url: &str) -> String {
  let trimmed = url.trim();
  if let Some(rest) = trimmed.strip_prefix("git@") {
    if let Some(path) = rest.split(':').nth(1) {
      let cleaned = path.trim_end_matches(".git").trim_end_matches('/');
      let parts: Vec<&str> = cleaned.split('/').collect();
      if parts.len() >= 2 {
        return format!("{}/{}", parts[parts.len() - 2], parts[parts.len() - 1]);
      }
      return cleaned.to_string();
    }
  }

  if let Some(after_scheme) = trimmed.split("://").nth(1) {
    let cleaned = after_scheme.trim_end_matches('/');
    let parts: Vec<&str> = cleaned.split('/').collect();
    if parts.len() >= 3 {
      let owner = parts[parts.len() - 2];
      let repo = parts[parts.len() - 1].trim_end_matches(".git");
      return format!("{}/{}", owner, repo);
    }
  }

  trimmed.to_string()
}

fn is_valid_repo_url(url: &str) -> bool {
  let value = url.trim();
  value.starts_with("https://") || value.starts_with("http://") || value.starts_with("git@")
}

pub fn find_skills_repo_path() -> Option<PathBuf> {
  if let Ok(env_path) = std::env::var("CONDUCT_SKILLS_REPO_PATH") {
    let path = PathBuf::from(env_path);
    if path.exists() {
      return Some(path);
    }
  }
  if let Some(path) = conduct_repo_config_path() {
    if path.exists() {
      return Some(path);
    }
  }
  let candidates = ["skills_repo.json", "../skills_repo.json"];
  for name in candidates {
    let path = Path::new(name);
    if path.exists() {
      return Some(path.to_path_buf());
    }
  }
  if let Ok(exe_path) = std::env::current_exe() {
    if let Some(exe_dir) = exe_path.parent() {
      let candidate = exe_dir.join("skills_repo.json");
      if candidate.exists() {
        return Some(candidate);
      }
      let resources_dir = exe_dir.join("../Resources");
      let resources_candidate = resources_dir.join("skills_repo.json");
      if resources_candidate.exists() {
        return Some(resources_candidate);
      }
    }
  }
  None
}

pub fn conduct_repo_config_path() -> Option<PathBuf> {
  home_dir_fallback().map(|home| home.join(".Conduct").join("skills_repo.json"))
}

pub fn read_marketplace_cache() -> Result<Vec<MarketplaceSkill>, String> {
  let cache_path = marketplace_cache_path();
  if !cache_path.exists() {
    return Ok(vec![]);
  }
  let content = fs::read_to_string(&cache_path)
    .map_err(|e| format!("Failed to read {}: {}", cache_path.display(), e))?;
  serde_json::from_str(&content)
    .map_err(|e| format!("Failed to parse {}: {}", cache_path.display(), e))
}

pub fn fetch_marketplace_skills() -> Result<Vec<MarketplaceSkill>, String> {
  info!("Marketplace fetch started");
  log_runtime_event("marketplace fetch start");
  // 1. Read repositories from skills_repo.json
  // Try to find the file in the current directory or project root (parent)
  let config_path = find_skills_repo_path();

  let repo_list: RepoList = if let Some(config_path) = config_path.as_ref() {
    info!("Using skills_repo.json at {}", config_path.display());
    log_runtime_event(&format!(
      "marketplace repo_config path={}",
      config_path.display()
    ));
    let content = fs::read_to_string(config_path)
      .map_err(|e| {
        log_runtime_event(&format!("marketplace repo_config read_error={}", e));
        format!("Failed to read {:?}: {}", config_path, e)
      })?;
    serde_json::from_str(&content)
      .map_err(|e| {
        log_runtime_event(&format!("marketplace repo_config parse_error={}", e));
        format!("Failed to parse {:?}: {}", config_path, e)
      })?
  } else {
    // Fallback or empty if not found
    warn!("skills_repo.json not found in CWD or parent.");
    log_runtime_event("marketplace repo_config missing");
    RepoList { repositories: vec![] }
  };

  let mut all_skills = Vec::new();

  for repo in repo_list.repositories {
    info!("Discovering repo: {}", repo.url);
    log_runtime_event(&format!("marketplace repo_fetch start url={}", repo.url));
    match discover_remote_repo(repo.url.clone()) {
      Ok(skills) => {
        info!("Discovered {} skills from {}", skills.len(), repo.url);
        log_runtime_event(&format!(
          "marketplace repo_fetch ok url={} count={}",
          repo.url,
          skills.len()
        ));
        all_skills.extend(skills);
      },
      Err(e) => {
        warn!("Failed to fetch from {}: {}", repo.url, e);
        log_runtime_event(&format!(
          "marketplace repo_fetch error url={} err={}",
          repo.url, e
        ));
      }
    }
  }

  // Convert DiscoveredSkill to MarketplaceSkill
  let marketplace_skills: Vec<MarketplaceSkill> = all_skills.into_iter().map(|s| {
    let author = if s.repo_url.starts_with("local:") {
      "Local".to_string()
    } else {
      s.repo_url.split('/').nth(3).unwrap_or("Unknown").to_string()
    };

    MarketplaceSkill {
      name: s.name,
      description: s.description,
      author,
      stars: 0,
      tags: s.metadata.allowed_tools.unwrap_or_default(),
      url: s.repo_url,
    }
  }).collect();

  log_runtime_event(&format!(
    "marketplace fetch done count={}",
    marketplace_skills.len()
  ));

  // 2. Save parsed skills to cache file for fast startup
  let output_path = if let Some(config_path) = config_path.as_ref() {
    config_path.parent().unwrap_or_else(|| Path::new(".")).join("skills_list.json")
  } else {
    marketplace_cache_path()
  };
  if let Ok(json_output) = serde_json::to_string_pretty(&marketplace_skills) {
    let _ = fs::write(output_path, json_output);
  }

  info!("Marketplace fetch completed with {} skills", marketplace_skills.len());
  Ok(marketplace_skills)
}

pub fn add_skills_repo(url: String) -> Result<AddRepoResult, String> {
  let trimmed = url.trim();
  if trimmed.is_empty() {
    return Err("Repository URL is required".to_string());
  }
  if !is_valid_repo_url(trimmed) {
    return Err("Invalid repository URL".to_string());
  }

  let config_path = find_skills_repo_path()
    .ok_or_else(|| "skills_repo.json not found".to_string())?;

  let content = fs::read_to_string(&config_path)
    .map_err(|e| format!("Failed to read {:?}: {}", config_path, e))?;
  let mut repo_list: RepoList = serde_json::from_str(&content)
    .map_err(|e| format!("Failed to parse {:?}: {}", config_path, e))?;

  let normalized = normalize_repo_url(trimmed);
  if repo_list.repositories.iter().any(|repo| normalize_repo_url(&repo.url) == normalized) {
    return Err("Repository already exists".to_string());
  }

  let discovered = discover_remote_repo(trimmed.to_string())
    .map_err(|e| format!("Failed to read repository: {}", e))?;
  if discovered.is_empty() {
    return Err("No skills found in repository".to_string());
  }

  let repo_name = repo_name_from_url(trimmed);
  repo_list.repositories.push(RepoConfig {
    name: repo_name.clone(),
    url: trimmed.to_string(),
    description: "User added repo".to_string(),
  });

  let updated = serde_json::to_string_pretty(&repo_list)
    .map_err(|e| format!("Failed to serialize skills_repo.json: {}", e))?;
  fs::write(&config_path, updated)
    .map_err(|e| format!("Failed to write skills_repo.json: {}", e))?;

  let skills = fetch_marketplace_skills()?;
  let total_skills = skills.len();
  let total_repos = repo_list.repositories.len();

  Ok(AddRepoResult {
    skills,
    added_repo: repo_name,
    added_skills: discovered.len(),
    total_skills,
    total_repos,
  })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceSkill {
  pub name: String,
  pub description: String,
  pub author: String,
  pub stars: u32,
  pub tags: Vec<String>,
  pub url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredSkill {
  pub name: String,
  pub description: String,
  pub path: String,
  pub repo_url: String,
  pub metadata: SkillMetadata,
}

fn remove_existing_path(path: &Path) {
  if let Ok(meta) = fs::symlink_metadata(path) {
    if meta.is_dir() {
      let _ = fs::remove_dir_all(path);
    } else {
      let _ = fs::remove_file(path);
    }
  }
}

fn resolve_local_repo_path(repo_url: &str) -> Option<PathBuf> {
  let trimmed = repo_url.trim_start_matches("file://");
  let path = PathBuf::from(trimmed);
  if path.exists() {
    Some(path)
  } else {
    None
  }
}

fn build_install_url(repo_url: &str, branch: Option<&str>, relative_path: &str, repo_root: &Path, is_local: bool) -> String {
  if is_local {
    if relative_path == "." {
      format!("local:{}", repo_root.to_string_lossy())
    } else {
      format!("local:{}#{}", repo_root.to_string_lossy(), relative_path)
    }
  } else {
    let base = repo_url.trim_end_matches(".git");
    let branch_name = branch.unwrap_or("main");
    if relative_path == "." {
      format!("{}/tree/{}", base, branch_name)
    } else {
      format!("{}/tree/{}/{}", base, branch_name, relative_path)
    }
  }
}

fn discover_from_dir(
  scan_root: &Path,
  repo_root: &Path,
  repo_url: &str,
  branch: Option<&str>,
  is_local: bool,
) -> Result<Vec<DiscoveredSkill>, String> {
  let skill_files = find_skill_files_recursive(scan_root);
  let mut discovered = Vec::new();

  for skill_file in skill_files {
    if let Ok(content) = fs::read_to_string(&skill_file) {
      if let Ok(frontmatter) = extract_frontmatter(&content) {
        let parent = skill_file.parent().unwrap_or(repo_root);
        let relative_path = pathdiff::diff_paths(parent, repo_root)
          .unwrap_or_else(|| PathBuf::from("."))
          .to_string_lossy()
          .to_string();

        let install_url = build_install_url(repo_url, branch, &relative_path, repo_root, is_local);

        discovered.push(DiscoveredSkill {
          name: frontmatter.metadata.name.clone(),
          description: frontmatter.metadata.description.clone(),
          path: relative_path,
          repo_url: install_url,
          metadata: frontmatter.metadata,
        });
      }
    }
  }

  Ok(discovered)
}

pub fn discover_remote_repo(repo_url: String) -> Result<Vec<DiscoveredSkill>, String> {
  info!("Discovering skills from {}", repo_url);
  if let Some(local_path) = resolve_local_repo_path(&repo_url) {
    if !local_path.is_dir() {
      return Err(format!("Local path is not a directory: {}", local_path.display()));
    }
    return discover_from_dir(&local_path, &local_path, &repo_url, None, true);
  }

  let (normalized_repo_url, branch, subdir) = parse_git_url(&repo_url);
  info!(
    "Normalized repo: {}, branch: {:?}, subdir: {:?}",
    normalized_repo_url, branch, subdir
  );

  let temp_dir = std::env::temp_dir().join("conduct_marketplace");
  if temp_dir.exists() && !directory_exists(&temp_dir) {
    remove_existing_path(&temp_dir);
  }
  if !directory_exists(&temp_dir) {
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
  }

  let repo_hash = format!("{:x}", md5::compute(normalized_repo_url.as_bytes()));
  let run_id = SystemTime::now()
    .duration_since(SystemTime::UNIX_EPOCH)
    .map_err(|e| format!("Failed to read system time: {}", e))?
    .as_millis();
  let counter = RUN_COUNTER.fetch_add(1, Ordering::Relaxed);
  let repo_path = temp_dir.join(format!("{}_{}_{}", repo_hash, run_id, counter));

  remove_existing_path(&repo_path);

  let mut cmd = std::process::Command::new("git");
  cmd.arg("clone").arg("--depth").arg("1");
  if let Some(ref br) = branch {
    cmd.arg("--branch").arg(br);
  }
  info!("Cloning repo to {}", repo_path.display());
  let output = cmd
    .arg(&normalized_repo_url)
    .arg(&repo_path)
    .output()
    .map_err(|e| format!("Failed to execute git: {}", e))?;

  if !output.status.success() {
    remove_existing_path(&repo_path);
    error!("Git clone failed: {}", String::from_utf8_lossy(&output.stderr));
    return Err(format!("Git clone failed: {}", String::from_utf8_lossy(&output.stderr)));
  }

  let scan_root = if let Some(subdir_path) = subdir {
    let candidate = repo_path.join(&subdir_path);
    if !directory_exists(&candidate) {
      remove_existing_path(&repo_path);
      return Err(format!("Subdirectory '{}' not found in repository", candidate.display()));
    }
    candidate
  } else {
    repo_path.clone()
  };

  let result = discover_from_dir(&scan_root, &repo_path, &normalized_repo_url, branch.as_deref(), false);
  remove_existing_path(&repo_path);
  result
}

fn find_skill_files_recursive(dir: &Path) -> Vec<PathBuf> {
  let mut results = Vec::new();
  if let Ok(entries) = fs::read_dir(dir) {
    for entry in entries.flatten() {
      let path = entry.path();
      if path.is_dir() {
        if path.file_name().and_then(|n| n.to_str()) == Some(".git") {
          continue;
        }
        results.extend(find_skill_files_recursive(&path));
      } else if path.file_name().and_then(|n| n.to_str()) == Some("SKILL.md") {
        results.push(path);
      }
    }
  }
  results
}

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
  fs::create_dir_all(&dst)?;
  for entry in fs::read_dir(src)? {
    let entry = entry?;
    let ty = entry.file_type()?;
    if ty.is_dir() {
      copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
    } else {
      fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
    }
  }
  Ok(())
}

fn runtime_log_paths() -> Vec<PathBuf> {
  let mut paths = Vec::new();
  if cfg!(target_os = "macos") {
    if let Some(home) = home_dir_fallback() {
      paths.push(
        home
          .join("Library")
          .join("Logs")
          .join("Conduct")
          .join("runtime_log.md"),
      );
      paths.push(
        home
          .join("Library")
          .join("Logs")
          .join("com.conduct.app")
          .join("runtime_log.md"),
      );
    }
    return paths;
  }
  if cfg!(target_os = "windows") {
    if let Some(data) = dirs::data_dir().or_else(|| std::env::var("APPDATA").ok().map(PathBuf::from)) {
      paths.push(data.join("Conduct").join("logs").join("runtime_log.md"));
    }
    return paths;
  }
  if let Some(dir) = dirs::data_local_dir().or_else(dirs::data_dir) {
    paths.push(dir.join("Conduct").join("logs").join("runtime_log.md"));
  }
  paths
}

fn home_dir_fallback() -> Option<PathBuf> {
  dirs::home_dir()
    .or_else(|| std::env::var("HOME").ok().map(PathBuf::from))
    .or_else(|| std::env::var("USERPROFILE").ok().map(PathBuf::from))
}

fn runtime_log_timestamp() -> String {
  match SystemTime::now().duration_since(UNIX_EPOCH) {
    Ok(duration) => format!("{}", duration.as_secs()),
    Err(_) => "0".to_string(),
  }
}

pub fn log_runtime_event(message: &str) {
  let paths = runtime_log_paths();
  if paths.is_empty() {
    warn!("runtime_log.md: no valid log path available");
    return;
  }
  let line = format!("- [{}] {}", runtime_log_timestamp(), message);
  for path in paths {
    if let Some(parent) = path.parent() {
      if fs::create_dir_all(parent).is_err() {
        continue;
      }
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) {
      let _ = writeln!(file, "{}", line);
      return;
    }
  }
  warn!("runtime_log.md: failed to write log entry");
}

pub fn ensure_runtime_log_exists() {
  let paths = runtime_log_paths();
  if paths.is_empty() {
    warn!("runtime_log.md: no valid log path available");
    return;
  }
  for path in paths {
    if let Some(parent) = path.parent() {
      if fs::create_dir_all(parent).is_err() {
        continue;
      }
    }
    if OpenOptions::new().create(true).append(true).open(&path).is_ok() {
      log_runtime_event("app start");
      return;
    }
  }
  warn!("runtime_log.md: failed to create log file");
}

fn resolve_locations(
  project_dir: &Path,
  include_global: bool,
  include_project: bool,
  include_plugin: bool,
) -> Vec<SkillLocation> {
  let mut locations = Vec::new();

  if include_global {
    if let Some(personal) = get_personal_location() {
      locations.push(personal);
    }
  }

  if include_project {
    locations.extend(get_project_locations(project_dir));
  }

  if include_plugin {
    locations.extend(get_plugin_locations());
  }

  locations
}

fn resolve_codex_locations(project_dir: &Path) -> Vec<SkillLocation> {
  let mut locations = Vec::new();
  let cwd = std::env::current_dir().unwrap_or_else(|_| project_dir.to_path_buf());

  // 1. CWD (Repo) - Priority 1
  let cwd_skills = cwd.join(".codex").join("skills");
  if directory_exists(&cwd_skills) {
    locations.push(SkillLocation {
      platform: "codex".to_string(),
      location_type: "repo".to_string(),
      path: cwd_skills.to_string_lossy().to_string(),
      priority: 1,
    });
  }

  // 2. Parents (Repo) - Priority 2
  // Scan upwards recursively
  let mut current = cwd.parent();
  while let Some(dir) = current {
    let parent_skills = dir.join(".codex").join("skills");
    if directory_exists(&parent_skills) {
      locations.push(SkillLocation {
        platform: "codex".to_string(),
        location_type: "repo".to_string(),
        path: parent_skills.to_string_lossy().to_string(),
        priority: 2,
      });
    }
    current = dir.parent();
  }

  // 3. Repo Root - Priority 3
  if let Some(repo_root) = find_repo_root(&cwd) {
    let repo_skills = repo_root.join(".codex").join("skills");
    if directory_exists(&repo_skills) {
      // Avoid duplication if repo root was already captured as a parent
      let path_str = repo_skills.to_string_lossy().to_string();
      if !locations.iter().any(|l| l.path == path_str) {
        locations.push(SkillLocation {
          platform: "codex".to_string(),
          location_type: "repo".to_string(),
          path: path_str,
          priority: 3,
        });
      }
    }
  }

  // 4. User - Priority 4
  let user_skills = codex_home_dir().join("skills");
  if directory_exists(&user_skills) {
    locations.push(SkillLocation {
      platform: "codex".to_string(),
      location_type: "user".to_string(),
      path: user_skills.to_string_lossy().to_string(),
      priority: 4,
    });
  }

  // 5. System - Priority 5
  let admin_skills = PathBuf::from("/etc/codex/skills");
  if directory_exists(&admin_skills) {
    locations.push(SkillLocation {
      platform: "codex".to_string(),
      location_type: "admin".to_string(),
      path: admin_skills.to_string_lossy().to_string(),
      priority: 5,
    });
  }

  locations
}

fn find_repo_root(start: &Path) -> Option<PathBuf> {
  let mut current = Some(start);
  while let Some(dir) = current {
    if directory_exists(&dir.join(".git")) {
      return Some(dir.to_path_buf());
    }
    current = dir.parent();
  }
  None
}

fn codex_home_dir() -> PathBuf {
  if let Ok(value) = std::env::var("CODEX_HOME") {
    if !value.trim().is_empty() {
      return PathBuf::from(value);
    }
  }
  dirs::home_dir()
    .unwrap_or_else(|| PathBuf::from("."))
    .join(".codex")
}

fn get_personal_location() -> Option<SkillLocation> {
  let home = dirs::home_dir()?;
  let skills_path = home.join(".claude").join("skills");
  if directory_exists(&skills_path) {
    Some(SkillLocation {
      platform: "claude".to_string(),
      location_type: "personal".to_string(),
      path: skills_path.to_string_lossy().to_string(),
      priority: 2,
    })
  } else {
    None
  }
}

fn get_project_locations(root_dir: &Path) -> Vec<SkillLocation> {
  let mut locations = Vec::new();
  let project_skills = root_dir.join(".claude").join("skills");
  if directory_exists(&project_skills) {
    locations.push(SkillLocation {
      platform: "claude".to_string(),
      location_type: "project".to_string(),
      path: project_skills.to_string_lossy().to_string(),
      priority: 3,
    });
  }

  for nested in find_nested_skill_dirs(root_dir) {
    locations.push(SkillLocation {
      platform: "claude".to_string(),
      location_type: "nested".to_string(),
      path: nested.to_string_lossy().to_string(),
      priority: 3,
    });
  }

  locations
}

fn get_plugin_locations() -> Vec<SkillLocation> {
  let mut locations = Vec::new();
  let Some(home) = dirs::home_dir() else {
    return locations;
  };
  let plugins_path = home.join(".claude").join("plugins");
  if !directory_exists(&plugins_path) {
    return locations;
  }

  let entries = match fs::read_dir(&plugins_path) {
    Ok(entries) => entries,
    Err(_) => return locations,
  };

  for entry in entries.flatten() {
    let Ok(file_type) = entry.file_type() else {
      continue;
    };
    if !file_type.is_dir() {
      continue;
    }
    let skills_path = entry.path().join("skills");
    if directory_exists(&skills_path) {
      locations.push(SkillLocation {
        platform: "claude".to_string(),
        location_type: "plugin".to_string(),
        path: skills_path.to_string_lossy().to_string(),
        priority: 4,
      });
    }
  }

  locations
}

fn find_nested_skill_dirs(root_dir: &Path) -> Vec<PathBuf> {
  let patterns = [
    "packages/*/.claude/skills",
    "modules/*/.claude/skills",
    "apps/*/.claude/skills",
    "libs/*/.claude/skills",
  ];

  let mut results = Vec::new();

  for pattern in patterns {
    let pattern_path = root_dir.join(pattern);
    let pattern_str = pattern_path.to_string_lossy().replace('\\', "/");
    if let Ok(entries) = glob(&pattern_str) {
      for entry in entries {
        if let Ok(path) = entry {
          if is_ignored_path(&path) {
            continue;
          }
          if directory_exists(&path) {
            results.push(path);
          }
        }
      }
    }
  }

  results
}

fn is_ignored_path(path: &Path) -> bool {
  for component in path.components() {
    let value = component.as_os_str().to_string_lossy();
    if value == "node_modules" || value == ".git" || value == "dist" || value == "build" {
      return true;
    }
  }
  false
}

fn scan_all_locations(locations: &[SkillLocation]) -> Vec<SkillDirectory> {
  let mut all = Vec::new();
  for location in locations {
    all.extend(scan_location(location));
  }
  all
}

fn scan_location(location: &SkillLocation) -> Vec<SkillDirectory> {
  let mut skill_dirs = Vec::new();
  let entries = match fs::read_dir(&location.path) {
    Ok(entries) => entries,
    Err(_) => return skill_dirs,
  };

  for entry in entries.flatten() {
    let Ok(file_type) = entry.file_type() else {
      continue;
    };
    if !file_type.is_dir() {
      continue;
    }
    let skill_path = entry.path();
    let skill_md_path = skill_path.join("SKILL.md");
    if file_exists(&skill_md_path) {
      let supporting_files = detect_supporting_files(&skill_path);
      skill_dirs.push(SkillDirectory {
        location: location.clone(),
        skill_path: skill_path.to_string_lossy().to_string(),
        has_skill_md: true,
        supporting_files,
      });
    }
  }

  skill_dirs
}

fn detect_supporting_files(skill_path: &Path) -> Vec<String> {
  let mut files = Vec::new();
  let supporting_names = [
    "reference.md",
    "examples.md",
    "README.md",
    "REFERENCE.md",
    "EXAMPLES.md",
  ];

  for name in supporting_names {
    let path = skill_path.join(name);
    if file_exists(&path) {
      files.push(name.to_string());
    }
  }

  let scripts_path = skill_path.join("scripts");
  if directory_exists(&scripts_path) {
    files.push("scripts/".to_string());
  }

  files
}

fn parse_all(skill_dirs: Vec<SkillDirectory>) -> Vec<ParsedSkill> {
  let mut skills = Vec::new();
  for dir in skill_dirs {
    if let Some(skill) = parse_skill(dir) {
      skills.push(skill);
    }
  }
  skills
}

fn parse_skill(skill_dir: SkillDirectory) -> Option<ParsedSkill> {
  let skill_md_path = Path::new(&skill_dir.skill_path).join("SKILL.md");
  let content = fs::read_to_string(skill_md_path).ok()?;
  let frontmatter = extract_frontmatter(&content).ok()?;

  Some(ParsedSkill {
    location: skill_dir.location,
    skill_path: skill_dir.skill_path,
    metadata: frontmatter.metadata,
    content: frontmatter.markdown_content,
    raw_yaml: frontmatter.raw_yaml,
    supporting_files: skill_dir.supporting_files,
    validation_result: ValidationResult {
      valid: true,
      errors: Vec::new(),
      warnings: Vec::new(),
    },
    is_overridden: None,
  })
}

fn read_skill_metadata_from_path(skill_dir: &Path) -> Result<SkillMetadata, String> {
  let skill_md_path = skill_dir.join("SKILL.md");
  if !file_exists(&skill_md_path) {
    return Err(format!("SKILL.md not found in {}", skill_dir.display()));
  }
  let content = fs::read_to_string(&skill_md_path)
    .map_err(|e| format!("Failed to read {}: {}", skill_md_path.display(), e))?;
  let frontmatter = extract_frontmatter(&content)?;
  Ok(frontmatter.metadata)
}

struct FrontmatterResult {
  metadata: SkillMetadata,
  markdown_content: String,
  raw_yaml: String,
}

fn extract_frontmatter(content: &str) -> Result<FrontmatterResult, String> {
  let regex = Regex::new(r"(?s)^---\n(.*?)\n---").map_err(|e| e.to_string())?;
  let captures = regex
    .captures(content)
    .ok_or_else(|| "missing YAML frontmatter".to_string())?;
  let raw_yaml = captures.get(1).map(|m| m.as_str()).unwrap_or("").to_string();
  let markdown_content = content[captures.get(0).unwrap().end()..].trim().to_string();

  let parsed: Value = serde_yaml::from_str(&raw_yaml)
    .map_err(|error| format!("YAML parse failed: {error}"))?;
  let metadata = normalize_metadata(&parsed);

  Ok(FrontmatterResult {
    metadata,
    markdown_content,
    raw_yaml,
  })
}

fn normalize_metadata(value: &Value) -> SkillMetadata {
  let name = value_to_string(lookup(value, "name")).unwrap_or_default();
  let description = value_to_string(lookup(value, "description")).unwrap_or_default();
  let version = value_to_string(lookup(value, "version"));
  let license = value_to_string(lookup(value, "license"));
  let allowed_tools = normalize_string_array(
    lookup(value, "allowed-tools").or_else(|| lookup(value, "allowedTools")),
  );
  let model = value_to_string(lookup(value, "model"));
  let context = normalize_context(value_to_string(lookup(value, "context")));
  let agent = normalize_agent(value_to_string(lookup(value, "agent")));
  let hooks = normalize_hooks(lookup(value, "hooks"));
  let user_invocable = normalize_user_invocable(value);

  SkillMetadata {
    name,
    description,
    version,
    license,
    allowed_tools,
    model,
    context,
    agent,
    hooks,
    user_invocable,
  }
}

fn normalize_string_array(value: Option<&Value>) -> Option<Vec<String>> {
  match value {
    Some(Value::Sequence(items)) => {
      let values: Vec<String> = items
        .iter()
        .filter_map(|item| value_to_string(Some(item)))
        .collect();
      if values.is_empty() {
        None
      } else {
        Some(values)
      }
    }
    Some(Value::String(text)) => {
      let values: Vec<String> = text
        .split(',')
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
        .collect();
      if values.is_empty() {
        None
      } else {
        Some(values)
      }
    }
    _ => None,
  }
}

fn normalize_context(value: Option<String>) -> Option<String> {
  match value.as_deref() {
    Some("fork") | Some("inline") => value,
    _ => None,
  }
}

fn normalize_agent(value: Option<String>) -> Option<String> {
  match value.as_deref() {
    Some("Explore") | Some("Plan") | Some("general-purpose") => value,
    _ => None,
  }
}

fn normalize_hooks(value: Option<&Value>) -> Option<Hooks> {
  let Some(Value::Mapping(map)) = value else {
    return None;
  };

  let pre = value_to_string(map.get(&Value::String("PreToolUse".to_string())));
  let post = value_to_string(map.get(&Value::String("PostToolUse".to_string())));
  let stop = value_to_string(map.get(&Value::String("Stop".to_string())));

  if pre.is_none() && post.is_none() && stop.is_none() {
    None
  } else {
    Some(Hooks {
      pre_tool_use: pre,
      post_tool_use: post,
      stop,
    })
  }
}

fn normalize_user_invocable(value: &Value) -> Option<bool> {
  if let Some(value) = lookup(value, "user-invocable") {
    return Some(match value {
      Value::Bool(flag) => *flag,
      Value::Null => false,
      _ => true,
    });
  }
  if let Some(value) = lookup(value, "userInvocable") {
    return Some(match value {
      Value::Bool(flag) => *flag,
      Value::Null => false,
      _ => true,
    });
  }
  None
}

fn value_to_string(value: Option<&Value>) -> Option<String> {
  match value {
    Some(Value::String(text)) => Some(text.to_string()),
    Some(Value::Number(num)) => Some(num.to_string()),
    Some(Value::Bool(value)) => Some(value.to_string()),
    _ => None,
  }
}

fn lookup<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
  match value {
    Value::Mapping(map) => map.get(&Value::String(key.to_string())),
    _ => None,
  }
}

fn validate_all(mut skills: Vec<ParsedSkill>) -> Vec<ParsedSkill> {
  for skill in &mut skills {
    skill.validation_result = validate(skill);
  }
  skills
}

fn validate(skill: &ParsedSkill) -> ValidationResult {
  let mut errors = Vec::new();
  let mut warnings = Vec::new();

  validate_required_fields(skill, &mut errors);
  validate_name(skill, &mut errors);
  validate_description(skill, &mut errors, &mut warnings);
  validate_allowed_tools(skill, &mut warnings);
  validate_model(skill, &mut warnings);
  validate_context_agent(skill, &mut warnings);

  ValidationResult {
    valid: errors.is_empty(),
    errors,
    warnings,
  }
}

fn validate_required_fields(skill: &ParsedSkill, errors: &mut Vec<ValidationError>) {
  if skill.metadata.name.trim().is_empty() {
    errors.push(ValidationError {
      field: "name".to_string(),
      message: "缺少必需字段: name".to_string(),
      severity: "error".to_string(),
    });
  }

  if skill.metadata.description.trim().is_empty() {
    errors.push(ValidationError {
      field: "description".to_string(),
      message: "缺少必需字段: description".to_string(),
      severity: "error".to_string(),
    });
  }
}

fn validate_name(skill: &ParsedSkill, errors: &mut Vec<ValidationError>) {
  let name = skill.metadata.name.trim();
  if name.is_empty() {
    return;
  }

  let name_regex = Regex::new(r"^[a-z0-9-]+$").unwrap();
  if !name_regex.is_match(name) {
    errors.push(ValidationError {
      field: "name".to_string(),
      message: "name 必须只包含小写字母、数字和连字符".to_string(),
      severity: "error".to_string(),
    });
  }

  if name.len() > 64 {
    errors.push(ValidationError {
      field: "name".to_string(),
      message: "name 长度不能超过 64 个字符".to_string(),
      severity: "error".to_string(),
    });
  }

  if name.starts_with('-') || name.ends_with('-') {
    errors.push(ValidationError {
      field: "name".to_string(),
      message: "name 不能以连字符开头或结尾".to_string(),
      severity: "error".to_string(),
    });
  }
}

fn validate_description(
  skill: &ParsedSkill,
  errors: &mut Vec<ValidationError>,
  warnings: &mut Vec<ValidationError>,
) {
  let description = skill.metadata.description.trim();
  if description.is_empty() {
    return;
  }

  if description.len() > 1024 {
    errors.push(ValidationError {
      field: "description".to_string(),
      message: "description 长度不能超过 1024 个字符".to_string(),
      severity: "error".to_string(),
    });
  }

  if description.len() < 10 {
    warnings.push(ValidationError {
      field: "description".to_string(),
      message: "description 应该至少包含 10 个字符，以便 Claude 准确触发".to_string(),
      severity: "warning".to_string(),
    });
  }
}

fn validate_allowed_tools(skill: &ParsedSkill, warnings: &mut Vec<ValidationError>) {
  let Some(allowed) = &skill.metadata.allowed_tools else {
    return;
  };
  if allowed.is_empty() {
    return;
  }

  let unknown: Vec<String> = allowed
    .iter()
    .filter(|tool| !VALID_TOOLS.contains(&tool.as_str()))
    .cloned()
    .collect();

  if !unknown.is_empty() {
    warnings.push(ValidationError {
      field: "allowed-tools".to_string(),
      message: format!("未知的工具: {}", unknown.join(", ")),
      severity: "warning".to_string(),
    });
  }
}

fn validate_model(skill: &ParsedSkill, warnings: &mut Vec<ValidationError>) {
  let Some(model) = &skill.metadata.model else {
    return;
  };
  let known = VALID_MODELS.iter().any(|valid| model.starts_with(valid));
  if !known {
    warnings.push(ValidationError {
      field: "model".to_string(),
      message: format!("未知的模型版本: {model}"),
      severity: "warning".to_string(),
    });
  }
}

fn validate_context_agent(skill: &ParsedSkill, warnings: &mut Vec<ValidationError>) {
  let context = skill.metadata.context.as_deref();
  let agent = skill.metadata.agent.as_deref();

  if context == Some("fork") && agent.is_none() {
    warnings.push(ValidationError {
      field: "agent".to_string(),
      message: "当 context=fork 时，建议指定 agent 类型".to_string(),
      severity: "warning".to_string(),
    });
  }

  if agent.is_some() && context != Some("fork") {
    warnings.push(ValidationError {
      field: "context".to_string(),
      message: "指定了 agent 但 context 不是 fork".to_string(),
      severity: "warning".to_string(),
    });
  }
}

fn analyze_conflicts(skills: Vec<ParsedSkill>) -> (Vec<SkillConflict>, Vec<ParsedSkill>) {
  let mut skills_by_name: HashMap<String, Vec<usize>> = HashMap::new();
  let mut updated_skills = skills;

  for (index, skill) in updated_skills.iter().enumerate() {
    skills_by_name
      .entry(skill.metadata.name.clone())
      .or_default()
      .push(index);
  }

  let mut conflicts = Vec::new();

  for (name, indices) in skills_by_name {
    if indices.len() <= 1 {
      continue;
    }

    let mut sorted = indices.clone();
    sorted.sort_by_key(|index| updated_skills[*index].location.priority);

    for index in sorted.iter().skip(1) {
      updated_skills[*index].is_overridden = Some(true);
    }

    let instances = sorted
      .iter()
      .enumerate()
      .map(|(idx, skill_index)| {
        let skill = &updated_skills[*skill_index];
        ConflictInstance {
          location: skill.location.clone(),
          path: skill.skill_path.clone(),
          active: idx == 0,
        }
      })
      .collect::<Vec<_>>();

    let effective_skill = updated_skills[sorted[0]].skill_path.clone();
    conflicts.push(SkillConflict {
      name,
      instances,
      effective_skill,
    });
  }

  (conflicts, updated_skills)
}

fn generate_report(skills: &[ParsedSkill], conflicts: &[SkillConflict]) -> ScanReport {
  let summary = generate_statistics(skills, conflicts);
  let by_location = group_by_location(skills);
  let validation_issues = summarize_validation_issues(skills);
  let recommendations = generate_recommendations(skills, conflicts);

  ScanReport {
    summary,
    by_location,
    validation_issues,
    conflicts: conflicts.to_vec(),
    recommendations,
  }
}

fn generate_statistics(skills: &[ParsedSkill], conflicts: &[SkillConflict]) -> Statistics {
  let valid = skills
    .iter()
    .filter(|skill| skill.validation_result.valid)
    .count();
  let warnings = skills
    .iter()
    .filter(|skill| !skill.validation_result.warnings.is_empty())
    .count();
  let errors = skills
    .iter()
    .filter(|skill| !skill.validation_result.valid)
    .count();

  let mut stats = Statistics {
    total: skills.len(),
    valid,
    warnings,
    errors,
    by_location: LocationStats {
      enterprise: skills
        .iter()
        .filter(|skill| skill.location.location_type == "enterprise")
        .count(),
      personal: skills
        .iter()
        .filter(|skill| skill.location.location_type == "personal")
        .count(),
      project: skills
        .iter()
        .filter(|skill| skill.location.location_type == "project")
        .count(),
      nested: skills
        .iter()
        .filter(|skill| skill.location.location_type == "nested")
        .count(),
      plugin: skills
        .iter()
        .filter(|skill| skill.location.location_type == "plugin")
        .count(),
    },
    conflicts: conflicts.len(),
  };

  for skill in skills {
    match skill.location.location_type.as_str() {
      "repo" | "user" | "admin" | "system" => {
        stats.by_location.project += 1;
      }
      _ => {}
    }
  }

  stats
}

fn group_by_location(skills: &[ParsedSkill]) -> SkillsByLocation {
  let mut grouped = SkillsByLocation {
    enterprise: skills
      .iter()
      .filter(|skill| skill.location.location_type == "enterprise")
      .cloned()
      .collect(),
    personal: skills
      .iter()
      .filter(|skill| skill.location.location_type == "personal")
      .cloned()
      .collect(),
    project: skills
      .iter()
      .filter(|skill| skill.location.location_type == "project")
      .cloned()
      .collect(),
    nested: skills
      .iter()
      .filter(|skill| skill.location.location_type == "nested")
      .cloned()
      .collect(),
    plugin: skills
      .iter()
      .filter(|skill| skill.location.location_type == "plugin")
      .cloned()
      .collect(),
  };

  for skill in skills {
    match skill.location.location_type.as_str() {
      "repo" | "user" | "admin" | "system" => grouped.project.push(skill.clone()),
      _ => {}
    }
  }

  grouped
}

fn summarize_validation_issues(skills: &[ParsedSkill]) -> Vec<ValidationIssue> {
  skills
    .iter()
    .filter(|skill| {
      !skill.validation_result.errors.is_empty()
        || !skill.validation_result.warnings.is_empty()
    })
    .map(|skill| ValidationIssue {
      skill: skill.metadata.name.clone(),
      errors: skill.validation_result.errors.clone(),
      warnings: skill.validation_result.warnings.clone(),
    })
    .collect()
}

fn generate_recommendations(skills: &[ParsedSkill], conflicts: &[SkillConflict]) -> Vec<String> {
  let mut recommendations = Vec::new();
  let with_errors = skills
    .iter()
    .filter(|skill| !skill.validation_result.valid)
    .count();
  if with_errors > 0 {
    recommendations.push(format!("修复 {with_errors} 个配置错误的 Skills"));
  }

  if !conflicts.is_empty() {
    recommendations.push(format!(
      "解决 {} 个同名 Skills 冲突，考虑重命名或删除低优先级的 Skills",
      conflicts.len()
    ));
  }

  let short_descriptions = skills
    .iter()
    .filter(|skill| !skill.metadata.description.is_empty())
    .filter(|skill| skill.metadata.description.len() < 50)
    .count();
  if short_descriptions > 0 {
    recommendations.push(format!(
      "优化 {short_descriptions} 个 Skills 的 description，使其更详细以提高触发准确性"
    ));
  }

  recommendations
}

fn file_exists(path: &Path) -> bool {
  fs::metadata(path).map(|meta| meta.is_file()).unwrap_or(false)
}

fn directory_exists(path: &Path) -> bool {
  fs::metadata(path).map(|meta| meta.is_dir()).unwrap_or(false)
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::env;

  fn make_temp_dir(prefix: &str) -> PathBuf {
    let nanos = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap_or_default()
      .as_nanos();
    let dir = env::temp_dir().join(format!("{prefix}_{nanos}"));
    fs::create_dir_all(&dir).expect("create temp dir");
    dir
  }

  fn write_skill(dir: &Path, name: &str) {
    fs::create_dir_all(dir).expect("create skill dir");
    let content = format!(
      "---\nname: {name}\ndescription: test\n---\n\nTest skill"
    );
    fs::write(dir.join("SKILL.md"), content).expect("write SKILL.md");
  }

  #[test]
  fn replicate_to_codex_works() {
    let base = make_temp_dir("conduct_replicate_test");
    let home = base.join("home");
    fs::create_dir_all(&home).expect("create home dir");
    env::set_var("HOME", &home);
    env::set_var("CODEX_HOME", home.join(".codex"));
    env::set_current_dir(&base).expect("set current dir");

    let source = base.join("sample-skill");
    write_skill(&source, "TestSkill");

    let result = install_local_skill(
      "codex".to_string(),
      source.to_string_lossy().to_string(),
    );
    assert!(result.is_ok(), "replicate failed: {result:?}");

    let target = home
      .join(".codex")
      .join("skills")
      .join("sample-skill")
      .join("SKILL.md");
    assert!(target.exists(), "target skill missing");
  }
}
