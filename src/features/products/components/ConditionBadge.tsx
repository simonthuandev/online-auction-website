import React from 'react';
import type { ProductCondition } from '@/contracts/api.generated';

export interface ConditionBadgeProps {
  condition: ProductCondition | string;
  className?: string;
  size?: 'sm' | 'md';
}

const CONDITION_MAP: Record<string, { label: string; className: string }> = {
  NEW: {
    label: 'Mới 100%',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  LIKE_NEW: {
    label: 'Như mới (99%)',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  USED: {
    label: 'Đã sử dụng',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

export const ConditionBadge: React.FC<ConditionBadgeProps> = ({
  condition,
  className = '',
  size = 'md',
}) => {
  const config = CONDITION_MAP[condition] || {
    label: condition,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-md ${sizeClasses} ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
};

