from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from .io_utils import read_json, write_json


def probe(path: Path) -> dict:
    result = subprocess.run(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(path)],check=True,capture_output=True,text=True)
    return json.loads(result.stdout)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--lossless-master", type=Path)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--timeline", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    info = probe(args.video)
    manifest = read_json(args.manifest)
    timeline = read_json(args.timeline)
    blockers: list[str] = []
    video = next((item for item in info["streams"] if item["codec_type"] == "video"), None)
    audio = next((item for item in info["streams"] if item["codec_type"] == "audio"), None)
    duration = float(info["format"]["duration"])
    if not video or video.get("codec_name") != "h264" or (video.get("width"),video.get("height")) != (1920,1080): blockers.append("video-format")
    if not audio or audio.get("codec_name") != "aac": blockers.append("audio-format")
    if abs(duration - float(timeline["duration_seconds"])) > 0.15: blockers.append("duration-mismatch")
    if manifest.get("soundtrack_user_acceptance") != "approved": blockers.append("soundtrack-not-approved")
    if manifest.get("speakers") != ["maya","marcus","elena","priya","owen","daniel","maya","maya"]: blockers.append("speaker-order")
    if manifest.get("reaction_count",0) < 20: blockers.append("too-few-emoji-reactions")
    if not manifest.get("closing","").endswith("Happy Wednesday, everyone."): blockers.append("closing-phrase")
    if manifest.get("soundtrack_mode") != "retained-first-take-live-agent-audio-with-separate-live-maya-close": blockers.append("provenance-mode")
    if manifest.get("source_audio_edits") != []: blockers.append("source-audio-was-edited")
    lossless_audio_codec = None
    if args.lossless_master:
        master = probe(args.lossless_master)
        master_audio = next((item for item in master["streams"] if item["codec_type"] == "audio"), None)
        lossless_audio_codec = None if not master_audio else master_audio.get("codec_name")
        if lossless_audio_codec != "pcm_s16le": blockers.append("lossless-master-audio-format")
        if abs(float(master["format"]["duration"]) - duration) > 0.15: blockers.append("lossless-master-duration")
    report = {"ready":not blockers,"blockers":blockers,"duration_seconds":round(duration,3),"width":None if not video else video.get("width"),"height":None if not video else video.get("height"),"video_codec":None if not video else video.get("codec_name"),"audio_codec":None if not audio else audio.get("codec_name"),"lossless_master_audio_codec":lossless_audio_codec,"speaker_order":manifest.get("speakers"),"reaction_count":manifest.get("reaction_count"),"closing_verified":manifest.get("closing","").endswith("Happy Wednesday, everyone.")}
    write_json(args.output, report)
    print(f"Live huddle video ready: {report['ready']}; blockers: {len(blockers)}; duration: {duration:.2f}s")
    if blockers: raise SystemExit(1)


if __name__ == "__main__":
    main()
