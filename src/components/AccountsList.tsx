import { useEffect, useState } from 'react';
import AccountCreateForm from './AccountCreateForm';
import type { Account } from '../types/account';
import { useAccountsStore } from '../store/accounts';
import { useApi } from '../hooks/useApi';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function AccountsList() {
  const {
    accounts,
    isLoading,
    error,
    fetchAccounts,
    updateAccount,
    deleteAccount,
  } = useAccountsStore();
  const { apiCall } = useApi();
  const [editId, setEditId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<Account>>({});
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    fetchAccounts(apiCall);
  }, [fetchAccounts, apiCall]);

  function startEdit(acc: Account) {
    setEditId(acc.id);
    setEditValues({ ...acc });
    setLocalError('');
  }

  function cancelEdit() {
    setEditId(null);
    setEditValues({});
    setLocalError('');
  }

  async function saveEdit() {
    if (!editValues.name || editId === null) {
      setLocalError('Name is required');
      return;
    }
    const result = await updateAccount(editId, editValues, apiCall);
    if (!result) {
      setLocalError('Failed to update account');
    } else {
      setEditId(null);
      setEditValues({});
    }
  }

  async function confirmDelete(id: number) {
    const ok = await deleteAccount(id, apiCall);
    if (!ok) setLocalError('Failed to delete account');
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <AccountCreateForm onCreated={() => fetchAccounts(apiCall)} />
      {(error || localError) && <div className="text-red-600 mb-2">{error || localError}</div>}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((acc) => (
              <TableRow key={acc.id}>
                <TableCell>
                  {editId === acc.id ? (
                    <Input
                      value={editValues.name || ''}
                      onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                      className="border px-2 py-1 rounded"
                    />
                  ) : (
                    acc.name
                  )}
                </TableCell>
                <TableCell>
                  {editId === acc.id ? (
                    <Input
                      value={editValues.type || ''}
                      onChange={e => setEditValues(v => ({ ...v, type: e.target.value }))}
                      className="border px-2 py-1 rounded"
                    />
                  ) : (
                    acc.type
                  )}
                </TableCell>
                <TableCell>
                  {editId === acc.id ? (
                    <Input
                      value={editValues.institution || ''}
                      onChange={e => setEditValues(v => ({ ...v, institution: e.target.value }))}
                      className="border px-2 py-1 rounded"
                    />
                  ) : (
                    acc.institution
                  )}
                </TableCell>
                <TableCell>
                  {editId === acc.id ? (
                    <>
                      <Button variant="ghost" size="sm" className="mr-2" onClick={saveEdit}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="mr-2" onClick={() => startEdit(acc)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive-hover" onClick={() => confirmDelete(acc.id)}>Delete</Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
