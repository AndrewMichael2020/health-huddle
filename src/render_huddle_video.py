from __future__ import annotations

import argparse
import json
import subprocess
import textwrap
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from .io_utils import read_json, write_json


FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
AGENT_COLOURS = {
    "maya": "#79C0FF",
    "daniel": "#D2A8FF",
    "priya": "#7EE787",
    "marcus": "#FFA657",
    "elena": "#FF7B72",
    "owen": "#A5D6FF",
}
COLUMN_WIDTH = 350
BOARD_SOURCE_TOP = 212
BOARD_SOURCE_BOTTOM = 936


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def draw_reaction_icon(draw: ImageDraw.ImageDraw, emoticon: str, x: int, y: int) -> None:
    """Draw crisp, font-independent reaction icons in a Teams-like pill."""
    if emoticon == "🙂":
        draw.ellipse((x, y, x + 48, y + 48), fill="#FFD45A", outline="#C18C00", width=2)
        draw.ellipse((x + 13, y + 15, x + 18, y + 20), fill="#5B4300")
        draw.ellipse((x + 30, y + 15, x + 35, y + 20), fill="#5B4300")
        draw.arc((x + 12, y + 16, x + 36, y + 38), 25, 155, fill="#5B4300", width=3)
    elif emoticon == "✨":
        draw.polygon([(x + 24, y), (x + 30, y + 18), (x + 48, y + 24), (x + 30, y + 30), (x + 24, y + 48), (x + 18, y + 30), (x, y + 24), (x + 18, y + 18)], fill="#F2B705")
        draw.polygon([(x + 42, y + 2), (x + 45, y + 10), (x + 53, y + 13), (x + 45, y + 16), (x + 42, y + 24), (x + 39, y + 16), (x + 31, y + 13), (x + 39, y + 10)], fill="#FFE792")
    elif emoticon == "☕":
        draw.rounded_rectangle((x + 3, y + 13, x + 39, y + 42), radius=7, fill="#D8955B", outline="#704425", width=2)
        draw.arc((x + 31, y + 17, x + 52, y + 38), 265, 95, fill="#704425", width=4)
        draw.arc((x + 10, y - 2, x + 22, y + 19), 65, 120, fill="#6E87A8", width=2)
        draw.arc((x + 22, y - 5, x + 34, y + 17), 65, 120, fill="#6E87A8", width=2)
    else:
        draw.rounded_rectangle((x + 12, y + 18, x + 47, y + 42), radius=6, fill="#2F81F7")
        draw.polygon([(x + 12, y + 22), (x + 4, y + 20), (x + 3, y + 42), (x + 14, y + 40), (x + 27, y + 39), (x + 31, y + 30), (x + 23, y + 27), (x + 27, y + 7), (x + 18, y + 5)], fill="#2F81F7")


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def _column(image: Image.Image, left: int, *, partial: bool = False) -> Image.Image:
    right = min(image.width, left + COLUMN_WIDTH)
    crop = image.crop((left, BOARD_SOURCE_TOP, right, BOARD_SOURCE_BOTTOM))
    if not partial and crop.width == COLUMN_WIDTH:
        return crop
    padded = Image.new("RGB", (COLUMN_WIDTH, crop.height), "#F6F8FA")
    padded.paste(crop, (0, 0))
    return padded


def board_panorama(left_path: Path, right_path: Path) -> Image.Image:
    """Build one authentic, full six-column Project view from two live captures."""
    left = Image.open(left_path).convert("RGB")
    right = Image.open(right_path).convert("RGB")
    columns = [
        _column(left, 16),
        _column(left, 374),
        _column(left, 731),
        _column(left, 1089, partial=True),
        _column(right, 597),
        _column(right, 955),
    ]
    height = BOARD_SOURCE_BOTTOM - BOARD_SOURCE_TOP
    panorama = Image.new("RGB", (COLUMN_WIDTH * 6, height + 176), "#F6F8FA")
    for index, column in enumerate(columns):
        panorama.paste(column, (index * COLUMN_WIDTH, 0))
    return panorama.resize((1920, 823), Image.Resampling.LANCZOS)


