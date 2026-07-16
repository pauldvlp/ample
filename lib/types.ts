/** Lightweight, client-safe option shapes shared between server and client. */

export interface AccountOption {
  id: string;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
  currency: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  kind: string;
  color: string | null;
  icon: string | null;
  parentId: string | null;
}

export interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

export interface PayeeOption {
  /** null when the option is derived from transaction history (not yet saved) */
  id: string | null;
  name: string;
  kind: string | null;
  icon: string | null;
  color: string | null;
}
