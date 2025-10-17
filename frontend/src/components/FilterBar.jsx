import { useEffect, useState } from 'react';

const FilterBar = ({ routeCode, week, weeksRange, onRouteChange, onWeekChange, onWeeksRangeChange }) => {
  const [localWeeks, setLocalWeeks] = useState(weeksRange.join(', '));

  useEffect(() => {
    setLocalWeeks(weeksRange.join(', '));
  }, [weeksRange]);

  const handleWeeksBlur = () => {
    const sanitized = localWeeks
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    onWeeksRangeChange(sanitized);
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col lg:flex-row lg:items-end lg:space-x-4 space-y-4 lg:space-y-0">
      <div className="flex-1">
        <label className="block text-sm font-medium text-slate-600" htmlFor="routeCode">Route code</label>
        <input
          id="routeCode"
          className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          value={routeCode}
          onChange={event => onRouteChange(event.target.value)}
          placeholder="ATL-LAX"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600" htmlFor="week">Week</label>
        <input
          id="week"
          className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          value={week}
          onChange={event => onWeekChange(event.target.value)}
          placeholder="2024-W01"
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-slate-600" htmlFor="weeks">Trend weeks (comma separated)</label>
        <input
          id="weeks"
          className="mt-1 w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          value={localWeeks}
          onChange={event => setLocalWeeks(event.target.value)}
          onBlur={handleWeeksBlur}
          placeholder="2024-W01, 2024-W02, 2024-W03"
        />
      </div>
    </div>
  );
};

export default FilterBar;
