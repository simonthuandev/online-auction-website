import React from 'react';
import { Package, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SellerProductsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kênh người bán - Sản phẩm</h1>
            <p className="text-sm text-slate-500">Quản lý và đăng bán sản phẩm của bạn</p>
          </div>
        </div>
        <Link
          to="/seller/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
        >
          <Plus className="h-4 w-4" /> Thêm sản phẩm
        </Link>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
        Khung quản lý sản phẩm Seller Studio [WEB-PROD-02] (FD4).
      </div>
    </div>
  );
};
