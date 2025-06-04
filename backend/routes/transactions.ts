import { Router } from 'express';
import { getTransactions, updateTransaction, deleteAllTransactions } from '../db/transactions';
import { setTransactionCategory, bulkCategorizeTransactions, applyRulesToAllUncategorizedTransactions, getUncategorizedTransactionContext } from '../db/categorizationRules';
import { getMatchingCategoriesForTransaction } from '../db/categorizationRules';
import { getDb } from '../db/index';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// --- Transactions API ---
router.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const {
      account_id,
      description,
      startDate,
      endDate,
      category_id,
      sort = 'date',
      direction = 'desc',
      page = '1',
      limit = '10'
    } = req.query as {
      account_id?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      category_id?: string;
      sort?: string;
      direction?: 'asc' | 'desc';
      page?: string;
      limit?: string;
    };
    const result = getTransactions(req.user!.id, {
      account_id,
      description,
      startDate,
      endDate,
      category_id,
      sort,
      direction,
      page: Number(page),
      limit: Number(limit)
    });
    res.json(result);
  } catch (e) {
    const error = e as Error;
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
  }
});

router.put('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { account_id, date, description, amount, category_id } = req.body;
    if (account_id === undefined || date === undefined || description === undefined || amount === undefined) {
      res.status(400).json({ error: 'Missing required fields: account_id, date, description, amount' });
      return;
    }
    const transaction = updateTransaction(req.user!.id, {
      id: Number(id),
      account_id: Number(account_id),
      date,
      description,
      amount: Number(amount),
      category_id: category_id === undefined ? undefined : (category_id === null ? null : Number(category_id))
    });
    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.json(transaction);
  } catch (e) {
    const error = e as Error;
    console.error(`Error updating transaction ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update transaction', details: error.message });
  }
});

// --- Transaction Categorization API ---
router.get('/:transactionId/matching-categories', (req: AuthenticatedRequest, res) => {
  try {
    const { transactionId } = req.params;
    const matchingCategories = getMatchingCategoriesForTransaction(req.user!.id, Number(transactionId));
    res.json({ transactionId: Number(transactionId), conflictingRules: matchingCategories });
  } catch (e) {
    const error = e as Error;
    console.error(`Error getting matching categories for transaction ${req.params.transactionId}:`, error);
    res.status(500).json({ error: 'Failed to get matching categories', details: error.message });
  }
});

router.put('/:transactionId/category', (req: AuthenticatedRequest, res) => {
  try {
    const { transactionId } = req.params;
    const { categoryId } = req.body;
    if (categoryId !== null && typeof categoryId !== 'number') {
      res.status(400).json({ error: 'Valid categoryId (number or null) is required' });
      return;
    }
    const result = setTransactionCategory(req.user!.id, Number(transactionId), categoryId);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Transaction not found or category not changed' });
      return;
    }
    res.json({ transactionId: Number(transactionId), categoryId, message: 'Transaction category updated' });
  } catch (e) {
    const error = e as Error;
    console.error(`Error setting category for transaction ${req.params.transactionId}:`, error);
    res.status(500).json({ error: 'Failed to set transaction category', details: error.message });
  }
});

router.post('/apply-all-rules', (req: AuthenticatedRequest, res) => {
  try {
    const result = applyRulesToAllUncategorizedTransactions(req.user!.id);
    res.json(result);
  } catch (e) {
    const error = e as Error;
    console.error('Error applying all categorization rules:', error);
    res.status(500).json({ error: 'Failed to apply categorization rules', details: error.message });
  }
});

router.post('/bulk-categorize', (req: AuthenticatedRequest, res) => {
  try {
    const { transactionIds, categoryId } = req.body;
    if (!Array.isArray(transactionIds) || transactionIds.length === 0 || categoryId === undefined) {
      res.status(400).json({ error: 'transactionIds (array) and categoryId are required' });
      return;
    }
    if (categoryId !== null && typeof categoryId !== 'number') {
      res.status(400).json({ error: 'categoryId must be a number or null' });
      return;
    }
    const result = bulkCategorizeTransactions(req.user!.id, transactionIds.map(id => Number(id)), categoryId as number | null);
    res.json(result);
  } catch (e) {
    const error = e as Error;
    console.error('Error bulk categorizing transactions:', error);
    res.status(500).json({ error: 'Failed to bulk categorize transactions', details: error.message });
  }
});

router.get('/uncategorized-descriptions', (req: AuthenticatedRequest, res) => {
  try {
    const contextRows = getUncategorizedTransactionContext(req.user!.id);
    res.json(contextRows);
  } catch (e) {
    const error = e as Error;
    console.error('Error fetching uncategorized descriptions:', error);
    res.status(500).json({ error: 'Failed to fetch uncategorized descriptions', details: error.message });
  }
});

// --- Categorization Conflicts API ---
router.get('/categorization-conflicts', (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const uncategorized = db.prepare(`
      SELECT t.id, t.description 
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id 
      WHERE t.category_id IS NULL AND a.user_id = ?
    `).all(req.user!.id) as { id: number, description: string | null }[];
    db.close();
    const conflicts = uncategorized
      .map(txn => {
        if (!txn.description || txn.description.trim() === '') return null;
        const matching = getMatchingCategoriesForTransaction(req.user!.id, txn.id);
        if (matching.length > 1) {
          // Find best matchType (lowest number)
          const bestType = Math.min(...matching.map(m => m.matchType));
          const bestMatches = matching.filter(m => m.matchType === bestType);
          if (bestMatches.length > 1) {
            return {
              transactionId: txn.id,
              transactionDescription: txn.description,
              conflictingRules: bestMatches.map(rule => ({
                id: rule.rule_id,
                pattern: rule.pattern,
                category_id: rule.category_id,
                priority: rule.priority,
                category_name: rule.category_name
              }))
            };
          }
        }
        return null;
      })
      .filter(Boolean);
    res.json(conflicts);
  } catch (e) {
    const error = e as Error;
    console.error('Error fetching categorization conflicts:', error);
    res.status(500).json({ error: 'Failed to fetch categorization conflicts', details: error.message });
  }
});

// --- Delete All Transactions ---
router.delete('/all', (req: AuthenticatedRequest, res) => {
  // Prevent demo user from deleting all transactions
  if (req.user?.email === 'demo@spendviz.app') {
    return res.status(403).json({ error: 'This action is unavailable for the demo user.' });
  }
  try {
    deleteAllTransactions(req.user!.id);
    res.json({ success: true });
  } catch (e) {
    const error = e as Error;
    console.error('Error deleting all transactions:', error);
    res.status(500).json({ error: 'Failed to delete all transactions', details: error.message });
  }
});

export default router;
