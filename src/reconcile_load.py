from __future__ import annotations

from typing import Any


def reconcile(metrics: dict[str, int]) -> dict[str, Any]:
    accounted = metrics["silver_current_rows"] + metrics["duplicate_or_superseded_rows"] + metrics["quarantined_rows"]
    source = metrics["bronze_source_rows"]
    return {
        "source_rows": source,
        "current_rows": metrics["silver_current_rows"],
        "duplicate_or_superseded_rows": metrics["duplicate_or_superseded_rows"],
        "quarantined_rows": metrics["quarantined_rows"],
        "accounted_rows": accounted,
        "difference": source - accounted,
        "conservation_passed": source == accounted,
    }
