import React from 'react';
import { Navigate, Outlet, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAppSelector } from '@/store';
import type { UserRole } from '@/contracts/api.generated';
import { getSafeRedirectUrl } from '@/lib/redirect';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
}

/**
 * Route guard requiring the user to be authenticated.
 * If not authenticated, redirects to /login?redirect=... and preserves location in state.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = `${location.pathname}${location.search || ''}`;
    const redirectParam = encodeURIComponent(currentPath);
    return <Navigate to={`/login?redirect=${redirectParam}`} state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export interface RoleRouteProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

/**
 * Route guard requiring the user to have one of the specified roles (e.g. SELLER, ADMIN).
 * Shows a friendly 403 Forbidden screen if user lacks permissions.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = `${location.pathname}${location.search || ''}`;
    const redirectParam = encodeURIComponent(currentPath);
    return <Navigate to={`/login?redirect=${redirectParam}`} state={{ from: location }} replace />;
  }

  const currentRole = user?.role;
  const hasPermission = currentRole && allowedRoles.includes(currentRole);

  if (!hasPermission) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-4 text-red-600">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Không có quyền truy cập (403)</h1>
        <p className="mt-2 max-w-md text-gray-600">
          Tài khoản của bạn ({currentRole || 'USER'}) không có quyền truy cập vào chức năng này.
          Yêu cầu vai trò: <span className="font-semibold">{allowedRoles.join(' hoặc ')}</span>.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Quay về Trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export interface AnonymousRouteProps {
  children?: React.ReactNode;
}

/**
 * Route guard for auth pages (Login, Register).
 * Redirects already authenticated users back to destination or home.
 */
export const AnonymousRoute: React.FC<AnonymousRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const redirectParam = searchParams.get('redirect');
  const fromState = (location.state as { from?: Location })?.from?.pathname;
  const safeTarget = getSafeRedirectUrl(redirectParam || fromState, '/');

  if (isAuthenticated) {
    return <Navigate to={safeTarget} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
