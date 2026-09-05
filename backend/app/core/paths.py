import os
from pathlib import Path


APP_NAME = "GamingRoomManager"


def app_data_dir() -> Path:
    """Return a writable per-user location; never write runtime state beside the EXE."""
    root = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    if root:
        return Path(root) / APP_NAME
    return Path.home() / ".local" / "share" / APP_NAME


def ensure_app_directories() -> dict[str, Path]:
    base = app_data_dir()
    paths = {"root": base, "data": base / "data", "logs": base / "logs", "backups": base / "backups", "captures": base / "captures"}
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    return paths
