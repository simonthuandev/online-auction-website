import { useState, useCallback } from 'react';
import {
  getRecentDraftIds,
  addRecentDraftId,
  removeRecentDraftId,
} from '../utils/recentDrafts';

export function useRecentDraftIds(sellerId?: string) {
  const [prevSellerId, setPrevSellerId] = useState(sellerId);
  const [draftIds, setDraftIds] = useState<string[]>(() =>
    getRecentDraftIds(sellerId)
  );

  if (sellerId !== prevSellerId) {
    setPrevSellerId(sellerId);
    setDraftIds(getRecentDraftIds(sellerId));
  }

  const addDraftId = useCallback(
    (productId: string) => {
      if (!sellerId) return;
      const next = addRecentDraftId(sellerId, productId);
      setDraftIds(next);
    },
    [sellerId]
  );

  const removeDraftId = useCallback(
    (productId: string) => {
      if (!sellerId) return;
      const next = removeRecentDraftId(sellerId, productId);
      setDraftIds(next);
    },
    [sellerId]
  );

  return {
    draftIds,
    addDraftId,
    removeDraftId,
  };
}

