// Database initialization and schema for Spendviz (Node.js backend)
// Uses better-sqlite3 for local storage
import * as path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'spendviz.multi-user.sqlite3');

export function getDb() {
  return new Database(DB_PATH);
}

export function initDb() {
  const db = getDb();

  // Users table (for multi-user support)
  db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  // Accounts table
  db.prepare(`CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    institution TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, name, type, institution)
  )`).run();

  // Categories table
  db.prepare(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    parent_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, name)
  )`).run();

  // Transactions table
  db.prepare(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    category_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  )`).run();

  // Categorization rules table
  db.prepare(`CREATE TABLE IF NOT EXISTS categorization_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pattern TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  )`).run();

  // Add user_id column to existing categorization_rules table if it doesn't exist
  try {
    db.prepare(`ALTER TABLE categorization_rules ADD COLUMN user_id INTEGER REFERENCES users(id)`).run();
  } catch {
    // Column already exists, which is fine
  }

  // CSV mapping presets per account
  db.prepare(`CREATE TABLE IF NOT EXISTS csv_mapping_presets_per_account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL UNIQUE,
    mapping_json TEXT NOT NULL,
    date_format TEXT,
    debit_credit_logic TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  )`).run();

  db.close();
}

export function ensureDefaultCategories(userId: number) {
  const db = getDb();
  const defaults = [
    'Income',
    'Housing',
    'Food',
    'Transportation',
    'Utilities',
    'Healthcare',
    'Entertainment',
    'Personal Care',
    'Miscellaneous',
  ];
  const stmt = db.prepare('INSERT OR IGNORE INTO categories (user_id, name) VALUES (?, ?)');
  for (const name of defaults) {
    stmt.run(userId, name);
  }
  db.close();
}
