from __future__ import annotations

from pathlib import Path

from .io_utils import read_csv, write_csv


TABLE_FILES = {
    "meditech_encounters": "meditech_encounters.csv",
    "paris_referral_status": "paris_referral_status.csv",
}


def ingest_bronze(data_root: Path, output_root: Path) -> dict[str, int]:
    counts: dict[str, int] = {}
    generated = data_root / "generated"
    for table, filename in TABLE_FILES.items():
        combined: list[dict[str, str]] = []
        for batch_dir in sorted(path for path in generated.iterdir() if path.is_dir()):
            source = batch_dir / filename
            if not source.exists():
                continue
            for row in read_csv(source):
                combined.append(
                    {
                        **row,
                        "_source_system": "meditech" if table.startswith("meditech") else "paris",
                        "_source_table": table,
                        "_batch_id": batch_dir.name,
                        "_source_file": str(source.relative_to(data_root)),
                        "_ingested_at": "2026-09-05T12:00:00Z",
                    }
                )
        write_csv(output_root / "bronze" / f"{table}.csv", combined)
        counts[table] = len(combined)
    return counts
