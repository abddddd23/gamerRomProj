"""
Standalone entry point for the Gaming Room Management backend executable.
This script is used by PyInstaller to create a standalone executable.
"""
import os
import sys
import socket
import threading
import time
import webbrowser
from pathlib import Path

# Add the app directory to the Python path
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    app_dir = Path(sys._MEIPASS) / 'app'
    sys.path.insert(0, str(app_dir))
    # Set working directory to the executable location
    os.chdir(Path(sys.executable).parent)
else:
    # Running as script
    app_dir = Path(__file__).parent
    sys.path.insert(0, str(app_dir))

# Set environment variables for the standalone version
os.environ.setdefault('DATABASE_MODE', 'sqlite')
os.environ.setdefault('APP_ENVIRONMENT', 'standalone')
os.environ.setdefault('CORS_ORIGINS', 'http://127.0.0.1:8000')

# Import and run the main application
try:
    import uvicorn
    from app.main import app
    
    # Check for --init-db flag
    if '--init-db' in sys.argv:
        print("Initializing database...")
        from app.db.session import Base, engine
        from app.seed import seed
        Base.metadata.create_all(bind=engine)
        seed()
        print("Database initialized successfully!")
        sys.exit(0)
    
    port = int(os.environ.get("PORT", "8000"))
    open_browser = "--open-browser" in sys.argv
    # A second shortcut click should open the existing app instead of a competing server.
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.4):
            if open_browser:
                webbrowser.open(f"http://127.0.0.1:{port}")
            sys.exit(0)
    except OSError:
        pass
    if open_browser:
        threading.Thread(target=lambda: (time.sleep(1.5), webbrowser.open(f"http://127.0.0.1:{port}")), daemon=True).start()
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=port,
        reload=False,  # No reload in standalone executable
        log_level="info",
        # Uvicorn's default formatter probes sys.stdout.isatty(), which is None
        # in a PyInstaller --noconsole Windows build. Application logging is
        # already configured to the LocalAppData log file by app.main.
        log_config=None,
    )
    
except Exception:
    import traceback
    from pathlib import Path
    # A windowed executable has no console; retain startup diagnostics even if
    # application logging did not finish initializing.
    diagnostic_root = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "GamingRoomManager" / "logs"
    diagnostic_root.mkdir(parents=True, exist_ok=True)
    (diagnostic_root / "startup-error.log").write_text(traceback.format_exc(), encoding="utf-8")
    # Don't wait for input in case of non-interactive environment
    sys.exit(1)
