from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import textwrap
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from .io_utils import read_json, write_json


FONT_CANDIDATES = [
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
]
BOLD_CANDIDATES = [
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
]
COLOURS = {
    "maya": "#79C0FF",
    "daniel": "#D2A8FF",
    "priya": "#7EE787",
    "marcus": "#FFA657",
    "elena": "#FF7B72",
    "owen": "#A5D6FF",
}
ROLE_SHORT = {
    "maya": "Lead BI Analyst Agent",
    "daniel": "Analytics Director Agent",
    "priya": "Meditech Mapping Agent",
    "marcus": "PARIS Mapping Agent",
    "elena": "Reconciliation Agent",
    "owen": "Governance Agent",
}
REACTION_COLOURS = {
    "coffee": "#D8955B",
    "sparkle": "#F2B705",
    "thinking": "#A5D6FF",
    "search": "#79C0FF",
    "target": "#FF7B72",
    "thumb": "#2F81F7",
    "smile": "#FFD45A",
    "check": "#3FB950",
    "repeat": "#D2A8FF",
    "shield": "#58A6FF",
    "lock": "#A5D6FF",
    "stop": "#F85149",
    "pin": "#FF7B72",
    "confetti": "#F2B705",
}
REACTION_LABELS = {
    "coffee": "COFFEE",
    "sparkle": "SPARK",
    "thinking": "THINK",
    "search": "CHECK",
    "target": "FOCUS",
    "thumb": "YES",
    "smile": "SMILE",
    "check": "DONE",
    "repeat": "REPLAY",
    "shield": "GUARD",
    "lock": "HOLD",
    "stop": "BLOCK",
    "pin": "ACTION",
    "confetti": "HOORAY",
}


def _font(candidates: list[Path], size: int) -> ImageFont.FreeTypeFont:
    selected = next((item for item in candidates if item.exists()), None)
    if not selected:
        raise FileNotFoundError("No supported font found")
    return ImageFont.truetype(str(selected), size)


def font(size: int) -> ImageFont.FreeTypeFont:
    return _font(FONT_CANDIDATES, size)


