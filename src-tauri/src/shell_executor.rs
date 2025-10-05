// Shell Executor Module
// Backend command execution service

use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio, ChildStdin};
use std::io::{Write, BufRead, BufReader};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::thread;
use tauri::{State, AppHandle, Emitter};
use encoding_rs::GBK;

/// Decode command output based on OS encoding
/// Windows uses GBK encoding, Unix uses UTF-8
fn decode_output(bytes: &[u8]) -> String {
    if cfg!(target_os = "windows") {
        // Windows command line uses GBK encoding (Chinese Windows)
        let (cow, _encoding, _had_errors) = GBK.decode(bytes);
        cow.to_string()
    } else {
        // Unix systems use UTF-8
        String::from_utf8_lossy(bytes).to_string()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellExecutionResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
    pub exit_code: i32,
    pub execution_time: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellContext {
    pub cwd: Option<String>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveSessionInfo {
    pub id: String,
    pub command: String,
    pub args: Vec<String>,
    pub pid: u32,
    pub state: String,
}

/// Interactive session data
struct SessionData {
    info: InteractiveSessionInfo,
    stdin: Option<ChildStdin>,
}

// Interactive session manager
#[derive(Clone)]
pub struct InteractiveSessionManager {
    sessions: Arc<Mutex<HashMap<String, SessionData>>>,
}

impl InteractiveSessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn add_session(&self, id: String, info: InteractiveSessionInfo, stdin: Option<ChildStdin>) {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.insert(id, SessionData { info, stdin });
    }

    pub fn get_session(&self, id: &str) -> Option<InteractiveSessionInfo> {
        let sessions = self.sessions.lock().unwrap();
        sessions.get(id).map(|data| data.info.clone())
    }

    pub fn remove_session(&self, id: &str) {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.remove(id);
    }

    pub fn list_sessions(&self) -> Vec<InteractiveSessionInfo> {
        let sessions = self.sessions.lock().unwrap();
        sessions.values().map(|data| data.info.clone()).collect()
    }

    pub fn write_to_session(&self, id: &str, data: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        if let Some(session_data) = sessions.get_mut(id) {
            if let Some(stdin) = &mut session_data.stdin {
                stdin.write_all(data.as_bytes())
                    .map_err(|e| format!("Failed to write to stdin: {}", e))?;
                stdin.flush()
                    .map_err(|e| format!("Failed to flush stdin: {}", e))?;
                Ok(())
            } else {
                Err("Session stdin not available".to_string())
            }
        } else {
            Err(format!("Session {} not found", id))
        }
    }
}

/// Execute a system command
#[tauri::command]
pub async fn execute_system_command(
    command: String,
    args: Vec<String>,
    context: ShellContext,
) -> Result<ShellExecutionResult, String> {
    let start_time = std::time::Instant::now();

    // Determine shell based on OS
    let (shell, shell_arg) = if cfg!(target_os = "windows") {
        ("cmd", "/C")
    } else {
        ("sh", "-c")
    };

    // Build full command string
    let full_command = if args.is_empty() {
        command.clone()
    } else {
        format!("{} {}", command, args.join(" "))
    };

    println!("[ShellExecutor] Executing: {} {} {}", shell, shell_arg, full_command);

    // Create command
    let mut cmd = Command::new(shell);
    cmd.arg(shell_arg).arg(&full_command);

    // Set working directory
    if let Some(cwd) = context.cwd {
        cmd.current_dir(cwd);
    }

    // Set environment variables
    if let Some(env) = context.env {
        for (key, value) in env {
            cmd.env(key, value);
        }
    }

    // Execute command
    match cmd.output() {
        Ok(output) => {
            let stdout = decode_output(&output.stdout);
            let stderr = decode_output(&output.stderr);
            let exit_code = output.status.code().unwrap_or(-1);
            let execution_time = start_time.elapsed().as_millis() as u64;

            let combined_output = if !stdout.is_empty() {
                stdout
            } else if !stderr.is_empty() {
                stderr.clone()
            } else {
                String::new()
            };

            Ok(ShellExecutionResult {
                success: output.status.success(),
                output: combined_output,
                error: if !stderr.is_empty() && !output.status.success() {
                    Some(stderr)
                } else {
                    None
                },
                exit_code,
                execution_time,
            })
        }
        Err(e) => {
            let execution_time = start_time.elapsed().as_millis() as u64;
            Ok(ShellExecutionResult {
                success: false,
                output: String::new(),
                error: Some(format!("Failed to execute command: {}", e)),
                exit_code: -1,
                execution_time,
            })
        }
    }
}

/// Execute command with pipeline support
#[tauri::command]
pub async fn execute_pipeline(
    commands: Vec<(String, Vec<String>)>,
    context: ShellContext,
) -> Result<ShellExecutionResult, String> {
    let start_time = std::time::Instant::now();

    if commands.is_empty() {
        return Ok(ShellExecutionResult {
            success: false,
            output: String::new(),
            error: Some("Empty pipeline".to_string()),
            exit_code: 1,
            execution_time: 0,
        });
    }

    // For now, execute commands sequentially
    // TODO: Implement true piping with stdin/stdout connection
    let mut last_output = String::new();
    let mut last_exit_code = 0;

    for (i, (command, args)) in commands.iter().enumerate() {
        println!("[Pipeline] Executing command {}/{}: {} {:?}", i + 1, commands.len(), command, args);

        let result = execute_system_command(
            command.clone(),
            args.clone(),
            context.clone(),
        ).await?;

        if !result.success {
            let execution_time = start_time.elapsed().as_millis() as u64;
            return Ok(ShellExecutionResult {
                success: false,
                output: last_output,
                error: Some(format!("Pipeline failed at command {}: {}", i + 1, result.error.unwrap_or_default())),
                exit_code: result.exit_code,
                execution_time,
            });
        }

        last_output = result.output;
        last_exit_code = result.exit_code;
    }

    let execution_time = start_time.elapsed().as_millis() as u64;
    Ok(ShellExecutionResult {
        success: last_exit_code == 0,
        output: last_output,
        error: None,
        exit_code: last_exit_code,
        execution_time,
    })
}

/// Read file content
#[tauri::command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))
}

/// Write file content
#[tauri::command]
pub async fn write_file_content(
    path: String,
    content: String,
    append: bool,
) -> Result<(), String> {
    use std::fs::OpenOptions;

    let mut options = OpenOptions::new();
    if append {
        options.append(true).create(true);
    } else {
        options.write(true).create(true).truncate(true);
    }

    let mut file = options.open(&path)
        .map_err(|e| format!("Failed to open file {}: {}", path, e))?;

    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write to file {}: {}", path, e))?;

    Ok(())
}

/// Start interactive session
#[tauri::command]
pub async fn start_interactive_session(
    session_id: String,
    command: String,
    args: Vec<String>,
    context: ShellContext,
    app_handle: AppHandle,
    session_manager: State<'_, InteractiveSessionManager>,
) -> Result<InteractiveSessionInfo, String> {
    println!("[InteractiveSession] Starting session {}: {} {:?}", session_id, command, args);

    // Create command
    let mut cmd = Command::new(&command);
    cmd.args(&args);

    // Set working directory
    if let Some(cwd) = context.cwd {
        cmd.current_dir(cwd);
    }

    // Set environment variables
    if let Some(env) = context.env {
        for (key, value) in env {
            cmd.env(key, value);
        }
    }

    // Configure stdio
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // Spawn process
    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    let pid = child.id();

    // Take stdin, stdout, stderr
    let stdin = child.stdin.take();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let session_info = InteractiveSessionInfo {
        id: session_id.clone(),
        command: command.clone(),
        args: args.clone(),
        pid,
        state: "running".to_string(),
    };

    // Store session info with stdin
    session_manager.add_session(session_id.clone(), session_info.clone(), stdin);

    // Handle stdout in separate thread
    if let Some(stdout) = stdout {
        let session_id_clone = session_id.clone();
        let app_handle_clone = app_handle.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        let event_name = format!("interactive-session-{}-stdout", session_id_clone);
                        let _ = app_handle_clone.emit(&event_name, line);
                    }
                    Err(e) => {
                        eprintln!("[InteractiveSession] Error reading stdout: {}", e);
                        break;
                    }
                }
            }
        });
    }

    // Handle stderr in separate thread
    if let Some(stderr) = stderr {
        let session_id_clone = session_id.clone();
        let app_handle_clone = app_handle.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        let event_name = format!("interactive-session-{}-stderr", session_id_clone);
                        let _ = app_handle_clone.emit(&event_name, line);
                    }
                    Err(e) => {
                        eprintln!("[InteractiveSession] Error reading stderr: {}", e);
                        break;
                    }
                }
            }
        });
    }

    // Wait for process to exit in separate thread
    let session_id_clone = session_id.clone();
    let app_handle_clone = app_handle.clone();
    let session_manager_clone: InteractiveSessionManager = (*session_manager.inner()).clone();
    thread::spawn(move || {
        match child.wait() {
            Ok(status) => {
                let exit_code = status.code().unwrap_or(-1);
                println!("[InteractiveSession] Session {} exited with code: {}", session_id_clone, exit_code);

                let event_name = format!("interactive-session-{}-close", session_id_clone);
                let _ = app_handle_clone.emit(&event_name, exit_code);

                // Remove session
                session_manager_clone.remove_session(&session_id_clone);
            }
            Err(e) => {
                eprintln!("[InteractiveSession] Error waiting for process: {}", e);
            }
        }
    });

    Ok(session_info)
}

