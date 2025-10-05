use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu, CheckMenuItem, MenuItemKind},
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
            &MenuItem::with_id(app, "open_workspace", "打开工作区", true, Some("CmdOrCtrl+O"))?,
            &MenuItem::with_id(app, "save_workspace", "保存工作区", true, Some("CmdOrCtrl+S"))?,
            &MenuItem::with_id(app, "save_workspace_as", "工作区另存为", true, Some("CmdOrCtrl+Shift+S"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "import_config", "导入配置", true, None::<&str>)?,
            &MenuItem::with_id(app, "export_config", "导出配置", true, None::<&str>)?,
            &MenuItem::with_id(app, "export_logs", "导出日志", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some("退出"))?,
        ],
    )?;

    // 编辑菜单 - 只保留基础编辑功能（查找/替换已集成到协议编辑器中）
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
        ],
    )?;

    // 主题子菜单 - 使用 CheckMenuItem 显示选中状态
    let theme_submenu = Submenu::with_items(
        app,
        "主题风格",
        true,
        &[
            &CheckMenuItem::with_id(app, "theme_light", "浅色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "theme_dark", "深色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "theme_system", "跟随系统", true, true, None::<&str>)?, // 默认选中
        ],
    )?;

    // 主题色子菜单 - 使用 CheckMenuItem 显示选中状态
    let color_theme_submenu = Submenu::with_items(
        app,
        "主题色",
        true,
        &[
            &CheckMenuItem::with_id(app, "color_default", "默认", true, true, None::<&str>)?, // 默认选中
            &CheckMenuItem::with_id(app, "color_slate", "石板", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_gray", "灰色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_zinc", "锌色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_neutral", "中性", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_stone", "石色", true, false, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &CheckMenuItem::with_id(app, "color_red", "红色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_orange", "橙色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_amber", "琥珀", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_yellow", "黄色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_lime", "青柠", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_green", "绿色", true, false, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &CheckMenuItem::with_id(app, "color_emerald", "翡翠", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_teal", "青色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_cyan", "青蓝", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_sky", "天蓝", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_blue", "蓝色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_indigo", "靛蓝", true, false, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &CheckMenuItem::with_id(app, "color_violet", "紫罗兰", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_purple", "紫色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_fuchsia", "紫红", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_pink", "粉色", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "color_rose", "玫瑰", true, false, None::<&str>)?,
        ],
    )?;

    // 侧边栏子菜单 - 使用 CheckMenuItem 显示选中状态
    let sidebar_submenu = Submenu::with_items(
        app,
        "侧边栏",
        true,
        &[
            &CheckMenuItem::with_id(app, "sidebar_show", "显示", true, true, None::<&str>)?, // 默认显示
            &CheckMenuItem::with_id(app, "sidebar_hide", "隐藏", true, false, None::<&str>)?,
        ],
    )?;

    // 检视器子菜单 - 使用 CheckMenuItem 显示选中状态
    let inspector_submenu = Submenu::with_items(
        app,
        "检视器",
        true,
        &[
            &CheckMenuItem::with_id(app, "inspector_show", "显示", true, false, None::<&str>)?,
            &CheckMenuItem::with_id(app, "inspector_hide", "隐藏", true, true, None::<&str>)?, // 默认隐藏
        ],
    )?;

    // 状态栏子菜单 - 使用 CheckMenuItem 显示选中状态
    let statusbar_submenu = Submenu::with_items(
        app,
        "状态栏",
        true,
        &[
            &CheckMenuItem::with_id(app, "statusbar_show", "显示", true, true, None::<&str>)?, // 默认显示
            &CheckMenuItem::with_id(app, "statusbar_hide", "隐藏", true, false, None::<&str>)?,
        ],
    )?;

    // 视图菜单
    let view_menu = Submenu::with_items(
        app,
        "视图",
        true,
        &[
            &MenuItem::with_id(app, "command_palette", "快捷命令", true, Some("CmdOrCtrl+K"))?,
            &PredefinedMenuItem::separator(app)?,
            &theme_submenu,
            &color_theme_submenu,
            &PredefinedMenuItem::separator(app)?,
            &sidebar_submenu,
            &inspector_submenu,
            &statusbar_submenu,
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
            &MenuItem::with_id(app, "about", "关于 ProtoTool", true, None::<&str>)?,
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
        "open_workspace" => {
            let _ = app.emit("menu-action", "open_workspace");
        }
        "save_workspace" => {
            let _ = app.emit("menu-action", "save_workspace");
        }
        "save_workspace_as" => {
            let _ = app.emit("menu-action", "save_workspace_as");
        }
        "import_config" => {
            let _ = app.emit("menu-action", "import_config");
        }
        "export_config" => {
            let _ = app.emit("menu-action", "export_config");
        }
        "export_logs" => {
            let _ = app.emit("menu-action", "export_logs");
        }

        // 视图菜单
        "command_palette" => {
            let _ = app.emit("menu-action", "command_palette");
        }

        // 主题风格
        "theme_light" => {
            let _ = app.emit("menu-action", "theme_light");
        }
        "theme_dark" => {
            let _ = app.emit("menu-action", "theme_dark");
        }
        "theme_system" => {
            let _ = app.emit("menu-action", "theme_system");
        }

        // 主题色
        "color_default" => {
            let _ = app.emit("menu-action", "color_default");
        }
        "color_slate" => {
            let _ = app.emit("menu-action", "color_slate");
        }
        "color_gray" => {
            let _ = app.emit("menu-action", "color_gray");
        }
        "color_zinc" => {
            let _ = app.emit("menu-action", "color_zinc");
        }
        "color_neutral" => {
            let _ = app.emit("menu-action", "color_neutral");
        }
        "color_stone" => {
            let _ = app.emit("menu-action", "color_stone");
        }
        "color_red" => {
            let _ = app.emit("menu-action", "color_red");
        }
        "color_orange" => {
            let _ = app.emit("menu-action", "color_orange");
        }
        "color_amber" => {
            let _ = app.emit("menu-action", "color_amber");
        }
        "color_yellow" => {
            let _ = app.emit("menu-action", "color_yellow");
        }
        "color_lime" => {
            let _ = app.emit("menu-action", "color_lime");
        }
        "color_green" => {
            let _ = app.emit("menu-action", "color_green");
        }
        "color_emerald" => {
            let _ = app.emit("menu-action", "color_emerald");
        }
        "color_teal" => {
            let _ = app.emit("menu-action", "color_teal");
        }
        "color_cyan" => {
            let _ = app.emit("menu-action", "color_cyan");
        }
        "color_sky" => {
            let _ = app.emit("menu-action", "color_sky");
        }
        "color_blue" => {
            let _ = app.emit("menu-action", "color_blue");
        }
        "color_indigo" => {
            let _ = app.emit("menu-action", "color_indigo");
        }
        "color_violet" => {
            let _ = app.emit("menu-action", "color_violet");
        }
        "color_purple" => {
            let _ = app.emit("menu-action", "color_purple");
        }
        "color_fuchsia" => {
            let _ = app.emit("menu-action", "color_fuchsia");
        }
        "color_pink" => {
            let _ = app.emit("menu-action", "color_pink");
        }
        "color_rose" => {
            let _ = app.emit("menu-action", "color_rose");
        }

        // 侧边栏子菜单
        "sidebar_show" => {
            let _ = app.emit("menu-action", "sidebar_show");
        }
        "sidebar_hide" => {
            let _ = app.emit("menu-action", "sidebar_hide");
        }

        // 检视器子菜单
        "inspector_show" => {
            let _ = app.emit("menu-action", "inspector_show");
        }
        "inspector_hide" => {
            let _ = app.emit("menu-action", "inspector_hide");
        }

        // 状态栏子菜单
        "statusbar_show" => {
            let _ = app.emit("menu-action", "statusbar_show");
        }
        "statusbar_hide" => {
            let _ = app.emit("menu-action", "statusbar_hide");
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
        "about" => {
            let _ = app.emit("menu-action", "about");
        }

        _ => {
            println!("Unhandled menu event: {}", event);
        }
    }
}

// 递归搜索并更新菜单项选中状态的辅助函数
fn find_and_update_check_item<R: Runtime>(
    item: &MenuItemKind<R>,
    item_id: &str,
    checked: bool,
) -> bool {
    match item {
        MenuItemKind::Check(check_item) => {
            if check_item.id().as_ref() == item_id {
                if let Err(e) = check_item.set_checked(checked) {
                    println!("Error setting checked state for '{}': {}", item_id, e);
                } else {
                    println!("Updated menu item '{}' checked state to: {}", item_id, checked);
                }
                return true;
            }
            false
        }
        MenuItemKind::Submenu(submenu) => {
            // 递归搜索子菜单中的项
            if let Ok(items) = submenu.items() {
                for sub_item in items {
                    if find_and_update_check_item(&sub_item, item_id, checked) {
                        return true;
                    }
                }
            }
            false
        }
        _ => false,
    }
}

// 更新菜单项选中状态的辅助函数
pub fn update_menu_check_state<R: Runtime>(
    app: &AppHandle<R>,
    item_id: &str,
    checked: bool,
) -> tauri::Result<()> {
    if let Some(menu) = app.menu() {
        // 遍历所有顶级菜单项
        for item in menu.items()? {
            if find_and_update_check_item(&item, item_id, checked) {
                return Ok(());
            }
        }
        println!("Warning: Menu item '{}' not found", item_id);
    } else {
        println!("Warning: Menu not found");
    }
    Ok(())
}

// 更新主题风格菜单的选中状态
pub fn update_theme_menu<R: Runtime>(app: &AppHandle<R>, theme: &str) -> tauri::Result<()> {
    println!("Updating theme menu to: {}", theme);
    update_menu_check_state(app, "theme_light", theme == "light")?;
    update_menu_check_state(app, "theme_dark", theme == "dark")?;
    update_menu_check_state(app, "theme_system", theme == "system")?;
    Ok(())
}

// 更新侧边栏菜单的选中状态
pub fn update_sidebar_menu<R: Runtime>(app: &AppHandle<R>, visible: bool) -> tauri::Result<()> {
    update_menu_check_state(app, "sidebar_show", visible)?;
    update_menu_check_state(app, "sidebar_hide", !visible)?;
    Ok(())
}

// 更新检视器菜单的选中状态
pub fn update_inspector_menu<R: Runtime>(app: &AppHandle<R>, visible: bool) -> tauri::Result<()> {
    update_menu_check_state(app, "inspector_show", visible)?;
    update_menu_check_state(app, "inspector_hide", !visible)?;
    Ok(())
}

// 更新状态栏菜单的选中状态
pub fn update_statusbar_menu<R: Runtime>(app: &AppHandle<R>, visible: bool) -> tauri::Result<()> {
    update_menu_check_state(app, "statusbar_show", visible)?;
    update_menu_check_state(app, "statusbar_hide", !visible)?;
    Ok(())
}

// 更新主题色菜单的选中状态
pub fn update_color_theme_menu<R: Runtime>(app: &AppHandle<R>, color: &str) -> tauri::Result<()> {
    println!("Updating color theme menu to: {}", color);
    // 所有主题色选项
    let colors = [
        "default", "slate", "gray", "zinc", "neutral", "stone",
        "red", "orange", "amber", "yellow", "lime", "green",
        "emerald", "teal", "cyan", "sky", "blue", "indigo",
        "violet", "purple", "fuchsia", "pink", "rose"
    ];

    // 取消所有选中，然后选中当前主题色
    for c in colors.iter() {
        let should_check = *c == color;
        update_menu_check_state(app, &format!("color_{}", c), should_check)?;
    }
    Ok(())
}