def transcript_window(turn: dict[str, Any], at: float) -> list[str]:
    lines = textwrap.wrap(turn["text"], width=111, break_long_words=False, break_on_hyphens=False)
    if len(lines) <= 3:
        return lines
    duration = max(float(turn["duration_seconds"]), 0.01)
    progress = max(0.0, min(1.0, (at - float(turn["start_seconds"])) / duration))
    first = min(len(lines) - 3, int(progress * (len(lines) - 2)))
    return lines[first : first + 3]


def action_label(action: dict[str, Any]) -> str:
    if action["type"] == "create_issue":
        return f"CREATED #{action['actual_issue_number']}  ·  {action['title']}"
    if action["type"] == "move_issue":
        return f"MOVED #{action['issue_number']}  ·  {action['from']} → {action['to']}"
    return f"CLOSED #{action['issue_number']}  ·  {action['title']}"


def active_turn(turns: list[dict[str, Any]], at: float) -> dict[str, Any] | None:
    active = [turn for turn in turns if turn["start_seconds"] <= at < turn["end_seconds"]]
    if not active:
        return None
    if any(turn.get("overlap_group") for turn in active):
        return {
            "speaker": "team",
            "text": "Happy Monday!",
            "phase": "closing-overlap",
        }
    ordinary = [turn for turn in active if not turn.get("overlap_group")]
    if ordinary:
        return ordinary[-1]
    return {
        "speaker": "team",
        "text": "Happy Monday!",
        "phase": "closing-overlap",
    }


def make_opening(source: Path, output: Path) -> None:
    canvas = cover(Image.open(source).convert("RGB"), (1920, 1080))
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((82, 745, 1270, 994), radius=30, fill=(8, 20, 38, 202), outline=(255, 255, 255, 48), width=2)
    draw.text((125, 790), "COFFEE OUTSIDE. AGENT HUDDLES INSIDE.", font=font(BOLD, 42), fill="#FFFFFF")
    draw.text((127, 857), "SKAGIT HEALTH LTC DATA MODERNIZATION", font=font(BOLD, 27), fill="#9ED0FF")
    draw.text((127, 907), "Six AI agents · Decisions remain human", font=font(FONT, 27), fill="#E6EDF3")
    Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB").save(output, quality=93)


