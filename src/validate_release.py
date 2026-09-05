from __future__ import annotations

import argparse
import copy
from pathlib import Path
from typing import Any

from .io_utils import read_csv, read_json, write_json


REQUIRED_MAP_FIELDS = (
    "source_system",
    "source_table",
    "source_field",
    "target_entity",
    "target_field",
    "data_type",
    "grain",
    "transformation",
    "classification_ref",
    "lifecycle_ref",
    "validation",
    "status",
    "owner",
)


def load_contract_bundle(contracts_root: Path) -> dict[str, Any]:
    return {
        "source_maps": read_csv(contracts_root / "meditech-source-map.csv") + read_csv(contracts_root / "paris-source-map.csv"),
        "privacy": read_json(contracts_root / "privacy-classification.yml"),
        "lifecycle": read_json(contracts_root / "lifecycle-rules.yml"),
        "release": read_json(contracts_root / "release-gates.yml"),
    }


def evaluate_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    blockers: list[dict[str, str]] = []
    for row in bundle["source_maps"]:
        missing = [field for field in REQUIRED_MAP_FIELDS if not row.get(field)]
        if missing:
            blockers.append({"type": "mapping", "item": f"{row.get('source_system')}.{row.get('source_table')}.{row.get('source_field')}", "reason": "missing:" + ",".join(missing)})
        if row.get("status") != "complete":
            blockers.append({"type": "mapping", "item": f"{row['source_system']}.{row['source_table']}.{row['source_field']}", "reason": f"status:{row.get('status')}"})

    for field in bundle["privacy"]["fields"]:
        if field.get("classification") in (None, "", "TBD") or field.get("status") != "approved":
            blockers.append({"type": "privacy", "item": field["field"], "reason": "classification-not-approved"})

    for record in bundle["lifecycle"]["records"]:
        unresolved = [name for name in ("correction_strategy", "deletion_strategy", "retention_status") if record.get(name) in (None, "", "TBD", "pending")]
        if unresolved:
            blockers.append({"type": "lifecycle", "item": record["record"], "reason": "unresolved:" + ",".join(unresolved)})

    for gate in bundle["release"]["gates"]:
        if gate.get("status") != "approved":
            blockers.append({"type": "release", "item": gate["name"], "reason": f"status:{gate.get('status')}"})

    return {"release_ready": not blockers, "blocker_count": len(blockers), "blockers": blockers}


def approved_test_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    approved = copy.deepcopy(bundle)
    for row in approved["source_maps"]:
        row["status"] = "complete"
        for field in REQUIRED_MAP_FIELDS:
            if not row.get(field):
                row[field] = "not-applicable"
    for field in approved["privacy"]["fields"]:
        if field["field"] == "paris.referral_note":
            field["classification"] = "restricted-free-text"
        field["status"] = "approved"
    for record in approved["lifecycle"]["records"]:
        record["correction_strategy"] = "retain-history-and-publish-latest"
        record["deletion_strategy"] = "retain-tombstone"
        record["retention_status"] = "approved"
    for gate in approved["release"]["gates"]:
        gate["status"] = "approved"
    return approved


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contracts", type=Path, default=Path("contracts"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--require-ready", action="store_true")
    args = parser.parse_args()
    result = evaluate_bundle(load_contract_bundle(args.contracts))
    if args.output:
        write_json(args.output, result)
    print(f"Release ready: {result['release_ready']}; blockers: {result['blocker_count']}")
    if args.require_ready and not result["release_ready"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
