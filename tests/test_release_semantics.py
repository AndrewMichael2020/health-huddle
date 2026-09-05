from __future__ import annotations

from pathlib import Path

from src.validate_release import approved_test_bundle, evaluate_bundle, load_contract_bundle


ROOT = Path(__file__).resolve().parents[1]


def test_current_contract_is_blocked_for_meaning_not_pipeline_syntax() -> None:
    result = evaluate_bundle(load_contract_bundle(ROOT / "contracts"))
    blocker_types = {blocker["type"] for blocker in result["blockers"]}

    assert result["release_ready"] is False
    assert {"mapping", "privacy", "lifecycle", "release"}.issubset(blocker_types)
    assert any(blocker["item"] == "paris.referral_note" for blocker in result["blockers"])
    assert any(blocker["item"] == "meditech.encounter" for blocker in result["blockers"])
    assert any(blocker["item"] == "paris.referral_status" for blocker in result["blockers"])


def test_gate_can_pass_after_all_documented_approvals() -> None:
    current = load_contract_bundle(ROOT / "contracts")
    approved = approved_test_bundle(current)
    result = evaluate_bundle(approved)

    assert result == {"release_ready": True, "blocker_count": 0, "blockers": []}
