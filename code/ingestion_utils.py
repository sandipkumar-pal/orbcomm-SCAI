"""Data ingestion helpers for working with local Parquet extracts.

These utilities mirror the production ingestion module found in
``backend/services/dataIngestionService.js``. They are intentionally lightweight so
that analysts can explore new KPI inputs or validate route-level data entirely in
Python without touching the running services.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Mapping, MutableMapping, Optional

import pandas as pd

DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@dataclass(frozen=True)
class DatasetPaths:
    """Container holding the canonical dataset filenames used by the project."""

    county_pair_moves: Path = Path("county_pair_move_data_06037-04019.parquet")
    transearch_sample: Path = Path("transearch_data_sample.parquet")

    def resolve(self, base_dir: Optional[Path] = None) -> "ResolvedDatasetPaths":
        base = Path(base_dir) if base_dir is not None else DEFAULT_DATA_DIR
        return ResolvedDatasetPaths(
            county_pair_moves=base / self.county_pair_moves,
            transearch_sample=base / self.transearch_sample,
        )


@dataclass(frozen=True)
class ResolvedDatasetPaths:
    county_pair_moves: Path
    transearch_sample: Path


def _ensure_exists(path: Path) -> Path:
    if not path.exists():
        raise FileNotFoundError(f"Data file not found: {path}")
    return path


def load_parquet(path: Path, *, columns: Optional[Iterable[str]] = None) -> pd.DataFrame:
    """Load a Parquet file into a :class:`pandas.DataFrame` with existence checks."""

    resolved = _ensure_exists(path)
    return pd.read_parquet(resolved, columns=list(columns) if columns else None)


def iter_dict_rows(frame: pd.DataFrame) -> Iterator[Mapping[str, object]]:
    """Yield DataFrame rows as dictionaries while preserving column names."""

    for _, row in frame.iterrows():
        yield row.to_dict()


def load_county_pair_moves(*, data_dir: Optional[Path] = None) -> pd.DataFrame:
    """Load the ORBCOMM county pair movement sample."""

    paths = DatasetPaths().resolve(base_dir=data_dir)
    return load_parquet(paths.county_pair_moves)


def load_transearch_sample(*, data_dir: Optional[Path] = None) -> pd.DataFrame:
    """Load the Transearch performance variation sample."""

    paths = DatasetPaths().resolve(base_dir=data_dir)
    return load_parquet(paths.transearch_sample)


def prepare_orbcomm_payload(row: Mapping[str, object]) -> MutableMapping[str, object]:
    """Normalise a county pair row into the shape expected by the backend service."""

    payload: MutableMapping[str, object] = {
        "route_code": row.get("route_code") or row.get("routeCode"),
        "week": row.get("week"),
        "available": row.get("available"),
        "loaded": row.get("loaded"),
        "used": row.get("used"),
        "total": row.get("total"),
        "avg_stop_duration": row.get("avg_stop_duration") or row.get("avgStopDuration"),
        "trips_over_five": row.get("trips_over_five") or row.get("tripsOverFive"),
        "total_trips": row.get("total_trips") or row.get("totalTrips"),
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "event_timestamp": row.get("event_timestamp") or row.get("eventTimestamp"),
    }

    if "origin_county" in row or "originCounty" in row:
        payload["origin_county"] = row.get("origin_county") or row.get("originCounty")
    if "destination_county" in row or "destinationCounty" in row:
        payload["destination_county"] = row.get("destination_county") or row.get("destinationCounty")
    if "mode" in row or "transport_mode" in row:
        payload["mode"] = row.get("mode") or row.get("transport_mode")

    return payload


def prepare_transearch_payload(row: Mapping[str, object]) -> MutableMapping[str, object]:
    """Normalise a Transearch row for direct API ingestion."""

    return {
        "route_code": row.get("route_code") or row.get("routeCode"),
        "week": row.get("week"),
        "performance_variation": row.get("performance_variation") or row.get("performanceVariation"),
    }


__all__ = [
    "DatasetPaths",
    "ResolvedDatasetPaths",
    "DEFAULT_DATA_DIR",
    "load_parquet",
    "iter_dict_rows",
    "load_county_pair_moves",
    "load_transearch_sample",
    "prepare_orbcomm_payload",
    "prepare_transearch_payload",
]
