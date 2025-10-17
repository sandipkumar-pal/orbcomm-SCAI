import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const formatTooltip = value => (value === null || value === undefined ? '—' : Number(value).toFixed(2));

const KPITrendChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={320}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="week" />
      <YAxis domain={[0, 2]} tickFormatter={value => value.toFixed(1)} allowDecimals />
      <Tooltip formatter={formatTooltip} />
      <Legend />
      <Line type="monotone" dataKey="sdei" stroke="#00467f" strokeWidth={2} dot={false} connectNulls />
      <Line type="monotone" dataKey="sdcui" stroke="#ff8c00" strokeWidth={2} dot={false} connectNulls />
      <Line type="monotone" dataKey="sii" stroke="#16a34a" strokeWidth={2} dot={false} connectNulls />
    </LineChart>
  </ResponsiveContainer>
);

export default KPITrendChart;
