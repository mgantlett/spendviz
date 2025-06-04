import type { CategorizationRule } from '../src/types/categorizationRule';
import { getDb } from './index';

export function getAllCategorizationRules(userId: number): CategorizationRule[] {
  const db = getDb();
  try {
    return db.prepare(`
      SELECT cr.id, cr.pattern, cr.category_id, c.name as category_name 
      FROM categorization_rules cr
      JOIN categories c ON cr.category_id = c.id
      WHERE cr.user_id = ?
      ORDER BY cr.id DESC
    `).all(userId) as CategorizationRule[];
  } finally {
    db.close();
  }
}

export function createCategorizationRule(userId: number, pattern: string, category_id: number): CategorizationRule {
  const db = getDb();
  try {
    // Verify the category belongs to the user
    const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId);
    if (!category) {
      throw new Error('Category not found or access denied.');
    }

    const result = db.prepare(
      'INSERT INTO categorization_rules (user_id, pattern, category_id) VALUES (?, ?, ?)'
    ).run(userId, pattern, category_id);
    const newRule = db.prepare(`
      SELECT cr.id, cr.pattern, cr.category_id, c.name as category_name 
      FROM categorization_rules cr
      LEFT JOIN categories c ON cr.category_id = c.id
      WHERE cr.id = ?
    `).get(result.lastInsertRowid) as CategorizationRule;
    if (!newRule) {
      throw new Error('Failed to create or retrieve categorization rule after insert.');
    }
    return newRule;
  } finally {
    db.close();
  }
}

export function updateCategorizationRule(userId: number, id: number, pattern: string, category_id: number): CategorizationRule {
  const db = getDb();
  try {
    // Verify the rule belongs to the user
    const rule = db.prepare('SELECT id FROM categorization_rules WHERE id = ? AND user_id = ?').get(id, userId);
    if (!rule) {
      throw new Error('Categorization rule not found or access denied.');
    }

    // Verify the category belongs to the user
    const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId);
    if (!category) {
      throw new Error('Category not found or access denied.');
    }

    db.prepare(
      'UPDATE categorization_rules SET pattern = ?, category_id = ? WHERE id = ? AND user_id = ?'
    ).run(pattern, category_id, id, userId);
    const updatedRule = db.prepare(`
      SELECT cr.id, cr.pattern, cr.category_id, c.name as category_name 
      FROM categorization_rules cr
      LEFT JOIN categories c ON cr.category_id = c.id
      WHERE cr.id = ?
    `).get(id) as CategorizationRule;
    if (!updatedRule) {
      throw new Error(`Categorization rule with id ${id} not found after update.`);
    }
    return updatedRule;
  } finally {
    db.close();
  }
}

export function deleteCategorizationRule(userId: number, id: number): { id: number; affectedRows: number } {
  const db = getDb();
  try {
    const result = db.prepare('DELETE FROM categorization_rules WHERE id = ? AND user_id = ?').run(id, userId);
    return { id, affectedRows: result.changes };
  } finally {
    db.close();
  }
}

// MatchType: 0=exact, 1=startsWith, 2=word, 3=substring
function getRuleMatchType(pattern: string, description: string): number {
  const p = pattern.trim().toLowerCase();
  const d = description.trim().toLowerCase();
  if (p === d) return 0;
  if (d.startsWith(p)) return 1;
  if (new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(d)) return 2;
  if (d.includes(p)) return 3;
  return 99;
}

export function getMatchingCategoriesForTransaction(userId: number, transactionIdParam: number): { rule_id: number, category_id: number, category_name: string, pattern: string, matchType: number }[] {
  const db = getDb();
  try {
    // Verify the transaction belongs to the user via account ownership
    const transaction = db.prepare(`
      SELECT t.description FROM transactions t 
      JOIN accounts a ON t.account_id = a.id 
      WHERE t.id = ? AND a.user_id = ?
    `).get(transactionIdParam, userId) as { description: string | null };
    if (!transaction || typeof transaction.description !== 'string' || transaction.description.trim() === '') {
      return [];
    }
    const transactionDescription = transaction.description;
    const rules = db.prepare(
      `SELECT cr.id, cr.pattern, cr.category_id, c.name as category_name
      FROM categorization_rules cr
      JOIN categories c ON cr.category_id = c.id
      WHERE cr.user_id = ?
      ORDER BY cr.id DESC`
    ).all(userId) as (CategorizationRule & { category_name: string })[];
    const matchingCategories: { rule_id: number, category_id: number, category_name: string, pattern: string, matchType: number }[] = [];
    for (const rule of rules) {
      const matchType = getRuleMatchType(rule.pattern, transactionDescription);
      if (matchType < 99) {
        matchingCategories.push({
          rule_id: rule.id,
          category_id: rule.category_id,
          category_name: rule.category_name,
          pattern: rule.pattern,
          matchType
        });
      }
    }
    return matchingCategories;
  } finally {
    db.close();
  }
}

