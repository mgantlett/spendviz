import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import Papa from 'papaparse';
import { detectDateFormat, convertDateToSQLiteFormat } from '../utils/dateFormatDetection';
import { createTransaction, getTransactions } from '../db/transactions';
import type { Transaction } from '../types/transaction';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// --- CSV Import API ---
router.post('/import-csv', upload.array('csvFiles'), async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (!req.files || !(Array.isArray(req.files)) || req.files.length === 0) {
    return res.status(400).json({ message: 'No file(s) uploaded.' });
  }
  const files = req.files;
  try {
    const accountId = parseInt(req.body.accountId, 10);
    const mapping = typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
    const debitCreditLogic = req.body.debitCreditLogic as 'single' | 'split';
    if (isNaN(accountId)) {
      return res.status(400).json({ message: 'Invalid account ID' });
    }
    const inserted: Transaction[] = [];
    const duplicates: Record<string, unknown>[] = [];
    const errors: { row: Record<string, unknown>, error: string, file?: string }[] = [];
    let detectedDateFormat: string | undefined = undefined;
    const fileSummaries: {
      fileName: string;
      rowCount: number;
      importedCount: number;
      duplicateCount: number;
      errorCount: number;
      errors: { row: Record<string, unknown>, error: string, file?: string }[];
    }[] = [];
    // Fetch all existing transactions for this account for duplicate detection
    const existingTxs = getTransactions(req.user!.id, { account_id: accountId.toString(), limit: 100000 }).transactions;
    const existingSet = new Set(
      existingTxs.map(tx => {
        const normDate = convertDateToSQLiteFormat(tx.date, 'YYYY-MM-DD') || tx.date;
        return `${normDate}|${tx.description}|${tx.amount}`;
      })
    );
    for (const file of files) {
      const filePath: string = file.path;
      let fileInserted = 0, fileDuplicates = 0, fileErrors = 0, fileRowCount = 0;
      const fileErrorsArr: { row: Record<string, unknown>, error: string, file?: string }[] = [];
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        // Use hasHeaderRow from the request to control PapaParse
        const hasHeaderRow = req.body.hasHeaderRow === 'true' || req.body.hasHeaderRow === true;
        const parsed = Papa.parse(fileContent, {
          header: hasHeaderRow,
          skipEmptyLines: true,
          dynamicTyping: true,
          transformHeader: (header: string) => header.trim().toLowerCase(),
        });
        if (parsed.errors.length > 0) {
          errors.push({ row: {}, error: 'Error parsing CSV file', file: file.originalname });
          fileErrorsArr.push({ row: {}, error: 'Error parsing CSV file', file: file.originalname });
          fileErrors++;
          continue;
        }
        // --- Count actual data rows (excluding empty lines) ---
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
        // If file has a header row, subtract 1 from row count for summary
        fileRowCount = hasHeaderRow && lines.length > 0 ? lines.length - 1 : lines.length;
        // --- Auto-detect date format from first 20 rows ---
        const dateSamples: string[] = [];
        // For header: true, parsed.data is array of objects; for header: false, array of arrays
        const previewRows = Array.isArray(parsed.data) ? parsed.data.slice(0, 20) : [];
        for (const row of previewRows) {
          let rowObj: Record<string, unknown>;
          if (hasHeaderRow) {
            rowObj = row as Record<string, unknown>;
          } else {
            // row is an array of unknowns
            rowObj = {};
            (row as unknown[]).forEach((v, i) => {
              rowObj[String(i)] = v;
            });
          }
          const rowValues = Object.values(rowObj);
          mapping.forEach((fieldType: string, idx: number) => {
            if (fieldType === 'date' && rowValues[idx]) {
              dateSamples.push(String(rowValues[idx]));
            }
          });
        }
        const detection = detectDateFormat(dateSamples, 20);
        if (!detection || detection.confidence < 0.8) {
          errors.push({ row: {}, error: 'Could not reliably detect date format in CSV. Please ensure all dates are consistent.', file: file.originalname });
          fileErrorsArr.push({ row: {}, error: 'Could not reliably detect date format in CSV. Please ensure all dates are consistent.', file: file.originalname });
          fileErrors++;
          continue;
        }
        const finalDateFormat = detection.format;
        if (!detectedDateFormat) detectedDateFormat = finalDateFormat;
        for (const rowUnknown of parsed.data) {
          const transactionData: Record<string, unknown> = {};
          try {
            let row: Record<string, unknown>;
            if (hasHeaderRow) {
              row = rowUnknown as Record<string, unknown>;
            } else {
              row = {};
              (rowUnknown as unknown[]).forEach((val, idx) => {
                row[String(idx)] = val;
              });
            }
            const rowValues = Object.values(row);
            mapping.forEach((fieldType: string, idx: number) => {
              if (fieldType !== 'ignore') {
                transactionData[fieldType] = rowValues[idx];
              }
            });
            if (!transactionData.date || !transactionData.description || (transactionData.amount === undefined && transactionData.debit === undefined && transactionData.credit === undefined)) {
              errors.push({ row, error: 'Missing required fields', file: file.originalname });
              fileErrorsArr.push({ row, error: 'Missing required fields', file: file.originalname });
              fileErrors++;
              continue;
            }
            transactionData.account_id = accountId;
            const ymdDate = convertDateToSQLiteFormat(String(transactionData.date), finalDateFormat);
            if (!ymdDate) {
              errors.push({ row, error: `Invalid date: ${transactionData.date}`, file: file.originalname });
              fileErrorsArr.push({ row, error: `Invalid date: ${transactionData.date}`, file: file.originalname });
              fileErrors++;
              continue;
            }
            if (debitCreditLogic === 'single') {
              let amount = transactionData.amount;
              if (amount === undefined) {
                amount = (Number(transactionData.debit) || 0) - (Number(transactionData.credit) || 0);
              } else {
                amount = Number(amount);
              }
              const key = `${ymdDate}|${String(transactionData.description)}|${Number(amount)}`;
              if (existingSet.has(key)) {
                duplicates.push({ mappedData: { ...transactionData }, debitCreditLogic, finalDateFormat });
                fileDuplicates++;
              } else {
                try {
                  const transaction = await createTransaction(req.user!.id, {
                    account_id: accountId,
                    date: ymdDate,
                    description: String(transactionData.description),
                    amount: Number(amount),
                    category_id: undefined,
                  });
                  if (transaction && typeof transaction === 'object' && 'id' in transaction) {
                    inserted.push(transaction as Transaction);
                    existingSet.add(key);
                    fileInserted++;
                  }
                } catch (e) {
                  errors.push({ row, error: (e as Error).message, file: file.originalname });
                  fileErrorsArr.push({ row, error: (e as Error).message, file: file.originalname });
                  fileErrors++;
                }
              }
            } else if (debitCreditLogic === 'split') {
              if (transactionData.debit !== undefined && Number(transactionData.debit) !== 0) {
                const key = `${ymdDate}|${String(transactionData.description)}|${-Math.abs(Number(transactionData.debit))}`;
                if (existingSet.has(key)) {
                  duplicates.push({ mappedData: { ...transactionData, _splitType: 'debit' }, debitCreditLogic, finalDateFormat });
                  fileDuplicates++;
                } else {
                  try {
                    const debitTransaction = await createTransaction(req.user!.id, {
                      account_id: accountId,
                      date: ymdDate,
                      description: String(transactionData.description),
                      amount: -Math.abs(Number(transactionData.debit)),
                      category_id: undefined,
                    });
                    if (debitTransaction && typeof debitTransaction === 'object' && 'id' in debitTransaction) {
                      inserted.push(debitTransaction as Transaction);
                      existingSet.add(key);
                      fileInserted++;
                    }
                  } catch (e) {
                    errors.push({ row, error: (e as Error).message, file: file.originalname });
                    fileErrorsArr.push({ row, error: (e as Error).message, file: file.originalname });
                    fileErrors++;
                  }
                }
              }
              if (transactionData.credit !== undefined && Number(transactionData.credit) !== 0) {
                const key = `${ymdDate}|${String(transactionData.description)}|${Math.abs(Number(transactionData.credit))}`;
                if (existingSet.has(key)) {
                  duplicates.push({ mappedData: { ...transactionData, _splitType: 'credit' }, debitCreditLogic, finalDateFormat });
                  fileDuplicates++;
                } else {
                  try {
                    const creditTransaction = await createTransaction(req.user!.id, {
                      account_id: accountId,
                      date: ymdDate,
                      description: String(transactionData.description),
                      amount: Math.abs(Number(transactionData.credit)),
                      category_id: undefined,
                    });
                    if (creditTransaction && typeof creditTransaction === 'object' && 'id' in creditTransaction) {
                      inserted.push(creditTransaction as Transaction);
                      existingSet.add(key);
                      fileInserted++;
                    }
                  } catch (e) {
                    errors.push({ row, error: (e as Error).message, file: file.originalname });
                    fileErrorsArr.push({ row, error: (e as Error).message, file: file.originalname });
                    fileErrors++;
                  }
                }
              }
            }
          } catch (e) {
            errors.push({ row: rowUnknown as Record<string, unknown>, error: (e as Error).message, file: file.originalname });
            fileErrorsArr.push({ row: rowUnknown as Record<string, unknown>, error: (e as Error).message, file: file.originalname });
            fileErrors++;
          }
        }
      } finally {
        if (filePath) {
          fs.unlink(filePath, err => {
            if (err) console.error('Error deleting file:', err);
          });
        }
        fileSummaries.push({
          fileName: file.originalname,
          rowCount: fileRowCount,
          importedCount: fileInserted,
          duplicateCount: fileDuplicates,
          errorCount: fileErrors,
          errors: fileErrorsArr,
        });
      }
    }
    res.json({
      insertedCount: inserted.length,
      duplicateCount: duplicates.length,
      duplicates,
      errors,
      detectedDateFormat,
      files: fileSummaries,
    });
  } catch (e) {
    const error = e as Error;
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Failed to import CSV', details: error.message });
  }
});

