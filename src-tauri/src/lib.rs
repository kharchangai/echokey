use std::{sync::Mutex, thread, time::Duration};

use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};

struct RecordingState {
    is_recording: Mutex<bool>,
}

#[tauri::command]
fn paste_text(text: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;

    clipboard
        .set_text(text)
        .map_err(|error| error.to_string())?;

    thread::sleep(Duration::from_millis(150));

    let mut enigo = Enigo::new(&Settings::default()).map_err(|error| error.to_string())?;

    enigo
        .key(Key::Shift, Direction::Press)
        .map_err(|error| error.to_string())?;

    enigo
        .key(Key::Insert, Direction::Click)
        .map_err(|error| error.to_string())?;

    enigo
        .key(Key::Shift, Direction::Release)
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn paste_text_with_ctrl_v(text: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;

    clipboard
        .set_text(text)
        .map_err(|error| error.to_string())?;

    thread::sleep(Duration::from_millis(150));

    let mut enigo = Enigo::new(&Settings::default()).map_err(|error| error.to_string())?;

    enigo
        .key(Key::Control, Direction::Press)
        .map_err(|error| error.to_string())?;

    enigo
        .key(Key::Unicode('v'), Direction::Click)
        .map_err(|error| error.to_string())?;

    enigo
        .key(Key::Control, Direction::Release)
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn set_recording_state(app: tauri::AppHandle, is_recording: bool) -> Result<(), String> {
    let state = app.state::<RecordingState>();

    let mut recording = state
        .is_recording
        .lock()
        .map_err(|error| error.to_string())?;

    *recording = is_recording;

    Ok(())
}

fn position_overlay_window(window: &tauri::WebviewWindow, width: f64, height: f64) {
    if let Some(monitor) = window.current_monitor().ok().flatten() {
        let monitor_size = monitor.size();
        let monitor_position = monitor.position();
        let scale_factor = monitor.scale_factor();

        let screen_width = monitor_size.width as f64 / scale_factor;
        let screen_height = monitor_size.height as f64 / scale_factor;

        let screen_x = monitor_position.x as f64 / scale_factor;
        let screen_y = monitor_position.y as f64 / scale_factor;

        let bottom_offset = 86.0;

        let x = screen_x + (screen_width - width) / 2.0;
        let y = screen_y + screen_height - height - bottom_offset;

        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
            x,
            y,
        }));
    }
}

// STT Overlay Controls
fn show_overlay_window(app: &tauri::AppHandle) {
    let width = 520.0;
    let height = 88.0;

    if let Some(window) = app.get_webview_window("overlay") {
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width,
            height,
        }));

        position_overlay_window(&window, width, height);

        let _ = window.set_always_on_top(true);
        let _ = window.show();

        return;
    }

    let overlay = WebviewWindowBuilder::new(
        app,
        "overlay",
        WebviewUrl::App("index.html?window=overlay".into()),
    )
    .title("EchoKey")
    .inner_size(width, height)
    .min_inner_size(width, height)
    .max_inner_size(width, height)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(true)
    .focused(false)
    .build();

    if let Ok(window) = overlay {
        position_overlay_window(&window, width, height);
        let _ = window.set_always_on_top(true);
    }
}

fn hide_overlay_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("overlay") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn hide_overlay(app: tauri::AppHandle) -> Result<(), String> {
    hide_overlay_window(&app);
    Ok(())
}

// TTS Overlay Controls
fn show_tts_overlay_window(app: &tauri::AppHandle) {
    let width = 520.0;
    let height = 88.0;

    if let Some(window) = app.get_webview_window("tts_overlay") {
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width,
            height,
        }));

        position_overlay_window(&window, width, height);

        let _ = window.set_always_on_top(true);
        let _ = window.show();

        return;
    }

    let overlay = WebviewWindowBuilder::new(
        app,
        "tts_overlay",
        WebviewUrl::App("index.html?window=tts_overlay".into()),
    )
    .title("EchoKey TTS")
    .inner_size(width, height)
    .min_inner_size(width, height)
    .max_inner_size(width, height)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(true)
    .focused(false) // Ensures it doesn't steal focus
    .build();

    if let Ok(window) = overlay {
        position_overlay_window(&window, width, height);
        let _ = window.set_always_on_top(true);
    }
}

fn hide_tts_overlay_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("tts_overlay") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn show_tts_overlay(app: tauri::AppHandle) -> Result<(), String> {
    show_tts_overlay_window(&app);
    Ok(())
}

#[tauri::command]
fn hide_tts_overlay(app: tauri::AppHandle) -> Result<(), String> {
    hide_tts_overlay_window(&app);
    Ok(())
}

