import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Gavel } from 'lucide-react';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Gavel className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-sm text-slate-800">Online Auction Platform</span>
            <span className="text-xs text-slate-400">© 2026. Tất cả các quyền được bảo lưu.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link to="/products" className="hover:text-indigo-600 transition">
              Sản phẩm
            </Link>
            <Link to="/auctions" className="hover:text-indigo-600 transition">
              Đấu giá trực tuyến
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">
              v1.0.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
