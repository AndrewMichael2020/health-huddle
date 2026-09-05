from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any

from .io_utils import read_json, write_json


WORD_RE = re.compile(r"[A-Za-z0-9]+(?:[-’'][A-Za-z0-9]+)*")
REQUIRED_HUMAN_HANDOFFS = (
    "Human Analytics Director",
    "Human BI Analyst",
    "LTC Source Mapping Working Group",
    "Human Data Engineering",
    "Human Privacy and Security",
    "Human Systems Owner",
)
REQUIRED_FACTS = (
    "294 delivered rows",
    "279 current",
    "nine duplicate or superseded",
    "six quarantined",
    "five corrected encounters",
    "Four rows are new deliveries",
)
BANNED_PHRASES = ("bespoke", "DevOps ticket", "DevOps tickets")


def word_count(text: str) -> int:
    return len(WORD_RE.findall(text))


def build_report(script: dict[str, Any], ledger: dict[str, Any], seed: dict[str, Any], voice_plan: dict[str, Any]) -> dict[str, Any]:
    blockers: list[str] = []
    agents = {agent["id"]: agent for agent in script["agents"]}
    turns = script["turns"]
    turn_ids = {turn["id"] for turn in turns}
    all_text = " ".join(turn["text"] for turn in turns)

    if len(agents) != 6:
        blockers.append("exactly-six-agents-required")
    genders = [agent["voice_gender"] for agent in agents.values()]
    if genders.count("female") != 3 or genders.count("male") != 3:
        blockers.append("voice-ratio-must-be-three-female-three-male")
    if sum(bool(agent.get("huddle_lead")) for agent in agents.values()) != 1:
        blockers.append("exactly-one-huddle-lead-required")
    director = next((agent for agent in agents.values() if agent["role"] == "Analytics Director Agent"), None)
    if not director or director.get("huddle_lead"):
        blockers.append("analytics-director-agent-must-not-lead")

    for agent_id, agent in agents.items():
        agent_turns = [turn for turn in turns if turn["speaker"] == agent_id]
        if not agent_turns:
            blockers.append(f"agent-without-turn:{agent_id}")
            continue
        if "Agent" not in agent["role"]:
            blockers.append(f"role-missing-agent-label:{agent_id}")
        first_text = agent_turns[0]["text"]
        if agent["name"] not in first_text or agent["role"] not in first_text:
            blockers.append(f"first-turn-does-not-identify-agent:{agent_id}")

    unknown_speakers = sorted({turn["speaker"] for turn in turns} - set(agents))
    blockers.extend(f"unknown-speaker:{speaker}" for speaker in unknown_speakers)
    if len(turn_ids) != len(turns):
        blockers.append("duplicate-turn-id")

    director_words = sum(word_count(turn["text"]) for turn in turns if turn["phase"] == "director-floor")
    if not 70 <= director_words <= 90:
        blockers.append(f"director-floor-word-count:{director_words}")
    question_words = sum(word_count(turn["text"]) for turn in turns if turn["phase"] in {"questions", "closing"})
    if not 65 <= question_words <= 105:
        blockers.append(f"closing-question-word-count:{question_words}")

    spoken_turns = [turn for turn in turns if not turn.get("overlap_group")]
    total_words = sum(word_count(turn["text"]) for turn in spoken_turns)
    estimated_seconds = total_words / script["speaking_rate_wpm"] * 60 + len(spoken_turns) * 0.28
    if not 225 <= estimated_seconds <= 330:
        blockers.append(f"estimated-duration-seconds:{estimated_seconds:.1f}")

    for phrase in REQUIRED_HUMAN_HANDOFFS:
        if phrase not in all_text:
            blockers.append(f"missing-human-handoff:{phrase}")
    for fact in REQUIRED_FACTS:
        if fact not in all_text:
            blockers.append(f"missing-scenario-fact:{fact}")
    for phrase in BANNED_PHRASES:
        if phrase.lower() in all_text.lower():
            blockers.append(f"banned-phrase:{phrase}")
    for term in ("privacy classification", "retention treatment", "release validation requirements", "test promotion remains blocked"):
        if term.lower() not in all_text.lower():
            blockers.append(f"missing-release-meaning:{term}")
    if sum("Ha," in turn["text"] or "red on this board" in turn["text"] for turn in turns) < 3:
        blockers.append("fewer-than-three-light-moments")
    if sum("I can" in turn["text"] or "I’ll" in turn["text"] for turn in turns) < 4:
        blockers.append("insufficient-help-offers")
    if len([turn for turn in turns if turn.get("overlap_group") == "happy-monday"]) != 5:
        blockers.append("closing-overlap-must-have-five-responding-agents")

    seed_titles = {ticket["title"] for ticket in seed["tickets"]}
    expected_created = {ticket["title"] for ticket in seed["huddle_created_tickets"]}
    created = [action for action in ledger["actions"] if action["type"] == "create_issue"]
    if {action["title"] for action in created} != expected_created:
        blockers.append("created-ticket-set-does-not-match-seed-plan")
    for action in ledger["actions"]:
        if action["at_turn"] not in turn_ids:
            blockers.append(f"action-references-unknown-turn:{action['id']}")
        if action["type"] in {"move_issue", "close_issue"} and action["title"] not in seed_titles:
            blockers.append(f"action-references-nonseed-ticket:{action['id']}")
    valid_statuses = {"Backlog", "Ready", "In Progress", "Blocked", "Review", "Done"}
    for action in ledger["actions"]:
        if action["type"] == "move_issue" and ({action["from"], action["to"]} - valid_statuses):
            blockers.append(f"invalid-status:{action['id']}")

    script_characters = sum(len(turn["text"]) for turn in turns)
    trial_characters = len(agents) * voice_plan["trial_text_characters_per_voice"]
    retry_reserve = voice_plan["selective_retry_reserve_characters"]
    conservative_credits = script_characters + trial_characters + retry_reserve
    if conservative_credits > voice_plan["credit_ceiling"]:
        blockers.append(f"credit-ceiling-exceeded:{conservative_credits}")
    plan_voices = voice_plan["voices"]
    if set(plan_voices) != set(agents):
        blockers.append("voice-plan-agent-set-mismatch")
    if len({voice["voice_id"] for voice in plan_voices.values()}) != 6:
        blockers.append("voice-ids-must-be-unique")
    for agent_id, voice in plan_voices.items():
        if voice["gender"] != agents[agent_id]["voice_gender"]:
            blockers.append(f"voice-gender-mismatch:{agent_id}")

    return {
        "ready": not blockers,
        "blockers": blockers,
        "agent_count": len(agents),
        "nonoverlap_word_count": total_words,
        "script_character_count": script_characters,
        "director_floor_word_count": director_words,
        "closing_question_word_count": question_words,
        "estimated_duration_seconds": round(estimated_seconds, 1),
        "create_issue_actions": len(created),
        "total_actions": len(ledger["actions"]),
        "conservative_credit_estimate": conservative_credits,
        "credit_ceiling": voice_plan["credit_ceiling"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo-root", type=Path, default=Path("demo"))
    parser.add_argument("--project-root", type=Path, default=Path("project"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--require-ready", action="store_true")
    args = parser.parse_args()
    report = build_report(
        read_json(args.demo_root / "huddle-script.json"),
        read_json(args.demo_root / "action-ledger.json"),
        read_json(args.project_root / "seed-tickets.yml"),
        read_json(args.demo_root / "voice-plan.json"),
    )
    if args.output:
        write_json(args.output, report)
    print(f"Huddle ready: {report['ready']}; blockers: {len(report['blockers'])}; estimated seconds: {report['estimated_duration_seconds']}; credits: {report['conservative_credit_estimate']}")
    if args.require_ready and not report["ready"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
