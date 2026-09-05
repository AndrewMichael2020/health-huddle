from pathlib import Path

from src.io_utils import read_json
from src.validate_huddle import build_report


ROOT = Path(__file__).resolve().parents[1]


def report() -> dict:
    return build_report(
        read_json(ROOT / "demo" / "huddle-script.json"),
        read_json(ROOT / "demo" / "action-ledger.json"),
        read_json(ROOT / "project" / "seed-tickets.yml"),
        read_json(ROOT / "demo" / "voice-plan.json"),
    )


def test_huddle_meaning_and_timing_are_ready_before_audio() -> None:
    result = report()
    assert result["ready"] is True, result["blockers"]
    assert 275 <= result["estimated_duration_seconds"] <= 330
    assert 70 <= result["director_floor_word_count"] <= 90


def test_huddle_has_auditable_actions_and_credit_headroom() -> None:
    result = report()
    assert result["create_issue_actions"] == 7
    assert result["total_actions"] == 13
    assert result["conservative_credit_estimate"] < result["credit_ceiling"]


def test_video_opening_is_locked_before_paid_audio() -> None:
    plan = read_json(ROOT / "demo" / "video-plan.json")
    opening = plan["opening"]
    assert (ROOT / opening["asset"]).exists()
    assert opening["duration_seconds"] == 7.0
    assert opening["fade_in_seconds"] == 2.5
    assert opening["first_voice_seconds"] == 1.0
    assert opening["fade_out_start_seconds"] == 5.5
    assert opening["fade_out_seconds"] == 1.5
    assert opening["audio_bed_end_seconds"] >= opening["duration_seconds"]
