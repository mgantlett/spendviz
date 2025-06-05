import React, { useState, useEffect, useCallback } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { DatePeriodSelector } from "./ui/date-period-selector";
import { Button } from "./ui/button";
import { useApi } from '../hooks/useApi';

export default function SpendingByCategoryPieChart() {
  // Show all data by default (no date filter)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<Array<{
    category_name: string;
    total_spent: number;
    transactions: Array<{
      id: number;
      date: string;
      description: string;
      amount: number;
      account_name: string;
    }>;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { apiCall } = useApi();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/reports/PIE-spending-by-category';
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) url += '?' + params.join('&');
      const res = await apiCall(url);
      if (!res.ok) throw new Error('Failed to fetch spending by category');
      const d = await res.json();
      setData(Array.isArray(d) ? d : []);
    } catch (err) {
      console.error('Error fetching spending by category:', err);
      setError('Failed to load spending by category.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, apiCall]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Color palette matching the bar chart
  const CHART_COLORS = [
    '#2563eb', '#dc2626', '#ca8a04', '#16a34a', '#ea580c',
    '#4f46e5', '#db2777', '#65a30d', '#0891b2', '#7c3aed',
    '#d946ef', '#d97706', '#059669', '#f472b6', '#475569'
  ];

  // Custom tooltip with transaction details
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const categoryName = data.category_name || 'Uncategorized';
      const totalSpent = data.total_spent;
      const transactions = data.transactions || [];
      
      // Sort transactions by amount (highest first) and take top 5
      const topTransactions = transactions
        .sort((a: any, b: any) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 5);
      
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-sm">
          <div className="font-semibold mb-2 text-foreground">{categoryName}</div>
          <div className="text-sm text-muted-foreground mb-3">
            Total: <span className="font-medium text-foreground">{formatCurrency(Math.abs(totalSpent))}</span>
          </div>
          
          {topTransactions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Top {topTransactions.length} transaction{topTransactions.length !== 1 ? 's' : ''}:
              </div>
              {topTransactions.map((transaction: any, index: number) => (
                <div key={transaction.id} className="text-xs space-y-1 border-l-2 border-muted pl-2">
                  <div className="font-medium text-foreground truncate" title={transaction.description}>
                    {transaction.description.length > 30 
                      ? transaction.description.substring(0, 30) + '...' 
                      : transaction.description}
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>{formatDate(transaction.date)}</span>
                    <span className={`font-medium ${transaction.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                  {transaction.account_name && (
                    <div className="text-muted-foreground/80">
                      {transaction.account_name}
                    </div>
                  )}
                </div>
              ))}
              
              {transactions.length > 5 && (
                <div className="text-xs text-muted-foreground pt-1 border-t border-muted">
                  +{transactions.length - 5} more transaction{transactions.length - 5 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-4 ">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4">Spending by Category (Pie Chart)</h2>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-4">
        <DatePeriodSelector
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          onApply={fetchData}
          onClear={() => {
            setStartDate('');
            setEndDate('');
          }}
          align="start"
          initialPeriod="custom"
        />
      </div>

      {loading && <div>Loading spending data...</div>}
      {error && <div className="text-destructive">{error}</div>}
      {!loading && !error && data.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1" style={{ minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  dataKey="total_spent"
                  nameKey="category_name"
                  innerRadius={0}
                  outerRadius={150}
                  label={({ category_name }) => category_name || 'Uncategorized'}
                  labelLine={true}
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => (
                  <React.Fragment key={row.category_name ?? idx}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleCategory(row.category_name ?? '')}>
                      <TableCell className="px-3 py-2">
                        {row.category_name || <span className="italic text-muted-foreground">Uncategorized</span>}
                        <Button variant="ghost" size="icon" className="ml-2 h-4 w-4">
                          {expandedCategories.has(row.category_name ?? '') ? '▼' : '▶'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right px-3 py-2">{formatCurrency(Math.abs(row.total_spent))}</TableCell>
                    </TableRow>
                    {expandedCategories.has(row.category_name ?? '') && row.transactions?.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="bg-muted/30 px-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[100px]">Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {row.transactions.map(transaction => (
                                <TableRow key={transaction.id}>
                                  <TableCell className="py-1">{formatDate(transaction.date)}</TableCell>
                                  <TableCell className="py-1">{transaction.description}</TableCell>
                                  <TableCell className="py-1">{transaction.account_name}</TableCell>
                                  <TableCell className={`text-right py-1 ${transaction.amount >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(transaction.amount)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {!loading && !error && data.length === 0 && <div>No spending data available.</div>}
    </div>
  );
}
