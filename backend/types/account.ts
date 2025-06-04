// Account type for UI and IPC
export interface Account {
  id: number;
  name: string;
  type?: string;
  institution?: string;
  created_at: string;
}
