from __future__ import annotations

import os
from typing import List

import pandas as pd
import plotly.express as px
import pydeck as pdk
import streamlit as st

from backend_client import BackendClient, BackendError


DEFAULT_BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:4000")


def ensure_client() -> BackendClient:
    backend_url = st.session_state.get("backend_url", DEFAULT_BACKEND_URL)
    client = st.session_state.get("backend_client")
    if client is None:
        client = BackendClient(backend_url)
        st.session_state.backend_client = client
        st.session_state.backend_url = backend_url
    return client


def reset_session_for_backend(new_url: str) -> None:
    st.session_state.backend_url = new_url
    st.session_state.backend_client = BackendClient(new_url)
    st.session_state.auth_payload = None
    st.session_state.user = None
    st.session_state.routes = None


def require_login(client: BackendClient) -> bool:
    st.sidebar.header("Authentication")
    backend_url = st.sidebar.text_input("Backend URL", st.session_state.get("backend_url", DEFAULT_BACKEND_URL))
    if backend_url != st.session_state.get("backend_url", DEFAULT_BACKEND_URL):
        reset_session_for_backend(backend_url)
        client = st.session_state.backend_client

    auth_payload = st.session_state.get("auth_payload")
    if auth_payload:
        user = auth_payload.get("user", {})
        st.sidebar.success(f"Signed in as {user.get('email')} ({user.get('role')})")
        if st.sidebar.button("Sign out"):
            st.session_state.auth_payload = None
            st.session_state.user = None
            st.session_state.routes = None
        return True

    with st.sidebar.form("login-form", clear_on_submit=False):
        email = st.text_input("Email", key="login-email")
        password = st.text_input("Password", type="password", key="login-password")
        submitted = st.form_submit_button("Sign in")
        if submitted:
            try:
                payload = client.login(email=email.strip(), password=password)
                st.session_state.auth_payload = payload
                st.session_state.user = payload.get("user")
                st.session_state.routes = None
                st.rerun()
            except BackendError as err:
                st.error(str(err))
    return False


def render_kpi_cards(kpi_payload: dict) -> None:
    cols = st.columns(4)
    cols[0].metric("SDEI", kpi_payload.get("sdei"))
    cols[1].metric("SDCUI", kpi_payload.get("sdcui"))
    cols[2].metric("SII", kpi_payload.get("sii"))
    cols[3].metric("RPI", kpi_payload.get("rpi"))

    with st.expander("Raw KPI Inputs"):
        st.json(kpi_payload.get("raw", {}))


def render_trend_chart(trend_points: List[dict]) -> None:
    if not trend_points:
        st.info("Trend data unavailable for this route")
        return

    trend_df = pd.DataFrame(trend_points)
    melted = trend_df.melt(id_vars="week", value_vars=["sdei", "sdcui", "sii"], var_name="Metric", value_name="Value")
    fig = px.line(melted, x="week", y="Value", color="Metric", markers=True, title="KPI Trend")
    fig.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1))
    st.plotly_chart(fig, use_container_width=True)


def render_map(map_payload: dict) -> None:
    telemetry = map_payload.get("telemetry", [])
    if not telemetry:
        st.warning("No telemetry points available for this route")
        return

    telemetry_df = pd.DataFrame(telemetry)
    telemetry_df = telemetry_df.dropna(subset=["latitude", "longitude"])
    if telemetry_df.empty:
        st.warning("Telemetry data missing coordinates")
        return

    sorted_points = telemetry_df.sort_values("event_timestamp")
    path_points = sorted_points[["longitude", "latitude"]].values.tolist()
    if len(path_points) >= 2:
        layer = pdk.Layer(
            "PathLayer",
            data=[{"path": path_points}],
            get_color=[255, 99, 71],
            width_min_pixels=5,
        )
    else:
        layer = pdk.Layer(
            "ScatterplotLayer",
            data=sorted_points,
            get_position="[longitude, latitude]",
            get_fill_color=[255, 99, 71],
            get_radius=5000,
        )

    mapbox_token = os.environ.get("MAPBOX_TOKEN")
    deck = pdk.Deck(
        layers=[layer],
        initial_view_state=pdk.ViewState(
            latitude=telemetry_df["latitude"].mean(),
            longitude=telemetry_df["longitude"].mean(),
            zoom=5,
            pitch=30,
        ),
        map_style="mapbox://styles/mapbox/light-v10" if mapbox_token else None,
        map_provider="mapbox" if mapbox_token else "carto",
        api_keys={"mapbox": mapbox_token} if mapbox_token else None,
    )

    st.pydeck_chart(deck)


