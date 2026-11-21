import React from 'react';
import { Bell } from 'lucide-react';

export const NotificationPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <Bell className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trung tâm thông báo</h1>
          <p className="text-sm text-slate-500">Thông báo realtime về phiên đấu giá và đơn hàng</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
        Khung thông báo [WEB-NOTIF-01] (FD7).
      </div>
    </div>
  );
};
