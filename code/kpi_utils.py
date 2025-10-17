"""Core KPI helper utilities for the Supply Chain Capacity Index (SCCI).

These functions mirror the business definitions that power both the Streamlit prototype
and the production Node.js service. Keeping the reference implementations in Python makes
it easy for data scientists to prototype new metrics while ensuring parity with the
running system.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional

Precision = int


def _safe_divide(numerator: Optional[float], denominator: Optional[float], precision: Precision = 4) -> Optional[float]:
    """Safely divide two numbers returning a rounded float or ``None`` when invalid.

    Args:
        numerator: Value to be divided.
        denominator: Value to divide by. ``None`` or zero returns ``None``.
        precision: Number of decimal places to round to.

    Returns:
        The rounded division result, or ``None`` when the operation is undefined.
    """
    if numerator is None:
        return None
    if denominator in (None, 0):
        return None

    try:
        result = float(numerator) / float(denominator)
    except (TypeError, ValueError, ZeroDivisionError):
        return None

    return round(result, precision)


def calculate_sdei(available: Optional[float], loaded: Optional[float], *, precision: Precision = 4) -> Optional[float]:
    """Supply–Demand Equilibrium Index (SDEI) = Available / Loaded."""
    return _safe_divide(available, loaded, precision)


def calculate_sdcui(used: Optional[float], total: Optional[float], *, precision: Precision = 4) -> Optional[float]:
    """Supply–Demand Capacity Utilization Index (SDCUI) = Used / Total."""
    return _safe_divide(used, total, precision)


def calculate_sii(
    avg_stop_duration: Optional[float],
    trips_over_five_minutes: Optional[float],
    total_trips: Optional[float],
    *,
    precision: Precision = 4,
) -> Optional[float]:
    """Stop Intensity Index (SII).

    SII = Average Stop Duration × (Trips > 5 minutes / Total Trips)
    """
    stop_ratio = _safe_divide(trips_over_five_minutes, total_trips, precision)
    if avg_stop_duration is None or stop_ratio is None:
        return None

    try:
        value = float(avg_stop_duration) * stop_ratio
    except (TypeError, ValueError):
        return None

    return round(value, precision)


def calculate_rpi(performance_variation: Optional[float], *, precision: Precision = 4) -> Optional[float]:
    """Route Performance Index (RPI) = Route-level performance variation."""
    if performance_variation is None:
        return None

    try:
        return round(float(performance_variation), precision)
    except (TypeError, ValueError):
        return None


@dataclass(frozen=True)
class KpiInput:
    """Container for raw KPI input values used by :func:`summarize_kpis`."""

    available: Optional[float] = None
    loaded: Optional[float] = None
    used: Optional[float] = None
    total: Optional[float] = None
    avg_stop_duration: Optional[float] = None
    trips_over_five: Optional[float] = None
    total_trips: Optional[float] = None
    performance_variation: Optional[float] = None


def summarize_kpis(values: Mapping[str, Optional[float]] | KpiInput, *, precision: Precision = 4) -> Mapping[str, Optional[float]]:
    """Compute all primary KPIs from either a mapping or :class:`KpiInput` instance."""
    if isinstance(values, KpiInput):
        payload = values.__dict__
    else:
        payload = dict(values)

    sdei = calculate_sdei(payload.get("available"), payload.get("loaded"), precision=precision)
    sdcui = calculate_sdcui(payload.get("used"), payload.get("total"), precision=precision)
    sii = calculate_sii(
        payload.get("avg_stop_duration"),
        payload.get("trips_over_five"),
        payload.get("total_trips"),
        precision=precision,
    )
    rpi = calculate_rpi(payload.get("performance_variation"), precision=precision)

    return {
        "sdei": sdei,
        "sdcui": sdcui,
        "sii": sii,
        "rpi": rpi,
    }
