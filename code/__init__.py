"""Utility package containing KPI calculation helpers for the Supply Chain Capacity Index (SCCI).

This package collects pure-Python implementations of the core KPI formulas used across the
platform. They are intended to serve as references for analysts experimenting with new
metrics as well as future backend services that may require Python-based computation.
"""

from .kpi_utils import (
    calculate_sdei,
    calculate_sdcui,
    calculate_sii,
    calculate_rpi,
    summarize_kpis,
)
from .ingestion_utils import (
    DatasetPaths,
    ResolvedDatasetPaths,
    DEFAULT_DATA_DIR,
    load_parquet,
    iter_dict_rows,
    load_county_pair_moves,
    load_transearch_sample,
    prepare_orbcomm_payload,
    prepare_transearch_payload,
)

__all__ = [
    "calculate_sdei",
    "calculate_sdcui",
    "calculate_sii",
    "calculate_rpi",
    "summarize_kpis",
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
