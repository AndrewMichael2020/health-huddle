from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from .io_utils import read_json, write_json


def ffprobe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(completed.stdout.strip())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", type=Path, required=True)
    parser.add_argument("--composed-root", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = read_json(args.audio_root / "voice-manifest.json")
    blockers: list[str] = []
    durations = []
    for item in manifest["files"]:
        path = args.audio_root / item["file"]
        if not path.exists() or path.stat().st_size < 1000:
            blockers.append(f"missing-or-small:{item['file']}")
            continue
        measured = ffprobe_duration(path)
        durations.append(measured)
        expected_low = max(0.5, item["words"] / 230 * 60)
        expected_high = item["words"] / 80 * 60 + 1.5
        if not expected_low <= measured <= expected_high:
            blockers.append(f"implausible-duration:{item['file']}:{measured:.2f}")

    final_duration = None
    if args.composed_root:
        mix = args.composed_root / "huddle-mix.wav"
        timeline = read_json(args.composed_root / "timeline.json")
        final_duration = ffprobe_duration(mix)
        if abs(final_duration - timeline["duration_seconds"]) > 0.2:
            blockers.append("mix-timeline-duration-mismatch")
        if not 275 <= final_duration <= 330:
            blockers.append(f"final-duration-outside-window:{final_duration:.2f}")
        if len(timeline["actions"]) != 13:
            blockers.append("action-count-mismatch")
        if len(timeline["turns"]) != 28:
            blockers.append("turn-count-mismatch")

    report = {
        "ready": not blockers,
        "blockers": blockers,
        "file_count": len(manifest["files"]),
        "decoded_file_count": len(durations),
        "individual_audio_seconds": round(sum(durations), 3),
        "final_duration_seconds": None if final_duration is None else round(final_duration, 3),
        "generated_character_count": manifest["generated_character_count"],
    }
    write_json(args.output, report)
    print(f"Audio ready: {report['ready']}; blockers: {len(blockers)}")
    if blockers:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
