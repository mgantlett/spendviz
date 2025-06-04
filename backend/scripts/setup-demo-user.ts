// Script to create a demo user and import demo data for Spendviz
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createUser, getUserByEmail } from '../db/users';
import { ensureDefaultCategories, initDb } from '../db/index'; // Added initDb
import { getDb } from '../db';

const DEMO_EMAIL = 'demo@spendviz.app';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME = 'Demo User';
const GENERATED_DATA_PATH = path.join(__dirname, '../data/generated_test_data.json');

async function main() {
  // Initialize the database schema if it doesn't exist
  initDb();

  // 1. Create demo user if not exists
  let user = getUserByEmail(DEMO_EMAIL);
  if (!user) {
    user = createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME });
    ensureDefaultCategories(user.id);
    console.log(`✅ Created demo user: ${DEMO_EMAIL}`);
  } else {
    console.log(`ℹ️ Demo user already exists: ${DEMO_EMAIL}`);
  }

  // 2. Import backup data for demo user
  if (!fs.existsSync(GENERATED_DATA_PATH)) {
    console.error(`❌ Generated data file not found: ${GENERATED_DATA_PATH}`);
    process.exit(1);
  }
  const userData = JSON.parse(fs.readFileSync(GENERATED_DATA_PATH, 'utf-8'));
  const db = getDb();

  // Clear existing demo user data
  db.prepare('DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)').run(user.id);
  db.prepare('DELETE FROM categorization_rules WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM accounts WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM categories WHERE user_id = ?').run(user.id);

  // Import categories
  const categoryIdMap = new Map();
  for (const category of userData.categories || []) {
    const result = db.prepare('INSERT INTO categories (user_id, name, parent_id) VALUES (?, ?, ?)').run(
      user.id, category.name, null
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
      user.id, account.name, account.type, account.institution
    );
    accountIdMap.set(account.id, result.lastInsertRowid);
  }
  // Import categorization rules
  for (const rule of userData.rules || []) {
    const newCategoryId = categoryIdMap.get(rule.category_id);
    db.prepare('INSERT INTO categorization_rules (user_id, pattern, category_id) VALUES (?, ?, ?)').run(
      user.id, rule.pattern, newCategoryId || null
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
  console.log('✅ Demo data imported for demo user.');
}

main().catch((err) => {
  console.error('❌ Error setting up demo user:', err);
  process.exit(1);
});
