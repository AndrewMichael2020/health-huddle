from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from .io_utils import read_json, write_json


def probe(path: Path) -> dict:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    )
    return json.loads(completed.stdout)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--timeline", type=Path, required=True)
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    info = probe(args.video)
    timeline = read_json(args.timeline)
    audit = read_json(args.audit)
    blockers = []
    video = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    audio = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    duration = float(info["format"]["duration"])
    if not video or video.get("codec_name") != "h264" or (video.get("width"), video.get("height")) != (1920, 1080):
        blockers.append("video-format")
    if not audio or audio.get("codec_name") != "aac":
        blockers.append("audio-format")
    if abs(duration - float(timeline["duration_seconds"])) > 0.15:
        blockers.append("duration-mismatch")
    if audit["script_turns"] != 28 or audit["github_actions"] != 13 or audit["reaction_events"] < 6:
        blockers.append("audit-counts")
    report = {"ready": not blockers, "blockers": blockers, "duration_seconds": round(duration, 3), "width": None if not video else video.get("width"), "height": None if not video else video.get("height"), "video_codec": None if not video else video.get("codec_name"), "audio_codec": None if not audio else audio.get("codec_name"), "deterministic_segments": len(audit["segments"])}
    write_json(args.output, report)
    print(f"Video ready: {report['ready']}; blockers: {len(blockers)}; duration: {duration:.2f}s")
    if blockers:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
