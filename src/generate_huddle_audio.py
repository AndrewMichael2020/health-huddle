from __future__ import annotations

import argparse
import json
import os
import subprocess
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from .io_utils import read_json, write_json
from .validate_huddle import build_report, word_count


API_ROOT = "https://api.elevenlabs.io/v1"


def api_request(url: str, api_key: str, payload: dict[str, Any] | None = None) -> bytes:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, method="GET" if data is None else "POST")
    request.add_header("xi-api-key", api_key)
    request.add_header("Accept", "application/json" if data is None else "audio/mpeg")
    if data is not None:
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"ElevenLabs request failed with HTTP {exc.code}: {detail}") from exc


def visible_voice_catalog(api_key: str) -> tuple[dict[str, dict[str, Any]], str | None]:
    try:
        payload = json.loads(api_request(f"{API_ROOT}/voices", api_key))
    except RuntimeError as exc:
        return {}, str(exc)
    return {voice["voice_id"]: voice for voice in payload.get("voices", [])}, None


def duration_seconds(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(completed.stdout.strip())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("preflight", "trials", "full"), required=True)
    parser.add_argument("--demo-root", type=Path, default=Path("demo"))
    parser.add_argument("--project-root", type=Path, default=Path("project"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    api_key = os.environ.get("ELEVENLABS_KEY", "")
    if not api_key:
        raise SystemExit("ELEVENLABS_KEY is required")
    script = read_json(args.demo_root / "huddle-script.json")
    ledger = read_json(args.demo_root / "action-ledger.json")
    seed = read_json(args.project_root / "seed-tickets.yml")
    voice_plan = read_json(args.demo_root / "voice-plan.json")
    validation = build_report(script, ledger, seed, voice_plan)
    if not validation["ready"]:
        raise SystemExit("Huddle semantic gate failed: " + "; ".join(validation["blockers"]))
    if validation["conservative_credit_estimate"] > voice_plan["credit_ceiling"]:
        raise SystemExit("Conservative credit estimate exceeds ceiling")

    args.output.mkdir(parents=True, exist_ok=True)
    catalog, catalog_error = visible_voice_catalog(api_key)
    agents = {agent["id"]: agent for agent in script["agents"]}
    selected: dict[str, dict[str, Any]] = {}
    blockers: list[str] = []
    for agent_id, planned in voice_plan["voices"].items():
        actual = catalog.get(planned["voice_id"])
        if actual:
            category = actual.get("category", "unknown")
            name = actual.get("name", planned["preferred_name"])
            labels = actual.get("labels") or {}
            actual_gender = labels.get("gender")
            if category not in {"premade", "default", "professional"}:
                blockers.append(f"voice-not-standard:{agent_id}:{category}")
            if actual_gender and actual_gender.lower() != planned["gender"]:
                blockers.append(f"voice-gender-mismatch:{agent_id}:{actual_gender}")
        else:
            category = "premade-planned"
            name = planned["preferred_name"]
            labels = {"gender": planned["gender"]}
        selected[agent_id] = {
            "agent_name": agents[agent_id]["name"],
            "agent_role": agents[agent_id]["role"],
            "voice_id": planned["voice_id"],
            "voice_name": name,
            "category": category,
            "gender": planned["gender"],
            "catalog_labels": labels,
        }
    if blockers:
        raise SystemExit("Voice preflight failed: " + "; ".join(blockers))

    manifest: dict[str, Any] = {
        "mode": args.mode,
        "model_id": voice_plan["model_id"],
        "output_format": voice_plan["output_format"],
        "catalog_visible": bool(catalog),
        "catalog_note": catalog_error,
        "semantic_validation": validation,
        "voices": selected,
        "files": [],
        "generated_character_count": 0,
        "credit_ceiling": voice_plan["credit_ceiling"],
    }
    if args.mode == "preflight":
        write_json(args.output / "voice-manifest.json", manifest)
        print(f"Voice preflight ready: {len(selected)} standard voices planned; catalog visible: {bool(catalog)}")
        return

    if args.mode == "trials":
        items = [
            {
                "id": f"trial-{agent_id}",
                "speaker": agent_id,
                "text": f"{agent['name']}, {agent['role']}. Skagit Health LTC modernization: Meditech, PARIS, Microsoft Fabric, and Power BI.",
            }
            for agent_id, agent in agents.items()
        ]
    else:
        items = script["turns"]

    projected = sum(len(item.get("synthesis_text", item["text"])) for item in items)
    if projected > voice_plan["credit_ceiling"]:
        raise SystemExit(f"This run would submit {projected} characters, above the hard ceiling")

    for index, item in enumerate(items, start=1):
        voice = selected[item["speaker"]]
        file_name = f"{index:02d}_{item['id']}_{item['speaker']}.mp3"
        output_path = args.output / file_name
        synthesis_text = item.get("synthesis_text", item["text"])
        model_id = "eleven_v3" if item.get("synthesis_text") else voice_plan["model_id"]
        payload = {
            "text": synthesis_text,
            "model_id": model_id,
            "voice_settings": voice_plan["voice_settings"],
        }
        audio = api_request(
            f"{API_ROOT}/text-to-speech/{voice['voice_id']}?output_format={voice_plan['output_format']}",
            api_key,
            payload,
        )
        output_path.write_bytes(audio)
        seconds = duration_seconds(output_path)
        manifest["files"].append(
            {
                "id": item["id"],
                "speaker": item["speaker"],
                "file": file_name,
                "characters": len(synthesis_text),
                "words": word_count(item["text"]),
                "duration_seconds": round(seconds, 3),
                "model_id": model_id,
            }
        )
        manifest["generated_character_count"] += len(synthesis_text)
        print(f"Generated {file_name}: {seconds:.2f}s")

    write_json(args.output / "voice-manifest.json", manifest)
    print(f"Generated {len(items)} files using {manifest['generated_character_count']} input characters")


if __name__ == "__main__":
    main()
