use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let sidecar = app.shell().sidecar("parvis-backend")
        .expect("failed to find parvis-backend sidecar");
      let (mut rx, _child) = sidecar.spawn()
        .expect("failed to spawn parvis-backend sidecar");

      tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;
        while let Some(event) = rx.recv().await {
          match event {
            CommandEvent::Stdout(line_bytes) => {
              println!("[parvis-backend] {}", String::from_utf8_lossy(&line_bytes).trim_end());
            }
            CommandEvent::Stderr(line_bytes) => {
              eprintln!("[parvis-backend] {}", String::from_utf8_lossy(&line_bytes).trim_end());
            }
            _ => {}
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
