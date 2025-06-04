export interface Transaction {
  id: number;
  account_id: number;
  date: string;
  description: string;
  amount: number;
  category_id?: number;
  created_at: string;
  
  // Joined fields from API
  account_name?: string;
  category_name?: string;
}

export interface CreateTransactionRequest {
  account_id: number;
  date: string;
  description: string;
  amount: number;
  category_id?: number;
}

export interface UpdateTransactionRequest extends CreateTransactionRequest {
  id: number;
}
