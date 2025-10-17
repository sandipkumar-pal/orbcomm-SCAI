import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchKpis, fetchKpiTrend, fetchRouteMap } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import KPIIndicator from '../components/KPIIndicator.jsx';
import KPITrendChart from '../components/KPITrendChart.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { tileLayer } from '../config/mapConfig.js';
import { fixLeafletIcons } from '../utils/fixLeafletIcons.js';

const defaultRoute = 'ATL-LAX';
const defaultWeek = '2024-W01';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [routeCode, setRouteCode] = useState(defaultRoute);
  const [week, setWeek] = useState(defaultWeek);
  const [weeksRange, setWeeksRange] = useState(['2024-W01', '2024-W02', '2024-W03', '2024-W04']);
  const [kpis, setKpis] = useState(null);
  const [trend, setTrend] = useState([]);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [kpiResponse, trendResponse, mapResponse] = await Promise.all([
          fetchKpis({ routeCode, week }),
          fetchKpiTrend({ routeCode, weeks: weeksRange }),
          fetchRouteMap({ routeCode })
        ]);
        setKpis(kpiResponse);
        setTrend(trendResponse);
        setMapData(mapResponse);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [routeCode, week, weeksRange]);

  const coordinates = useMemo(() => {
    if (!mapData?.telemetry) return [];
    return mapData.telemetry
      .filter(point => point.latitude !== null && point.latitude !== undefined && point.longitude !== null && point.longitude !== undefined)
      .map(point => [point.latitude, point.longitude]);
  }, [mapData]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Supply Chain Capacity Index</h1>
            <p className="text-sm text-slate-500">Role: {user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-secondary text-white hover:bg-orange-600"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-6 space-y-6">
        <FilterBar
          routeCode={routeCode}
          week={week}
          weeksRange={weeksRange}
          onRouteChange={setRouteCode}
          onWeekChange={setWeek}
          onWeeksRangeChange={setWeeksRange}
        />

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

        {loading ? (
          <div className="text-center py-24 text-slate-500">Loading dashboard…</div>
        ) : (
          <>
            {kpis && (
              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPIIndicator title="SDEI" value={kpis.sdei} description="Supply–Demand Equilibrium" />
                <KPIIndicator title="SDCUI" value={kpis.sdcui} description="Capacity Utilization" />
                <KPIIndicator title="SII" value={kpis.sii} description="Stop Intensity" />
                <KPIIndicator title="RPI" value={kpis.rpi} description="Route Performance" />
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Route Telemetry</h2>
                  {mapData?.route && (
                    <span className="text-sm text-slate-500">
                      {mapData.route.origin} → {mapData.route.destination} ({mapData.route.mode})
                    </span>
                  )}
                </div>
                <div className="h-80 rounded overflow-hidden">
                  <MapContainer center={[37.8, -96.9]} zoom={4} scrollWheelZoom={false} className="h-full w-full">
                    <TileLayer
                      attribution={tileLayer.attribution}
                      url={tileLayer.url}
                    />
                    {coordinates.length > 0 && <Polyline positions={coordinates} color="#ff8c00" />}
                  </MapContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h2 className="text-lg font-semibold mb-4">KPI Trend</h2>
                <KPITrendChart data={trend} />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
