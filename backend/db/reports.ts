import { getDb } from './index';

export function PIE_getSpendingByCategory(userId: number, { startDate, endDate, account_id }: { startDate?: string; endDate?: string; account_id?: string }) {
  const db = getDb();
  try {
    let where = 'WHERE t.category_id IS NOT NULL AND a.user_id = ?';
    const params: (string | number)[] = [userId];
    if (startDate) {
      where += ' AND t.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND t.date <= ?';
      params.push(endDate);
    }
    if (account_id) {
      where += ' AND t.account_id = ?';
      params.push(account_id);
    }

    // First get the category summaries
    const categorySummary = db.prepare(`
      SELECT 
        c.id as category_id, 
        c.name as category_name, 
        CAST(SUM(t.amount) as REAL) as total_spent,
        GROUP_CONCAT(t.id, ',') as transaction_ids
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts a ON t.account_id = a.id
      ${where} AND LOWER(c.name) != 'transfer' AND LOWER(c.name) NOT LIKE 'income%'
      GROUP BY c.id, c.name
      HAVING total_spent < 0
      ORDER BY total_spent ASC
    `).all(...params) as Array<{
      category_id: number;
      category_name: string;
      total_spent: number;
      transaction_ids: string;
    }>;

    // For each category, get its transactions
    const categoriesWithTransactions = categorySummary.map(category => {
      const transactionIds = category.transaction_ids.split(',');
      const transactions = db.prepare(`
        SELECT 
          t.id,
          t.date,
          t.description,
          t.amount,
          a.name as account_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.id IN (${transactionIds.map(() => '?').join(',')})
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT 100
      `).all(...transactionIds) as Array<{
        id: number;
        date: string;
        description: string;
        amount: number;
        account_name: string;
      }>;

      // Map the structure to ensure total_spent is a positive number for the pie chart
      return {
        category_id: category.category_id,
        category_name: category.category_name,
        total_spent: -category.total_spent, // Convert negative spending to positive for pie chart display (negative values from SQL become positive)
        transactions
      };
    });

    return categoriesWithTransactions;
  } finally {
    db.close();
  }
}

export function BAR_getSpendingByCategoryGroupedByMonth(userId: number, { startDate, endDate, account_id }: { startDate?: string; endDate?: string; account_id?: string }) {
  const db = getDb();
  try {
    let where = 'WHERE t.category_id IS NOT NULL AND a.user_id = ?';
    const params: (string | number)[] = [userId];
    if (startDate) {
      where += ' AND t.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND t.date <= ?';
      params.push(endDate);
    }
    if (account_id) {
      where += ' AND t.account_id = ?';
      params.push(account_id);
    }
    // Group by category and month, exclude only 'Transfer' category (not income)
    return db.prepare(`
      SELECT c.name as category, 
             strftime('%Y-%m', t.date) as month, 
             SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts a ON t.account_id = a.id
      ${where} AND LOWER(c.name) != 'transfer'
      GROUP BY c.name, month
      ORDER BY month ASC, total DESC
    `).all(...params);
  } finally {
    db.close();
  }
}

// Returns an array of { date: string, netWorth: number }
export function getNetWorthTrend(userId: number, { startDate, endDate }: { startDate?: string; endDate?: string } = {}) {
  const db = getDb();
  // Get all unique transaction dates for this user, sorted ascending
  const dates = db.prepare(`
    SELECT DISTINCT t.date
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE a.user_id = ?
    ${startDate ? 'AND t.date >= ?' : ''}
    ${endDate ? 'AND t.date <= ?' : ''}
    ORDER BY t.date ASC
  `).all(...[userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])]) as { date: string }[];

  // For each date, calculate net worth (sum of all account balances up to and including that date)
  const trend = dates.map(({ date }) => {
    const row = db.prepare(`
      SELECT COALESCE(SUM(t.amount), 0) as netWorth
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = ? AND t.date <= ?
    `).get(userId, date) as { netWorth: number };
    return { date, netWorth: row.netWorth };
  });
  return trend;
}
