import React from 'react';
import { PlusCircle } from 'lucide-react';

export const CreateAuctionPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
          <PlusCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tạo phiên đấu giá mới</h1>
          <p className="text-sm text-slate-500">Khởi tạo phiên đấu giá cho sản phẩm sẵn sàng (READY)</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
        Khung tạo phiên đấu giá [WEB-AUC-03] (FD5).
      </div>
    </div>
  );
};