def draw_scene(
    capture: Path,
    right_capture: Path,
    output: Path,
    turn: dict[str, Any] | None,
    agents: dict[str, dict[str, Any]],
    action: dict[str, Any] | None,
    reaction: dict[str, Any] | None,
    at: float,
) -> None:
    canvas = Image.new("RGB", (1920, 1080), "#F6F8FA")
    canvas.paste(board_panorama(capture, right_capture), (0, 70))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1920, 70), fill="#0B1526")
    draw.text((42, 18), "SKAGIT HEALTH AUTHORITY  ·  LTC DATA MODERNIZATION", font=font(BOLD, 28), fill="#FFFFFF")
    draw.text((1452, 22), "AGENT HUDDLE", font=font(BOLD, 24), fill="#79C0FF")
    glass = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    glass_draw = ImageDraw.Draw(glass)
    # Sixty percent opacity leaves the board perceptible while prioritizing readability.
    glass_draw.rectangle((0, 830, 1920, 1080), fill=(16, 29, 50, 153))
    glass_draw.line((0, 830, 1920, 830), fill=(93, 130, 174, 205), width=3)
    canvas = Image.alpha_composite(canvas.convert("RGBA"), glass).convert("RGB")
    draw = ImageDraw.Draw(canvas)

    if turn:
        speaker = turn["speaker"]
        if speaker == "team":
            name, role, colour = "The Agent Team", "Six AI Agents", "#79C0FF"
        else:
            agent = agents[speaker]
            name, role, colour = agent["name"], agent["role"], AGENT_COLOURS[speaker]
        draw.rounded_rectangle((42, 850, 100, 908), radius=15, fill=colour)
        initials = "".join(part[0] for part in name.split()[:2])
        draw.text((54, 863), initials, font=font(BOLD, 22), fill="#07111F")
        draw.text((120, 844), name, font=font(BOLD, 30), fill="#FFFFFF")
        draw.text((120, 881), role, font=font(FONT, 21), fill=colour)
        subtitle = "\n".join(transcript_window(turn, at))
        draw.multiline_text((42, 924), subtitle, font=font(FONT, 27), fill="#F0F6FC", spacing=7)
        draw.text((1600, 856), turn.get("phase", "").replace("-", " ").upper(), font=font(BOLD, 17), fill="#A9BED8")

    if action:
        draw.rounded_rectangle((42, 102, 1410, 180), radius=20, fill="#07111F", outline="#2F81F7", width=3)
        draw.text((72, 124), action_label(action), font=font(BOLD, 25), fill="#FFFFFF")
        if action.get("handoff"):
            draw.text((1440, 124), f"→ {action['handoff']}", font=font(BOLD, 21), fill="#7EE787")

    if reaction:
        # A visible Teams-style pop: avatar, sender, and emoticon all travel together.
        draw.rounded_rectangle((1430, 196, 1872, 284), radius=42, fill="#FFFFFF", outline="#6E87A8", width=3)
        draw.rounded_rectangle((1448, 211, 1509, 272), radius=29, fill="#2F81F7")
        draw.text((1461, 229), reaction["badge"], font=font(BOLD, 19), fill="#FFFFFF")
        draw.text((1530, 211), f"{reaction['from'].title()} reacted", font=font(BOLD, 20), fill="#172B4D")
        draw_reaction_icon(draw, reaction["emoticon"], 1789, 216)

    draw.text((42, 1051), "SYNTHETIC DATA  ·  AGENT-GENERATED RECOMMENDATIONS  ·  HUMAN APPROVAL REQUIRED", font=font(BOLD, 15), fill="#A9BED8")
    canvas.save(output, quality=91)


