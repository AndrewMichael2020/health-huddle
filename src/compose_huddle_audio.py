from __future__ import annotations

import argparse
import subprocess
from pathlib import Path
from typing import Any

from .io_utils import read_json, write_json


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--script", type=Path, default=Path("demo/huddle-script.json"))
    parser.add_argument("--ledger", type=Path, default=Path("demo/action-ledger.json"))
    parser.add_argument("--audio-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    script = read_json(args.script)
    ledger = read_json(args.ledger)
    manifest = read_json(args.audio_root / "voice-manifest.json")
    files = {item["id"]: item for item in manifest["files"]}
    if set(files) != {turn["id"] for turn in script["turns"]}:
        raise SystemExit("Audio files do not match the locked transcript")

    args.output.mkdir(parents=True, exist_ok=True)
    timeline: list[dict[str, Any]] = []
    cursor = 0.35
    gap = 0.28
    closing_base = None
    stagger_index = 0
    for turn in script["turns"]:
        audio = files[turn["id"]]
        duration = float(audio["duration_seconds"])
        if turn.get("overlap_group") == "happy-monday":
            if closing_base is None:
                closing = next(item for item in timeline if item["id"] == "T23")
                closing_base = max(closing["start_seconds"] + closing["duration_seconds"] - 1.05, closing["start_seconds"])
            start = closing_base + stagger_index * 0.13
            stagger_index += 1
        else:
            start = cursor
            cursor = start + duration + gap
        timeline.append(
            {
                "id": turn["id"],
                "speaker": turn["speaker"],
                "phase": turn["phase"],
                "text": turn["text"],
                "file": audio["file"],
                "start_seconds": round(start, 3),
                "duration_seconds": round(duration, 3),
                "end_seconds": round(start + duration, 3),
                "overlap_group": turn.get("overlap_group"),
            }
        )

    total_duration = max(item["end_seconds"] for item in timeline) + 0.55
    inputs: list[str] = []
    filters: list[str] = []
    for index, item in enumerate(timeline):
        inputs.extend(["-i", str(args.audio_root / item["file"])])
        delay = round(item["start_seconds"] * 1000)
        filters.append(f"[{index}:a]aresample=48000,adelay={delay}|{delay},volume=0.92[a{index}]")
    mix_inputs = "".join(f"[a{index}]" for index in range(len(timeline)))
    filters.append(f"{mix_inputs}amix=inputs={len(timeline)}:duration=longest:normalize=0,alimiter=limit=0.92[mix]")
    output_audio = args.output / "huddle-mix.wav"
    subprocess.run(
        ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[mix]", "-t", f"{total_duration:.3f}", "-c:a", "pcm_s16le", str(output_audio)],
        check=True,
    )

    action_timeline = []
    by_turn = {item["id"]: item for item in timeline}
    for action in ledger["actions"]:
        scheduled = by_turn[action["at_turn"]]["start_seconds"] + float(action["offset_seconds"])
        action_timeline.append({**action, "scheduled_seconds": round(scheduled, 3)})
    write_json(
        args.output / "timeline.json",
        {"duration_seconds": round(total_duration, 3), "turns": timeline, "actions": action_timeline},
    )
    print(f"Composed {len(timeline)} tracks; duration {total_duration:.2f}s")


if __name__ == "__main__":
    main()
