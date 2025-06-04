import { getDb } from './index';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  name?: string;
  created_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export function createUser(userData: CreateUserData): User {
  const db = getDb();
  
  // Hash password
  const saltRounds = 12;
  const passwordHash = bcrypt.hashSync(userData.password, saltRounds);
  
  try {
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, name)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(userData.email, passwordHash, userData.name || null);
    
    // Get the created user
    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid) as User;
    
    return user;
  } finally {
    db.close();
  }
}

export function getUserByEmail(email: string): User | null {
  const db = getDb();
  
  try {
    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE email = ?')
      .get(email) as User | undefined;
    
    return user || null;
  } finally {
    db.close();
  }
}

export function getUserById(id: number): User | null {
  const db = getDb();
  
  try {
    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?')
      .get(id) as User | undefined;
    
    return user || null;
  } finally {
    db.close();
  }
}

export function validateUserPassword(email: string, password: string): User | null {
  const db = getDb();
  
  try {
    const result = db.prepare('SELECT id, email, name, created_at, password_hash FROM users WHERE email = ?')
      .get(email) as (User & { password_hash: string }) | undefined;
    
    if (!result) {
      return null;
    }
    
    const isValid = bcrypt.compareSync(password, result.password_hash);
    if (!isValid) {
      return null;
    }
    
    // Return user without password hash
    const { password_hash: _, ...user } = result;
    return user;
  } finally {
    db.close();
  }
}

export function updateUserPassword(userId: number, newPassword: string): boolean {
  const db = getDb();
  
  try {
    const saltRounds = 12;
    const passwordHash = bcrypt.hashSync(newPassword, saltRounds);
    
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    const result = stmt.run(passwordHash, userId);
    
    return result.changes > 0;
  } finally {
    db.close();
  }
}