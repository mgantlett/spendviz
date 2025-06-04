export interface CategorizationRule {
  id: number;
  pattern: string;
  category_id: number;
  category_name?: string; // Optional: for displaying in UI
}

export interface TransactionCategorizationConflict {
  transactionId: number;
  transactionDescription?: string; // For context in UI
  conflictingRules: CategorizationRule[];
}
