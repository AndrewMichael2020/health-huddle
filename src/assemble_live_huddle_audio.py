from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any

from .io_utils import read_json, write_json


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


def assemble(
    *,
    segments_dir: Path,
    segments: list[dict[str, Any]],
    output: Path,
    gap_seconds: float,
) -> None:
    command = ["ffmpeg", "-y"]
    for segment in segments:
        command.extend(["-i", str(segments_dir / segment["file"])])
    filters = []
    labels = []
    for index, segment in enumerate(segments):
        duration = ffprobe_duration(segments_dir / segment["file"])
        start = max(0.0, float(segment.get("leading_silence_seconds", 0)) - gap_seconds)
        end = duration
        if end <= start:
            raise ValueError(f"invalid trim for {segment['label']}: {start} >= {end}")
        label = f"a{index}"
        chain = f"[{index}:a]atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS,aresample=16000,aformat=sample_fmts=s16:channel_layouts=mono"
        if index < len(segments) - 1:
            chain += f",apad=pad_dur={gap_seconds:.3f}"
        filters.append(f"{chain}[{label}]")
        labels.append(f"[{label}]")
    filters.append(f"{''.join(labels)}concat=n={len(labels)}:v=0:a=1[joined]")
    command.extend([
        "-filter_complex", ";".join(filters),
        "-map", "[joined]",
        "-c:a", "pcm_s16le",
        str(output),
    ])
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--plan", type=Path, required=True)
    args = parser.parse_args()
    plan = read_json(args.plan)
    if args.run.name != plan["source_run"]:
        raise SystemExit("audio plan does not match the selected run")
    segments_dir = args.run / "segments"
    complete = args.run / "audio-first-takes-complete.wav"
    assemble(
        segments_dir=segments_dir,
        segments=plan["segments"],
        output=complete,
        gap_seconds=float(plan["gap_seconds"]),
    )
    manifest = {
        "schema_version": 1,
        "source_run": args.run.name,
        "complete": {"file": complete.name, "duration_seconds": round(ffprobe_duration(complete), 3), "sha256": sha256(complete)},
        "gap_seconds": plan["gap_seconds"],
        "specialist_audio": "retained first takes; no specialist was regenerated",
        "closing": "separate live Maya closing conversation",
    }
    write_json(args.run / "audio-manifest.json", manifest)
    listen = f"""<!doctype html><meta charset=\"utf-8\"><title>Live huddle retry</title>
<style>body{{font:18px/1.5 system-ui;max-width:760px;margin:3rem auto;padding:0 1rem}}audio{{width:100%}}section{{margin:2rem 0}}</style>
<h1>Live huddle full first takes</h1>
<section><h2>Complete first takes ({manifest['complete']['duration_seconds']} seconds)</h2><audio controls src=\"{complete.name}\"></audio></section>
"""
    (args.run / "listen.html").write_text(listen, encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
