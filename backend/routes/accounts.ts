import { Router } from 'express';
import { getAllAccounts, createAccount, updateAccount, deleteAccount } from '../db/accounts';
import { getCsvMappingPreset, saveCsvMappingPreset } from '../db/csvMappingPresets';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// --- Accounts API ---
router.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const accounts = getAllAccounts(req.user!.id);
    res.json(accounts);
  } catch (e) {
    const error = e as Error;
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts', details: error.message });
  }
});

router.post('/', (req: AuthenticatedRequest, res) => {
  try {
    const { name, type, institution } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const account = createAccount(req.user!.id, name, type, institution);
    res.status(201).json(account);
  } catch (e) {
    const error = e as Error;
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account', details: error.message });
  }
});

router.put('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, type, institution } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const account = updateAccount(req.user!.id, Number(id), name, type, institution);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json(account);
  } catch (e) {
    const error = e as Error;
    console.error(`Error updating account ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update account', details: error.message });
  }
});

router.delete('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const ok = deleteAccount(req.user!.id, Number(id));
    if (!ok) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.status(204).send();
  } catch (e) {
    const error = e as Error;
    console.error(`Error deleting account ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
});

// --- CSV Mapping Presets API ---
router.get('/:id/csv-preset', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const preset = getCsvMappingPreset(req.user!.id, Number(id));
    if (preset) {
      res.json(preset);
    } else {
      res.status(404).json({ error: 'No preset found' });
    }
  } catch (e) {
    const error = e as Error;
    console.error(`Error fetching CSV preset for account ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch CSV preset', details: error.message });
  }
});

router.post('/:id/csv-preset', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { mapping_json, date_format, debit_credit_logic } = req.body;
    saveCsvMappingPreset(req.user!.id, Number(id), mapping_json, date_format, debit_credit_logic);
    const preset = getCsvMappingPreset(req.user!.id, Number(id));
    res.json(preset);
  } catch (e) {
    const error = e as Error;
    console.error(`Error saving CSV preset for account ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to save CSV preset', details: error.message });
  }
});

export default router;
