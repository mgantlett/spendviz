import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { useApi } from '../hooks/useApi';

interface CategorizationRule {
  id: number;
  pattern: string;
  category_id: number;
  category_name?: string;
}

interface Conflict {
  transactionId: number;
  transactionDescription: string;
  conflictingRules: CategorizationRule[];
}

export default function CategorizationConflictsPanel() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { apiCall } = useApi();

  useEffect(() => {
    setLoading(true);
    apiCall('/api/transactions/categorization-conflicts')
      .then((res) => res.json())
      .then(setConflicts)
      .catch(() => setConflicts([]))
      .finally(() => setLoading(false));
  }, [apiCall]);

  return (
    <div className="p-4 rounded shadow max-w-4xl mx-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-border dark:border-zinc-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Categorization Conflicts</h2>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600 dark:text-red-400">{error}</div>}
      {!loading && !error && conflicts.length === 0 && <div>No conflicts found.</div>}
      {!loading && !error && conflicts.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Matching Rules</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conflicts.map(conflict => (
              <TableRow key={conflict.transactionId}>
                <TableCell>{conflict.transactionId}</TableCell>
                <TableCell>{conflict.transactionDescription}</TableCell>
                <TableCell>
                  <ul className="list-disc ml-4">
                    {conflict.conflictingRules.map(rule => (
                      <li key={rule.id} className="mb-1">
                        <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded mr-1">{rule.pattern}</span>
                        <span className="font-semibold">{rule.category_name || rule.category_id}</span>
                      </li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
