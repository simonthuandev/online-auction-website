import { createBrowserRouter, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute, RoleRoute, AnonymousRoute } from '@/routes/Guards';

// Feature Pages
import { HomePage } from '@/features/home/HomePage';
import { ProductListPage } from '@/features/products/ProductListPage';
import { ProductDetailPage } from '@/features/products/ProductDetailPage';
import { AuctionListPage } from '@/features/auctions/AuctionListPage';
import { AuctionDetailPage } from '@/features/auctions/AuctionDetailPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ProfilePage } from '@/features/auth/ProfilePage';
import { OrderListPage } from '@/features/orders/OrderListPage';
import { OrderDetailPage } from '@/features/orders/OrderDetailPage';
import { NotificationPage } from '@/features/notifications/NotificationPage';
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage';
import { SellerProductsPage } from '@/features/products/seller/SellerProductsPage';
import { ProductFormPage } from '@/features/products/seller/ProductFormPage';
import { CreateAuctionPage } from '@/features/auctions/seller/CreateAuctionPage';
import { registerLogoutNavigate } from '@/features/auth/services/performLogout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'products',
        element: <ProductListPage />,
      },
      {
        path: 'products/:id',
        element: <ProductDetailPage />,
      },
      {
        path: 'auctions',
        element: <AuctionListPage />,
      },
      {
        path: 'auctions/:id',
        element: <AuctionDetailPage />,
      },
      // Auth routes (Anonymous only)
      {
        path: 'login',
        element: (
          <AnonymousRoute>
            <LoginPage />
          </AnonymousRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <AnonymousRoute>
            <RegisterPage />
          </AnonymousRoute>
        ),
      },
      // Protected routes (Any authenticated user)
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders',
        element: (
          <ProtectedRoute>
            <OrderListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders/:id',
        element: (
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute>
            <NotificationPage />
          </ProtectedRoute>
        ),
      },
      // Seller routes
      {
        path: 'seller/products',
        element: (
          <RoleRoute allowedRoles={['SELLER']}>
            <SellerProductsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/products/new',
        element: (
          <RoleRoute allowedRoles={['SELLER']}>
            <ProductFormPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/products/:id/edit',
        element: (
          <RoleRoute allowedRoles={['SELLER']}>
            <ProductFormPage />
          </RoleRoute>
        ),
      },
      {
        path: 'seller/auctions/new',
        element: (
          <RoleRoute allowedRoles={['SELLER', 'ADMIN']}>
            <CreateAuctionPage />
          </RoleRoute>
        ),
      },
      // Admin routes
      {
        path: 'admin',
        element: (
          <RoleRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: 'admin/*',
        element: (
          <RoleRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </RoleRoute>
        ),
      },
      // 404 Not Found
      {
        path: '*',
        element: (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
            <p className="mt-2 text-slate-600">Trang bạn tìm kiếm không tồn tại.</p>
            <Link
              to="/"
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Về Trang chủ
            </Link>
          </div>
        ),
      },
    ],
  },
]);

registerLogoutNavigate((to, opts) => {
  void router.navigate(to, opts);
});

