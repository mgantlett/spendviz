import React, { useEffect, useState } from 'react';
import { useCategoriesStore } from '../store/categories';
import { Category } from '../types/category';
import CategorizationRulesManager from './CategorizationRulesManager'; // Import the new component
import CategorizationConflictsPanel from './CategorizationConflictsPanel';
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from './ui/tabs';
import { Label } from './ui/label';
import { useApi } from '../hooks/useApi';

const CategoriesManager: React.FC = () => {
  const {
    categories,
    isLoading,
    error,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategoriesStore();
  const { apiCall } = useApi();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | null>(null);
  // Inline edit state for a single category
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryParentId, setEditCategoryParentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'categories' | 'rules' | 'conflicts'>('categories');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Paging, sorting, and filter state for categories
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<'name' | 'created_at'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pagedCategories, setPagedCategories] = useState<Category[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    fetchCategories(apiCall);
  }, [fetchCategories, apiCall]);

  // Fetch paged categories
  useEffect(() => {
    async function fetchPagedCategories() {
      setIsPageLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(itemsPerPage),
          filter: categoryFilter,
          sort: sortColumn,
          direction: sortDirection,
        });
        const res = await apiCall(`/api/categories/paged?${params}`);
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setPagedCategories(data.categories);
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
      } catch (err) {
        setPagedCategories([]);
        setTotalItems(0);
        setTotalPages(1);
      }
      setIsPageLoading(false);
    }
    if (activeTab === 'categories') fetchPagedCategories();
  }, [currentPage, itemsPerPage, sortColumn, sortDirection, categoryFilter, activeTab, apiCall, categories]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const result = await addCategory(newCategoryName, apiCall, newCategoryParentId);
    if (result) {
      setNewCategoryName('');
      setNewCategoryParentId(null);
      // The useEffect will automatically refresh pagedCategories when categories change
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategoryName.trim() || editingCategoryId === null) return;
    const result = await updateCategory(editingCategoryId, editCategoryName, apiCall, editCategoryParentId);
    if (result) {
      setEditingCategoryId(null);
      setEditCategoryName('');
      setEditCategoryParentId(null);
      // The useEffect will automatically refresh pagedCategories when categories change
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this category? This might fail if it has sub-categories or is used by transactions/rules.')) {
      const result = await deleteCategory(id, apiCall);
      if (result) {
        // The useEffect will automatically refresh pagedCategories when categories change
      }
    }
  };

  // Inline edit: set state for the row being edited
  const startEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryParentId(category.parent_id ?? null);
  };

  const cancelEdit = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
    setEditCategoryParentId(null);
  };

  function handleSort(col: 'name' | 'created_at') {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }

  if (isLoading && categories.length === 0 && activeTab === 'categories') return <p>Loading categories...</p>;
  if (error && activeTab === 'categories') return <p className="text-red-500">Error loading categories: {error}</p>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Main Tabs Container */}
      <div className="flex flex-col space-y-6">
        <Tabs 
          value={activeTab} 
          onValueChange={(val: string) => {
            if (val === 'categories' || val === 'rules' || val === 'conflicts') setActiveTab(val);
          }}
          className="w-full"
        >
          <TabsList className="inline-flex h-12 items-center justify-start rounded-lg bg-muted/60 p-2 text-muted-foreground w-full gap-1">
            <TabsTrigger 
              value="categories" 
              className="flex-1 min-w-[160px] data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Manage Categories
            </TabsTrigger>
            <TabsTrigger 
              value="rules" 
              className="flex-1 min-w-[160px] data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Categorization Rules
            </TabsTrigger>
            <TabsTrigger 
              value="conflicts" 
              className="flex-1 min-w-[160px] data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Conflicts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-6">
            {/* Categories Tab Content */}
            <div className="bg-background rounded-lg shadow-sm border">
              <div className="max-w-6xl mx-auto p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => handleSort('name')} className="cursor-pointer select-none">Name{sortColumn === 'name' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} className="p-1">
                        <Input
                          type="text"
                          value={categoryFilter}
                          onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                          placeholder="Filter categories by name or parent..."
                          className="w-full"
                        />
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Add Category Form Row */}
                    <TableRow>
                      <TableCell>
                        <form onSubmit={handleAddCategory} className="w-full flex flex-col">
                          <Label htmlFor="newCategoryName" className="sr-only">Name</Label>
                          <Input
                            type="text"
                            id="newCategoryName"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            required
                            className="w-full"
                            placeholder="Category name"
                          />
                        </form>
                      </TableCell>
                      <TableCell>
                        <form onSubmit={handleAddCategory} className="w-full flex flex-col">
                          <Label htmlFor="newCategoryParentId" className="sr-only">Parent Category</Label>
                          <Select
                            value={newCategoryParentId === null ? 'none' : String(newCategoryParentId)}
                            onValueChange={(val) => setNewCategoryParentId(val === 'none' ? null : Number(val))}
                          >
                            <SelectTrigger id="newCategoryParentId" className="w-full">
                              <SelectValue placeholder="None (Top-level)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None (Top-level)</SelectItem>
                              {pagedCategories.map((c: Category) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </form>
                      </TableCell>
                      <TableCell>
                        <form onSubmit={handleAddCategory} className="w-full flex flex-col items-center">
                          <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold px-4 py-2 rounded shadow-sm hover:shadow-md transition-shadow min-w-[8rem]">
                            Add Category
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                    {/* Render paged categories */}
                    {isPageLoading ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : pagedCategories.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No categories found.</TableCell></TableRow>
                    ) : (
                      pagedCategories.map((category: Category) => (
                        <TableRow key={category.id}>
                          {editingCategoryId === category.id ? (
                            <>
                              <TableCell style={{ width: '30%' }}>
                                <form onSubmit={handleEditCategory} className="flex flex-col w-full">
                                  <Label htmlFor={`editCategoryName-${category.id}`} className="sr-only">Name</Label>
                                  <Input
                                    type="text"
                                    id={`editCategoryName-${category.id}`}
                                    value={editCategoryName}
                                    onChange={e => setEditCategoryName(e.target.value)}
                                    required
                                    className="w-full"
                                    placeholder="Category name"
                                  />
                                </form>
                              </TableCell>
                              <TableCell style={{ width: '30%' }}>
                                <form onSubmit={handleEditCategory} className="flex flex-col w-full">
                                  <Label htmlFor={`editCategoryParentId-${category.id}`} className="sr-only">Parent Category</Label>
                                  <Select
                                    value={editCategoryParentId === null ? 'none' : String(editCategoryParentId)}
                                    onValueChange={val => setEditCategoryParentId(val === 'none' ? null : Number(val))}
                                  >
                                    <SelectTrigger id={`editCategoryParentId-${category.id}`} className="w-full">
                                      <SelectValue placeholder="None (Top-level)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None (Top-level)</SelectItem>
                                      {pagedCategories.filter((c: Category) => c.id !== category.id).map((c: Category) => (
                                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </form>
                              </TableCell>
                              <TableCell style={{ width: '20%' }}>
                                <form onSubmit={handleEditCategory} className="flex flex-row gap-2 items-center w-full">
                                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold px-4 py-2 rounded shadow-sm min-w-[6rem]">Save</Button>
                                  <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>
                                </form>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>{category.name}</TableCell>
                              <TableCell>{category.parent_id ? categories.find(c => c.id === category.parent_id)?.name || 'N/A' : 'N/A'}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="mr-2" onClick={() => startEdit(category)}>
                                  Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive-hover" onClick={() => handleDeleteCategory(category.id)}>
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
            </div>
          </TabsContent>

          <TabsContent value="rules" className="mt-6">
            <div className="bg-background rounded-lg shadow-sm border">
              <div className="max-w-6xl mx-auto p-6">
                <CategorizationRulesManager />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="conflicts" className="mt-6">
            <div className="bg-background rounded-lg shadow-sm border">
              <div className="max-w-6xl mx-auto p-6">
                <CategorizationConflictsPanel />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CategoriesManager;