export function setTransactionCategory(userId: number, transactionId: number, categoryId: number | null) {
  const db = getDb();
  try {
    // Verify the transaction belongs to the user via account ownership
    const transaction = db.prepare(`
      SELECT t.id FROM transactions t 
      JOIN accounts a ON t.account_id = a.id 
      WHERE t.id = ? AND a.user_id = ?
    `).get(transactionId, userId);
    if (!transaction) {
      throw new Error('Transaction not found or access denied.');
    }

    // If category is provided, verify it belongs to the user
    if (categoryId !== null) {
      const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(categoryId, userId);
      if (!category) {
        throw new Error('Category not found or access denied.');
      }
    }

    const result = db.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').run(categoryId, transactionId);
    return { transactionId, categoryId, affectedRows: result.changes };
  } finally {
    db.close();
  }
}

export function applyRulesToAllUncategorizedTransactions(userId: number): { categorized: number, conflicts: number } {
  const db = getDb();
  try {
    const uncategorizedTransactions = db.prepare(`
      SELECT t.id, t.description 
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id 
      WHERE t.category_id IS NULL AND a.user_id = ?
    `).all(userId) as { id: number, description: string | null }[];
    let categorizedCount = 0;
    let conflictCount = 0;
    for (const transaction of uncategorizedTransactions) {
      if (transaction.description && transaction.description.trim() !== '') {
        const matches = getMatchingCategoriesForTransaction(userId, transaction.id);
        if (matches.length === 0) continue;
        // Find best matchType (lowest number is most exact)
        const bestType = Math.min(...matches.map(m => m.matchType));
        const bestMatches = matches.filter(m => m.matchType === bestType);
        if (bestMatches.length === 1) {
          setTransactionCategory(userId, transaction.id, bestMatches[0].category_id);
          categorizedCount++;
        } else {
          // If multiple rules have the same best matchType, always treat as conflict
          conflictCount++;
        }
      }
    }
    return { categorized: categorizedCount, conflicts: conflictCount };
  } finally {
    db.close();
  }
}

export function bulkCategorizeTransactions(userId: number, transactionIds: number[], categoryId: number | null) {
  const db = getDb();
  try {
    // If category is provided, verify it belongs to the user
    if (categoryId !== null) {
      const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(categoryId, userId);
      if (!category) {
        throw new Error('Category not found or access denied.');
      }
    }

    // Verify all transactions belong to the user and update only those
    const stmt = db.prepare(`
      UPDATE transactions SET category_id = ? 
      WHERE id = ? AND account_id IN (SELECT id FROM accounts WHERE user_id = ?)
    `);
    let affectedCount = 0;
    const runInTransaction = db.transaction((ids: number[], catId: number | null, uId: number) => {
      for (const id of ids) {
        const info = stmt.run(catId, id, uId);
        affectedCount += info.changes;
      }
    });
    runInTransaction(transactionIds, categoryId, userId);
    return { affectedRows: affectedCount, categoryId };
  } finally {
    db.close();
  }
}

export function getCategorizationRulesPaged(userId: number, { page = 1, limit = 10, filter = '', sort = 'pattern', direction = 'desc' }: { page?: number; limit?: number; filter?: string; sort?: string; direction?: 'asc' | 'desc' }) {
  const db = getDb();
  try {
    const offset = (page - 1) * limit;
    let where = 'WHERE cr.user_id = ?';
    const params: (string | number)[] = [userId];
    if (filter && filter.trim() !== '') {
      where += ' AND LOWER(cr.pattern) LIKE ?';
      params.push(`%${filter.trim().toLowerCase()}%`);
    }
    const allowedSort = ['pattern', 'category_name'];
    const sortCol = allowedSort.includes(sort) ? sort : 'pattern';
    const dir = direction === 'asc' ? 'ASC' : 'DESC';
    const totalItems = db.prepare(`SELECT COUNT(*) as count FROM categorization_rules cr ${where}`).get(...params) as { count: number };
    const rules = db.prepare(`
      SELECT cr.id, cr.pattern, cr.category_id, c.name as category_name
      FROM categorization_rules cr
      JOIN categories c ON cr.category_id = c.id
      ${where}
      ORDER BY ${sortCol === 'category_name' ? 'c.name' : 'cr.' + sortCol} ${dir}, cr.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as CategorizationRule[];
    return {
      rules,
      totalItems: totalItems.count,
      currentPage: page,
      totalPages: Math.ceil(totalItems.count / limit)
    };
  } finally {
    db.close();
  }
}

export function getUncategorizedTransactionContext(userId: number) {
  const db = getDb();
  try {
    return db.prepare(`
      SELECT DISTINCT t.description, t.date, t.amount
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE t.category_id IS NULL AND t.description IS NOT NULL AND t.description != '' AND a.user_id = ?
      ORDER BY t.description ASC, t.date DESC
    `).all(userId);
  } finally {
    db.close();
  }
}
