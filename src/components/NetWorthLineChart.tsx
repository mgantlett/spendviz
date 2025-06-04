import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from './ui/card';
import { useApi } from '../hooks/useApi';

interface NetWorthPoint {
  date: string;
  netWorth: number;
}

export default function NetWorthLineChart() {
  const { apiCall } = useApi();
  const [data, setData] = useState<NetWorthPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiCall('/api/reports/net-worth-trend')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch net worth data');
        return res.json();
      })
      .then(setData)
      .catch(() => setError('Could not load net worth data.'))
      .finally(() => setLoading(false));
  }, [apiCall]);

  if (loading) return <div className="text-muted-foreground">Loading net worth chart...</div>;
  if (error) return <div className="text-destructive">{error}</div>;
  if (!data.length) return <div className="text-muted-foreground">No net worth data available.</div>;

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-2">Net Worth Over Time</h2>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="netWorth" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
