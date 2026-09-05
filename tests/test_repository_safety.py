from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_no_generated_media_or_local_secret_files_are_tracked_in_source_tree() -> None:
    forbidden_names = {".env", "client_secrets.json"}
    forbidden_suffixes = {".mp3", ".wav", ".mp4", ".webm"}
    violations = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts or ".artifacts" in path.parts:
            continue
        if path.name in forbidden_names or path.suffix.lower() in forbidden_suffixes:
            violations.append(str(path.relative_to(ROOT)))
    assert violations == []