fn clear_clipboard_text() {
    if let Ok(mut clipboard) = Clipboard::new() {
        let _ = clipboard.set_text("");
    }
}

fn read_clipboard_text() -> String {
    Clipboard::new()
        .and_then(|mut clipboard| clipboard.get_text())
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn release_common_modifier_keys(enigo: &mut Enigo) {
    let _ = enigo.key(Key::Control, Direction::Release);
    let _ = enigo.key(Key::Alt, Direction::Release);
    let _ = enigo.key(Key::Shift, Direction::Release);
    let _ = enigo.key(Key::Meta, Direction::Release);
}

fn simulate_ctrl_c() {
    if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
        release_common_modifier_keys(&mut enigo);

        thread::sleep(Duration::from_millis(150));

        let _ = enigo.key(Key::Control, Direction::Press);
        thread::sleep(Duration::from_millis(50));

        // Use Ctrl+Insert for universal copy (bypasses language layout issues like Persian keyboard)
        let _ = enigo.key(Key::Insert, Direction::Click);
        thread::sleep(Duration::from_millis(50));

        // Fallback to Ctrl+C just in case
        let _ = enigo.key(Key::Unicode('c'), Direction::Click);
        let _ = enigo.key(Key::Unicode('C'), Direction::Click);

        thread::sleep(Duration::from_millis(50));

        let _ = enigo.key(Key::Control, Direction::Release);

        thread::sleep(Duration::from_millis(150));
    }
}

fn copy_selected_text_from_active_app() -> String {
    clear_clipboard_text();

    // Give OS enough time to restore focus to the target app after shortcut release
    thread::sleep(Duration::from_millis(350));

    simulate_ctrl_c();

    // Increase polling attempts (30 attempts * 100ms = 3 seconds max wait)
    let max_attempts = 30;
    let delay_between_attempts = Duration::from_millis(100);

    for attempt in 0..max_attempts {
        thread::sleep(delay_between_attempts);

        let text = read_clipboard_text();

        if !text.is_empty() {
            println!(
                "TTS selected text copied successfully on attempt {}. Length: {}",
                attempt + 1,
                text.len()
            );

            return text;
        }
    }

    println!("TTS selected text copy failed. Clipboard is empty.");

    String::new()
}

fn start_tts_from_selected_text(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        // Copy first to avoid focus loss
        let selected_text = copy_selected_text_from_active_app();

        // Show window only AFTER copy attempt is completely finished
        show_tts_overlay_window(&app_handle);

        thread::sleep(Duration::from_millis(220));

        if let Some(tts_overlay) = app_handle.get_webview_window("tts_overlay") {
            let _ = tts_overlay.emit("start-tts-command", selected_text);
        }
    });
}

fn handle_stt_shortcut(app: &tauri::AppHandle) {
    let state = app.state::<RecordingState>();

    let mut is_recording = match state.is_recording.lock() {
        Ok(value) => value,
        Err(error) => {
            eprintln!("Failed to lock recording state: {}", error);
            return;
        }
    };

    if *is_recording {
        *is_recording = false;

        if let Some(overlay) = app.get_webview_window("overlay") {
            let _ = overlay.emit("stop-recording-command", ());
        }

        return;
    }

    *is_recording = true;

    show_overlay_window(app);

    let app_handle = app.clone();

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(220));

        if let Some(overlay) = app_handle.get_webview_window("overlay") {
            let _ = overlay.emit("start-recording-command", ());
        }
    });
}

fn handle_tts_shortcut(app: &tauri::AppHandle) {
    let app_handle = app.clone();
    start_tts_from_selected_text(app_handle);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(RecordingState {
            is_recording: Mutex::new(false),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let label = window.label();

                if label == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }

                if label == "overlay" {
                    api.prevent_close();
                    let _ = window.hide();
                }

                if label == "tts_overlay" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            paste_text,
            paste_text_with_ctrl_v,
            set_recording_state,
            hide_overlay,
            show_tts_overlay,
            hide_tts_overlay
        ])
        .setup(|app| {
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.hide();
            }

            let settings_item =
                MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let tray_menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            let shortcut_stt = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::ALT),
                Code::Digit1,
            );

            let shortcut_tts = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::ALT),
                Code::KeyS,
            );

            app.global_shortcut()
                .on_shortcut(shortcut_stt, |app, _shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }

                    handle_stt_shortcut(app);
                })?;

            app.global_shortcut()
                .on_shortcut(shortcut_tts, |app, _shortcut, event| {
                    // MUST be Released. Prevents conflict with held modifier keys.
                    if event.state() != ShortcutState::Released {
                        return;
                    }

                    handle_tts_shortcut(app);
                })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}