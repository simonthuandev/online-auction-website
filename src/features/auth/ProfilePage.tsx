import React from 'react';
import { useAppSelector } from '@/store';
import { User as UserIcon } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <UserIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hồ sơ cá nhân</h1>
          <p className="text-sm text-slate-500">Xem và cập nhật thông tin tài khoản</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase">Họ và tên</span>
          <p className="text-base font-medium text-slate-900">{user?.name || '--'}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase">Email</span>
          <p className="text-base font-medium text-slate-900">{user?.email || '--'}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase">Vai trò</span>
          <p className="text-sm font-semibold text-indigo-600">{user?.role || 'USER'}</p>
        </div>
      </div>
    </div>
  );
};
