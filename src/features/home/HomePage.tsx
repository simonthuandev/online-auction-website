import React from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { Gavel, Package, ShieldCheck, Zap, ArrowRight, Activity } from 'lucide-react';
import { formatVnd } from '@/lib/money';
import { formatLocalTime } from '@/lib/time';

export const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 px-6 py-12 sm:px-12 sm:py-16 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-sm border border-indigo-400/30">
            <Zap className="h-3.5 w-3.5 text-yellow-400" /> Nền tảng Đấu giá Realtime High-Performance
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Sàn Đấu Giá Trực Tuyến Đáng Tin Cậy
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Hệ thống đấu giá thời gian thực với microservices kiến trúc phân tán. Cập nhật bước giá
            tức thì, thanh toán an toàn, bảo vệ người mua và người bán.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/auctions"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-400 transition"
            >
              <Gavel className="h-4 w-4" /> Tham gia đấu giá <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-xs border border-white/20 hover:bg-white/20 transition"
            >
              <Package className="h-4 w-4" /> Khám phá sản phẩm
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      </section>

      {/* System Status & Architecture Quick Card */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">API Gateway</h3>
              <p className="text-xs text-slate-500 font-mono">http://localhost:8080</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 pt-2">
            Single-flight refresh token mutex, chuẩn hóa Error envelope, gắn Bearer token tự động.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Realtime Sockets</h3>
              <p className="text-xs text-slate-500 font-mono">:3003/auctions & :3006/notifs</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 pt-2">
            Socket singletons tự động reconnect, kích hoạt TanStack Query invalidate để re-sync REST.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Độ chính xác dữ liệu</h3>
              <p className="text-xs text-slate-500 font-mono">BigInt VND & UTC Time</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 pt-2">
            Ví dụ mẫu: <span className="font-semibold text-emerald-700">{formatVnd('1500000')}</span> | Giờ: <span className="font-semibold">{formatLocalTime(new Date())}</span>
          </p>
        </div>
      </section>

      {/* User Session Banner if logged in */}
      {isAuthenticated && user && (
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-indigo-950">
              Xin chào, {user.name} ({user.role})!
            </h3>
            <p className="text-sm text-indigo-700">
              Bạn đang đăng nhập bằng email: <span className="font-mono">{user.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Hồ sơ cá nhân
            </Link>
            <Link
              to="/orders"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 transition"
            >
              Đơn hàng
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};
