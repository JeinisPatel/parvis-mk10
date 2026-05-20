"""PyInstaller entry point for the bundled PARVIS backend.

Imported indirectly by PyInstaller's static analyzer when building
the standalone binary. At runtime, this script starts uvicorn
serving the FastAPI app on localhost:8000 -- the same address the
frontend bundle has baked into NEXT_PUBLIC_API_BASE.

Run as a Tauri sidecar: spawned by the Rust shell on app launch,
terminated when the app quits.
"""
import sys

import uvicorn


def main() -> None:
    # Lazy import so PyInstaller's analyzer walks the full transitive
    # graph (pgmpy, scipy, numpy, anthropic, etc.) from this entry
    # rather than from a top-level import that might miss branches.
    from main import app

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
        access_log=False,  # Tauri pipes stderr; reduce log volume
    )


if __name__ == "__main__":
    main()