st.set_page_config(page_title="SCCI Dashboard", layout="wide")
st.title("Supply Chain Capacity Index Dashboard")
st.caption("Interactive analytics powered by the SCCI backend APIs")

client = ensure_client()

if not require_login(client):
    st.info("Sign in to load KPIs and map visualizations.")
    st.stop()

client = st.session_state.backend_client

if "routes" not in st.session_state or st.session_state.routes is None:
    try:
        st.session_state.routes = client.list_routes()
    except BackendError as err:
        st.error(str(err))
        st.stop()

routes = st.session_state.routes
if not routes:
    st.warning("No routes available. Load data via the ingestion workflow.")
    st.stop()

route_codes = [route.code for route in routes]
selected_route_code = st.selectbox("Route", options=route_codes, format_func=lambda code: code)
selected_route = next(route for route in routes if route.code == selected_route_code)

col1, col2, col3 = st.columns(3)
col1.write(f"**Origin County:** {selected_route.origin or 'Unknown'}")
col2.write(f"**Destination County:** {selected_route.destination or 'Unknown'}")
col3.write(f"**Mode:** {selected_route.mode or 'N/A'}")

available_weeks = selected_route.weeks or []
if not available_weeks:
    st.warning("No KPI weeks found for the selected route.")
    st.stop()

default_week_index = len(available_weeks) - 1 if available_weeks else 0
selected_week = st.selectbox("Week", options=available_weeks, index=max(default_week_index, 0))

trend_weeks = st.multiselect(
    "Trend Weeks (leave empty to use all available)",
    options=available_weeks,
    default=available_weeks,
)
if not trend_weeks:
    trend_weeks = available_weeks

trend_weeks_sorted = sorted(trend_weeks)

refresh = st.button("Refresh data")

selection_key = f"{selected_route_code}:{selected_week}"
trend_key = f"{selected_route_code}:" + ",".join(trend_weeks_sorted)
map_key = selected_route_code

if refresh:
    st.session_state.pop("kpi_payload", None)
    st.session_state.pop("trend_payload", None)
    st.session_state.pop("map_payload", None)
    st.session_state.pop("kpi_cache_key", None)
    st.session_state.pop("trend_cache_key", None)
    st.session_state.pop("map_cache_key", None)

if (
    st.session_state.get("kpi_cache_key") != selection_key
    or "kpi_payload" not in st.session_state
    or st.session_state.kpi_payload is None
):
    try:
        st.session_state.kpi_payload = client.fetch_kpis(selected_route_code, selected_week)
        st.session_state.kpi_cache_key = selection_key
    except BackendError as err:
        st.error(str(err))
        st.stop()

if (
    st.session_state.get("trend_cache_key") != trend_key
    or "trend_payload" not in st.session_state
    or st.session_state.trend_payload is None
):
    try:
        st.session_state.trend_payload = client.fetch_trend(selected_route_code, trend_weeks_sorted)
        st.session_state.trend_cache_key = trend_key
    except BackendError as err:
        st.error(str(err))
        st.session_state.trend_payload = []

if (
    st.session_state.get("map_cache_key") != map_key
    or "map_payload" not in st.session_state
    or st.session_state.map_payload is None
):
    try:
        st.session_state.map_payload = client.fetch_map(selected_route_code)
        st.session_state.map_cache_key = map_key
    except BackendError as err:
        st.error(str(err))
        st.session_state.map_payload = {}

render_kpi_cards(st.session_state.kpi_payload)

st.subheader("KPI Trend")
render_trend_chart(st.session_state.trend_payload)

st.subheader("Route Telemetry")
render_map(st.session_state.map_payload)
