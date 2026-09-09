from __future__ import annotations

import argparse
import hashlib
import subprocess
from pathlib import Path
from typing import Any

from .io_utils import read_json, write_json


SPEAKERS = {
    "opening": "maya",
    "marcus": "marcus",
    "elena": "elena",
    "priya": "priya",
    "owen": "owen",
    "daniel": "daniel",
    "project-action": "maya",
    "closing": "maya",
}

KINDS = {
    "opening": "opening",
    "project-action": "project_action",
    "closing": "closing",
}


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def aggregate_turns(transcript: list[dict[str, Any]], plan: dict[str, Any], run: Path) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    grouped: dict[str, list[str]] = {}
    for row in transcript:
        grouped.setdefault(row["segment"], []).append(row["text"].strip())

    turns: list[dict[str, str]] = []
    segments: list[dict[str, Any]] = []
    gap = float(plan["gap_seconds"])
    source_segments = plan["segments"]
    for index, item in enumerate(source_segments):
        label = item["label"]
        source = run / "segments" / item["file"]
        trim_start = max(0.0, float(item.get("leading_silence_seconds", 0.0)) - gap)
        duration = ffprobe_duration(source) - trim_start
        if index < len(source_segments) - 1:
            duration += gap
        turns.append({
            "speaker": SPEAKERS[label],
            "kind": KINDS.get(label, "contribution"),
            "text": " ".join(grouped[label]),
        })
        segments.append({"label": label, "duration_seconds": duration})
    return turns, segments


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    audio = args.run / "audio-first-takes-complete.wav"
    transcript = read_json(args.run / "transcript.json")
    plan = read_json(args.plan)
    turns, segments = aggregate_turns(transcript, plan, args.run)
    audio_duration = ffprobe_duration(audio)
    delta = audio_duration - sum(float(item["duration_seconds"]) for item in segments)
    segments[-1]["duration_seconds"] += delta
    for segment in segments:
        segment["duration_seconds"] = round(float(segment["duration_seconds"]), 6)

    args.output.mkdir(parents=True, exist_ok=True)
    write_json(args.output / "transcript.json", turns)
    write_json(args.output / "provenance.json", {
        "schema_version": 1,
        "run_id": "live-157330ed-completed-full-first-takes",
        "mode": "retained-first-take-live-agent-audio-with-separate-live-maya-close",
        "segments": segments,
        "inter_turn_gap_seconds": 0,
        "source_audio": str(audio.resolve()),
        "source_audio_duration_seconds": round(audio_duration, 6),
        "source_audio_sha256": sha256(audio),
        "audio_edits": [],
    })
    write_json(args.output / "acceptance.json", {
        "user_acceptance": "approved",
        "approved_source": "audio-first-takes-complete.wav",
        "instruction": "Use the full organic recording without cuts or edits.",
    })
    print(f"Prepared exact full-run video timeline: {audio_duration:.3f}s; {len(turns)} scene groups")


if __name__ == "__main__":
    main()
