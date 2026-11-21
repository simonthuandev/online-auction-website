import React from 'react';
import { Shield } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản trị Hệ thống (Admin Console)</h1>
          <p className="text-sm text-slate-500">Quản lý danh mục, xác nhận COD và phân quyền người dùng</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
        Khung Admin Console [WEB-ADMIN-01] (FD7).
      </div>
    </div>
  );
};
