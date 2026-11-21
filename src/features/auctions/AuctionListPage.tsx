import React from 'react';
import { Gavel } from 'lucide-react';

export const AuctionListPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <Gavel className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách phiên đấu giá</h1>
          <p className="text-sm text-slate-500">Các phiên đấu giá trực tuyến đang diễn ra và sắp mở</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
        Khung giao diện phòng đấu giá [WEB-AUC-01] (FD3).
      </div>
    </div>
  );
};
