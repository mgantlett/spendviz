// Account-specific DB queries will go here.
import { getDb } from './index';

export function getAllAccounts(userId: number) {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY name').all(userId);
  } finally {
    db.close();
  }
}

export function createAccount(userId: number, name: string, type?: string, institution?: string) {
  const db = getDb();
  try {
    try {
      const stmt = db.prepare('INSERT INTO accounts (user_id, name, type, institution) VALUES (?, ?, ?, ?)');
      const info = stmt.run(userId, name, type || null, institution || null);
      return db.prepare('SELECT * FROM accounts WHERE id = ?').get(info.lastInsertRowid);
    } catch (e) {
      if (e instanceof Error && typeof (e as unknown as { code?: string }).code === 'string' && (e as unknown as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('An account with the same name, type, and institution already exists.');
      }
      throw e;
    }
  } finally {
    db.close();
  }
}

export function updateAccount(userId: number, id: number, name: string, type?: string, institution?: string) {
  const db = getDb();
  try {
    const stmt = db.prepare('UPDATE accounts SET name = ?, type = ?, institution = ? WHERE id = ? AND user_id = ?');
    const info = stmt.run(name, type || null, institution || null, id, userId);
    if (info.changes === 0) return null;
    return db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, userId);
  } finally {
    db.close();
  }
}

export function deleteAccount(userId: number, id: number) {
  const db = getDb();
  try {
    // Delete any csv_mapping_presets_per_account rows for this account (to avoid FK constraint)
    db.prepare('DELETE FROM csv_mapping_presets_per_account WHERE account_id = ?').run(id);
    // Now delete the account
    const stmt = db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?');
    const info = stmt.run(id, userId);
    return info.changes > 0;
  } finally {
    db.close();
  }
}
