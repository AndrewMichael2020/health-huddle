from __future__ import annotations

from collections import defaultdict
from pathlib import Path

from .io_utils import read_csv, write_csv


def _latest(rows: list[dict[str, str]], key_fields: tuple[str, ...]) -> tuple[list[dict[str, str]], int]:
    grouped: dict[tuple[str, ...], list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[tuple(row[field] for field in key_fields)].append(row)
    current = [max(group, key=lambda item: (item["modified_at"], item["_batch_id"], item.get("source_row_id", item.get("paris_row_id", "")))) for group in grouped.values()]
    return current, len(rows) - len(current)


def standardize(data_root: Path, output_root: Path) -> dict[str, int]:
    identity_rows = read_csv(data_root / "reference" / "identity_crosswalk.csv")
    identities = {(row["source_system"], row["source_client_id"]): row["enterprise_client_id"] for row in identity_rows}
    facilities = {row["source_code"]: row["location_id"] for row in read_csv(data_root / "reference" / "facility_crosswalk.csv")}
    programs = {row["source_code"]: row["program_id"] for row in read_csv(data_root / "reference" / "program_crosswalk.csv")}

    meditech_raw = read_csv(output_root / "bronze" / "meditech_encounters.csv")
    meditech_current, meditech_superseded = _latest(meditech_raw, ("encounter_id",))
    encounters = []
    quarantine = []
    for row in sorted(meditech_current, key=lambda item: item["encounter_id"]):
        enterprise_id = identities.get(("meditech", row["source_client_id"]))
        location_id = facilities.get(row["facility_code"])
        reasons = []
        if not enterprise_id:
            reasons.append("missing-enterprise-client-crosswalk")
        if not location_id:
            reasons.append("missing-facility-crosswalk")
        if reasons:
            quarantine.append({"source_system": "meditech", "source_record_key": row["encounter_id"], "reason": ";".join(reasons), "batch_id": row["_batch_id"]})
            continue
        encounters.append(
            {
                "enterprise_client_id": enterprise_id,
                "source_encounter_id": row["encounter_id"],
                "location_id": location_id,
                "admit_at": row["admit_at"],
                "discharge_at": row["discharge_at"],
                "source_modified_at": row["modified_at"],
                "source_system": "meditech",
                "source_record_key": row["encounter_id"],
                "batch_id": row["_batch_id"],
            }
        )

    paris_raw = read_csv(output_root / "bronze" / "paris_referral_status.csv")
    paris_current, paris_superseded = _latest(paris_raw, ("referral_id", "status_code", "event_at"))
    status_events = []
    for row in sorted(paris_current, key=lambda item: (item["referral_id"], item["event_at"], item["status_code"])):
        enterprise_id = identities.get(("paris", row["source_client_id"]))
        program_id = programs.get(row["program_code"])
        reasons = []
        if not enterprise_id:
            reasons.append("missing-enterprise-client-crosswalk")
        if not program_id:
            reasons.append("missing-program-crosswalk")
        key = "|".join((row["referral_id"], row["status_code"], row["event_at"]))
        if reasons:
            quarantine.append({"source_system": "paris", "source_record_key": key, "reason": ";".join(reasons), "batch_id": row["_batch_id"]})
            continue
        status_events.append(
            {
                "enterprise_client_id": enterprise_id,
                "referral_id": row["referral_id"],
                "program_id": program_id,
                "status_code": row["status_code"].upper(),
                "event_at": row["event_at"],
                "source_modified_at": row["modified_at"],
                "referral_note": "",
                "source_system": "paris",
                "source_record_key": key,
                "batch_id": row["_batch_id"],
            }
        )

    write_csv(output_root / "silver" / "ltc_encounter.csv", encounters)
    write_csv(output_root / "silver" / "ltc_status_event.csv", status_events)
    write_csv(output_root / "quarantine" / "records.csv", quarantine, ["source_system", "source_record_key", "reason", "batch_id"])

    return {
        "meditech_source_rows": len(meditech_raw),
        "meditech_current_rows": len(encounters),
        "meditech_superseded_rows": meditech_superseded,
        "paris_source_rows": len(paris_raw),
        "paris_current_accepted_rows": len(status_events),
        "paris_duplicate_or_superseded_rows": paris_superseded,
        "paris_quarantined_rows": sum(1 for row in quarantine if row["source_system"] == "paris"),
        "bronze_source_rows": len(meditech_raw) + len(paris_raw),
        "silver_current_rows": len(encounters) + len(status_events),
        "duplicate_or_superseded_rows": meditech_superseded + paris_superseded,
        "quarantined_rows": len(quarantine),
    }
