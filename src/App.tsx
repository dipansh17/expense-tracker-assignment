import React, { useState, useEffect } from 'react';
import { PlusCircle, Filter, DollarSign, Calendar, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';


interface Expense {
  _id?: string;
  amount: number;
  category: string;
  date: string;
  description: string;
}

interface ExpenseResponse {
  total?: number;
  data?: Expense[];
  error?: string;
}

function App() {

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  

  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState<string>('');
  

  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  const categories = [
    'Food', 'Transportation', 'Housing', 'Entertainment', 
    'Utilities', 'Healthcare', 'Shopping', 'Other'
  ];

  // Validate expense object
  const isValidExpense = (expense: unknown): expense is Expense => {
    if (!expense || typeof expense !== 'object') return false;
    
    const e = expense as Record<string, unknown>;
    
    return (
      typeof e.amount === 'number' &&
      !isNaN(e.amount) &&
      e.amount > 0 &&
      typeof e.category === 'string' &&
      e.category.trim() !== '' &&
      typeof e.date === 'string' &&
      e.date.trim() !== '' &&
      (e.description === undefined || typeof e.description === 'string')
    );
  };


  const apiRequest = async <T,>(url: string, options?: RequestInit): Promise<T> => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw new Error('API request failed');
    }
  };


  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiRequest<Expense[]>('http://localhost:5000/api/expenses');
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array');
      }

      const validExpenses = data.filter(isValidExpense);
      
      if (validExpenses.length !== data.length) {
        console.warn(`Filtered out ${data.length - validExpenses.length} invalid expenses`);
      }

      setExpenses(validExpenses);
      setFilteredExpenses(validExpenses);
      calculateTotal(validExpenses);
    } catch (err) {
      setError('Error fetching expenses. Please try again later.');
      console.error('Fetch expenses error:', err);
      setExpenses([]);
      setFilteredExpenses([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };


  const calculateTotal = (expenseList: Expense[]) => {
    const total = expenseList.reduce((sum, expense) => sum + expense.amount, 0);
    setTotalAmount(total);
  };


  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!amount || !category || !date) {
      setError('Please fill in all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    const newExpense = {
      amount: amountNum,
      category,
      date,
      description: description.trim()
    };
    
    try {
      await apiRequest<Expense>('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newExpense)
      });
      

      setAmount('');
      setCategory('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setDescription('');
      setShowAddModal(false);
      

      await fetchExpenses();
    } catch (err) {
      setError('Error adding expense. Please try again.');
      console.error('Add expense error:', err);
    }
  };


  const applyFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (filterDate) params.append('date', filterDate);
      
      const url = `http://localhost:5000/api/expenses?${params.toString()}`;
      const data = await apiRequest<Expense[]>(url);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array');
      }

      const validExpenses = data.filter(isValidExpense);
      setFilteredExpenses(validExpenses);
      calculateTotal(validExpenses);
      setShowFilterModal(false);
    } catch (err) {
      setError('Error applying filters. Please try again.');
      console.error('Apply filters error:', err);
      setFilteredExpenses([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  
  const getTotalForDateRange = async () => {
    if (!filterStartDate || !filterEndDate) {
      setError('Please select both start and end dates');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        start: filterStartDate,
        end: filterEndDate
      });
      
      const data = await apiRequest<ExpenseResponse>(
        `http://localhost:5000/api/expenses/total?${params.toString()}`
      );
      
      if (typeof data.total !== 'number' || isNaN(data.total)) {
        throw new Error('Invalid total amount received');
      }

      setTotalAmount(data.total);
      setShowFilterModal(false);
    } catch (err) {
      setError('Error fetching total. Please try again.');
      console.error('Get total error:', err);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilterCategory('');
    setFilterDate('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilteredExpenses(expenses);
    calculateTotal(expenses);
    setShowFilterModal(false);
    setError(null);
  };


  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (error) {
      console.error('Invalid date format:', dateString);
      return 'Invalid date';
    }
  };

  // Load expenses on component mount
  useEffect(() => {
    fetchExpenses();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <DollarSign size={24} />
            <h1 className="text-xl font-bold">Expense Tracker</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilterModal(true)}
              className="flex items-center space-x-1 bg-indigo-700 hover:bg-indigo-800 px-3 py-1 rounded-md transition"
            >
              <Filter size={16} />
              <span>Filter</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md transition"
            >
              <PlusCircle size={16} />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {/* Total Amount Card */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Expenses</h2>
          <p className="text-3xl font-bold text-indigo-600">${totalAmount.toFixed(2)}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="float-right font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-700 p-4 border-b">Expenses</h2>
          
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading expenses...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No expenses found. Add some!</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredExpenses.map((expense) => (
                <div key={expense._id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-800">{expense.description || 'No description'}</h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          <span>{formatDate(expense.date)}</span>
                        </div>
                        <div className="flex items-center">
                          <Tag size={14} className="mr-1" />
                          <span>{expense.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-indigo-600">
                      ${expense.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center border-b p-4">
              <h2 className="text-lg font-semibold">Add New Expense</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={addExpense} className="p-4">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
                  Amount*
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                  Category*
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="date">
                  Date*
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Enter expense details..."
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

     
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center border-b p-4">
              <h2 className="text-lg font-semibold">Filter Expenses</h2>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Filter by Category and Date</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1" htmlFor="filterCategory">
                      Category
                    </label>
                    <select
                      id="filterCategory"
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm mb-1" htmlFor="filterDate">
                      Date
                    </label>
                    <input
                      id="filterDate"
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="mt-3 flex justify-end space-x-2">
                  <button
                    onClick={resetFilters}
                    className="px-3 py-1 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
                  >
                    Reset
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-3 py-1 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 text-sm"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-700 mb-2">Get Total for Date Range</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1" htmlFor="startDate">
                      Start Date
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm mb-1" htmlFor="endDate">
                      End Date
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={getTotalForDateRange}
                    className="px-3 py-1 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 text-sm"
                  >
                    Calculate Total
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;