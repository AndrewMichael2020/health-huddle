from __future__ import annotations

from pathlib import Path

from src.generate_synthetic_data import generate_scenario
from src.io_utils import read_csv, read_json
from src.run_pipeline import run_pipeline


def test_synthetic_pipeline_matches_truth_and_conserves_rows(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    output_root = tmp_path / "output"
    truth = generate_scenario(data_root)
    result = run_pipeline(data_root, output_root)

    assert result["reconciliation"]["conservation_passed"] is True
    for key in (
        "meditech_source_rows",
        "meditech_current_rows",
        "meditech_superseded_rows",
        "paris_source_rows",
        "paris_current_accepted_rows",
        "paris_duplicate_or_superseded_rows",
        "paris_quarantined_rows",
        "bronze_source_rows",
        "silver_current_rows",
        "duplicate_or_superseded_rows",
        "quarantined_rows",
    ):
        assert result["metrics"][key] == truth[key]


def test_late_meditech_correction_wins_exactly_once(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    output_root = tmp_path / "output"
    generate_scenario(data_root)
    run_pipeline(data_root, output_root)

    rows = read_csv(output_root / "silver" / "ltc_encounter.csv")
    assert len({row["source_encounter_id"] for row in rows}) == len(rows)
    corrected = next(row for row in rows if row["source_encounter_id"] == "ENC00011")
    assert corrected["batch_id"] == "batch_002"


def test_paris_business_event_duplicates_are_not_current(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    output_root = tmp_path / "output"
    generate_scenario(data_root)
    result = run_pipeline(data_root, output_root)

    events = read_csv(output_root / "silver" / "ltc_status_event.csv")
    keys = [row["source_record_key"] for row in events]
    assert len(keys) == len(set(keys))
    assert result["metrics"]["paris_duplicate_or_superseded_rows"] == 4


def test_unmapped_records_are_visible_in_quarantine(tmp_path: Path) -> None:
    data_root = tmp_path / "data"
    output_root = tmp_path / "output"
    generate_scenario(data_root)
    run_pipeline(data_root, output_root)

    quarantine = read_csv(output_root / "quarantine" / "records.csv")
    reasons = [row["reason"] for row in quarantine]
    assert reasons.count("missing-enterprise-client-crosswalk") == 4
    assert reasons.count("missing-program-crosswalk") == 2
    assert read_json(data_root / "expected-results" / "scenario_truth.json")["quarantined_rows"] == len(quarantine)
