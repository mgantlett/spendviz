import React, { useRef, useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import CsvColumnMapper from './CsvColumnMapper';
import type { CsvFieldType } from './CsvColumnMapper';
import { useTransactionsStore } from '../store/transactions';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';
import { detectDateFormat, convertDateToSQLiteFormat } from '../utils/dateFormatDetection';
import { useApi } from '../hooks/useApi';

interface Account {
  id: number;
  name: string;
  type?: string;
}

interface Props {
  accountId?: number | null; // Optional accountId to pre-select
}

// Define a type for the duplicate transaction data we expect from the backend
interface DuplicateTransactionData {
  accountId: number; // Added based on logs
  mappedData: {
    date?: string;
    description?: string;
    debit?: string;
    credit?: string;
    amount?: string; // For single column amount
    [key: string]: string | undefined; // Allow other fields from CSV
  };
  debitCreditLogic: 'single' | 'split';
  finalDateFormat: string;
}

interface FileImportSummary {
  fileName: string;
  rowCount: number;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  errors: { row: Record<string, unknown>, error: string, file?: string }[];
}

interface ForceImportSummary {
  insertedCount: number;
}

interface ImportResult {
  insertedCount: number;
  duplicateCount: number;
  duplicates: DuplicateTransactionData[];
  detectedDateFormat?: string;
  files?: FileImportSummary[];
  forceImportSummary?: ForceImportSummary; // Added for force import result
}

export default function CsvImport({ accountId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]); // Support multiple files
  const [error, setError] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]); // Store all CSV rows for import
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(accountId || null);
  const [mapping, setMapping] = useState<CsvFieldType[]>([]);
  const [importResult, setImportResult] = useState<null | ImportResult>(null);
  const [importing, setImporting] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(false);
  const [forceImportingDuplicates, setForceImportingDuplicates] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasHeaderRow, setHasHeaderRow] = useState(true); // New state for header row toggle

  const { fetchTransactions } = useTransactionsStore();
  const { apiCall } = useApi();

  // Load accounts on component mount
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await apiCall(`/api/accounts`);
        const data = await res.json();
        setAccounts(data);
        // If an accountId prop was passed, use it. Otherwise, selectedAccountId remains as initialized (null or from prop).
        if (accountId) {
          setSelectedAccountId(accountId);
        } else {
          // Ensure it defaults to null if no accountId prop is passed
          setSelectedAccountId(null); 
        }
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      }
    }
    fetchAccounts();
  }, [accountId, apiCall]);

  // Define loadMappingPreset with useCallback
  const loadMappingPreset = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoadingPreset(true);
    try {
      const res = await apiCall(`/api/accounts/${selectedAccountId}/csv-preset`);
      if (res.ok) {
        const preset = await res.json();
        if (preset) {
          // Apply the saved preset if compatible with current CSV columns
          const savedMapping = JSON.parse(preset.mapping_json);
          if (savedMapping.length === columns.length) {
            setMapping(savedMapping);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load mapping preset:', err);
    } finally {
      setLoadingPreset(false);
    }
  }, [selectedAccountId, columns.length, apiCall]); // Added dependencies

  // Load mapping preset when account changes
  useEffect(() => {
    if (selectedAccountId && columns.length > 0) {
      loadMappingPreset();
    }
  }, [selectedAccountId, columns.length, loadMappingPreset]);

  async function saveMappingPreset() {
    if (!selectedAccountId) return;
    try {
      await apiCall(`/api/accounts/${selectedAccountId}/csv-preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapping_json: JSON.stringify(mapping),
          date_format: null, // No longer used
          debit_credit_logic: inferDebitCreditLogic(mapping),
        }),
      });
    } catch (err) {
      console.error('Failed to save mapping preset:', err);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    setFiles(fileList);
    setColumns([]);
    setPreviewRows([]);
    setAllRows([]);
    if (fileList.length > 0) {
      // Use the first file for preview/mapping
      const f = fileList[0];
      Papa.parse<string[]>(f, {
        header: false,
        skipEmptyLines: true,
        preview: 6,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError('Failed to parse CSV: ' + results.errors[0].message);
            return;
          }
          const data = results.data;
          if (!data.length) {
            setError('CSV file is empty');
            return;
          }
          let cols: string[] = [];
          let preview: string[][] = [];
          // --- Auto-detect header row ---
          let autoHasHeader = false;
          if (data.length > 1) {
            const firstRow = data[0];
            let likelyHeader = 0;
            for (let i = 0; i < firstRow.length; i++) {
              const cell = firstRow[i];
              // If cell is not a number and not a valid date, likely a header
              if (isNaN(Number(cell)) && isNaN(Date.parse(cell))) {
                likelyHeader++;
              }
            }
            // If more than half the columns look like headers, treat as header
            if (likelyHeader > firstRow.length / 2) {
              autoHasHeader = true;
            }
          }
          setHasHeaderRow(autoHasHeader);
          if (autoHasHeader) {
            cols = data[0];
            preview = data.slice(1);
          } else {
            cols = data[0].map((_, idx) => `Column ${idx + 1}`);
            preview = data;
          }
          setColumns(cols);
          setPreviewRows(preview);
          setMapping(cols.map(() => 'ignore'));

          // Now parse all rows for import, using the detected hasHeaderRow
          Papa.parse<string[]>(f, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data.length > 0 && results.data[0]) {
                const data = results.data;
                let all: string[][] = [];
                if (autoHasHeader) {
                  if (data.length > 1) {
                    all = data.slice(1);
                  }
                } else {
                  all = data;
                }
                setAllRows(all);
              }
            },
          });
        },
        error: (error: Error) => {
          setError('Failed to load CSV file: ' + error.message);
        },
      });
    }
  }

  function handleRemoveFile(idx?: number) {
    if (typeof idx === 'number') {
      setFiles(prev => prev.filter((_, i) => i !== idx));
    } else {
      setFiles([]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleMappingChange(newMapping: CsvFieldType[]) {
    setMapping(newMapping);
  }

  // Preview mapped data
  function getMappedPreview() {
    if (!columns.length || !previewRows.length) return [];
    // Try to auto-detect date format from preview rows
    const dateColIdx = mapping.findIndex(f => f === 'date');
    let detectedFormat = 'YYYY-MM-DD';
    if (dateColIdx !== -1) {
      const dateSamples = previewRows.map(row => row[dateColIdx]).filter(Boolean);
      const detection = detectDateFormat(dateSamples, 6);
      if (detection && detection.confidence > 0.7) {
        detectedFormat = detection.format;
      }
    }
    return previewRows.map((row) => {
      const mapped: Record<string, string> = {};
      mapping.forEach((field, idx) => {
        if (field !== 'ignore') {
          if (field === 'date') {
            mapped[field] = convertDateToSQLiteFormat(row[idx], detectedFormat) || row[idx];
          } else {
            mapped[field] = row[idx];
          }
        }
      });
      return mapped;
    });
  }

  const mappedPreview = getMappedPreview();

  // In handleImport and saveMappingPreset, infer logic from mapping
  function inferDebitCreditLogic(mapping: CsvFieldType[]): 'single' | 'split' {
    const hasDebit = mapping.includes('debit');
    const hasCredit = mapping.includes('credit');
    return hasDebit && hasCredit ? 'split' : 'single';
  }

  async function handleImport() {
    setImporting(true);
    setError('');
    setImportResult(null);
    setSuccessMessage('');
    try {
      if (files.length === 0 || !selectedAccountId) {
        setError('No file(s) or account selected');
        setImporting(false);
        return;
      }
      const formData = new FormData();
      files.forEach((file, idx) => {
        formData.append('csvFiles', file, file.name);
      });
      formData.append('accountId', String(selectedAccountId));
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('debitCreditLogic', inferDebitCreditLogic(mapping));
      formData.append('hasHeaderRow', String(hasHeaderRow));

      const res = await apiCall(`/api/csv-import/import-csv`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to import CSV' }));
        throw new Error(errorData.error || 'Failed to import CSV');
      }
      const result = await res.json();
      setImportResult(result);
      await saveMappingPreset();
      // Refresh transaction list after import
      await fetchTransactions(apiCall, { accountId: selectedAccountId });
      setSuccessMessage('Transactions imported successfully.');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  }

  async function handleForceImportDuplicates() {
    setForceImportingDuplicates(true);
    setError('');
    setSuccessMessage('');
    try {
      if (!importResult || !importResult.duplicates || importResult.duplicates.length === 0) return;
      const res = await apiCall(`/api/csv-import/force-import-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: importResult.duplicates }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to force import duplicates' }));
        throw new Error(errorData.error || 'Failed to force import duplicates');
      }
      const forceResult = await res.json();
      setImportResult({
        ...importResult,
        forceImportSummary: forceResult,
      });
      setSuccessMessage('Duplicate transactions imported successfully.');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to force import duplicates');
    } finally {
      setForceImportingDuplicates(false);
    }
  }

  // Defensive: compute counts from fields if present, fallback to 0
  const insertedCount = importResult?.insertedCount ?? 0;
  const duplicateCount = importResult?.duplicateCount ?? (importResult?.duplicates?.length ?? 0);
  const fileSummaries: FileImportSummary[] = importResult?.files ?? [];

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Import Data</h2>
      {successMessage && <div className="mb-2 text-green-700">{successMessage}</div>}
      {/* Account Selection */}
      <div className="mb-4">
        <Label htmlFor="accountSelect" className="mb-1">Account:</Label>
        <Select
          value={selectedAccountId === null ? 'none' : String(selectedAccountId)}
          onValueChange={val => setSelectedAccountId(val === 'none' ? null : Number(val))}
        >
          <SelectTrigger id="accountSelect">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {accounts.map(account => (
              <SelectItem key={account.id} value={String(account.id)}>{account.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* File Selection */}
      <div className="mb-4">
        <Label htmlFor="csvFile" className="mb-1">CSV File:</Label>
        <input
          type="file"
          id="csvFile"
          accept=".csv"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          className="block w-full text-sm text-muted-foreground file:bg-primary file:text-primary-foreground file:rounded file:border-0 file:px-4 file:py-2 file:mr-4"
          required
        />
      </div>
      {files.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {files.map((f, idx) => (
            <span key={f.name} className="text-green-700 flex items-center gap-1">
              Selected: {f.name}
              <Button type="button" variant="link" className="text-xs text-red-500 p-0 h-auto min-h-0" onClick={() => handleRemoveFile(idx)}>Remove</Button>
            </span>
          ))}
          <Button type="button" variant="link" className="text-xs text-red-500 p-0 h-auto min-h-0" onClick={() => handleRemoveFile()}>Remove All</Button>
        </div>
      )}
      {error && <div className="text-destructive text-sm mt-2">{error}</div>}
      {files.length > 0 && columns.length > 0 && previewRows.length > 0 && (
        <>
          {loadingPreset && (
            <div className="text-blue-600 mb-2">Loading saved mapping for this account...</div>
          )}
          <CsvColumnMapper
            columns={columns}
            previewRows={previewRows}
            onMappingChange={handleMappingChange}
            initialMapping={mapping}
          />
          {/* Preview mapped data */}
          <div className="mb-4">
            <div className="font-semibold mb-1">Preview (first 5 mapped rows):</div>
            <div className="text-xs text-muted-foreground mb-1">Dates will be saved as <span className="font-mono">YYYY-MM-DD</span> format</div>
            <Table className="min-w-full text-xs">
              <TableHeader>
                <TableRow>
                  {Array.from(new Set(mapping.filter(f => f !== 'ignore'))).map((field) => (
                    <TableHead key={field} className="px-2 py-1 ">{field}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedPreview.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {Array.from(new Set(mapping.filter(f => f !== 'ignore'))).map((field) => (
                      <TableCell key={field} className="px-2 py-1 ">{row[field] || ''}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-white font-bold px-4 py-2 rounded shadow-sm mt-4"
            onClick={handleImport}
            disabled={!selectedAccountId || mapping.every(f => f === 'ignore') || importing || allRows.length === 0 || (importResult !== null && importResult.duplicateCount > 0) }
          >
            {importing ? 'Importing...' : 'Confirm & Import'}
          </Button>
          {importResult && (
            <div className="mt-4">
              <div className="font-semibold">Import Result:</div>
              <div>Inserted: {insertedCount}</div>
              <div>Duplicates: {duplicateCount}</div>
              {fileSummaries.length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold mb-1">Per-file Summary:</div>
                  <Table className="min-w-full text-xs mb-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Rows</TableHead>
                        <TableHead>Imported</TableHead>
                        <TableHead>Duplicates</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fileSummaries.map((f, i) => (
                        <TableRow key={i}>
                          <TableCell>{f.fileName}</TableCell>
                          <TableCell>{f.rowCount}</TableCell>
                          <TableCell>{f.importedCount}</TableCell>
                          <TableCell>{f.duplicateCount}</TableCell>
                          <TableCell>{f.errorCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {fileSummaries.some((f) => f.errorCount > 0) && (
                    <details className="mb-2">
                      <summary className="cursor-pointer text-red-700">Show error details</summary>
                      <div className="overflow-x-auto mt-2">
                        <Table className="min-w-full text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>File</TableHead>
                              <TableHead>Error</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fileSummaries.flatMap((f) =>
                              (f.errors || []).map((err, j) => (
                                <TableRow key={f.fileName + '-' + j}>
                                  <TableCell>{f.fileName}</TableCell>
                                  <TableCell>{err.error}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </details>
                  )}
                </div>
              )}
              {importResult.duplicates && importResult.duplicates.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-700">Show duplicate details</summary>
                  <div className="overflow-x-auto mt-2">
                    <Table className="min-w-full text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-2 py-1 ">Date</TableHead>
                          <TableHead className="px-2 py-1 ">Description</TableHead>
                          <TableHead className="px-2 py-1 ">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.duplicates.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="px-2 py-1 ">{d.mappedData?.date || ''}</TableCell>
                            <TableCell className="px-2 py-1 ">{d.mappedData?.description || ''}</TableCell>
                            <TableCell className="px-2 py-1 ">{d.mappedData?.amount || d.mappedData?.debit || d.mappedData?.credit || ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {importResult.duplicates.length > 0 && (
                    <Button
                      className="mt-2 bg-green-600 text-white px-3 py-1 rounded shadow hover:bg-green-700 disabled:opacity-60"
                      onClick={handleForceImportDuplicates}
                      disabled={forceImportingDuplicates || !selectedAccountId || !!importResult.forceImportSummary}
                    >
                      {forceImportingDuplicates ? 'Importing Duplicates...' : 'Import Flagged Duplicates'}
                    </Button>
                  )}
                </details>
              )}
              {/* Render force import summary if available */}
              {importResult.forceImportSummary && (
                <div className="mt-4">
                  <div className="font-semibold">Force Import Duplicates Result:</div>
                  <div>Inserted: {importResult.forceImportSummary.insertedCount}</div>
                </div>
              )}
              {/* Add Reset Import button to allow user to clear state manually */}
              <Button
                className="mt-4 bg-gray-200 text-gray-800 px-3 py-1 rounded shadow hover:bg-gray-300"
                onClick={() => {
                  setFiles([]);
                  setColumns([]);
                  setPreviewRows([]);
                  setAllRows([]);
                  setMapping([]);
                  setImportResult(null);
                  setSuccessMessage('');
                  setError('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Reset Import
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
