import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import CategorizationConflictsPanel from './CategorizationConflictsPanel';
import { useApi } from '../hooks/useApi';

interface BackupList {
  db: string[];
  rules: string[];
  categoriesAndRules?: string[];
}

export default function BackupRestorePanel() {
  const [backups, setBackups] = useState<BackupList>({ db: [], rules: [], categoriesAndRules: [] });
  const [selectedDb, setSelectedDb] = useState('');
  const [selectedCatRules, setSelectedCatRules] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showConflicts, setShowConflicts] = useState(false);
  const { apiCall } = useApi();

  useEffect(() => {
    apiCall('/api/backup/backups')
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to fetch backups');
        return r.json();
      })
      .then((data) => {
        setBackups({
          db: data.db || [],
          rules: data.rules || [],
          categoriesAndRules: data.categoriesAndRules || data["categories-and-rules"] || []
        });
      })
      .catch(() => {
        setMessage('Could not load backup list.');
        // Ensure backups state remains safe even on error
        setBackups({ db: [], rules: [], categoriesAndRules: [] });
      });
  }, [apiCall]);

  const handleDbBackup = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await apiCall('/api/backup/export', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage('Database backup created.');
        setBackups((prev) => ({ ...prev, db: [data.backup, ...prev.db] }));
      } else {
        setMessage('Backup failed.');
      }
    } catch {
      setMessage('Backup failed (network or server error).');
    }
    setLoading(false);
  };

  const handleDbRestore = async () => {
    if (!selectedDb) return;
    if (!window.confirm('Restore will overwrite all data. Continue?')) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await apiCall('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupFile: selectedDb, overwrite: true }),
      });
      const data = await res.json();
      setMessage(data.success ? 'Database restored.' : 'Restore failed.');
    } catch {
      setMessage('Restore failed (network or server error).');
    }
    setLoading(false);
  };

  const handleCatRulesBackup = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await apiCall('/api/backup/categories-and-rules', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage('Categories & Rules backup created.');
        setBackups((prev) => ({ ...prev, categoriesAndRules: [data.backup, ...(prev.categoriesAndRules || [])] }));
      } else {
        setMessage('Categories & Rules backup failed.');
      }
    } catch {
      setMessage('Categories & Rules backup failed (network or server error).');
    }
    setLoading(false);
  };

  const handleCatRulesRestore = async () => {
    if (!selectedCatRules) return;
    if (!window.confirm('Restore will overwrite all categories and categorization rules, and remap transactions. Continue?')) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await apiCall('/api/backup/restore/categories-and-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupFile: selectedCatRules }),
      });
      const data = await res.json();
      setMessage(data.success ? 'Categories & Rules restored.' : 'Restore failed.');
    } catch {
      setMessage('Restore failed (network or server error).');
    }
    setLoading(false);
  };

  const handleDeleteAllTransactions = async () => {
    if (!window.confirm('Are you sure you want to delete ALL transactions? This action cannot be undone.')) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await apiCall('/api/transactions/all', { method: 'DELETE' });
      const data = await res.json();
      setMessage(data.success ? 'All transactions deleted.' : 'Failed to delete transactions.');
    } catch {
      setMessage('Failed to delete transactions (network or server error).');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Backup & Restore</h2>
      <div className="mb-8">
        <div className="p-3 mb-4 bg-warning/10 border border-warning rounded-md text-warning">
          <strong>Warning:</strong> Restoring categories and rules will reset all transaction categories. You will need to re-apply rules to re-categorize your transactions.
        </div>
        <h3 className="font-semibold mb-2">Full Database</h3>
        <div className="flex gap-2 mb-2">
          <Button onClick={handleDbBackup} disabled={loading}>Create Backup</Button>
          <Select value={selectedDb} onValueChange={setSelectedDb}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select backup file" /></SelectTrigger>
            <SelectContent>
              {(backups.db || []).map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleDbRestore} disabled={loading || !selectedDb} variant="secondary">Restore</Button>
        </div>
      </div>
      <div className="mb-8">
        <h3 className="font-semibold mb-2">Categories & Categorization Rules</h3>
        <div className="flex gap-2 mb-2">
          <Button onClick={handleCatRulesBackup} disabled={loading}>Backup Categories & Rules</Button>
          <Select value={selectedCatRules} onValueChange={setSelectedCatRules}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select backup file" /></SelectTrigger>
            <SelectContent>
              {(backups.categoriesAndRules || []).map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCatRulesRestore} disabled={loading || !selectedCatRules} variant="secondary">Restore</Button>
        </div>
      </div>
      <div className="mb-8">
        <h3 className="font-semibold mb-2">Danger Zone</h3>
        <div className="flex gap-2 mb-2">
          <Button onClick={handleDeleteAllTransactions} disabled={loading} variant="destructive">
            Delete All Transactions
          </Button>
        </div>
      </div>
      {message && <div className="mt-4 text-sm text-foreground font-medium">{message}</div>}
      {showConflicts && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-4 max-w-4xl w-full relative">
            <CategorizationConflictsPanel />
          </div>
        </div>
      )}
    </div>
  );
}
