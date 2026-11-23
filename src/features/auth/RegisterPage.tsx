import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useRegister } from './hooks/useAuth';
import { useAppSelector } from '@/store';
import { getSafeRedirectUrl } from '@/lib/redirect';
import { ApiError } from '@/api/client';
import {
  UserPlus,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import type { RegisterInput } from '@/api/auth.api';

interface RegisterFormValues extends RegisterInput {
  confirmPassword: string;
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const redirectParam = searchParams.get('redirect');
  const safeDestination = getSafeRedirectUrl(redirectParam, '/');

  // React Hook Form
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  const registerMutation = useRegister();

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(safeDestination, { replace: true });
    }
  }, [isAuthenticated, navigate, safeDestination]);

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);

    try {
      await registerMutation.mutateAsync({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
      });

      // Per OpenAPI contract, register returns User (no tokens).
      // Redirect to /login with success message and pre-filled email.
      navigate(
        redirectParam
          ? `/login?redirect=${encodeURIComponent(redirectParam)}`
          : '/login',
        {
          state: {
            registered: true,
            email: data.email.trim(),
            message: 'Đăng ký tài khoản thành công! Vui lòng đăng nhập để bắt đầu.',
          },
          replace: true,
        }
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409 || err.code === 'CONFLICT') {
          setServerError(
            'Địa chỉ email này đã được sử dụng trên hệ thống. Vui lòng đăng nhập hoặc sử dụng email khác.'
          );
        } else if (err.statusCode === 400 || err.code === 'INVALID_REQUEST') {
          setServerError(
            err.message || 'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.'
          );
        } else {
          setServerError(err.message || 'Đăng ký không thành công. Vui lòng thử lại.');
        }
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
      }
    }
  };

  const isLoading = isSubmitting || registerMutation.isPending;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 bg-white p-8 border border-slate-200 rounded-2xl shadow-sm">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tạo tài khoản mới
          </h1>
          <p className="text-sm text-slate-500">
            Tham gia sàn đấu giá trực tuyến uy tín và minh bạch
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl text-sm bg-red-50 border border-red-200 text-red-800"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Đăng ký thất bại</p>
              <p className="mt-0.5 text-xs opacity-90">{serverError}</p>
            </div>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Full Name Field */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-lg shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="h-4 w-4" />
              </div>
              <input
                id="name"
                type="text"
                autoFocus
                placeholder="Nguyễn Văn A"
                disabled={isLoading}
                className={`block w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border transition outline-none ${errors.name
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-red-900 bg-red-50/20'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white'
                  } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                {...register('name', {
                  required: 'Vui lòng nhập họ và tên',
                  validate: (val) => {
                    const trimmed = val.trim();
                    if (!trimmed) return 'Họ và tên không được để trống';
                    if (trimmed.length > 100) return 'Họ và tên tối đa 100 ký tự';
                    return true;
                  },
                })}
              />
            </div>
            {errors.name && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.name.message}
              </p>
            )}
          </div>

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
                placeholder="name@example.com"
                disabled={isLoading}
                className={`block w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border transition outline-none ${errors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-red-900 bg-red-50/20'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white'
                  } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                {...register('email', {
                  required: 'Vui lòng nhập địa chỉ email',
                  maxLength: {
                    value: 254,
                    message: 'Email tối đa 254 ký tự',
                  },
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
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-lg shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Tối thiểu 8 ký tự"
                disabled={isLoading}
                className={`block w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border transition outline-none ${errors.password
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-red-900 bg-red-50/20'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white'
                  } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                {...register('password', {
                  required: 'Vui lòng nhập mật khẩu',
                  minLength: {
                    value: 8,
                    message: 'Mật khẩu phải có ít nhất 8 ký tự',
                  },
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

          {/* Confirm Password Field */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Xác nhận mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-lg shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu"
                disabled={isLoading}
                className={`block w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border transition outline-none ${errors.confirmPassword
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-red-900 bg-red-50/20'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white'
                  } disabled:bg-slate-100 disabled:cursor-not-allowed`}
                {...register('confirmPassword', {
                  required: 'Vui lòng xác nhận lại mật khẩu',
                  validate: (val) =>
                    val === getValues('password') || 'Mật khẩu xác nhận không khớp',
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.confirmPassword.message}
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
                <span>Đang xử lý đăng ký...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Đăng ký tài khoản</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Đã có tài khoản?{' '}
          <Link
            to={
              redirectParam
                ? `/login?redirect=${encodeURIComponent(redirectParam)}`
                : '/login'
            }
            className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
