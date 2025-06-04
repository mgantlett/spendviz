import { useState, useEffect } from 'react';
import type { Transaction } from '../types/transaction';
import type { Account } from '../types/account';
import type { Category } from '../types/category';
import { useTransactionsStore } from '../store/transactions';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "./ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Button } from "./ui/button";
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DatePeriodSelector } from "./ui/date-period-selector";
import { convertDateToSQLiteFormat, detectDateFormat } from '../utils/dateFormatDetection';
import { useApi } from '../hooks/useApi';

export default function TransactionsList() {
  // Replace local state for transactions, totalItems, loading, error with store
  const {
    transactions,
    totalItems,
    isLoading,
    error,
    fetchTransactions,
  } = useTransactionsStore();
  const { apiCall } = useApi();

  // Local state for filters, sorting, pagination, etc. remains
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Filter states
  const [filterDescription, setFilterDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Sorting states
  const [sortColumn, setSortColumn] = useState<keyof Transaction | 'account_name' | 'category_name'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25); // Increased from 10 to 25

  // State for all filtered transactions (not paginated)
  const [allFilteredTransactions, setAllFilteredTransactions] = useState<Transaction[]>();

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions(apiCall, {
      accountId: selectedAccountId,
      description: filterDescription,
      startDate,
      endDate,
      categoryId:
        selectedCategoryId === null
          ? undefined // All Categories
          : selectedCategoryId === -1
          ? null // Uncategorized
          : selectedCategoryId, // Specific category
      sortColumn,
      sortDirection,
      currentPage,
      itemsPerPage,
    });
  }, [selectedAccountId, filterDescription, startDate, endDate, selectedCategoryId, sortColumn, sortDirection, currentPage, itemsPerPage, fetchTransactions, apiCall]);

  // Fetch all filtered transactions for totals (not paginated)
  useEffect(() => {
    async function fetchAllFilteredTransactions() {
      const urlParams = new URLSearchParams();
      if (selectedAccountId) urlParams.append('account_id', selectedAccountId.toString());
      if (filterDescription) urlParams.append('description', filterDescription);
      if (startDate) urlParams.append('startDate', startDate);
      if (endDate) urlParams.append('endDate', endDate);
      if (selectedCategoryId === -1) {
        urlParams.append('category_id', 'null');
      } else if (selectedCategoryId) {
        urlParams.append('category_id', selectedCategoryId.toString());
      }
      urlParams.append('sort', sortColumn);
      urlParams.append('direction', sortDirection);
      urlParams.append('limit', '100000'); // Large limit to get all filtered
      urlParams.append('page', '1');
      const res = await apiCall(`/api/transactions?${urlParams}`);
      if (res.ok) {
        const data = await res.json();
        setAllFilteredTransactions(data.transactions || []);
      } else {
        setAllFilteredTransactions([]);
      }
    }
    fetchAllFilteredTransactions();
  }, [selectedAccountId, filterDescription, startDate, endDate, selectedCategoryId, sortColumn, sortDirection, apiCall]);

  async function fetchAccounts() {
    try {
      const res = await apiCall(`/api/accounts`);
      if (!res.ok) throw new Error('Failed to fetch accounts');
      const data = await res.json();
      setAccounts(data);
      // Default to "All Accounts" (null selectedAccountId)
      // The existing logic for selectedAccountId starting as null is correct for "All Accounts"
      // No change needed here to default to "All Accounts" as selectedAccountId is initialized to null.
    } catch (err: unknown) {
      console.error(err);
    }
  }

  async function fetchCategories() {
    try {
      const res = await apiCall(`/api/categories`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data);
    } catch (err: unknown) {
      console.error(err);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Helper to display date as YYYY-MM-DD
  function displayDate(date: string) {
    // Try to parse as YYYY-MM-DD, fallback to auto-detect
    const ymd = convertDateToSQLiteFormat(date, 'YYYY-MM-DD');
    if (ymd) return ymd;
    // Try to auto-detect format if not already normalized
    const detection = detectDateFormat([date], 1);
    if (detection) {
      const norm = convertDateToSQLiteFormat(date, detection.format);
      if (norm) return norm;
    }
    return date;
  }

  function handleSort(column: keyof Transaction | 'account_name' | 'category_name') {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page on sort change
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  function renderSortIcon(column: keyof Transaction | 'account_name' | 'category_name') {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓'; // Up and down arrows
  }

  // Calculate total debit and credit from all filtered transactions
  const totalDebit = allFilteredTransactions?.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalCredit = allFilteredTransactions?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0;

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Total transactions count + debit/credit summary */}
      <div className="mb-4 flex flex-wrap items-center text-sm text-muted-foreground">
        <span className="pr-8">
          Showing {totalItems} transaction{totalItems === 1 ? '' : 's'}
        </span>
        <span className="pr-8 text-destructive">Total Debits: {formatCurrency(totalDebit)}</span>
        <span className="text-success">Total Credits: {formatCurrency(totalCredit)}</span>
      </div>

      <div>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead onClick={() => handleSort('date')} className="cursor-pointer select-none px-2 py-2 whitespace-nowrap">
                Date{renderSortIcon('date')}
              </TableHead>
              <TableHead onClick={() => handleSort('description')} className="cursor-pointer select-none px-2 py-2">
                Description{renderSortIcon('description')}
              </TableHead>
              <TableHead onClick={() => handleSort('account_name')} className="cursor-pointer select-none px-2 py-2 whitespace-nowrap">
                Account{renderSortIcon('account_name')}
              </TableHead>
              <TableHead onClick={() => handleSort('category_name')} className="cursor-pointer select-none px-2 py-2 whitespace-nowrap">
                Category{renderSortIcon('category_name')}
              </TableHead>
              <TableHead onClick={() => handleSort('amount')} className="cursor-pointer select-none px-2 py-2 whitespace-nowrap text-right">
                Amount{renderSortIcon('amount')}
              </TableHead>
            </TableRow>
            {/* Filter Row - Optimized spacing */}
            <TableRow>
              {/* Date Filter */}
              <TableCell className="p-1 pr-2">
                <DatePeriodSelector
                  startDate={startDate}
                  endDate={endDate}
                  setStartDate={setStartDate}
                  setEndDate={setEndDate}
                  onApply={() => fetchTransactions(apiCall, {
                    accountId: selectedAccountId,
                    description: filterDescription,
                    startDate,
                    endDate,
                    categoryId:
                      selectedCategoryId === null
                        ? undefined
                        : selectedCategoryId === -1
                        ? null
                        : selectedCategoryId,
                    sortColumn,
                    sortDirection,
                    currentPage,
                    itemsPerPage,
                  })}
                  onClear={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="min-w-[135px] w-[135px]"
                  modal={true}
                  align="start"
                />
              </TableCell>
              <TableCell className="p-1 pr-2">
                <Input
                  type="text"
                  id="descriptionFilter"
                  value={filterDescription}
                  onChange={e => setFilterDescription(e.target.value)}
                  placeholder="Search..."
                  className="w-full"
                />
              </TableCell>
              <TableCell className="p-1 pr-2">
                <Select value={selectedAccountId === null ? undefined : String(selectedAccountId)} onValueChange={val => setSelectedAccountId(val && val !== "__ALL__" ? parseInt(val) : null)}>
                  <SelectTrigger className="w-full min-w-[100px]">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Accounts</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.name} {account.type ? `(${account.type})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="p-1 pr-2">
                <Select
                  value={selectedCategoryId === null ? undefined : String(selectedCategoryId)}
                  onValueChange={val => {
                    if (val === "__ALL__") {
                      setSelectedCategoryId(null);
                    } else if (val === "__UNCATEGORIZED__") {
                      setSelectedCategoryId(-1); // Use -1 to represent uncategorized
                    } else {
                      setSelectedCategoryId(parseInt(val));
                    }
                  }}
                >
                  <SelectTrigger className="w-full min-w-[100px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Categories</SelectItem>
                    <SelectItem value="__UNCATEGORIZED__">Uncategorized</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="p-1 pr-2"></TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive">
                  Error: {error}
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No transactions found. (Try adjusting filters or check server logs)
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} >
                  <TableCell className="px-2 py-2 whitespace-nowrap">{displayDate(transaction.date)}</TableCell>
                  <TableCell className="px-2 py-2">{transaction.description}</TableCell>
                  <TableCell className="px-2 py-2 whitespace-nowrap">{transaction.account_name}</TableCell>
                  <TableCell className="px-2 py-2 whitespace-nowrap">
                    {transaction.category_name || (categories.find(c => c.id === transaction.category_id)?.name) || 'Uncategorized'}
                  </TableCell>
                  <TableCell className={`px-2 py-2 whitespace-nowrap text-right ${transaction.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div>
              <span className="text-sm">
                Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
              </span>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="itemsPerPage" >Items per page:</Label>
              <Select
                value={String(itemsPerPage)}
                onValueChange={val => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id="itemsPerPage" className="min-w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
