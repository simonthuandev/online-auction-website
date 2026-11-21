import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/authSlice';
import { disconnectSockets } from '@/lib/socket';
import {
  Gavel,
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  ShoppingBag,
  Shield,
  PlusCircle,
  Menu,
  X,
  Package,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSeller = user?.role === 'SELLER';
  const isAdmin = user?.role === 'ADMIN';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    disconnectSockets();
    dispatch(logout());
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo / Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Gavel className="h-6 w-6 text-indigo-600" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:inline">
                Online Auction
              </span>
            </Link>

            {/* Main Nav Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/products"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  location.pathname.startsWith('/products')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Sản phẩm
              </Link>
              <Link
                to="/auctions"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  location.pathname.startsWith('/auctions')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Phiên đấu giá
              </Link>

              {/* Seller Menu Links */}
              {isSeller && (
                <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                  <Link
                    to="/seller/products"
                    className={`px-3 py-2 rounded-md text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition ${
                      location.pathname.startsWith('/seller') ? 'bg-emerald-50 font-semibold' : ''
                    }`}
                  >
                    Kênh Người Bán
                  </Link>
                  <Link
                    to="/seller/auctions/new"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Tạo đấu giá
                  </Link>
                </div>
              )}

              {/* Admin Menu Link */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-purple-700 hover:bg-purple-50 transition ml-2 ${
                    location.pathname.startsWith('/admin') ? 'bg-purple-100 font-semibold' : ''
                  }`}
                >
                  <Shield className="h-4 w-4" /> Quản trị
                </Link>
              )}
            </nav>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm sản phẩm, phiên đấu giá..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-full border border-gray-300 bg-gray-50 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </form>

          {/* Right Action Icons & User Menu */}
          <div className="flex items-center gap-3">
            {/* Notification Bell (Placeholder & Hook Target) */}
            <Link
              to="/notifications"
              className="relative p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition"
              title="Thông báo"
            >
              <Bell className="h-5 w-5" />
              {/* Unread indicator badge placeholder */}
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            </Link>

            {/* User Menu / Auth Buttons */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition focus:outline-hidden"
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium text-sm">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-800 hidden lg:inline max-w-[120px] truncate">
                    {user?.name || user?.email}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md hidden sm:inline ${
                      isAdmin
                        ? 'bg-purple-100 text-purple-700'
                        : isSeller
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {user?.role || 'USER'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg border border-gray-200 py-1 z-50"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <UserIcon className="h-4 w-4 text-gray-400" /> Hồ sơ cá nhân
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <ShoppingBag className="h-4 w-4 text-gray-400" /> Đơn hàng của tôi
                    </Link>

                    {isSeller && (
                      <Link
                        to="/seller/products"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        <Package className="h-4 w-4 text-emerald-500" /> Quản lý sản phẩm
                      </Link>
                    )}

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
                      >
                        <Shield className="h-4 w-4 text-purple-500" /> Quản trị hệ thống
                      </Link>
                    )}

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                    >
                      <LogOut className="h-4 w-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Đăng ký
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md md:hidden"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 space-y-3">
            <form onSubmit={handleSearch} className="px-2">
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300"
              />
            </form>
            <div className="flex flex-col space-y-1">
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Sản phẩm
              </Link>
              <Link
                to="/auctions"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Phiên đấu giá
              </Link>
              {isSeller && (
                <>
                  <Link
                    to="/seller/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-md"
                  >
                    Kênh Người Bán
                  </Link>
                  <Link
                    to="/seller/auctions/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-md"
                  >
                    + Tạo phiên đấu giá
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 rounded-md"
                >
                  Quản trị Admin
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
