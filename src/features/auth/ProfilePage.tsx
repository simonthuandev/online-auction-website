import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMe, useUpdateProfile } from './hooks/useAuth';
import { performLogout } from './services/performLogout';
import { ApiError } from '@/api/client';
import {
  User as UserIcon,
  Mail,
  Shield,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Save,
  Lock,
} from 'lucide-react';
import type { UpdateProfileInput } from '@/api/auth.api';

interface ProfileFormValues {
  name: string;
  avatarUrl: string;
}

const DEFAULT_AVATAR_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

export const ProfilePage: React.FC = () => {
  const { data: user, isLoading, isError, error, refetch } = useMe();
  const updateMutation = useUpdateProfile();

  const [erroredUrl, setErroredUrl] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      name: '',
      avatarUrl: '',
    },
    mode: 'onChange',
  });

  // Populate form with current user data when loaded
  useEffect(() => {
    if (user) {
      reset({
        name: user.name ?? '',
        avatarUrl: user.avatarUrl ?? '',
      });
    }
  }, [user, reset]);

  // Granular field observation with useWatch (safe for React 19 compiler)
  const watchedName = useWatch({ control, name: 'name' }) ?? '';
  const watchedAvatarUrl = useWatch({ control, name: 'avatarUrl' }) ?? '';

  // Determine if form has actually changed compared to current user profile
  const trimmedName = watchedName.trim();
  const normalizedAvatar = watchedAvatarUrl.trim() || null;
  const originalAvatar = user?.avatarUrl || null;
  const isNameChanged = trimmedName !== (user?.name ?? '');
  const isAvatarChanged = normalizedAvatar !== originalAvatar;
  const isFormChanged = isNameChanged || isAvatarChanged;

  // Validation rules for avatar URL: empty or valid http/https URL <= 2048 chars
  const isValidAvatarUrl =
    !normalizedAvatar ||
    (/^https?:\/\/.+/i.test(normalizedAvatar) && normalizedAvatar.length <= 2048);

  const isValidName = trimmedName.length >= 1 && trimmedName.length <= 100;
  const isFormValid = isValidName && isValidAvatarUrl && !errors.name && !errors.avatarUrl;

  // Save button is locked when form has no changes, is invalid, or is currently submitting
  const isSaveDisabled =
    !isFormChanged || !isFormValid || updateMutation.isPending || isLoading;

  const onSubmit = async (data: ProfileFormValues) => {
    setSuccessMessage(null);
    setServerError(null);

    const payload: UpdateProfileInput = {
      name: data.name.trim(),
      avatarUrl: data.avatarUrl.trim() ? data.avatarUrl.trim() : null,
    };

    try {
      await updateMutation.mutateAsync(payload);
      setSuccessMessage('Cập nhật hồ sơ cá nhân thành công!');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 400 || err.code === 'INVALID_REQUEST') {
          setServerError(
            err.message || 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.'
          );
        } else {
          setServerError(err.message || 'Cập nhật thất bại. Vui lòng thử lại.');
        }
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      }
    }
  };

  const handleLogout = async () => {
    await performLogout({ callApi: true });
  };

  // 1. Loading State (Skeleton)
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-200 animate-pulse rounded-xl" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-md" />
            <div className="h-4 w-32 bg-slate-200 animate-pulse rounded-md" />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-xs animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-slate-200" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 bg-slate-200 rounded-md" />
              <div className="h-4 w-60 bg-slate-200 rounded-md" />
            </div>
          </div>
          <div className="h-10 bg-slate-200 rounded-lg" />
          <div className="h-10 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  // 2. Error / Offline State
  if (isError || !user) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-xl">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Không thể tải thông tin hồ sơ</h2>
        <p className="text-xs text-slate-600">
          {error?.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc phiên đăng nhập.'}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Thử lại
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  // Determine avatar preview source
  const rawAvatarUrl = watchedAvatarUrl.trim();
  const previewError = Boolean(erroredUrl && erroredUrl === rawAvatarUrl);
  const currentAvatarSrc =
    !previewError && rawAvatarUrl
      ? rawAvatarUrl
      : DEFAULT_AVATAR_PLACEHOLDER;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Hồ sơ cá nhân
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý thông tin tài khoản và xem quyền hạn người dùng
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition"
        >
          <LogOut className="h-4 w-4" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl text-sm bg-emerald-50 border border-emerald-200 text-emerald-800"
          role="status"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="font-medium text-xs sm:text-sm">{successMessage}</p>
        </div>
      )}

      {/* Server Error Notification */}
      {serverError && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl text-sm bg-red-50 border border-red-200 text-red-800"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="font-medium text-xs sm:text-sm">{serverError}</p>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        {/* User Identity & Avatar Preview */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-100">
          <div className="relative group shrink-0">
            <div className="h-24 w-24 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-xs flex items-center justify-center">
              <img
                key={currentAvatarSrc}
                src={currentAvatarSrc}
                alt={user.name || 'Ảnh đại diện'}
                onError={() => {
                  if (rawAvatarUrl) setErroredUrl(rawAvatarUrl);
                }}
                className="h-full w-full object-cover"
              />
            </div>
            {previewError && (
              <span className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-semibold rounded-full shadow-xs">
                Lỗi ảnh
              </span>
            )}
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {user.name ?? 'Người dùng'}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  user.role === 'ADMIN'
                    ? 'bg-rose-100 text-rose-700'
                    : user.role === 'SELLER'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                <Shield className="h-3 w-3" />
                {user.role || 'USER'}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {user.email}
            </p>
            <p className="text-[11px] text-slate-400">
              Mã tài khoản: <span className="font-mono">{user.id}</span>
            </p>
          </div>
        </div>

        {/* Read-Only Information Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Địa chỉ Email (Chỉ đọc)
            </span>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Vai trò hệ thống (Chỉ đọc)
            </span>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              <span>{user.role || 'USER'}</span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="space-y-4">
            {/* Name Input */}
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
                  placeholder="Nhập họ và tên mới"
                  disabled={updateMutation.isPending}
                  className={`block w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition outline-none ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-red-900 bg-red-50/20'
                      : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white'
                  } disabled:bg-slate-100`}
                  {...register('name', {
                    required: 'Họ và tên không được để trống',
                    validate: (val) => {
                      const trimmed = val.trim();
                      if (!trimmed) return 'Họ và tên không được chỉ chứa khoảng trắng';
                      if (trimmed.length > 100) return 'Họ và tên tối đa 100 ký tự';
                      return true;
                    },
                  })}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Avatar URL Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="avatarUrl"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Đường dẫn ảnh đại diện (URL)
                </label>
                <span className="text-[11px] text-slate-400">
                  Để trống để xóa avatar
                </span>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <input
                  id="avatarUrl"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  disabled={updateMutation.isPending}
                  className={`block w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition outline-none ${
                    errors.avatarUrl || previewError
                      ? 'border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-slate-900 bg-white'
                      : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white'
                  } disabled:bg-slate-100`}
                  {...register('avatarUrl', {
                    validate: (val) => {
                      const trimmed = val.trim();
                      if (!trimmed) return true; // empty is allowed, sends null
                      if (trimmed.length > 2048) return 'Độ dài URL tối đa 2048 ký tự';
                      if (!/^https?:\/\/.+/i.test(trimmed)) {
                        return 'URL phải bắt đầu bằng http:// hoặc https://';
                      }
                      return true;
                    },
                  })}
                />
              </div>
              {errors.avatarUrl && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.avatarUrl.message}
                </p>
              )}
              {previewError && !errors.avatarUrl && watchedAvatarUrl.trim() && (
                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Không thể tải ảnh từ URL này. Vui lòng kiểm tra lại đường dẫn.
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-400">
              {!isFormChanged
                ? 'Chưa có thay đổi nào'
                : 'Có thay đổi chưa được lưu'}
            </div>

            <button
              type="submit"
              disabled={isSaveDisabled}
              title={
                !isFormChanged
                  ? 'Chưa có thay đổi nào'
                  : !isFormValid
                  ? 'Dữ liệu không hợp lệ'
                  : 'Lưu thay đổi hồ sơ'
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
