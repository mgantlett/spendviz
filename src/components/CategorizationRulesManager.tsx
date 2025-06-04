import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Category } from '../types/category';
import { useCategorizationRulesStore } from '../store/categorizationRules';
import { CategorizationRule } from '../types/categorizationRule'; // Adjust the import based on your project structure
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Label } from './ui/label';
import { useApi } from '../hooks/useApi';

const CategorizationRulesManager: React.FC = () => {
  const {
    rules,
    isLoading,
    error,
    fetchRules,
    addRule,
    updateRule,
    deleteRule,
  } = useCategorizationRulesStore();
  const { apiCall } = useApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newRule, setNewRule] = useState<Partial<CategorizationRule>>({ pattern: '', category_id: undefined });
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editRule, setEditRule] = useState<Partial<CategorizationRule>>({ pattern: '', category_id: undefined });
  const [uncategorizedDescriptions, setUncategorizedDescriptions] = useState<{ description: string; date: string; amount: number }[]>([]);
  const [showPatternPopup, setShowPatternPopup] = useState(false);
  const [patternSearch, setPatternSearch] = useState('');
  const patternInputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [ruleFilter, setRuleFilter] = useState('');

  // Paging, sorting, and filter state for rules
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<'pattern' | 'category_name'>('pattern');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pagedRules, setPagedRules] = useState<CategorizationRule[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiCall('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unknown error fetching categories');
    }
  }, [apiCall]);

  const fetchUncategorizedDescriptions = useCallback(async () => {
    try {
      const response = await apiCall('/api/transactions/uncategorized-descriptions');
      if (!response.ok) {
        throw new Error('Failed to fetch uncategorized descriptions');
      }
      const data = await response.json();
      setUncategorizedDescriptions(data);
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Unknown error fetching descriptions');
    }
  }, [apiCall]);

  // Fetch paged rules
  useEffect(() => {
    async function fetchPagedRules() {
      setIsPageLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(itemsPerPage),
          filter: ruleFilter,
          sort: sortColumn,
          direction: sortDirection,
        });
        const res = await apiCall(`/api/categorization-rules/paged?${params}`);
        if (!res.ok) throw new Error('Failed to fetch rules');
        const data = await res.json();
        setPagedRules(data.rules);
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
      } catch {
        setPagedRules([]);
        setTotalItems(0);
        setTotalPages(1);
      }
      setIsPageLoading(false);
    }
    fetchPagedRules();
  }, [currentPage, itemsPerPage, sortColumn, sortDirection, ruleFilter, apiCall, rules]);

  useEffect(() => {
    fetchRules(apiCall);
    fetchCategories();
    fetchUncategorizedDescriptions();
  }, [fetchRules, fetchCategories, fetchUncategorizedDescriptions, apiCall]);

  const handleDeleteRule = async (id: number) => {
    const result = await deleteRule(id, apiCall);
    if (result) {
      // The useEffect will automatically refresh pagedRules when rules change
    }
  };

  // Add this function to handle apply all rules
  const handleApplyAllRules = async () => {
    setLocalError(null);
    try {
      const response = await apiCall('/api/transactions/apply-all-rules', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply rules');
      }
      const result = await response.json();
      await fetchUncategorizedDescriptions(); // Refresh uncategorized descriptions
      alert(`Rules applied. Categorized: ${result.categorized}, Conflicts: ${result.conflicts}. You may need to refresh the transactions list to see changes.`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error applying rules');
    }
  };

  // Filter raw descriptions to exclude those matching existing rule patterns
  const filteredDescriptions = uncategorizedDescriptions.filter(row =>
    !rules.some(rule => row.description.toLowerCase().includes(rule.pattern.toLowerCase())) &&
    (patternSearch.trim() === '' || row.description.toLowerCase().includes(patternSearch.toLowerCase()))
  );

  if (isLoading) {
    return <div>Loading rules...</div>;
  }

  // Add Rule (header row)
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.pattern || !newRule.category_id) {
      setLocalError('Pattern and category are required');
      return;
    }
    const result = await addRule(newRule as CategorizationRule, apiCall);
    if (result) {
      setNewRule({ pattern: '', category_id: undefined });
      setPatternSearch('');
      setShowPatternPopup(false);
      setLocalError(null);
      // Refresh the paged rules to show the new rule
      setCurrentPage(1); // Reset to first page to see the new rule
    }
  };

  // Edit Rule (inline row)
  const handleEditRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRule.pattern || !editRule.category_id || editingRuleId === null) {
      setLocalError('Pattern and category are required');
      return;
    }
    const result = await updateRule(editingRuleId, editRule, apiCall);
    if (result) {
      setEditingRuleId(null);
      setEditRule({ pattern: '', category_id: undefined });
      setLocalError(null);
      // The useEffect will automatically refresh pagedRules when rules change
    }
  };

  const startEdit = (rule: CategorizationRule) => {
    setEditingRuleId(rule.id);
    setEditRule({ pattern: rule.pattern, category_id: rule.category_id });
  };

  const cancelEdit = () => {
    setEditingRuleId(null);
    setEditRule({ pattern: '', category_id: undefined });
  };

  function handleSort(col: 'pattern' | 'category_name') {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }

  return (
    <div className="max-w-6xl mx-auto p-0 pt-0">
      <div className="flex justify-between items-center mb-4 gap-2">
        <Button
          onClick={handleApplyAllRules}
          className="bg-success hover:bg-success/90 text-white font-bold px-4 py-2 rounded shadow-sm"
          disabled={isLoading}
        >
          {isLoading ? 'Applying...' : 'Apply All Rules'}
        </Button>
      </div>
      {error && (
        <div className="p-3 mb-4 bg-destructive/10 border border-destructive rounded-md">
          <div className="text-destructive text-sm">{error}</div>
        </div>
      )}

      <div >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort('pattern')} className="cursor-pointer select-none">Pattern{sortColumn === 'pattern' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</TableHead>
              <TableHead onClick={() => handleSort('category_name')} className="cursor-pointer select-none">Category{sortColumn === 'category_name' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
            <TableRow>
              <TableCell colSpan={3} className="p-1">
                <Input
                  type="text"
                  value={ruleFilter}
                  onChange={e => { setRuleFilter(e.target.value); setCurrentPage(1); }}
                  placeholder="Filter rules by pattern or category..."
                  className="w-full"
                />
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Add Rule Form Row (header) */}
            <TableRow>
              <TableCell>
                <form onSubmit={handleAddRule} className="flex flex-col w-full relative">
                  <Label htmlFor="add-rule-pattern" className="sr-only">Pattern</Label>
                  <Input
                    type="text"
                    id="add-rule-pattern"
                    ref={patternInputRef}
                    value={newRule.pattern || ''}
                    onChange={e => {
                      setNewRule({ ...newRule, pattern: e.target.value });
                      setPatternSearch(e.target.value);
                      setShowPatternPopup(true);
                    }}
                    onFocus={() => setShowPatternPopup(true)}
                    onBlur={() => {
                      // Delay to allow pointer events in popup
                      setTimeout(() => {
                        const popup = document.getElementById('pattern-popup');
                        if (
                          !popup?.contains(document.activeElement) &&
                          document.activeElement !== patternInputRef.current
                        ) {
                          setShowPatternPopup(false);
                        }
                      }, 120);
                    }}
                    onPointerDown={() => setShowPatternPopup(true)}
                    required
                    placeholder="Pattern"
                    autoComplete="off"
                  />
                  {showPatternPopup && filteredDescriptions.length > 0 && (
                    <div
                      id="pattern-popup"
                      className="absolute left-0 top-[110%] z-20 bg-white dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded shadow-lg w-auto min-w-0 max-w-[32rem] h-auto max-h-[22rem] overflow-y-auto mt-1"
                      tabIndex={-1}
                      onPointerDown={e => {
                        // Prevent popup from closing when clicking/scrolling inside
                        e.stopPropagation();
                      }}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-20">Date</TableHead>
                            <TableHead className="w-16 text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDescriptions.map((row, idx) => (
                            <TableRow
                              key={row.description + row.date + row.amount + idx}
                              className="cursor-pointer hover:bg-accent"
                              onMouseDown={e => {
                                e.preventDefault();
                                setNewRule({ ...newRule, pattern: row.description });
                                setPatternSearch(row.description);
                                setShowPatternPopup(false);
                                patternInputRef.current?.blur();
                              }}
                            >
                              <TableCell className="font-mono text-xs max-w-[20rem] truncate">{row.description}</TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap w-20">{row.date}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums whitespace-nowrap w-16">{row.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </form>
              </TableCell>
              <TableCell>
                <form onSubmit={handleAddRule} className="flex flex-col w-full">
                  <Label htmlFor="add-rule-category" className="sr-only">Category</Label>
                  <Select
                    value={newRule.category_id ? String(newRule.category_id) : ''}
                    onValueChange={val => setNewRule({ ...newRule, category_id: parseInt(val) })}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </form>
              </TableCell>
              <TableCell>
                <form onSubmit={handleAddRule} className="flex flex-row gap-2 items-center w-full">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold px-4 py-2 rounded shadow-sm min-w-[8rem]">
                    + Add New Rule
                  </Button>
                </form>
              </TableCell>
            </TableRow>
            {/* Render paged rules */}
            {isPageLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : pagedRules.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No rules found.</TableCell></TableRow>
            ) : (
              pagedRules.map((rule) => (
                <TableRow key={rule.id}>
                  {editingRuleId === rule.id ? (
                    <>
                      <TableCell style={{ width: '40%' }}>
                        <form onSubmit={handleEditRule} className="flex flex-col w-full">
                          <Label htmlFor={`edit-rule-pattern-${rule.id}`} className="sr-only">Pattern</Label>
                          <Input
                            type="text"
                            id={`edit-rule-pattern-${rule.id}`}
                            value={editRule.pattern || ''}
                            onChange={e => setEditRule({ ...editRule, pattern: e.target.value })}
                            required
                            placeholder="Pattern"
                          />
                        </form>
                      </TableCell>
                      <TableCell style={{ width: '40%' }}>
                        <form onSubmit={handleEditRule} className="flex flex-col w-full">
                          <Label htmlFor={`edit-rule-category-${rule.id}`} className="sr-only">Category</Label>
                          <Select
                            value={editRule.category_id ? String(editRule.category_id) : ''}
                            onValueChange={val => setEditRule({ ...editRule, category_id: parseInt(val) })}
                            required
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </form>
                      </TableCell>
                      <TableCell style={{ width: '20%' }}>
                        <form onSubmit={handleEditRule} className="flex flex-row gap-2 items-center w-full">
                          <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold rounded shadow-sm min-w-[4rem] px-2 py-1 text-sm">Save</Button>
                          <Button type="button" variant="outline" onClick={cancelEdit} className="px-2 py-1 text-sm">Cancel</Button>
                        </form>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{rule.pattern}</TableCell>
                      <TableCell>{rule.category_name || rule.category_id}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="mr-2" onClick={() => startEdit(rule)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive-hover" onClick={() => handleDeleteRule(rule.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
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
              <Label htmlFor="itemsPerPage">Items per page:</Label>
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
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      {localError && <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4 mt-2" role="alert">{localError}</div>}
    </div>
  );
};

export default CategorizationRulesManager;