def bold(size: int) -> ImageFont.FreeTypeFont:
    return _font(BOLD_CANDIDATES, size)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def cover(source: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(source).convert("RGB")
    scale = max(size[0] / image.width, size[1] / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = (image.width - size[0]) // 2
    top = (image.height - size[1]) // 2
    return image.crop((left, top, left + size[0], top + size[1]))


def contain(source: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(source).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, "#F6F8FA")
    canvas.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return canvas


def draw_icon(draw: ImageDraw.ImageDraw, kind: str, x: int, y: int, scale: float = 1.0) -> None:
    size = round(48 * scale)
    colour = REACTION_COLOURS[kind]
    if kind == "smile":
        draw.ellipse((x, y, x + size, y + size), fill=colour, outline="#C18C00", width=max(2, round(2 * scale)))
        eye = max(3, round(5 * scale))
        draw.ellipse((x + round(13 * scale), y + round(15 * scale), x + round(13 * scale) + eye, y + round(15 * scale) + eye), fill="#5B4300")
        draw.ellipse((x + round(30 * scale), y + round(15 * scale), x + round(30 * scale) + eye, y + round(15 * scale) + eye), fill="#5B4300")
        draw.arc((x + round(12 * scale), y + round(16 * scale), x + round(36 * scale), y + round(38 * scale)), 25, 155, fill="#5B4300", width=max(2, round(3 * scale)))
    elif kind in {"sparkle", "confetti"}:
        points = [(x + size // 2, y), (x + round(size * .62), y + round(size * .38)), (x + size, y + size // 2), (x + round(size * .62), y + round(size * .62)), (x + size // 2, y + size), (x + round(size * .38), y + round(size * .62)), (x, y + size // 2), (x + round(size * .38), y + round(size * .38))]
        draw.polygon(points, fill=colour)
        if kind == "confetti":
            for dx, dy, shade in [(55, 2, "#FF7B72"), (65, 28, "#79C0FF"), (-12, 6, "#7EE787"), (-18, 34, "#D2A8FF")]:
                draw.rectangle((x + round(dx * scale), y + round(dy * scale), x + round((dx + 8) * scale), y + round((dy + 14) * scale)), fill=shade)
    elif kind == "coffee":
        draw.rounded_rectangle((x + round(3 * scale), y + round(12 * scale), x + round(39 * scale), y + round(42 * scale)), radius=round(7 * scale), fill=colour, outline="#704425", width=max(2, round(2 * scale)))
        draw.arc((x + round(31 * scale), y + round(16 * scale), x + round(53 * scale), y + round(39 * scale)), 265, 95, fill="#704425", width=max(2, round(4 * scale)))
        draw.arc((x + round(10 * scale), y - round(4 * scale), x + round(24 * scale), y + round(17 * scale)), 65, 120, fill="#D8E8F8", width=max(2, round(2 * scale)))
    elif kind == "search":
        draw.ellipse((x + 3, y + 3, x + round(size * .70), y + round(size * .70)), outline=colour, width=max(3, round(6 * scale)))
        draw.line((x + round(size * .62), y + round(size * .62), x + size, y + size), fill=colour, width=max(3, round(7 * scale)))
    elif kind == "target":
        draw.ellipse((x, y, x + size, y + size), outline=colour, width=max(3, round(5 * scale)))
        draw.ellipse((x + round(size * .22), y + round(size * .22), x + round(size * .78), y + round(size * .78)), outline="#FFFFFF", width=max(2, round(4 * scale)))
        draw.ellipse((x + round(size * .40), y + round(size * .40), x + round(size * .60), y + round(size * .60)), fill=colour)
    elif kind in {"check", "thumb"}:
        draw.ellipse((x, y, x + size, y + size), fill=colour)
        draw.line((x + round(size * .22), y + round(size * .52), x + round(size * .42), y + round(size * .70)), fill="#FFFFFF", width=max(3, round(6 * scale)))
        draw.line((x + round(size * .42), y + round(size * .70), x + round(size * .78), y + round(size * .27)), fill="#FFFFFF", width=max(3, round(6 * scale)))
    elif kind == "repeat":
        draw.arc((x, y + 3, x + size, y + size - 3), 205, 25, fill=colour, width=max(3, round(6 * scale)))
        draw.arc((x, y + 3, x + size, y + size - 3), 25, 205, fill=colour, width=max(3, round(6 * scale)))
        draw.polygon([(x + 1, y + size // 2), (x + 14, y + size // 3), (x + 17, y + round(size * .64))], fill=colour)
        draw.polygon([(x + size - 1, y + size // 2), (x + size - 14, y + size // 3), (x + size - 17, y + round(size * .64))], fill=colour)
    elif kind in {"shield", "lock", "stop", "pin"}:
        if kind == "shield":
            draw.polygon([(x + size // 2, y), (x + size, y + round(size * .18)), (x + round(size * .88), y + round(size * .72)), (x + size // 2, y + size), (x + round(size * .12), y + round(size * .72)), (x, y + round(size * .18))], fill=colour)
        elif kind == "lock":
            draw.rounded_rectangle((x + 4, y + round(size * .38), x + size - 4, y + size), radius=5, fill=colour)
            draw.arc((x + round(size * .22), y, x + round(size * .78), y + round(size * .62)), 180, 360, fill=colour, width=max(3, round(6 * scale)))
        elif kind == "stop":
            draw.regular_polygon((x + size // 2, y + size // 2, size // 2), 8, fill=colour)
            draw.rectangle((x + round(size * .20), y + round(size * .44), x + round(size * .80), y + round(size * .58)), fill="#FFFFFF")
        else:
            draw.ellipse((x + round(size * .18), y, x + round(size * .82), y + round(size * .64)), fill=colour)
            draw.polygon([(x + size // 2, y + size), (x + round(size * .35), y + round(size * .52)), (x + round(size * .65), y + round(size * .52))], fill=colour)
    else:
        draw.ellipse((x, y, x + size, y + size), fill=colour)


def darken(image: Image.Image, amount: int = 115) -> Image.Image:
    overlay = Image.new("RGBA", image.size, (3, 12, 28, amount))
    return Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")


def background_for(speaker: str, assets: Path) -> Image.Image:
    if speaker == "maya":
        return darken(cover(assets / "coffee-outside-agent-huddles-inside.jpg", (1920, 1080)), 120)
    if speaker == "marcus":
        return darken(contain(assets / "paris-referral-status-batch-002.png", (1920, 1080)), 45)
    if speaker == "priya":
        return darken(contain(assets / "identity-crosswalk.png", (1920, 1080)), 70)
    return darken(cover(assets / "huddle-board-reaction.jpg", (1920, 1080)), 70)


def roster(draw: ImageDraw.ImageDraw, active: str, completed: set[str], names: dict[str, str]) -> None:
    order = ["maya", "daniel", "priya", "marcus", "elena", "owen"]
    left = 44
    for agent_id in order:
        width = 290
        colour = COLOURS[agent_id]
        if agent_id == active:
            fill, status = "#172B4D", "ON FLOOR"
        elif agent_id in completed:
            fill, status = "#12351F", "READY"
        else:
            fill, status = "#1F2937", "THINKING"
        draw.rounded_rectangle((left, 82, left + width - 12, 146), radius=17, fill=fill, outline=colour, width=3 if agent_id == active else 1)
        draw.ellipse((left + 12, 95, left + 52, 135), fill=colour)
        initials = "".join(part[0] for part in names[agent_id].split()[:2])
        draw.text((left + 20, 104), initials, font=bold(15), fill="#07111F")
        draw.text((left + 64, 91), names[agent_id], font=bold(18), fill="#FFFFFF")
        draw.text((left + 64, 118), status, font=bold(12), fill=colour)
        left += width + 8


def reaction_pill(draw: ImageDraw.ImageDraw, kind: str, x: int, y: int, sender: str) -> None:
    draw.rounded_rectangle((x, y, x + 264, y + 82), radius=35, fill="#FFFFFF", outline=REACTION_COLOURS[kind], width=3)
    draw_icon(draw, kind, x + 18, y + 17)
    draw.text((x + 82, y + 15), sender, font=bold(17), fill="#172B4D")
    draw.text((x + 82, y + 43), REACTION_LABELS[kind], font=bold(14), fill="#57606A")


def subtitle_window(text: str, progress: float) -> str:
    lines = textwrap.wrap(text, width=95, break_long_words=False, break_on_hyphens=False)
    if len(lines) <= 3:
        return "\n".join(lines)
    first = min(len(lines) - 3, int(max(0, min(1, progress)) * (len(lines) - 2)))
    return "\n".join(lines[first:first + 3])


def phase_title(speaker: str) -> str:
    return {
        "maya": "FACILITATION",
        "marcus": "ROW EVIDENCE",
        "elena": "CHALLENGE",
        "priya": "CROSS-SOURCE CHECK",
        "owen": "GOVERNANCE",
        "daniel": "GUIDANCE",
    }[speaker]


def draw_frame(
    turn: dict[str, Any], progress: float, output: Path, assets: Path,
    plan: dict[str, Any], names: dict[str, str], completed: set[str], reactions: list[str],
) -> None:
    speaker = turn["speaker"]
    canvas = background_for(speaker, assets)
    glass = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glass)
    gd.rectangle((0, 0, 1920, 72), fill=(7, 17, 31, 245))
    gd.rounded_rectangle((44, 178, 770, 744), radius=30, fill=(7, 17, 31, 225), outline=(121, 192, 255, 130), width=2)
    gd.rectangle((0, 802, 1920, 1080), fill=(7, 17, 31, 238))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), glass).convert("RGB")
    draw = ImageDraw.Draw(canvas)
    draw.text((42, 17), plan["title"], font=bold(28), fill="#FFFFFF")
    draw.text((1250, 21), plan["subtitle"].upper(), font=bold(19), fill="#79C0FF")
    draw.rounded_rectangle((1750, 13, 1890, 61), radius=16, fill="#D1242F", outline="#FF7B72", width=2)
    draw.ellipse((1770, 28, 1787, 45), fill="#FFFFFF")
    draw.text((1799, 23), "LIVE", font=bold(21), fill="#FFFFFF")
    roster(draw, speaker, completed, names)

    colour = COLOURS[speaker]
    draw.ellipse((91, 226, 241, 376), fill=colour, outline="#FFFFFF", width=5)
    initials = "".join(part[0] for part in names[speaker].split()[:2])
    draw.text((126, 272), initials, font=bold(45), fill="#07111F")
    draw.text((280, 226), names[speaker], font=bold(42), fill="#FFFFFF")
    draw.text((282, 286), ROLE_SHORT[speaker], font=font(24), fill=colour)
    draw.rounded_rectangle((282, 342, 612, 390), radius=16, fill=colour)
    draw.text((310, 354), phase_title(speaker), font=bold(17), fill="#07111F")

    if speaker == "marcus":
        draw.text((92, 449), "CONCRETE PAIR", font=bold(17), fill="#A9BED8")
        draw.text((92, 487), "PAR-R00001", font=bold(29), fill="#FFA657")
        draw.text((326, 490), "→", font=bold(28), fill="#FFFFFF")
        draw.text((378, 487), "PAR-D00001", font=bold(29), fill="#FFA657")
        draw.text((92, 548), "same referral + status + event time", font=font(22), fill="#FFFFFF")
        draw.text((92, 602), "row ID = delivery lineage", font=bold(24), fill="#7EE787")
    elif speaker == "elena":
        draw.text((92, 449), "REPLAY TEST", font=bold(17), fill="#A9BED8")
        for index, label in enumerate(["Normalize status first", "Flag candidate-key collisions", "Conserve every Bronze row"]):
            y = 493 + index * 62
            draw.ellipse((96, y, 126, y + 30), fill="#3FB950")
            draw.line((104, y + 15, 112, y + 23), fill="#FFFFFF", width=4)
            draw.line((112, y + 23, 121, y + 8), fill="#FFFFFF", width=4)
            draw.text((145, y - 1), label, font=font(23), fill="#FFFFFF")
    elif speaker == "priya":
        draw.text((92, 449), "USE THE ANALOGY", font=bold(17), fill="#A9BED8")
        draw.text((92, 491), "Meditech correction pattern", font=bold(28), fill="#7EE787")
        draw.text((92, 545), "helps test PARIS handling", font=font(24), fill="#FFFFFF")
        draw.text((92, 605), "≠ proof of PARIS semantics", font=bold(27), fill="#FF7B72")
    elif speaker == "owen":
        draw.text((92, 449), "HUMAN DECISION GATES", font=bold(17), fill="#A9BED8")
        for index, label in enumerate(["Systems · source + lifecycle", "BI Analyst · reconciliation", "Privacy/Security · notes"]):
            y = 491 + index * 62
            draw.rounded_rectangle((92, y, 670, y + 45), radius=14, fill="#172B4D", outline="#A5D6FF", width=2)
            draw.text((112, y + 9), label, font=font(21), fill="#FFFFFF")
    elif speaker == "daniel":
        draw.text((92, 449), "DECISION GUIDANCE", font=bold(17), fill="#A9BED8")
        for index, label in enumerate(["Document candidate grain", "Keep lineage for audit", "Attach reconciliation evidence"]):
            y = 491 + index * 62
            draw.text((95, y), f"{index + 1}.", font=bold(24), fill="#D2A8FF")
            draw.text((137, y), label, font=font(23), fill="#FFFFFF")
    elif turn["kind"] == "opening":
        draw.text((92, 449), "ONE QUESTION", font=bold(17), fill="#A9BED8")
        draw.multiline_text((92, 491), "Duplicate event\nor delivery lineage?", font=bold(35), fill="#FFFFFF", spacing=12)
        draw.text((92, 622), "Specialists reviewed quietly", font=font(22), fill="#79C0FF")
    else:
        draw.text((92, 449), "HUDDLE OUTCOME", font=bold(17), fill="#A9BED8")
        draw.text((92, 492), "Candidate grain recorded", font=bold(28), fill="#7EE787")
        draw.text((92, 547), "Issue #11 tested + restored", font=bold(25), fill="#79C0FF")
        draw.text((92, 602), "Human decisions remain human", font=bold(24), fill="#D2A8FF")

    visible_reactions = max(1, min(len(reactions), 1 + int(progress * len(reactions))))
    positions = [(1540, 185), (1248, 292), (1540, 399), (1248, 506)]
    senders = ["Maya reacted", "Elena reacted", "Daniel reacted", "Team reacted"]
    for index, kind in enumerate(reactions[:visible_reactions]):
        reaction_pill(draw, kind, *positions[index], senders[index])

    if speaker == "maya" and turn["kind"] == "closing":
        draw.rounded_rectangle((925, 660, 1845, 752), radius=24, fill="#07111F", outline="#3FB950", width=4)
        draw_icon(draw, "check", 955, 681)
        draw.text((1020, 674), "ISSUE #11 · READY DURING TEST · RESTORED", font=bold(24), fill="#FFFFFF")
        draw.text((1020, 713), "No Human approval was given", font=font(20), fill="#A9BED8")

    draw.text((42, 822), names[speaker], font=bold(31), fill="#FFFFFF")
    draw.text((42, 862), ROLE_SHORT[speaker], font=font(20), fill=colour)
    draw.multiline_text((42, 908), subtitle_window(turn["text"], progress), font=font(27), fill="#F0F6FC", spacing=7)
    draw.text((42, 1052), plan["footer"], font=bold(14), fill="#A9BED8")
    canvas.save(output, quality=92)


def quote_concat(path: Path) -> str:
    return str(path.resolve()).replace("'", "'\\''")


def build_timeline(transcript: list[dict[str, Any]], segments: list[dict[str, Any]], gap_seconds: float = 0.0) -> list[dict[str, Any]]:
    if len(transcript) != len(segments):
        raise ValueError("transcript and segment manifest differ")
    cursor = 0.0
    result = []
    for index, (turn, segment) in enumerate(zip(transcript, segments, strict=True)):
        duration = float(segment["duration_seconds"])
        result.append({**turn, "start_seconds": round(cursor, 3), "end_seconds": round(cursor + duration, 3), "duration_seconds": duration})
        cursor += duration
        if index < len(transcript) - 1:
            cursor += gap_seconds
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--assets", type=Path, default=Path("demo/assets"))
    parser.add_argument("--plan", type=Path, default=Path("live-demo/video-plan.json"))
    parser.add_argument("--agents", type=Path, default=Path("live_huddle/config/agents.json"))
    parser.add_argument("--audio", type=Path)
    args = parser.parse_args()

    transcript = read_json(args.run / "transcript.json")
    provenance = read_json(args.run / "provenance.json")
    acceptance = read_json(args.run / "acceptance.json")
    plan = read_json(args.plan)
    agent_config = read_json(args.agents)
    if acceptance.get("user_acceptance") != "approved":
        raise SystemExit("soundtrack must have explicit user approval before video rendering")
    if transcript[-1]["text"].strip().split()[-3:] != ["Happy", "Wednesday,", "everyone."]:
        raise SystemExit("approved closing phrase changed")
    names = {item["id"]: item["name"] for item in agent_config["agents"]}
    audio = args.audio or (args.run / "audio.wav")
    if not audio.exists():
        raise SystemExit(f"soundtrack does not exist: {audio}")
    gap_seconds = float(provenance.get("inter_turn_gap_seconds", 0.0))
    timeline = build_timeline(transcript, provenance["segments"], gap_seconds)
    args.output.mkdir(parents=True, exist_ok=True)
    frames = args.output / "frames"
    frames.mkdir(exist_ok=True)

    frame_groups: list[list[dict[str, Any]]] = []
    completed: set[str] = set()
    reaction_count = 0
    frame_index = 0
    for turn in timeline:
        reactions = plan["reactions"][f"{turn['speaker']}:{turn['kind']}"]
        reaction_count += len(reactions)
        parts = max(3, len(textwrap.wrap(turn["text"], width=95)) - 1)
        group: list[dict[str, Any]] = []
        for part in range(parts):
            progress = (part + 0.5) / parts
            frame_path = frames / f"segment-{frame_index:03d}.jpg"
            draw_frame(turn, progress, frame_path, args.assets, plan, names, completed, reactions)
            duration = float(turn["duration_seconds"]) / parts
            group.append({"path":frame_path,"duration_seconds":duration,"speaker":turn["speaker"],"kind":turn["kind"],"reaction_count":min(len(reactions),1 + int(progress * len(reactions)))})
            frame_index += 1
        completed.add(turn["speaker"])
        if turn is not timeline[-1] and gap_seconds > 0:
            gap_frame = frames / f"segment-{frame_index:03d}.jpg"
            draw_frame(turn, 1.0, gap_frame, args.assets, plan, names, completed, reactions)
            group.append({"path":gap_frame,"duration_seconds":gap_seconds,"speaker":turn["speaker"],"kind":"gap","reaction_count":len(reactions)})
            frame_index += 1
        frame_groups.append(group)
    if not frame_groups:
        raise SystemExit("empty transcript")

    transition_seconds = float(plan.get("visual_transition_seconds", 0.2))
    transition_frame_count = max(1, round(float(plan["format"]["fps"]) * transition_seconds))
    schedule: list[dict[str, Any]] = []
    for group_index, group in enumerate(frame_groups):
        if schedule and transition_seconds > 0:
            previous = schedule[-1]
            incoming = group[0]
            half = transition_seconds / 2
            if previous["duration_seconds"] <= half or incoming["duration_seconds"] <= half:
                raise ValueError("visual transition is longer than its adjacent scene frames")
            previous["duration_seconds"] -= half
            incoming["duration_seconds"] -= half
            before = Image.open(previous["path"]).convert("RGB")
            after = Image.open(incoming["path"]).convert("RGB")
            for step in range(1, transition_frame_count + 1):
                transition_path = frames / f"transition-{group_index:02d}-{step:02d}.jpg"
                Image.blend(before, after, step / (transition_frame_count + 1)).save(transition_path, quality=92)
                schedule.append({"path":transition_path,"duration_seconds":transition_seconds / transition_frame_count,"speaker":incoming["speaker"],"kind":"visual_transition","reaction_count":0})
        schedule.extend(group)

    concat: list[str] = ["ffconcat version 1.0"]
    audit_segments = []
    cursor = 0.0
    for item in schedule:
        duration = float(item["duration_seconds"])
        concat.extend([f"file '{quote_concat(item['path'])}'", f"duration {duration:.6f}"])
        audit_segments.append({"frame":item["path"].name,"speaker":item["speaker"],"kind":item["kind"],"start_seconds":round(cursor,3),"duration_seconds":round(duration,3),"reaction_count":item["reaction_count"]})
        cursor += duration
    concat.append(f"file '{quote_concat(schedule[-1]['path'])}'")
    concat_path = args.output / "scenes.ffconcat"
    concat_path.write_text("\n".join(concat) + "\n", encoding="utf-8")

    total = float(provenance["segments"][-1]["duration_seconds"]) + timeline[-1]["start_seconds"]
    if abs(cursor - total) > 0.001:
        raise ValueError(f"visual schedule changed the soundtrack duration: {cursor:.6f} != {total:.6f}")
    video_only = args.output / "video-only.mp4"
    final = args.output / "Skagit-Health-Live-Knowledge-Grounded-Agent-Huddle.mp4"
    lossless_master = args.output / "Skagit-Health-Live-Knowledge-Grounded-Agent-Huddle-Lossless-Audio-Master.mov"
    subprocess.run(["ffmpeg","-y","-f","concat","-safe","0","-i",str(concat_path),"-vf",f"fps={plan['format']['fps']},format=yuv420p","-t",f"{total:.3f}","-c:v","libx264","-preset","medium","-crf","19",str(video_only)],check=True)
    subprocess.run(["ffmpeg","-y","-i",str(video_only),"-i",str(audio),"-map","0:v:0","-map","1:a:0","-c:v","copy","-c:a","aac","-b:a","192k","-movflags","+faststart",str(final)],check=True)
    subprocess.run(["ffmpeg","-y","-i",str(video_only),"-i",str(audio),"-map","0:v:0","-map","1:a:0","-c:v","copy","-c:a","copy","-movflags","+faststart",str(lossless_master)],check=True)
    manifest = {
        "schema_version":1,
        "video":final.name,
        "lossless_audio_master":lossless_master.name,
        "soundtrack_run":provenance["run_id"],
        "soundtrack_mode":provenance["mode"],
        "soundtrack_user_acceptance":acceptance["user_acceptance"],
        "source_audio":str(audio.resolve()),
        "source_audio_sha256":sha256(audio),
        "source_audio_duration_seconds":provenance.get("source_audio_duration_seconds"),
        "source_audio_edits":provenance.get("audio_edits", []),
        "duration_seconds":round(total,3),
        "format":plan["format"],
        "speakers":[turn["speaker"] for turn in timeline],
        "closing":transcript[-1]["text"],
        "reaction_count":reaction_count,
        "visual_transition_seconds":transition_seconds,
        "deterministic_segments":audit_segments,
        "source_assets":[str(args.assets / name) for name in ["coffee-outside-agent-huddles-inside.jpg","huddle-board-reaction.jpg","identity-crosswalk.png","paris-referral-status-batch-002.png"]],
    }
    write_json(args.output / "video-manifest.json", manifest)
    write_json(args.output / "timeline.json", {"duration_seconds":round(total,3),"turns":timeline})
    print(f"Rendered {final} ({total:.2f}s, {reaction_count} emoji reactions, {len(audit_segments)} deterministic segments)")


if __name__ == "__main__":
    main()
