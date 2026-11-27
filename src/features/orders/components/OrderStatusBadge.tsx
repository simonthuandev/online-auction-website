import React from 'react';
import type { OrderStatus } from '@/contracts/api.generated';
import { getOrderStatusMeta } from '../utils/orderHelpers';

export interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const meta = getOrderStatusMeta(status);
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold border rounded-full ${sizeClasses} ${meta.className} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotColor}`} />
      {meta.label}
    </span>
  );
};

