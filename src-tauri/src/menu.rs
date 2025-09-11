use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Manager, Runtime,
};

pub fn create_app_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    // 文件菜单
    let file_menu = Submenu::with_items(
        app,
        "文件",
        true,
        &[
            &MenuItem::with_id(app, "new_session", "新建会话", true, Some("CmdOrCtrl+N"))?,
            &MenuItem::with_id(app, "new_workspace", "新建工作区", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "open", "打开", true, Some("CmdOrCtrl+O"))?,
            &MenuItem::with_id(app, "save", "保存", true, Some("CmdOrCtrl+S"))?,
            &MenuItem::with_id(app, "save_as", "另存为", true, Some("CmdOrCtrl+Shift+S"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "import_config", "导入配置", true, None::<&str>)?,
            &MenuItem::with_id(app, "export_config", "导出配置", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some("退出"))?,
        ],
    )?;

    // 编辑菜单
    let edit_menu = Submenu::with_items(
        app,
        "编辑",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("撤销"))?,
            &PredefinedMenuItem::redo(app, Some("重做"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, Some("剪切"))?,
            &PredefinedMenuItem::copy(app, Some("复制"))?,
            &PredefinedMenuItem::paste(app, Some("粘贴"))?,
            &PredefinedMenuItem::select_all(app, Some("全选"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "find", "查找", true, Some("CmdOrCtrl+F"))?,
            &MenuItem::with_id(app, "replace", "替换", true, Some("CmdOrCtrl+H"))?,
        ],
    )?;

    // 视图菜单
    let view_menu = Submenu::with_items(
        app,
        "视图",
        true,
        &[
            &MenuItem::with_id(app, "command_palette", "命令面板", true, Some("CmdOrCtrl+K"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "toggle_dark_mode", "切换深色模式", true, Some("CmdOrCtrl+J"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "show_sidebar", "显示侧边栏", true, None::<&str>)?,
            &MenuItem::with_id(app, "show_inspector", "显示检视器", true, None::<&str>)?,
            &MenuItem::with_id(app, "show_status_bar", "显示状态栏", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "zoom_in", "放大", true, Some("CmdOrCtrl+Plus"))?,
            &MenuItem::with_id(app, "zoom_out", "缩小", true, Some("CmdOrCtrl+-"))?,
            &MenuItem::with_id(app, "zoom_reset", "重置缩放", true, Some("CmdOrCtrl+0"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "fullscreen", "全屏", true, Some("F11"))?,
        ],
    )?;

    // 会话菜单
    let session_menu = Submenu::with_items(
        app,
        "会话",
        true,
        &[
            &MenuItem::with_id(app, "connect", "连接", true, Some("CmdOrCtrl+Enter"))?,
            &MenuItem::with_id(app, "disconnect", "断开连接", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "send_builder", "发送构建器", true, Some("CmdOrCtrl+B"))?,
            &MenuItem::with_id(app, "start_capture", "开始抓包", true, Some("CmdOrCtrl+R"))?,
            &MenuItem::with_id(app, "stop_capture", "停止抓包", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "apply_rule", "应用规则", true, None::<&str>)?,
            &MenuItem::with_id(app, "bind_protocol", "绑定协议", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "snapshot", "快照和标记", true, None::<&str>)?,
            &MenuItem::with_id(app, "open_playback", "在回放中打开", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "session_settings", "会话设置", true, None::<&str>)?,
        ],
    )?;

    // 工具菜单
    let tools_menu = Submenu::with_items(
        app,
        "工具",
        true,
        &[
            &MenuItem::with_id(app, "open_toolbox", "打开工具箱", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "message_generator", "报文生成器", true, None::<&str>)?,
            &MenuItem::with_id(app, "protocol_parser", "协议解析器", true, None::<&str>)?,
            &MenuItem::with_id(app, "log_extractor", "日志提取器", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "hex_converter", "Hex ↔ 二进制", true, None::<&str>)?,
            &MenuItem::with_id(app, "base64_converter", "Base64 编解码", true, None::<&str>)?,
            &MenuItem::with_id(app, "crc_suite", "CRC 校验套件", true, None::<&str>)?,
            &MenuItem::with_id(app, "timestamp_suite", "时间戳套件", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "ai_assistant", "AI 助手", true, None::<&str>)?,
        ],
    )?;

    // 窗口菜单
    let window_menu = Submenu::with_items(
        app,
        "窗口",
        true,
        &[
            &PredefinedMenuItem::minimize(app, Some("最小化"))?,
            &MenuItem::with_id(app, "maximize", "最大化", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "next_tab", "下一个标签", true, Some("CmdOrCtrl+Tab"))?,
            &MenuItem::with_id(app, "prev_tab", "上一个标签", true, Some("CmdOrCtrl+Shift+Tab"))?,
        ],
    )?;

    // 帮助菜单
    let help_menu = Submenu::with_items(
        app,
        "帮助",
        true,
        &[
            &MenuItem::with_id(app, "user_guide", "用户指南", true, None::<&str>)?,
            &MenuItem::with_id(app, "keyboard_shortcuts", "键盘快捷键", true, None::<&str>)?,
            &MenuItem::with_id(app, "release_notes", "版本说明", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "report_issue", "报告问题", true, None::<&str>)?,
            &MenuItem::with_id(app, "check_updates", "检查更新", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::about(app, Some("关于 ProtoTool"), None)?,
        ],
    )?;

    // 创建主菜单
    let menu = Menu::with_items(
        app,
        &[
            &file_menu,
            &edit_menu,
            &view_menu,
            &session_menu,
            &tools_menu,
            &window_menu,
            &help_menu,
        ],
    )?;

    Ok(menu)
}

pub fn handle_menu_event(app: &AppHandle, event: &str) {
    match event {
        // 文件菜单
        "new_session" => {
            let _ = app.emit("menu-action", "new_session");
        }
        "new_workspace" => {
            let _ = app.emit("menu-action", "new_workspace");
        }
        "open" => {
            let _ = app.emit("menu-action", "open");
        }
        "save" => {
            let _ = app.emit("menu-action", "save");
        }
        "save_as" => {
            let _ = app.emit("menu-action", "save_as");
        }
        "import_config" => {
            let _ = app.emit("menu-action", "import_config");
        }
        "export_config" => {
            let _ = app.emit("menu-action", "export_config");
        }

        // 编辑菜单
        "find" => {
            let _ = app.emit("menu-action", "find");
        }
        "replace" => {
            let _ = app.emit("menu-action", "replace");
        }

        // 视图菜单
        "command_palette" => {
            let _ = app.emit("menu-action", "command_palette");
        }
        "toggle_dark_mode" => {
            let _ = app.emit("menu-action", "toggle_dark_mode");
        }
        "show_sidebar" => {
            let _ = app.emit("menu-action", "show_sidebar");
        }
        "show_inspector" => {
            let _ = app.emit("menu-action", "show_inspector");
        }
        "show_status_bar" => {
            let _ = app.emit("menu-action", "show_status_bar");
        }
        "zoom_in" => {
            let _ = app.emit("menu-action", "zoom_in");
        }
        "zoom_out" => {
            let _ = app.emit("menu-action", "zoom_out");
        }
        "zoom_reset" => {
            let _ = app.emit("menu-action", "zoom_reset");
        }
        "fullscreen" => {
            let _ = app.emit("menu-action", "fullscreen");
        }

        // 会话菜单
        "connect" => {
            let _ = app.emit("menu-action", "connect");
        }
        "disconnect" => {
            let _ = app.emit("menu-action", "disconnect");
        }
        "send_builder" => {
            let _ = app.emit("menu-action", "send_builder");
        }
        "start_capture" => {
            let _ = app.emit("menu-action", "start_capture");
        }
        "stop_capture" => {
            let _ = app.emit("menu-action", "stop_capture");
        }
        "apply_rule" => {
            let _ = app.emit("menu-action", "apply_rule");
        }
        "bind_protocol" => {
            let _ = app.emit("menu-action", "bind_protocol");
        }
        "snapshot" => {
            let _ = app.emit("menu-action", "snapshot");
        }
        "open_playback" => {
            let _ = app.emit("menu-action", "open_playback");
        }
        "session_settings" => {
            let _ = app.emit("menu-action", "session_settings");
        }

        // 工具菜单
        "open_toolbox" => {
            let _ = app.emit("menu-action", "open_toolbox");
        }
        "message_generator" => {
            let _ = app.emit("menu-action", "message_generator");
        }
        "protocol_parser" => {
            let _ = app.emit("menu-action", "protocol_parser");
        }
        "log_extractor" => {
            let _ = app.emit("menu-action", "log_extractor");
        }
        "hex_converter" => {
            let _ = app.emit("menu-action", "hex_converter");
        }
        "base64_converter" => {
            let _ = app.emit("menu-action", "base64_converter");
        }
        "crc_suite" => {
            let _ = app.emit("menu-action", "crc_suite");
        }
        "timestamp_suite" => {
            let _ = app.emit("menu-action", "timestamp_suite");
        }
        "ai_assistant" => {
            let _ = app.emit("menu-action", "ai_assistant");
        }

        // 窗口菜单
        "maximize" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.maximize();
            }
        }
        "next_tab" => {
            let _ = app.emit("menu-action", "next_tab");
        }
        "prev_tab" => {
            let _ = app.emit("menu-action", "prev_tab");
        }

        // 帮助菜单
        "user_guide" => {
            let _ = app.emit("menu-action", "user_guide");
        }
        "keyboard_shortcuts" => {
            let _ = app.emit("menu-action", "keyboard_shortcuts");
        }
        "release_notes" => {
            let _ = app.emit("menu-action", "release_notes");
        }
        "report_issue" => {
            let _ = app.emit("menu-action", "report_issue");
        }
        "check_updates" => {
            let _ = app.emit("menu-action", "check_updates");
        }

        _ => {
            println!("Unhandled menu event: {}", event);
        }
    }
}
