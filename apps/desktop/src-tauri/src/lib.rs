//! The Orbit desktop application (library crate).
//!
//! Tauri 2 splits an app into a thin `main.rs` binary and this library so the
//! same code can target desktop and (in future) mobile. [`run`] wires up the
//! plugins, the local database, the system tray and the command handlers, then
//! hands control to the webview.

mod commands;
mod state;
mod terminal;

use state::AppState;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, SubmenuBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

/// Build and run the Orbit desktop application.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init());

    // The updater and process (relaunch) plugins are desktop-only.
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        .manage(AppState::new())
        .manage(terminal::Terminals::new())
        .setup(|app| {
            attach_store(app.handle());
            install_menu(app.handle())?;
            install_tray(app.handle())?;
            Ok(())
        })
        // ^ setup returns Result<(), Box<dyn Error>>; the helpers below use it.
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "palette" {
                let _ = app.emit("menu:command-palette", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_folder,
            commands::list_projects,
            commands::add_project,
            commands::remove_project,
            commands::set_pinned,
            commands::open_project,
            commands::project_detail,
            commands::project_health,
            commands::project_deps,
            commands::git_info,
            commands::git_status,
            commands::git_stage,
            commands::git_unstage,
            commands::git_diff,
            commands::git_commit,
            commands::git_log,
            commands::git_branches,
            commands::git_switch_branch,
            commands::git_create_branch,
            commands::git_fetch,
            commands::git_pull,
            commands::git_push,
            commands::git_stash_save,
            commands::git_stash_list,
            commands::git_stash_pop,
            commands::git_stash_drop,
            commands::docker_available,
            commands::docker_containers,
            commands::docker_images,
            commands::docker_action,
            commands::assess_command,
            commands::run_command,
            commands::generate_profile,
            commands::activity_report,
            commands::get_setting,
            commands::set_setting,
            commands::open_terminal,
            commands::app_version,
            commands::get_workspace,
            commands::save_workspace,
            commands::run_task,
            commands::env_report,
            commands::terminal_shells,
            commands::terminal_open,
            commands::terminal_write,
            commands::terminal_resize,
            commands::terminal_close,
            commands::read_dir,
            commands::read_file,
            commands::write_file,
            commands::list_files,
            commands::search_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Orbit application");
}

/// Open (or create) the local SQLite database in the app data directory and
/// stash it in [`AppState`]. Failure is non-fatal: the UI still loads and
/// storage-backed commands surface a clear error.
fn attach_store(app: &tauri::AppHandle) {
    let Ok(data_dir) = app.path().app_data_dir() else {
        eprintln!("orbit: could not resolve app data directory");
        return;
    };
    if let Err(err) = std::fs::create_dir_all(&data_dir) {
        eprintln!("orbit: could not create data directory: {err}");
        return;
    }
    let db_path = data_dir.join("orbit.db");
    match orbit_core::store::Store::open(&db_path) {
        Ok(store) => {
            if let Ok(mut guard) = app.state::<AppState>().store.lock() {
                *guard = Some(store);
            }
        }
        Err(err) => eprintln!("orbit: could not open database at {db_path:?}: {err}"),
    }
}

type SetupResult = Result<(), Box<dyn std::error::Error>>;

/// Install the native application menu bar (mostly visible on macOS).
fn install_menu(app: &tauri::AppHandle) -> SetupResult {
    let palette = MenuItem::with_id(app, "palette", "Command Palette", true, Some("CmdOrCtrl+K"))?;

    let app_menu = SubmenuBuilder::new(app, "Orbit")
        .about(None)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let go_menu = SubmenuBuilder::new(app, "Go").item(&palette).build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .fullscreen()
        .build()?;

    let menu = Menu::with_items(app, &[&app_menu, &edit_menu, &go_menu, &window_menu])?;
    app.set_menu(menu)?;
    Ok(())
}

/// Install the system tray icon and its menu.
fn install_tray(app: &tauri::AppHandle) -> SetupResult {
    let show = MenuItem::with_id(app, "show", "Open Orbit", true, None::<&str>)?;
    let palette = MenuItem::with_id(app, "palette", "Command Palette", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Orbit", true, None::<&str>)?;
    let tray_menu = Menu::with_items(
        app,
        &[&show, &palette, &PredefinedMenuItem::separator(app)?, &quit],
    )?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("no default window icon is configured")?;

    TrayIconBuilder::with_id("orbit-tray")
        .icon(icon)
        .tooltip("Orbit")
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => reveal_main_window(app),
            "palette" => {
                reveal_main_window(app);
                let _ = app.emit("menu:command-palette", ());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                reveal_main_window(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

/// Bring the main window to the front, showing it if it was hidden.
fn reveal_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
