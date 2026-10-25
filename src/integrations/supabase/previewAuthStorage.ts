/** Storage accepted by Supabase's `auth.storage` option. */
export interface PreviewAuthStorage {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

/**
 * Hook point for a custom auth storage on special hosting surfaces.
 * Returns undefined everywhere, so Supabase falls back to localStorage.
 */
export function brokeredPreviewStorage(): PreviewAuthStorage | undefined {
  return undefined;
}