def quote_concat(path: Path) -> str:
    return str(path.resolve()).replace("'", "'\\''")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", type=Path, required=True)
    parser.add_argument("--captures-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--script", type=Path, default=Path("demo/huddle-script.json"))
    parser.add_argument("--plan", type=Path, default=Path("demo/video-plan.json"))
    parser.add_argument("--ledger", type=Path, default=Path("demo/action-ledger.json"))
    args = parser.parse_args()

    script = read_json(args.script)
    plan = read_json(args.plan)
    timeline = read_json(args.audio_root / "timeline.json")
    locked_actions = {item["id"]: item for item in read_json(args.ledger)["actions"]}
    timeline["actions"] = [{**item, **locked_actions[item["id"]]} for item in timeline["actions"]]
    agents = {agent["id"]: agent for agent in script["agents"]}
    args.output.mkdir(parents=True, exist_ok=True)
    frames = args.output / "frames"
    frames.mkdir(exist_ok=True)

    by_action = {action["id"]: action for action in timeline["actions"]}
    reaction_events = []
    by_turn = {turn["id"]: turn for turn in timeline["turns"]}
    for reaction in plan["reactions"]:
        reaction_events.append({**reaction, "scheduled_seconds": by_turn[reaction["at_turn"]]["start_seconds"] + reaction["offset_seconds"]})

    capture_events = []
    for state in plan["capture_states"]:
        when = 0.0 if state["after_action"] is None else by_action[state["after_action"]]["scheduled_seconds"] + 0.15
        capture_events.append({**state, "scheduled_seconds": when})
    capture_events.sort(key=lambda item: item["scheduled_seconds"])

    total = float(timeline["duration_seconds"])
    boundaries = {0.0, 7.0, total}
    for turn in timeline["turns"]:
        boundaries.update((float(turn["start_seconds"]), float(turn["end_seconds"])))
        lines = textwrap.wrap(turn["text"], width=111, break_long_words=False, break_on_hyphens=False)
        for line_index in range(1, max(1, len(lines) - 2)):
            boundaries.add(float(turn["start_seconds"]) + float(turn["duration_seconds"]) * line_index / (len(lines) - 2))
    for action in timeline["actions"]:
        boundaries.update((float(action["scheduled_seconds"]), min(total, float(action["scheduled_seconds"]) + 3.0)))
    for reaction in reaction_events:
        boundaries.update((float(reaction["scheduled_seconds"]), min(total, float(reaction["scheduled_seconds"]) + 2.6)))
    points = sorted(value for value in boundaries if 0 <= value <= total)

    concat_lines: list[str] = []
    audit_segments = []
    for index, (start, end) in enumerate(zip(points, points[1:])):
        if end - start < 0.01:
            continue
        at = (start + end) / 2
        capture_state = max((item for item in capture_events if item["scheduled_seconds"] <= at), key=lambda item: item["scheduled_seconds"])
        action = next((item for item in timeline["actions"] if item["scheduled_seconds"] <= at < item["scheduled_seconds"] + 3.0), None)
        reaction = next((item for item in reaction_events if item["scheduled_seconds"] <= at < item["scheduled_seconds"] + 2.6), None)
        turn = active_turn(timeline["turns"], at)
        frame = frames / f"segment-{index:03d}.jpg"
        right_file = capture_state.get("right_file", "08-project-final-right.jpg")
        draw_scene(args.captures_root / capture_state["file"], args.captures_root / right_file, frame, turn, agents, action, reaction, at)
        concat_lines.extend((f"file '{quote_concat(frame)}'", f"duration {end - start:.3f}"))
        audit_segments.append({"start": round(start, 3), "end": round(end, 3), "turn": None if not turn else turn.get("id", turn.get("speaker")), "capture": capture_state["file"], "right_capture": right_file, "action": None if not action else action["id"], "reaction": None if not reaction else reaction["badge"] + reaction["emoticon"]})
    concat_lines.append(f"file '{quote_concat(frame)}'")
    concat_file = args.output / "scenes.ffconcat"
    concat_file.write_text("ffconcat version 1.0\n" + "\n".join(concat_lines) + "\n", encoding="utf-8")

    board_video = args.output / "board-scenes.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-vf", "fps=30,format=yuv420p", "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "medium", "-crf", "20", str(board_video)
    ], check=True)

    opening = args.output / "opening-card.jpg"
    make_opening(Path(plan["opening"]["asset"]), opening)
    final_video = args.output / "skagit-health-agent-huddle.mp4"
    fade_in = plan["opening"]["fade_in_seconds"]
    fade_out_start = plan["opening"]["fade_out_start_seconds"]
    fade_out = plan["opening"]["fade_out_seconds"]
    subprocess.run([
        "ffmpeg", "-y", "-i", str(board_video), "-loop", "1", "-t", "7", "-i", str(opening), "-i", str(args.audio_root / "huddle-mix.wav"),
        "-filter_complex",
        f"color=c=black:s=1920x1080:d=7[black];"
        f"[1:v]scale=1920:1080,format=rgba,fade=t=in:st=0:d={fade_in}:alpha=1[image];"
        f"[black][image]overlay=0:0,format=rgba,fade=t=out:st={fade_out_start}:d={fade_out}:alpha=1[op];"
        "[0:v][op]overlay=0:0:enable='lt(t,7)'[v]",
        "-map", "[v]", "-map", "2:a:0", "-t", f"{total:.3f}", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(final_video)
    ], check=True)

    write_json(args.output / "video-audit.json", {
        "video": final_video.name,
        "duration_seconds": total,
        "script_turns": len(timeline["turns"]),
        "github_actions": len(timeline["actions"]),
        "reaction_events": len(reaction_events),
        "segments": audit_segments,
    })
    print(f"Rendered {final_video} ({total:.2f}s, {len(audit_segments)} deterministic scenes)")


if __name__ == "__main__":
    main()
