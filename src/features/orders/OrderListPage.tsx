import React from 'react';
import { ShoppingBag } from 'lucide-react';

export const OrderListPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Đơn hàng của tôi</h1>
          <p className="text-sm text-slate-500">Quản lý các đơn mua và đơn bán thành công</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
        Khung danh sách đơn hàng [WEB-ORD-01] (FD5).
      </div>
    </div>
  );
};
