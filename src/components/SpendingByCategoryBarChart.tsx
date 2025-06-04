import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { DatePeriodSelector } from './ui/date-period-selector';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { useApi } from '../hooks/useApi';

function ChartPeriodSelector({ startDate, endDate, setStartDate, setEndDate, onApply, onClear }: {
  startDate: string;
  endDate: string;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <DatePeriodSelector
      startDate={startDate}
      endDate={endDate}
      setStartDate={setStartDate}
      setEndDate={setEndDate}
      onApply={onApply}
      onClear={onClear}
      modal={false}
    />
  );
}

// Color palette matching the pie chart
const COLORS = [
  '#2563eb', '#dc2626', '#ca8a04', '#16a34a', '#ea580c',
  '#4f46e5', '#db2777', '#65a30d', '#0891b2', '#7c3aed',
  '#d946ef', '#d97706', '#059669', '#f472b6', '#475569',
  '#6366f1', '#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#f87171', '#a78bfa', '#facc15', '#60a5fa', '#4ade80', '#f472b6', '#f59e42', '#818cf8', '#f43f5e'
];

type ViewMode = 'stacked' | 'grouped';
type ChartOrientation = 'vertical' | 'horizontal';

export default function SpendingByCategoryBarChart({ endpoint = '/api/reports/BAR-spending-by-category' }: { endpoint?: string }) {
  type SpendingByCategory = { category: string; month: string; total: number };
  const [data, setData] = useState<SpendingByCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('stacked');
  const [orientation, setOrientation] = useState<ChartOrientation>('vertical');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showValues, setShowValues] = useState(false);
  const { apiCall } = useApi();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = endpoint;
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) url += '?' + params.join('&');
      const response = await apiCall(url);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load spending by category.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, endpoint, apiCall]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Find all months and categories in the data
  const months = Array.from(new Set(data.map(d => d.month))).sort();
  const allCategories = Array.from(new Set(data.map(d => d.category)));
  
  // Initialize selected categories if empty
  useEffect(() => {
    if (selectedCategories.length === 0 && allCategories.length > 0) {
      setSelectedCategories(allCategories);
    }
  }, [allCategories, selectedCategories.length]);

  // Filter categories based on selection
  const categories = selectedCategories.length > 0 ? selectedCategories : allCategories;

  // Pivot data for chart
  const chartData = months.map(month => {
    const row: Record<string, number | string> = { month };
    for (const cat of categories) {
      const found = data.find(d => d.month === month && d.category === cat);
      row[cat] = found ? Math.abs(found.total) : 0;
    }
    return row;
  });

  // Format month for display
  const formatMonth = (month: string) => {
    try {
      const date = new Date(month + '-01');
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
    } catch {
      return month;
    }
  };

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Toggle all categories
  const toggleAllCategories = () => {
    setSelectedCategories(prev => 
      prev.length === allCategories.length ? [] : allCategories
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      
      // Sort payload by value (high to low) and filter out zero values
      const sortedPayload = payload
        .filter((entry: any) => entry.value > 0)
        .sort((a: any, b: any) => b.value - a.value);
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{formatMonth(label)}</p>
          {sortedPayload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.dataKey}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4">Spending by Category Over Time</h2>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        {/* Date Range Selector */}
        <div className="flex-1">
          <ChartPeriodSelector
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            onApply={fetchData}
            onClear={() => { setStartDate(''); setEndDate(''); }}
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Label htmlFor="view-mode">View:</Label>
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stacked">Stacked</SelectItem>
              <SelectItem value="grouped">Grouped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show Values Toggle */}
        <div className="flex items-center gap-2">
          <Label htmlFor="show-values">Values</Label>
          <Button
            variant={showValues ? "default" : "outline"}
            size="sm"
            onClick={() => setShowValues(!showValues)}
          >
            {showValues ? "Hide" : "Show"}
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      {allCategories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Categories:</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllCategories}
            >
              {selectedCategories.length === allCategories.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((category, idx) => (
              <Button
                key={category}
                variant={selectedCategories.includes(category) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCategory(category)}
                className="text-xs"
                style={{
                  backgroundColor: selectedCategories.includes(category) 
                    ? COLORS[idx % COLORS.length] 
                    : undefined,
                  borderColor: COLORS[idx % COLORS.length],
                  color: selectedCategories.includes(category) ? 'white' : undefined
                }}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData} 
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse space-y-4 w-full">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-8 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && (
        <div className="w-full">
          <ResponsiveContainer width="100%" height={450}>
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis 
                dataKey="month" 
                tickFormatter={formatMonth}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tickFormatter={formatCurrency}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              {categories.map((cat, idx) => (
                <Bar 
                  key={cat} 
                  dataKey={cat} 
                  stackId={viewMode === 'stacked' ? "a" : undefined}
                  fill={COLORS[allCategories.indexOf(cat) % COLORS.length]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && chartData.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-lg mb-2">No data available</p>
          <p className="text-sm">Try adjusting your date range or check if there are transactions in this period.</p>
        </div>
      )}
    </div>
  );
}
