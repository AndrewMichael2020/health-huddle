from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path

from .generate_huddle_audio import API_ROOT, api_request, duration_seconds
from .io_utils import read_json, write_json
from .validate_huddle import word_count


REACTION_TURNS = {"T05", "T13", "T15"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-audio-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--script", type=Path, default=Path("demo/huddle-script.json"))
    parser.add_argument("--voice-plan", type=Path, default=Path("demo/voice-plan.json"))
    args = parser.parse_args()

    api_key = os.environ.get("ELEVENLABS_KEY", "")
    if not api_key:
        raise SystemExit("ELEVENLABS_KEY is required")

    script = read_json(args.script)
    voice_plan = read_json(args.voice_plan)
    turns = {turn["id"]: turn for turn in script["turns"]}
    missing = REACTION_TURNS - set(turns)
    if missing:
        raise SystemExit(f"Reaction turns missing from script: {sorted(missing)}")
    if any("synthesis_text" not in turns[turn_id] for turn_id in REACTION_TURNS):
        raise SystemExit("Every reaction turn must have synthesis_text")

    projected = sum(len(turns[turn_id]["synthesis_text"]) for turn_id in REACTION_TURNS)
    if projected > 500:
        raise SystemExit(f"Selective tune hard gate exceeded: {projected} characters")

    if args.output.exists():
        shutil.rmtree(args.output)
    shutil.copytree(args.base_audio_root, args.output)
    manifest = read_json(args.output / "voice-manifest.json")
    files = {item["id"]: item for item in manifest["files"]}
    if set(files) != set(turns):
        raise SystemExit("Base audio manifest does not match the locked transcript")

    replacements = []
    for turn_id in ("T05", "T13", "T15"):
        turn = turns[turn_id]
        file_item = files[turn_id]
        voice = voice_plan["voices"][turn["speaker"]]
        synthesis_text = turn["synthesis_text"]
        payload = {
            "text": synthesis_text,
            "model_id": "eleven_v3",
            "voice_settings": voice_plan["voice_settings"],
        }
        output_path = args.output / file_item["file"]
        output_path.write_bytes(
            api_request(
                f"{API_ROOT}/text-to-speech/{voice['voice_id']}?output_format={voice_plan['output_format']}",
                api_key,
                payload,
            )
        )
        seconds = duration_seconds(output_path)
        file_item.update(
            {
                "characters": len(synthesis_text),
                "words": word_count(turn["text"]),
                "duration_seconds": round(seconds, 3),
                "model_id": "eleven_v3",
                "selective_replacement": True,
            }
        )
        replacements.append(
            {
                "id": turn_id,
                "file": file_item["file"],
                "duration_seconds": round(seconds, 3),
                "characters": len(synthesis_text),
                "delivery": turn["delivery"],
            }
        )
        print(f"Replaced {turn_id}: {seconds:.2f}s")

    manifest["mode"] = "selective-reaction-tune"
    manifest["base_generated_character_count"] = manifest.get("generated_character_count", 0)
    manifest["reaction_tuning_character_count"] = projected
    manifest["cumulative_production_character_count"] = manifest["base_generated_character_count"] + projected
    manifest["selective_replacements"] = replacements
    write_json(args.output / "voice-manifest.json", manifest)
    print(f"Selective reaction tune complete: {projected} new characters across 3 clips")


if __name__ == "__main__":
    main()
