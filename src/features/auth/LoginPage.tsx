import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <LogIn className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Đăng nhập tài khoản</h1>
          <p className="text-xs text-slate-500">Truy cập hệ thống đấu giá trực tuyến</p>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600">
        Khung đăng nhập chuẩn bị cho [WEB-AUTH-01] (FD2).
      </div>

      <div className="text-center text-xs text-slate-500">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="text-indigo-600 font-medium hover:underline">
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
};
