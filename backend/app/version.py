from pathlib import Path


def get_version() -> str:
    """Read the single project version source in development and frozen builds."""
    for parent in Path(__file__).resolve().parents:
        version_file = parent / "VERSION"
        if version_file.is_file():
            return version_file.read_text(encoding="utf-8").strip()
    return "0.9.0-beta"


VERSION = get_version()
