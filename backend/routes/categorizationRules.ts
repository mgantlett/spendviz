import { Router } from 'express';
import { getAllCategorizationRules, createCategorizationRule, updateCategorizationRule, deleteCategorizationRule, getCategorizationRulesPaged } from '../db/categorizationRules';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// --- Categorization Rules API ---
router.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const rules = getAllCategorizationRules(req.user!.id);
    res.json(rules);
  } catch (e) {
    const error = e as Error;
    console.error('Error fetching categorization rules:', error);
    res.status(500).json({ error: 'Failed to fetch categorization rules', details: error.message });
  }
});

router.post('/', (req: AuthenticatedRequest, res) => {
  try {
    const { pattern, category_id, priority } = req.body;
    if (!pattern || category_id === undefined) {
      res.status(400).json({ error: 'Pattern and category_id are required' });
      return;
    }
    const rule = createCategorizationRule(req.user!.id, pattern, Number(category_id));
    res.status(201).json(rule);
  } catch (e) {
    const error = e as Error;
    console.error('Error creating categorization rule:', error);
    res.status(500).json({ error: 'Failed to create categorization rule', details: error.message });
  }
});

router.put('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { pattern, category_id, priority } = req.body;
    if (!pattern || category_id === undefined) {
      res.status(400).json({ error: 'Pattern and category_id are required' });
      return;
    }
    const rule = updateCategorizationRule(req.user!.id, Number(id), pattern, Number(category_id));
    res.json(rule);
  } catch (e) {
    const error = e as Error;
    console.error(`Error updating categorization rule ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update categorization rule', details: error.message });
  }
});

router.delete('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const result = deleteCategorizationRule(req.user!.id, Number(id));
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }
    res.status(204).send();
  } catch (e) {
    const error = e as Error;
    console.error(`Error deleting categorization rule ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete categorization rule', details: error.message });
  }
});

router.get('/paged', (req: AuthenticatedRequest, res) => {
  try {
    const { page = '1', limit = '10', filter = '', sort = 'priority', direction = 'desc' } = req.query;
    const result = getCategorizationRulesPaged(req.user!.id, {
      page: Number(page),
      limit: Number(limit),
      filter: String(filter),
      sort: String(sort),
      direction: direction === 'asc' ? 'asc' : 'desc',
    });
    res.json(result);
  } catch (e) {
    const error = e as Error;
    console.error('Error fetching paged categorization rules:', error);
    res.status(500).json({ error: 'Failed to fetch paged categorization rules', details: error.message });
  }
});

export default router;
