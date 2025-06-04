// CSV mapping preset DB queries will go here.
import { getDb } from './index';

export function getCsvMappingPreset(userId: number, accountId: number): { account_id: number; mapping_json: string; date_format: string | null; debit_credit_logic: string | null; } | null {
  const db = getDb();
  try {
    // Verify the account belongs to the user and get the preset
    const row = db.prepare(`
      SELECT p.account_id, p.mapping_json, p.date_format, p.debit_credit_logic 
      FROM csv_mapping_presets_per_account p
      JOIN accounts a ON p.account_id = a.id
      WHERE p.account_id = ? AND a.user_id = ?
    `).get(accountId, userId);
    return row ? (row as { account_id: number; mapping_json: string; date_format: string | null; debit_credit_logic: string | null; }) : null;
  } finally {
    db.close();
  }
}

export function saveCsvMappingPreset(userId: number, accountId: number, mappingJson: string, dateFormat: string | null, debitCreditLogic: string | null): void {
  const db = getDb();
  try {
    // Verify the account belongs to the user
    const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(accountId, userId);
    if (!account) {
      throw new Error('Account not found or access denied.');
    }

    db.prepare(
      `INSERT OR REPLACE INTO csv_mapping_presets_per_account
      (account_id, mapping_json, date_format, debit_credit_logic, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(accountId, mappingJson, dateFormat, debitCreditLogic);
  } finally {
    db.close();
  }
}
