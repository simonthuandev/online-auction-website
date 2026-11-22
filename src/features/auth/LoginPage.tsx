import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useLogin } from './hooks/useAuth';
import { useAppSelector } from '@/store';
import { getSafeRedirectUrl } from '@/lib/redirect';
import { ApiError } from '@/api/client';
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import type { LoginInput } from '@/api/auth.api';

type LoginFormValues = LoginInput;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Compute safe destination
  const redirectParam = searchParams.get('redirect');
  const stateFrom = (location.state as { from?: { pathname: string; search?: string } })?.from;
  const rawTarget = stateFrom ? `${stateFrom.pathname}${stateFrom.search || ''}` : redirectParam;
  const safeDestination = getSafeRedirectUrl(rawTarget, '/');

  // Flash messages passed from redirect (e.g. logout reason or registration success)
  const stateMessage = (location.state as { message?: string })?.message;
  const queryMessage = searchParams.get('message');
  const flashMessage = stateMessage || queryMessage;
  const isRegistrationSuccess = (location.state as { registered?: boolean })?.registered;

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: (location.state as { email?: string })?.email || '',
      password: '',
    },
    mode: 'onBlur',
  });

  const loginMutation = useLogin();

  // If already authenticated, redirect away
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(safeDestination, { replace: true });
    }
  }, [isAuthenticated, navigate, safeDestination]);

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);

    try {
      await loginMutation.mutateAsync({
        email: data.email.trim(),
        password: data.password,
      });

      // Navigate to intended destination
      navigate(safeDestination, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401 || err.code === 'UNAUTHORIZED') {
          if (err.message.toLowerCase().includes('inactive') || err.message.toLowerCase().includes('bị khóa')) {
            setServerError('Tài khoản của bạn đã bị khóa hoặc không còn hoạt động. Vui lòng liên hệ quản trị viên.');
          } else {
            setServerError('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
          }
        } else if (err.statusCode === 403 || err.code === 'FORBIDDEN') {
          setServerError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
        } else {
          setServerError(err.message || 'Đăng nhập không thành công. Vui lòng thử lại.');
        }
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
      }
    }
  };

  const isLoading = isSubmitting || loginMutation.isPending;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 bg-white p-8 border border-slate-200 rounded-2xl shadow-sm">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Đăng nhập tài khoản
          </h1>
          <p className="text-sm text-slate-500">
            Chào mừng bạn quay lại hệ thống đấu giá trực tuyến
          </p>
        </div>

        {/* Flash Message Banner (Success or Notice) */}
        {flashMessage && !serverError && (
          <div
            className={`flex items-start gap-3 p-4 rounded-xl text-sm border ${
              isRegistrationSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
            role="status"
          >
            {isRegistrationSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">
                {isRegistrationSuccess ? 'Đăng ký thành công!' : 'Thông báo'}
              </p>
              <p className="mt-0.5 text-xs opacity-90">{flashMessage}</p>
            </div>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl text-sm bg-red-50 border border-red-200 text-red-800"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Đăng nhập thất bại</p>
              <p className="mt-0.5 text-xs opacity-90">{serverError}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Địa chỉ Email <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-lg shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="name@example.com"
                disabled={isLoading}
                className={`block w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border transition outline-none ${
                  errors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-red-900 bg-red-50/20'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white'
                } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                {...register('email', {
                  required: 'Vui lòng nhập địa chỉ email',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Địa chỉ email không đúng định dạng',
                  },
                })}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Mật khẩu <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="relative rounded-lg shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                disabled={isLoading}
                className={`block w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border transition outline-none ${
                  errors.password
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-red-900 bg-red-50/20'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white'
                } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                {...register('password', {
                  required: 'Vui lòng nhập mật khẩu',
                  maxLength: {
                    value: 72,
                    message: 'Mật khẩu tối đa 72 ký tự',
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Đăng nhập</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Chưa có tài khoản?{' '}
          <Link
            to={
              redirectParam
                ? `/register?redirect=${encodeURIComponent(redirectParam)}`
                : '/register'
            }
            className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition"
          >
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
