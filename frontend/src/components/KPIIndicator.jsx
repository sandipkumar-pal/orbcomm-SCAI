const formatValue = value => {
  if (value === null || value === undefined) return '—';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '—';
  return numeric.toFixed(2);
};

const KPIIndicator = ({ title, value, description }) => (
  <div className="bg-white rounded-xl shadow p-4 border border-slate-100">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-slate-500 uppercase">{title}</h3>
        <p className="text-3xl font-semibold text-primary mt-2">{formatValue(value)}</p>
      </div>
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-semibold">
        {title.slice(0, 2)}
      </div>
    </div>
    <p className="text-xs text-slate-500 mt-4">{description}</p>
  </div>
);

export default KPIIndicator;
