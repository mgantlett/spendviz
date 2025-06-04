import 'dotenv/config';
// Minimal Express backend for Spendviz
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { initDb } from './db';
import accountsRouter from './routes/accounts';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import csvImportRouter from './routes/csvImport';
import categorizationRulesRouter from './routes/categorizationRules';
import backupRouter from './routes/backup';
import reportsRouter from './routes/reports';
import authRouter from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';

initDb();
// Note: Default categories are now created per-user during registration

const app = express();

// Trust proxy for correct IP detection behind Nginx
app.set('trust proxy', 1); 

// Security middleware
app.use(helmet());
app.use(cors());

// JSON middleware for most routes, but exclude CSV file upload route that needs multipart handling
app.use((req, res, next) => {
  if (req.path === '/api/csv-import/import-csv' && req.method === 'POST') {
    // Skip JSON parsing for CSV file upload route that handles multipart form data
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

// Authentication routes (public)
app.use('/api/auth', authRouter);

// Protected API routes (require authentication)
app.use('/api/accounts', requireAuth, accountsRouter);
app.use('/api/transactions', requireAuth, transactionsRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/csv-import', requireAuth, csvImportRouter);
app.use('/api/categorization-rules', requireAuth, categorizationRulesRouter);
app.use('/api/backup', requireAuth, backupRouter);
app.use('/api/reports', requireAuth, reportsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// DB Info API
app.get('/api/db-info', (_req, res) => {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'spendviz.multi-user.sqlite3');
  res.json({ dbPath });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'dist')));
  
  // Handle client-side routing - send index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5174;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
