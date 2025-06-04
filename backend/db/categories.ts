// Category-specific DB queries will go here.
import type { Category } from '../src/types/category';

import { getDb } from './index';

export function getAllCategories(userId: number): Category[] {
  const db = getDb();
  try {
    return db.prepare('SELECT id, name, parent_id, created_at FROM categories WHERE user_id = ? ORDER BY name ASC').all(userId) as Category[];
  } finally {
    db.close();
  }
}

export function createCategory(userId: number, name: string, parent_id?: number | null): Category {
  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO categories (user_id, name, parent_id) VALUES (?, ?, ?)')
      .run(userId, name, parent_id === undefined ? null : parent_id);
    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as Category;
    if (!newCategory) {
      throw new Error('Failed to create or retrieve category after insert.');
    }
    return newCategory;
  } finally {
    db.close();
  }
}

export function updateCategory(userId: number, id: number, name: string, parent_id?: number | null): Category {
  const db = getDb();
  try {
    const result = db.prepare('UPDATE categories SET name = ?, parent_id = ? WHERE id = ? AND user_id = ?')
      .run(name, parent_id === undefined ? null : parent_id, id, userId);
    if (result.changes === 0) {
      throw new Error(`Category with id ${id} not found or access denied.`);
    }
    const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId) as Category;
    if (!updatedCategory) {
      throw new Error(`Category with id ${id} not found after update.`);
    }
    return updatedCategory;
  } finally {
    db.close();
  }
}

export function deleteCategory(userId: number, id: number) {
  const db = getDb();
  try {
    // First verify the category belongs to the user
    const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
    if (!category) {
      throw new Error('Category not found or access denied.');
    }
    
    const inTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(id) as { count: number };
    if (inTransactions.count > 0) {
      throw new Error('Category is in use by transactions and cannot be deleted.');
    }
    const inRules = db.prepare('SELECT COUNT(*) as count FROM categorization_rules WHERE category_id = ?').get(id) as { count: number };
    if (inRules.count > 0) {
      throw new Error('Category is in use by categorization rules and cannot be deleted.');
    }
    const children = db.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND user_id = ?').get(id, userId) as { count: number };
    if (children.count > 0) {
      throw new Error('Category has sub-categories and cannot be deleted. Please delete sub-categories first.');
    }
    const result = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId);
    return { id, affectedRows: result.changes };
  } finally {
    db.close();
  }
}

export function getCategoriesPaged(userId: number, { page = 1, limit = 10, filter = '', sort = 'name', direction = 'asc' }: { page?: number; limit?: number; filter?: string; sort?: string; direction?: 'asc' | 'desc' }) {
  const db = getDb();
  try {
    const offset = (page - 1) * limit;
    let where = 'WHERE user_id = ?';
    const params: (string | number)[] = [userId];
    if (filter && filter.trim() !== '') {
      where += ' AND LOWER(name) LIKE ?';
      params.push(`%${filter.trim().toLowerCase()}%`);
    }
    const allowedSort = ['name', 'created_at'];
    const sortCol = allowedSort.includes(sort) ? sort : 'name';
    const dir = direction === 'desc' ? 'DESC' : 'ASC';
    const totalItems = db.prepare(`SELECT COUNT(*) as count FROM categories ${where}`).get(...params) as { count: number };
    const categories = db.prepare(`SELECT id, name, parent_id, created_at FROM categories ${where} ORDER BY ${sortCol} ${dir} LIMIT ? OFFSET ?`).all(...params, limit, offset) as Category[];
    return {
      categories,
      totalItems: totalItems.count,
      currentPage: page,
      totalPages: Math.ceil(totalItems.count / limit)
    };
  } finally {
    db.close();
  }
}
