from __future__ import annotations

import argparse
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .io_utils import write_csv, write_json


SEED = 20260905
CLIENT_COUNT = 120


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def generate_scenario(data_root: Path, seed: int = SEED) -> dict[str, int]:
    rng = random.Random(seed)
    batch_1 = data_root / "generated" / "batch_001"
    batch_2 = data_root / "generated" / "batch_002"
    reference = data_root / "reference"
    expected = data_root / "expected-results"

    facilities = [
        {"source_code": "SKG-A", "location_id": "LOC-ACUTE-NORTH", "location_name": "North Valley Hospital"},
        {"source_code": "SKG-B", "location_id": "LOC-ACUTE-CENTRAL", "location_name": "Central Sound Hospital"},
        {"source_code": "SKG-C", "location_id": "LOC-ACUTE-SOUTH", "location_name": "South Ridge Hospital"},
    ]
    programs = [
        {"source_code": "LTC-ACC", "program_id": "PROGRAM-LTC-ACCESS", "program_name": "LTC Access"},
        {"source_code": "LTC-HOME", "program_id": "PROGRAM-LTC-HOME", "program_name": "Home Health Transition"},
        {"source_code": "LTC-TRANS", "program_id": "PROGRAM-LTC-TRANS", "program_name": "Transitional Care"},
    ]
    identities = []
    for number in range(1, CLIENT_COUNT + 1):
        enterprise_id = f"E{number:05d}"
        identities.append({"source_system": "meditech", "source_client_id": f"M{number:05d}", "enterprise_client_id": enterprise_id})
        if number <= CLIENT_COUNT - 2:
            identities.append({"source_system": "paris", "source_client_id": f"P{number:05d}", "enterprise_client_id": enterprise_id})

    write_csv(reference / "facility_crosswalk.csv", facilities)
    write_csv(reference / "program_crosswalk.csv", programs)
    write_csv(reference / "identity_crosswalk.csv", identities)

    start = datetime(2025, 1, 1, 8, tzinfo=timezone.utc)
    meditech_initial: list[dict[str, str]] = []
    for number in range(1, 81):
        admit = start + timedelta(days=number * 4, hours=rng.randint(0, 10))
        discharge = admit + timedelta(days=rng.randint(2, 14), hours=rng.randint(0, 8))
        meditech_initial.append(
            {
                "source_row_id": f"MED-R{number:05d}",
                "encounter_id": f"ENC{number:05d}",
                "source_client_id": f"M{number:05d}",
                "facility_code": facilities[number % len(facilities)]["source_code"],
                "admit_at": iso(admit),
                "discharge_at": iso(discharge),
                "modified_at": iso(discharge + timedelta(hours=2)),
                "status": "DISCHARGED",
            }
        )

    meditech_incremental: list[dict[str, str]] = []
    for index in range(5):
        original = meditech_initial[10 + index * 7]
        corrected_discharge = datetime.fromisoformat(original["discharge_at"].replace("Z", "+00:00")) + timedelta(days=1)
        modified = corrected_discharge + timedelta(days=21 + index)
        meditech_incremental.append(
            {
                **original,
                "source_row_id": f"MED-C{index + 1:05d}",
                "discharge_at": iso(corrected_discharge),
                "modified_at": iso(modified),
            }
        )

    paris_initial: list[dict[str, str]] = []
    row_number = 1
    for number in range(21, 121):
        referral_date = start + timedelta(days=number * 3, hours=rng.randint(0, 8))
        program = programs[number % len(programs)]["source_code"]
        for offset, status in ((0, "REFERRED"), (rng.randint(3, 18), "ASSESSED")):
            event_at = referral_date + timedelta(days=offset)
            paris_initial.append(
                {
                    "paris_row_id": f"PAR-R{row_number:05d}",
                    "referral_id": f"REF{number:05d}",
                    "source_client_id": f"P{number:05d}",
                    "program_code": program,
                    "status_code": status,
                    "event_at": iso(event_at),
                    "modified_at": iso(event_at + timedelta(hours=1)),
                    "referral_note": "Synthetic referral note" if number % 25 == 0 else "",
                }
            )
            row_number += 1

    paris_incremental: list[dict[str, str]] = []
    for index, original in enumerate(paris_initial[:4], start=1):
        paris_incremental.append({**original, "paris_row_id": f"PAR-D{index:05d}"})

    for number in range(21, 24):
        assessed = next(row for row in paris_initial if row["referral_id"] == f"REF{number:05d}" and row["status_code"] == "ASSESSED")
        event_at = datetime.fromisoformat(assessed["event_at"].replace("Z", "+00:00")) + timedelta(days=7)
        paris_incremental.append(
            {
                "paris_row_id": f"PAR-N{number:05d}",
                "referral_id": f"REF{number:05d}",
                "source_client_id": f"P{number:05d}",
                "program_code": assessed["program_code"],
                "status_code": "READY",
                "event_at": iso(event_at),
                "modified_at": iso(event_at + timedelta(hours=1)),
                "referral_note": "",
            }
        )

    for number in range(30, 32):
        event_at = start + timedelta(days=360 + number)
        paris_incremental.append(
            {
                "paris_row_id": f"PAR-X{number:05d}",
                "referral_id": f"REF-X{number:05d}",
                "source_client_id": f"P{number:05d}",
                "program_code": "LTC-UNMAPPED",
                "status_code": "REFERRED",
                "event_at": iso(event_at),
                "modified_at": iso(event_at + timedelta(hours=1)),
                "referral_note": "Synthetic note requiring classification",
            }
        )

    write_csv(batch_1 / "meditech_encounters.csv", meditech_initial)
    write_csv(batch_2 / "meditech_encounters.csv", meditech_incremental)
    write_csv(batch_1 / "paris_referral_status.csv", paris_initial)
    write_csv(batch_2 / "paris_referral_status.csv", paris_incremental)

    truth = {
        "seed": seed,
        "meditech_source_rows": 85,
        "meditech_current_rows": 80,
        "meditech_superseded_rows": 5,
        "paris_source_rows": 209,
        "paris_current_accepted_rows": 199,
        "paris_duplicate_or_superseded_rows": 4,
        "paris_quarantined_rows": 6,
        "missing_identity_current_rows": 4,
        "unmapped_program_current_rows": 2,
        "bronze_source_rows": 294,
        "silver_current_rows": 279,
        "duplicate_or_superseded_rows": 9,
        "quarantined_rows": 6,
    }
    write_json(expected / "scenario_truth.json", truth)
    return truth


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data"))
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()
    truth = generate_scenario(args.output, args.seed)
    print(f"Generated {truth['bronze_source_rows']} synthetic source rows with seed {args.seed}.")


if __name__ == "__main__":
    main()
