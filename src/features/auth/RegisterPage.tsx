import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <UserPlus className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tạo tài khoản mới</h1>
          <p className="text-xs text-slate-500">Đăng ký để tham gia đấu giá</p>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600">
        Khung đăng ký chuẩn bị cho [WEB-AUTH-01] (FD2).
      </div>

      <div className="text-center text-xs text-slate-500">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-indigo-600 font-medium hover:underline">
          Đăng nhập
        </Link>
      </div>
    </div>
  );
};
