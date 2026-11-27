import React from 'react';
import type { AuctionStatus } from '@/contracts/api.generated';
import { getAuctionStatusMeta } from '../utils/auctionHelpers';

export interface AuctionStatusBadgeProps {
  status?: AuctionStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const AuctionStatusBadge: React.FC<AuctionStatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const meta = getAuctionStatusMeta(status);

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ring-1 transition-all ${meta.badgeClass} ${sizeClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      <span>{meta.label}</span>
    </span>
  );
};
