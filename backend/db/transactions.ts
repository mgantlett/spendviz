import type { Transaction } from '../src/types/transaction';
import { getDb } from './index';

export function getTransactions(userId: number, {
  account_id,
  description,
  startDate,
  endDate,
  category_id,
  sort = 'date',
  direction = 'desc',
  page = 1,
  limit = 10
}: {
  account_id?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  category_id?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): { transactions: Transaction[]; totalItems: number; currentPage: number; totalPages: number; } {
  const db = getDb();
  try {
    const currentPage = page || 1;
    const itemsPerPage = limit || 10;
    const offset = (currentPage - 1) * itemsPerPage;
    const allowedSortColumns = ['date', 'description', 'amount', 'account_name', 'category_name', 'created_at'];
    const sortColumn = allowedSortColumns.includes(sort!) ? sort : 'date';
    const sortDirection = direction === 'asc' ? 'ASC' : 'DESC';
    let baseQuery = `
      FROM transactions t 
      LEFT JOIN accounts a ON t.account_id = a.id 
      LEFT JOIN categories c ON t.category_id = c.id
    `;
    const sqlParams: (string | number | null)[] = [userId];
    const conditions: string[] = ['a.user_id = ?'];
    if (account_id) {
      conditions.push('t.account_id = ?');
      sqlParams.push(account_id);
    }
    if (description) {
      conditions.push('t.description LIKE ?');
      sqlParams.push(`%${description}%`);
    }
    if (startDate) {
      conditions.push('t.date >= ?');
      sqlParams.push(startDate);
    }
    if (endDate) {
      conditions.push('t.date <= ?');
      sqlParams.push(endDate);
    }
    if (category_id) {
      if (category_id.toLowerCase() === "null" || category_id === "") {
        conditions.push('t.category_id IS NULL');
      } else {
        conditions.push('t.category_id = ?');
        sqlParams.push(Number(category_id));
      }
    }
    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const totalItemsQuery = `SELECT COUNT(*) as count ${baseQuery}`;
    const totalItemsResult = db.prepare(totalItemsQuery).get(...sqlParams as any[]) as { count: number };
    const totalItems = totalItemsResult.count;
    let transactionsQuery = `SELECT t.*, a.name as account_name, c.name as category_name ${baseQuery}`;
    transactionsQuery += ` ORDER BY ${sortColumn === 'account_name' ? 'a.name' : (sortColumn === 'category_name' ? 'c.name' : `t.${sortColumn}`)} ${sortDirection}, t.created_at DESC`;
    transactionsQuery += ` LIMIT ? OFFSET ?`;
    const queryParamsFinal = [...sqlParams, itemsPerPage, offset] as any[];
    const transactions = db.prepare(transactionsQuery).all(...queryParamsFinal) as Transaction[];
    return {
      transactions,
      totalItems,
      currentPage,
      totalPages: Math.ceil(totalItems / itemsPerPage)
    };
  } finally {
    db.close();
  }
}

export function createTransaction(userId: number, { account_id, date, description, amount, category_id }: { account_id: number; date: string; description: string; amount: number; category_id?: number; }) {
  const db = getDb();
  try {
    // Verify the account belongs to the user
    const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(account_id, userId);
    if (!account) {
      throw new Error('Account not found or access denied.');
    }

    // If category is provided, verify it belongs to the user
    if (category_id) {
      const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId);
      if (!category) {
        throw new Error('Category not found or access denied.');
      }
    }

    const result = db.prepare(
      'INSERT INTO transactions (account_id, date, description, amount, category_id) VALUES (?, ?, ?, ?, ?)'
    ).run(account_id, date, description, amount, category_id === undefined ? null : category_id);
    const newTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    return newTransaction;
  } finally {
    db.close();
  }
}

export function updateTransaction(userId: number, { id, account_id, date, description, amount, category_id }: { id: number; account_id?: number; date?: string; description?: string; amount?: number; category_id?: number | null; }): Transaction {
  const db = getDb();
  try {
    // Verify the transaction belongs to the user via account ownership
    const currentTransaction = db.prepare(`
      SELECT t.* FROM transactions t 
      JOIN accounts a ON t.account_id = a.id 
      WHERE t.id = ? AND a.user_id = ?
    `).get(id, userId) as Transaction | undefined;
    if (!currentTransaction) {
      throw new Error(`Transaction with id ${id} not found or access denied.`);
    }
    // If changing account, verify new account belongs to user
    if (account_id !== undefined && account_id !== currentTransaction.account_id) {
      const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(account_id, userId);
      if (!account) {
        throw new Error('New account not found or access denied.');
      }
    }

    // If changing category, verify new category belongs to user
    if (category_id !== undefined && category_id !== null && category_id !== currentTransaction.category_id) {
      const category = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId);
      if (!category) {
        throw new Error('New category not found or access denied.');
      }
    }

    const newValues = {
      account_id: account_id !== undefined ? account_id : currentTransaction.account_id,
      date: date !== undefined ? date : currentTransaction.date,
      description: description !== undefined ? description : currentTransaction.description,
      amount: amount !== undefined ? amount : currentTransaction.amount,
      category_id: category_id !== undefined ? (category_id === null ? null : category_id) : currentTransaction.category_id,
    };
    const stmt = db.prepare(
      `UPDATE transactions 
      SET account_id = ?, date = ?, description = ?, amount = ?, category_id = ?
      WHERE id = ?`
    );
    stmt.run(newValues.account_id, newValues.date, newValues.description, newValues.amount, newValues.category_id, id);
    const updatedTransaction = db.prepare(
      `SELECT t.*, a.name as account_name, c.name as category_name 
      FROM transactions t 
      LEFT JOIN accounts a ON t.account_id = a.id 
      LEFT JOIN categories c ON t.category_id = c.id 
      WHERE t.id = ?`
    ).get(id) as Transaction;
    if (!updatedTransaction) {
      throw new Error('Failed to retrieve transaction after update.');
    }
    return updatedTransaction;
  } finally {
    db.close();
  }
}

// Remove chart/reporting functions from this file. They are now in db/reports.ts

export function deleteAllTransactions(userId: number) {
  const db = getDb();
  try {
    db.prepare(`
      DELETE FROM transactions 
      WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)
    `).run(userId);
  } finally {
    db.close();
  }
}
