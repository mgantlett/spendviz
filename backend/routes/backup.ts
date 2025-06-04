import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const BACKUP_DIR = path.resolve('backup');

// Ensure backup dir exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

// --- USER DATA EXPORT ---
router.post('/export', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const db = getDb();
    
    // Export all user data
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);
    const categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
    const rules = db.prepare('SELECT * FROM categorization_rules WHERE user_id = ?').all(userId);
    const transactions = db.prepare(`
      SELECT t.* FROM transactions t 
      JOIN accounts a ON t.account_id = a.id 
      WHERE a.user_id = ?
    `).all(userId);
    
    const userData = {
      user: req.user,
      accounts,
      categories,
      rules,
      transactions,
      exportedAt: new Date().toISOString()
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `user_${userId}_export_${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(userData, null, 2));
    db.close();
    
    res.json({ success: true, backup: filename });
  } catch (error) {
    console.error('User export failed:', error);
    res.status(500).json({ success: false, error: 'Export failed.' });
  }
});

// --- USER DATA IMPORT ---
router.post('/import', (req: AuthenticatedRequest, res) => {
  const { backupFile, overwrite = false } = req.body;
  if (!backupFile) return res.status(400).json({ error: 'No backup file specified.' });
  
  try {
    const userId = req.user!.id;
    const src = path.join(BACKUP_DIR, backupFile);
    const userData = JSON.parse(fs.readFileSync(src, 'utf-8'));
    const db = getDb();
    
    if (overwrite) {
      // Clear existing user data
      db.prepare('DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)').run(userId);
      db.prepare('DELETE FROM categorization_rules WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM accounts WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId);
    }
    
    // Import categories first (needed for foreign keys)
    const categoryIdMap = new Map();
    for (const category of userData.categories || []) {
      const result = db.prepare('INSERT INTO categories (user_id, name, parent_id) VALUES (?, ?, ?)').run(
        userId, category.name, null // Will update parent_id in second pass
      );
      categoryIdMap.set(category.id, result.lastInsertRowid);
    }
    
    // Update parent_id references
    for (const category of userData.categories || []) {
      if (category.parent_id) {
        const newId = categoryIdMap.get(category.id);
        const newParentId = categoryIdMap.get(category.parent_id);
        if (newId && newParentId) {
          db.prepare('UPDATE categories SET parent_id = ? WHERE id = ?').run(newParentId, newId);
        }
      }
    }
    
    // Import accounts
    const accountIdMap = new Map();
    for (const account of userData.accounts || []) {
      const result = db.prepare('INSERT INTO accounts (user_id, name, type, institution) VALUES (?, ?, ?, ?)').run(
        userId, account.name, account.type, account.institution
      );
      accountIdMap.set(account.id, result.lastInsertRowid);
    }
    
    // Import categorization rules
    for (const rule of userData.rules || []) {
      const newCategoryId = categoryIdMap.get(rule.category_id);
      db.prepare('INSERT INTO categorization_rules (user_id, pattern, category_id) VALUES (?, ?, ?)').run(
        userId, rule.pattern, newCategoryId || null
      );
    }
    
    // Import transactions
    for (const transaction of userData.transactions || []) {
      const newAccountId = accountIdMap.get(transaction.account_id);
      const newCategoryId = transaction.category_id ? categoryIdMap.get(transaction.category_id) : null;
      
      if (newAccountId) {
        db.prepare(`INSERT INTO transactions 
          (account_id, date, description, amount, category_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          newAccountId, transaction.date, transaction.description, 
          transaction.amount, newCategoryId, transaction.created_at
        );
      }
    }
    
    db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('User import failed:', error);
    res.status(500).json({ success: false, error: 'Import failed.', details: error.message });
  }
});

// --- CATEGORIES + RULES BACKUP ---
router.post('/categories-and-rules', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const db = getDb();
    // Exclude created_at from backup
    const categories = db.prepare('SELECT id, name, parent_id FROM categories WHERE user_id = ?').all(userId);
    const rules = db.prepare('SELECT id, pattern, category_id FROM categorization_rules WHERE user_id = ?').all(userId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `user_${userId}_categories_and_rules_backup.${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, backupFile);
    fs.writeFileSync(backupPath, JSON.stringify({ categories, rules }, null, 2));
    db.close();
    res.json({ success: true, backup: backupFile });
  } catch {
    res.status(500).json({ success: false, error: 'Categories+Rules backup failed.' });
  }
});

// --- CATEGORIES + RULES RESTORE  ---
router.post('/restore/categories-and-rules', (req: AuthenticatedRequest, res) => {
  const { backupFile } = req.body;
  if (!backupFile) return res.status(400).json({ error: 'No backup file specified.' });
  const src = path.join(BACKUP_DIR, backupFile);
  try {
    const userId = req.user!.id;
    const { categories, rules } = JSON.parse(fs.readFileSync(src, 'utf-8'));
    const db = getDb();
    
    // Set user's transaction category_id to NULL before deleting categories to avoid FK constraint errors
    db.prepare(`UPDATE transactions SET category_id = NULL 
                WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)`).run(userId);
    db.prepare('DELETE FROM categorization_rules WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId);

    // --- Two-pass category restore ---
    // 1. Insert all categories with name only, build oldId -> newId map
    const idMap = new Map(); // oldId -> newId
    for (const cat of categories) {
      const result = db.prepare('INSERT INTO categories (user_id, name) VALUES (?, ?)').run(userId, cat.name);
      idMap.set(cat.id, result.lastInsertRowid);
    }
    // 2. Update parent_id for each category
    for (const cat of categories) {
      if (cat.parent_id) {
        const newId = idMap.get(cat.id);
        const newParentId = idMap.get(cat.parent_id) || null;
        db.prepare('UPDATE categories SET parent_id = ? WHERE id = ?').run(newParentId, newId);
      }
    }
    // 3. Insert rules, mapping category_id
    for (const rule of rules) {
      const newCatId = idMap.get(rule.category_id) || null;
      db.prepare('INSERT INTO categorization_rules (user_id, pattern, category_id) VALUES (?, ?, ?)')
        .run(userId, rule.pattern, newCatId);
    }
    db.close();
    res.json({ success: true });
  } catch (err) {
    console.error('Categories+Rules restore failed:', err);
    res.status(500).json({ success: false, error: 'Categories+Rules restore failed.', details: err && err.message });
  }
});

// --- LIST BACKUPS ---
router.get('/backups', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const allFiles = fs.readdirSync(BACKUP_DIR);
    
    // Filter files that belong to this user
    const userExports = allFiles.filter(f => f.startsWith(`user_${userId}_export_`) && f.endsWith('.json'));
    const categoriesAndRules = allFiles.filter(f => f.startsWith(`user_${userId}_categories_and_rules_backup.`) && f.endsWith('.json'));
    
    res.json({ 
      exports: userExports, 
      categoriesAndRules 
    });
  } catch {
    res.status(500).json({ error: 'Failed to list backups.' });
  }
});

export default router;
