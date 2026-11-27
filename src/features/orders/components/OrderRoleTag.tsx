import React from 'react';
import type { Order } from '@/contracts/api.generated';
import { getOrderRole } from '../utils/orderHelpers';
import { ShoppingBag, Store } from 'lucide-react';

export interface OrderRoleTagProps {
  order: Pick<Order, 'buyerId' | 'sellerId'>;
  currentUserId?: string | null;
  className?: string;
}

export const OrderRoleTag: React.FC<OrderRoleTagProps> = ({
  order,
  currentUserId,
  className = '',
}) => {
  const role = getOrderRole(order, currentUserId);

  if (!role) return null;

  if (role === 'BUYER') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
      >
        <ShoppingBag className="h-3 w-3" />
        Đơn mua
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
    >
      <Store className="h-3 w-3" />
      Đơn bán
    </span>
  );
};