// --- Force Import Duplicates API ---
router.post('/force-import-transactions', async (req: AuthenticatedRequest, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions provided' });
    }
    let insertedCount = 0;
    for (const t of transactions) {
      const tx = t.mappedData || t;
      const logic = t.debitCreditLogic || 'single';
      const splitType = tx._splitType;
      let account_id = tx.account_id;
      if (account_id === undefined && req.body.accountId) {
        account_id = Number(req.body.accountId);
      }
      if (account_id === undefined) {
        continue;
      }
      let ymdDate = tx.date;
      const finalDateFormat = t.finalDateFormat || 'YYYY-MM-DD';
      ymdDate = convertDateToSQLiteFormat(String(tx.date), finalDateFormat);
      if (!ymdDate) continue;
      let amount: number;
      if (logic === 'split') {
        if (splitType === 'debit') {
          amount = -Math.abs(Number(tx.debit));
        } else if (splitType === 'credit') {
          amount = Math.abs(Number(tx.credit));
        } else {
          continue;
        }
      } else {
        amount = tx.amount !== undefined ? Number(tx.amount) : (Number(tx.debit) || 0) - (Number(tx.credit) || 0);
      }
      try {
        await createTransaction(req.user!.id, {
          account_id,
          date: ymdDate,
          description: String(tx.description),
          amount,
          category_id: undefined,
        });
        insertedCount++;
      } catch (e) {
        if (!(e instanceof Error && e.message.includes('UNIQUE constraint failed'))) {
          throw e;
        }
      }
    }
    res.json({ insertedCount });
  } catch (e) {
    const error = e as Error;
    console.error('Error force importing duplicates:', error);
    res.status(500).json({ error: 'Failed to force import duplicates', details: error.message });
  }
});

export default router;
