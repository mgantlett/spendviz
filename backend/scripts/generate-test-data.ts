import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_DATA_PATH = path.join(__dirname, '../data/seed_data.json');
const GENERATED_DATA_PATH = path.join(__dirname, '../data/generated_test_data.json');

interface Transaction {
  id: number;
  account_id: number;
  date: string;
  description: string;
  amount: number;
  category_id: number | null;
  created_at: string;
}

interface Account {
  id: number;
  user_id: number;
  name: string;
  type: string;
  institution: string;
  created_at: string;
}

interface Category {
  id: number;
  user_id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
}

interface Rule {
  id: number;
  pattern: string;
  category_id: number | null;
  created_at: string;
  user_id: number;
}

import { User } from '../types/user';

interface UserData {
  user: User;
  accounts: Account[];
  categories: Category[];
  rules: Rule[];
  transactions: Transaction[];
  exportedAt: string;
}

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function generateTestData() {
  if (!fs.existsSync(SEED_DATA_PATH)) {
    console.error(`❌ Seed data file not found: ${SEED_DATA_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(SEED_DATA_PATH, 'utf-8');
  const userData: UserData = JSON.parse(rawData);

  const accounts = userData.accounts;
  const rules = userData.rules;
  const transactions = [...userData.transactions];

  // Determine the last date in existing transactions
  let lastDate = new Date('2024-01-01'); // Default if no transactions
  if (transactions.length > 0) {
    const latestTransaction = transactions.reduce((prev, current) => {
      return (new Date(prev.date) > new Date(current.date)) ? prev : current;
    });
    lastDate = new Date(latestTransaction.date);
  }

  const today = new Date();
  let currentDate = addDays(lastDate, 1);
  let newTransactionId = transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1;

  console.log(`Generating data from ${formatDate(currentDate)} to ${formatDate(today)}`);

  while (currentDate <= today) {
    for (const account of accounts) {
      // Generate a few random transactions per account per day
      const numTransactions = getRandomInt(0, 2); // 0 to 2 transactions per account per day
      for (let i = 0; i < numTransactions; i++) {
        const isIncome = Math.random() < 0.1; // 10% chance of income
        let amount = getRandomFloat(10, 300);
        if (isIncome) {
          amount = getRandomFloat(500, 5000); // Larger amounts for income
        } else {
          amount = -amount; // Expenses are negative
        }

        const randomRule = rules[getRandomInt(0, rules.length - 1)];
        const description = randomRule ? randomRule.pattern + ' - GENERATED' : 'GENERATED TRANSACTION';
        const category_id = randomRule ? randomRule.category_id : null;

        transactions.push({
          id: newTransactionId++,
          account_id: account.id,
          date: formatDate(currentDate),
          description: description,
          amount: amount,
          category_id: category_id,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' ') // Current timestamp
        });
      }
    }
    currentDate = addDays(currentDate, 1);
  }

  userData.transactions = transactions;
  userData.exportedAt = new Date().toISOString();

  fs.writeFileSync(GENERATED_DATA_PATH, JSON.stringify(userData, null, 2), 'utf-8');
  console.log(`✅ Generated test data saved to: ${GENERATED_DATA_PATH}`);
  console.log(`Total transactions: ${transactions.length}`);
}

generateTestData().catch((err) => {
  console.error('❌ Error generating test data:', err);
  process.exit(1);
});
