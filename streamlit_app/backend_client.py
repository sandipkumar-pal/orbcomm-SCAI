"""Utility client for interacting with the SCCI backend APIs from Streamlit."""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, List, Optional

import requests


class BackendError(RuntimeError):
    """Raised when the backend responds with a non-success status code."""


@dataclass
class RouteSummary:
    code: str
    origin: Optional[str]
    destination: Optional[str]
    mode: Optional[str]
    weeks: List[str]


class BackendClient:
    """Simple wrapper around the REST API with JWT session awareness."""

    def __init__(self, base_url: Optional[str] = None) -> None:
        self.base_url = base_url or os.environ.get("BACKEND_URL", "http://localhost:4000")
        self._session = requests.Session()
        self._token: Optional[str] = None

    # ------------------------------------------------------------------
    # Authentication helpers
    # ------------------------------------------------------------------
    def login(self, email: str, password: str) -> Dict:
        """Authenticate against the backend and retain the JWT."""
        try:
            response = self._session.post(
                f"{self.base_url}/auth/login",
                json={"email": email, "password": password},
                timeout=30,
            )
        except requests.RequestException as exc:
            raise BackendError(str(exc)) from exc
        if response.status_code >= 400:
            raise BackendError(response.json().get("message", "Login failed"))

        payload = response.json()
        token = payload.get("token")
        if not token:
            raise BackendError("Login succeeded but token missing in response")

        self._token = token
        return payload

    def _headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {"Accept": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers

    # ------------------------------------------------------------------
    # Data accessors
    # ------------------------------------------------------------------
    def list_routes(self) -> List[RouteSummary]:
        try:
            response = self._session.get(
                f"{self.base_url}/api/kpi",
                headers=self._headers(),
                timeout=30,
            )
        except requests.RequestException as exc:
            raise BackendError(str(exc)) from exc
        if response.status_code >= 400:
            raise BackendError(response.json().get("message", "Unable to load routes"))

        routes: List[RouteSummary] = []
        for item in response.json():
            routes.append(
                RouteSummary(
                    code=item.get("code"),
                    origin=item.get("origin"),
                    destination=item.get("destination"),
                    mode=item.get("mode"),
                    weeks=[str(week) for week in item.get("weeks", [])],
                )
            )
        return routes

    def fetch_kpis(self, route_code: str, week: str) -> Dict:
        try:
            response = self._session.get(
                f"{self.base_url}/api/kpi/{route_code}/{week}",
                headers=self._headers(),
                timeout=30,
            )
        except requests.RequestException as exc:
            raise BackendError(str(exc)) from exc
        if response.status_code == 404:
            raise BackendError("No KPI data found for selection")
        if response.status_code >= 400:
            raise BackendError(response.json().get("message", "Unable to load KPIs"))
        return response.json()

    def fetch_trend(self, route_code: str, weeks: List[str]) -> List[Dict]:
        try:
            response = self._session.post(
                f"{self.base_url}/api/kpi/{route_code}/trend",
                headers=self._headers(),
                json={"weeks": weeks},
                timeout=30,
            )
        except requests.RequestException as exc:
            raise BackendError(str(exc)) from exc
        if response.status_code >= 400:
            raise BackendError(response.json().get("message", "Unable to load KPI trend"))
        return response.json()

    def fetch_map(self, route_code: str) -> Dict:
        try:
            response = self._session.get(
                f"{self.base_url}/api/map/{route_code}",
                headers=self._headers(),
                timeout=30,
            )
        except requests.RequestException as exc:
            raise BackendError(str(exc)) from exc
        if response.status_code == 404:
            raise BackendError("Route telemetry not found")
        if response.status_code >= 400:
            raise BackendError(response.json().get("message", "Unable to load map data"))
        return response.json()


__all__ = ["BackendClient", "BackendError", "RouteSummary"]
