/**
 * Idempotency Key Generator (UUID v4)
 * Used for critical mutating requests: POST /api/auctions, POST /api/auctions/{id}/bids, POST /api/payments
 * Ensures idempotency with backend services (length: 8-128 characters).
 */

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for non-secure contexts or older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
