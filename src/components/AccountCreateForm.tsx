import { useState } from 'react';
import { useAccountsStore } from '../store/accounts';
import { useApi } from '../hooks/useApi';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface Props {
  onCreated?: () => void;
}

export default function AccountCreateForm({ onCreated }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState('');
  const { addAccount, isLoading } = useAccountsStore();
  const { apiCall } = useApi();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const result = await addAccount({ name, type, institution }, apiCall);
    if (result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' && result.error) {
      setError(result.error);
    } else if (result) {
      setName('');
      setType('');
      setInstitution('');
      if (onCreated) onCreated();
    } else {
      setError('Failed to create account');
    }
  }

  return (
    <form className="mb-6" onSubmit={handleSubmit}>
      <div className="flex gap-4 mb-2 items-end">
        <div className="w-1/3">
          <Input
            id="account-name"
            placeholder="Account Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div className="w-1/4">
          <Input
            id="account-type"
            placeholder="Type (e.g. Checking)"
            value={type}
            onChange={e => setType(e.target.value)}
          />
        </div>
        <div className="w-1/4">
          <Input
            id="account-institution"
            placeholder="Institution"
            value={institution}
            onChange={e => setInstitution(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            disabled={isLoading || !name}
            className="h-10"
          >
            Add
          </Button>
        </div>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </form>
  );
}
