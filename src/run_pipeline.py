from __future__ import annotations

import argparse
from pathlib import Path

from .ingest_bronze import ingest_bronze
from .io_utils import write_json
from .reconcile_load import reconcile
from .standardize_records import standardize


def run_pipeline(data_root: Path, output_root: Path) -> dict:
    bronze_counts = ingest_bronze(data_root, output_root)
    metrics = standardize(data_root, output_root)
    result = {"bronze_tables": bronze_counts, "metrics": metrics, "reconciliation": reconcile(metrics)}
    write_json(output_root / "run_metrics.json", result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=Path("data"))
    parser.add_argument("--output", type=Path, default=Path(".artifacts/pipeline"))
    args = parser.parse_args()
    result = run_pipeline(args.data_root, args.output)
    print(f"Reconciliation passed: {result['reconciliation']['conservation_passed']}")


if __name__ == "__main__":
    main()