/// Write to interactive session stdin
#[tauri::command]
pub async fn write_interactive_session(
    session_id: String,
    data: String,
    session_manager: State<'_, InteractiveSessionManager>,
) -> Result<(), String> {
    session_manager.write_to_session(&session_id, &data)
}

/// Get interactive session info
#[tauri::command]
pub async fn get_interactive_session(
    session_id: String,
    session_manager: State<'_, InteractiveSessionManager>,
) -> Result<Option<InteractiveSessionInfo>, String> {
    Ok(session_manager.get_session(&session_id))
}

/// List all interactive sessions
#[tauri::command]
pub async fn list_interactive_sessions(
    session_manager: State<'_, InteractiveSessionManager>,
) -> Result<Vec<InteractiveSessionInfo>, String> {
    Ok(session_manager.list_sessions())
}

/// Kill interactive session
#[tauri::command]
pub async fn kill_interactive_session(
    session_id: String,
    session_manager: State<'_, InteractiveSessionManager>,
) -> Result<(), String> {
    if let Some(session) = session_manager.get_session(&session_id) {
        // Kill process by PID
        #[cfg(target_os = "windows")]
        {
            Command::new("taskkill")
                .args(&["/F", "/PID", &session.pid.to_string()])
                .output()
                .map_err(|e| format!("Failed to kill process: {}", e))?;
        }

        #[cfg(not(target_os = "windows"))]
        {
            Command::new("kill")
                .args(&["-9", &session.pid.to_string()])
                .output()
                .map_err(|e| format!("Failed to kill process: {}", e))?;
        }

        session_manager.remove_session(&session_id);
        Ok(())
    } else {
        Err(format!("Session {} not found", session_id))
    }
}

