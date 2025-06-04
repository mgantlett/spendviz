import { Router } from 'express';
import { getAllCategories, createCategory, updateCategory, deleteCategory, getCategoriesPaged } from '../db/categories';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// --- Categories API ---
router.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const categories = getAllCategories(req.user!.id);
    res.json(categories);
  } catch (e) {
    const error = e as Error;
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
});

router.post('/', (req: AuthenticatedRequest, res) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const newCategory = createCategory(req.user!.id, name, parent_id || null);
    res.status(201).json(newCategory);
  } catch (e) {
    const error = e as Error;
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'A category with this name already exists.' });
    } else {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Failed to create category', details: error.message });
    }
  }
});

router.put('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const updated = updateCategory(req.user!.id, Number(id), name, parent_id || null);
    res.json(updated);
  } catch (e) {
    const error = e as Error;
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'A category with this name already exists.' });
    } else if (error.message.includes('not found or access denied')) {
      res.status(404).json({ error: 'Category not found' });
    } else {
      console.error(`Error updating category ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to update category', details: error.message });
    }
  }
});

router.delete('/:id', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const result = deleteCategory(req.user!.id, Number(id));
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.status(204).send();
  } catch (e) {
    const error = e as Error;
    if (error.message.includes('Category is in use') || error.message.includes('Category has sub-categories')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('not found or access denied')) {
      res.status(404).json({ error: 'Category not found' });
    } else {
      console.error(`Error deleting category ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to delete category', details: error.message });
    }
  }
});

router.get('/paged', (req: AuthenticatedRequest, res) => {
  try {
    const { page = '1', limit = '10', filter = '', sort = 'name', direction = 'asc' } = req.query;
    const result = getCategoriesPaged(req.user!.id, {
      page: Number(page),
      limit: Number(limit),
      filter: String(filter),
      sort: String(sort),
      direction: direction === 'desc' ? 'desc' : 'asc',
    });
    res.json(result);
  } catch (e) {
    const error = e as Error;
    console.error('Error fetching paged categories:', error);
    res.status(500).json({ error: 'Failed to fetch paged categories', details: error.message });
  }
});

export default router;
