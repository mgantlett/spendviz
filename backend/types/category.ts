// Category type for UI and IPC
export interface Category {
  id: number;
  name: string;
  parent_id?: number | null;
  created_at: string;
}
