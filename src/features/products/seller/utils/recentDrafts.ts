export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const MAX_RECENT_DRAFTS = 50;

export function getRecentDraftsStorageKey(sellerId: string): string {
  return `oa_seller_recent_drafts_${sellerId}`;
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) {
    return storage;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Safely reads recent product/draft IDs for a seller from localStorage.
 * Returns empty array if storage is unavailable or corrupted.
 */
export function getRecentDraftIds(
  sellerId?: string,
  storage?: StorageLike | null
): string[] {
  if (!sellerId) return [];
  const store = resolveStorage(storage);
  if (!store) return [];

  try {
    const raw = store.getItem(getRecentDraftsStorageKey(sellerId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const unique = new Set<string>();
    for (const item of parsed) {
      if (typeof item === 'string' && item.trim()) {
        unique.add(item.trim());
      }
      if (unique.size >= MAX_RECENT_DRAFTS) break;
    }
    return Array.from(unique);
  } catch {
    return [];
  }
}

/**
 * Adds a product ID to the top of the seller's recent drafts list.
 */
export function addRecentDraftId(
  sellerId?: string,
  productId?: string,
  storage?: StorageLike | null
): string[] {
  if (!sellerId || !productId) return [];
  const cleanId = productId.trim();
  if (!cleanId) return [];

  const current = getRecentDraftIds(sellerId, storage);
  const next = [cleanId, ...current.filter((id) => id !== cleanId)].slice(
    0,
    MAX_RECENT_DRAFTS
  );

  const store = resolveStorage(storage);
  if (store) {
    try {
      store.setItem(getRecentDraftsStorageKey(sellerId), JSON.stringify(next));
    } catch {
      // Ignore storage quota or security errors
    }
  }
  return next;
}

/**
 * Removes a product ID from the seller's recent drafts list.
 */
export function removeRecentDraftId(
  sellerId?: string,
  productId?: string,
  storage?: StorageLike | null
): string[] {
  if (!sellerId || !productId) return [];
  const cleanId = productId.trim();
  const current = getRecentDraftIds(sellerId, storage);
  const next = current.filter((id) => id !== cleanId);

  const store = resolveStorage(storage);
  if (store) {
    try {
      store.setItem(getRecentDraftsStorageKey(sellerId), JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }
  return next;
}

