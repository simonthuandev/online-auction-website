import React from 'react';
import type { ProductStatus } from '@/contracts/api.generated';

export interface StatusBadgeProps {
  status: ProductStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

interface StatusConfig {
  label: string;
  className: string;
  dotColor?: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  READY: {
    label: 'Sẵn sàng đấu giá',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    dotColor: 'bg-sky-500',
  },
  RESERVED: {
    label: 'Đã giữ chỗ',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  IN_AUCTION: {
    label: 'Đang đấu giá',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500 animate-pulse',
  },
  SOLD: {
    label: 'Đã bán',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    dotColor: 'bg-slate-400',
  },
  DRAFT: {
    label: 'Bản nháp',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const config = STATUS_MAP[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${sizeClasses} ${config.className} ${className}`}
    >
      {config.dotColor && (
        <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      )}
      {config.label}
    </span>
  );
};

