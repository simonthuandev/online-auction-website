import React, { useEffect, useMemo, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { useAppSelector } from '@/store';
import { ApiError } from '@/api/client';
import { useCategories, useProduct } from '../hooks/useProducts';
import { StatusBadge } from '../components/StatusBadge';
import { ImageListField } from './components/ImageListField';
import { DeleteProductModal } from './components/DeleteProductModal';
import {
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from './hooks/useSellerProductMutations';
import {
  PRODUCT_CONDITION_OPTIONS,
  buildCreateProductPayload,
  buildUpdateProductPayload,
  canTransitionToReady,
  getErrorStatusCode,
  isProductEditable,
  productFormSchema,
  type ProductFormValues,
} from './utils/productFormHelpers';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  Lock,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';

const productZodResolver: Resolver<ProductFormValues> = async (values) => {
  const result = productFormSchema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }

  const fieldErrors: Record<string, { type: string; message: string }> = {};
  const imageErrors: Array<{ url?: { type: string; message: string } }> = [];
  let imagesRootError: { type: string; message: string } | undefined;

  for (const issue of result.error.issues) {
    const [first, second] = issue.path;
    if (first === 'images') {
      if (typeof second === 'number') {
        imageErrors[second] = {
          url: { type: 'validation', message: issue.message },
        };
      } else {
        imagesRootError = { type: 'validation', message: issue.message };
      }
    } else if (typeof first === 'string' && !fieldErrors[first]) {
      fieldErrors[first] = { type: 'validation', message: issue.message };
    }
  }

  const errors: Record<string, unknown> = { ...fieldErrors };
  if (imageErrors.length > 0 || imagesRootError) {
    errors.images = Object.assign(imageErrors, imagesRootError ? { root: imagesRootError } : {});
  }

  return {
    values: {},
    errors: errors as never,
  };
};

export const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const [categorySearch, setCategorySearch] = useState('');
  const [targetStatus, setTargetStatus] = useState<'DRAFT' | 'READY'>('DRAFT');
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    data: categoriesPage,
    isLoading: isLoadingCategories,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useCategories({ page: 1, pageSize: 100 });

  const {
    data: product,
    isLoading: isLoadingProduct,
    isError: isProductError,
    error: productError,
    refetch: refetchProduct,
  } = useProduct(isEditMode ? id : undefined);

  const createMutation = useCreateProduct(user?.id);
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct(user?.id);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: productZodResolver,
    defaultValues: {
      categoryId: '',
      title: '',
      description: '',
      condition: 'NEW',
      images: [],
    },
    mode: 'onBlur',
  });

  const watchedImages = useWatch({ control, name: 'images' }) ?? [];
  const [prevProduct, setPrevProduct] = useState(product);

  if (isEditMode && product && product !== prevProduct) {
    setPrevProduct(product);
    setTargetStatus(product.status === 'READY' ? 'READY' : 'DRAFT');
  }

  // Populate form when editing product is fetched
  useEffect(() => {
    if (isEditMode && product) {
      reset({
        categoryId: product.categoryId ?? '',
        title: product.title ?? '',
        description: product.description ?? '',
        condition: product.condition ?? 'NEW',
        images: (product.images ?? []).map((img) => ({
          url: img.url,
          isPrimary: Boolean(img.isPrimary),
        })),
      });
    }
  }, [isEditMode, product, reset]);

  const shouldBlockNavigation =
    isDirty && !createMutation.isSuccess && !deleteMutation.isSuccess;

  // Warn before browser refresh/close if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldBlockNavigation) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlockNavigation]);

  // Warn on in-app navigation if there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlockNavigation &&
      currentLocation.pathname !== nextLocation.pathname
  );

  const categories = useMemo(() => categoriesPage?.items ?? [], [categoriesPage]);
  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const productErrorStatus = getErrorStatusCode(productError);
  const isProductNotFound = isEditMode && productErrorStatus === 404;
  const isProductForbidden =
    isEditMode &&
    (productErrorStatus === 403 ||
      Boolean(forbiddenError) ||
      Boolean(product && user?.id && product.sellerId !== user.id));

  const editability = isEditMode
    ? isProductEditable(product?.status)
    : { editable: true };
  const isReadOnly = isEditMode && !editability.editable;
  const isMutating =
    isSubmitting || createMutation.isPending || updateMutation.isPending;

  const readyCheck = canTransitionToReady(watchedImages);

  // If images become invalid for READY while READY was selected, fall back to DRAFT
  const effectiveTargetStatus: 'DRAFT' | 'READY' =
    targetStatus === 'READY' && readyCheck.allowed ? 'READY' : 'DRAFT';

  const applyServerFieldErrors = (err: ApiError) => {
    const resp = err.response as { details?: unknown } | undefined;
    const details = resp?.details;
    if (!details || typeof details !== 'object') return;

    if (Array.isArray(details)) {
      for (const item of details) {
        if (item && typeof item === 'object' && 'field' in item && 'message' in item) {
          const field = String((item as { field: unknown }).field);
          const message = String((item as { message: unknown }).message);
          if (
            field === 'categoryId' ||
            field === 'title' ||
            field === 'description' ||
            field === 'condition'
          ) {
            setError(field, { type: 'server', message });
          }
        }
      }
    } else {
      for (const [key, val] of Object.entries(details as Record<string, unknown>)) {
        if (
          (key === 'categoryId' ||
            key === 'title' ||
            key === 'description' ||
            key === 'condition') &&
          typeof val === 'string'
        ) {
          setError(key, { type: 'server', message: val });
        }
      }
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    setServerError(null);
    setSuccessMessage(null);

    try {
      if (!isEditMode) {
        const payload = buildCreateProductPayload(values);
        const created = await createMutation.mutateAsync(payload);
        navigate(`/products/${created.id}`, {
          state: { toastMessage: 'Tạo sản phẩm nháp thành công!' },
        });
        return;
      }

      if (!id || isReadOnly) return;

      const payload = buildUpdateProductPayload(values, effectiveTargetStatus);
      const updated = await updateMutation.mutateAsync({ id, input: payload });
      reset({
        categoryId: updated.categoryId ?? values.categoryId,
        title: updated.title ?? values.title,
        description: updated.description ?? values.description,
        condition: updated.condition ?? values.condition,
        images: (updated.images ?? []).map((img) => ({
          url: img.url,
          isPrimary: Boolean(img.isPrimary),
        })),
      });
      setTargetStatus(updated.status === 'READY' ? 'READY' : 'DRAFT');
      setSuccessMessage('Đã lưu thay đổi sản phẩm thành công.');
    } catch (err: unknown) {
      const status = getErrorStatusCode(err);
      if (status === 403) {
        setForbiddenError('Bạn không có quyền chỉnh sửa sản phẩm này.');
        return;
      }
      if (status === 409) {
        setServerError(
          'Trạng thái sản phẩm vừa thay đổi (ví dụ đã được giữ chỗ hoặc đưa vào đấu giá). Hệ thống đang tải lại dữ liệu mới nhất.'
        );
        await refetchProduct();
        return;
      }
      if (err instanceof ApiError) {
        if (status === 400) {
          applyServerFieldErrors(err);
        }
        setServerError(err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
        return;
      }
      if (err instanceof Error) {
        setServerError(err.message);
        return;
      }
      setServerError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!id || isReadOnly) return;
    setDeleteError(null);

    try {
      await deleteMutation.mutateAsync(id);
      setDeleteModalOpen(false);
      navigate('/seller/products', {
        state: { toastMessage: `Đã xóa sản phẩm "${product?.title ?? ''}" thành công.` },
      });
    } catch (err: unknown) {
      const status = getErrorStatusCode(err);
      if (status === 403) {
        setDeleteModalOpen(false);
        setForbiddenError('Bạn không có quyền xóa sản phẩm này.');
        return;
      }
      if (status === 409) {
        setDeleteModalOpen(false);
        setServerError(
          'Sản phẩm vừa chuyển trạng thái nên không thể xóa. Dữ liệu mới nhất đã được nạp lại.'
        );
        await refetchProduct();
        return;
      }
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Không thể xóa sản phẩm lúc này. Vui lòng thử lại.');
      }
    }
  };

  // 1. Loading State in Edit mode
  if (isEditMode && isLoadingProduct) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded-md w-48" />
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="h-10 bg-slate-200 rounded-xl" />
          <div className="h-10 bg-slate-200 rounded-xl" />
          <div className="h-28 bg-slate-200 rounded-xl" />
          <div className="h-24 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // 2. 404 Not Found in Edit mode
  if (isEditMode && (isProductNotFound || (!product && !isLoadingProduct && !isProductError))) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
        <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-2xl">
          <FileQuestion className="h-10 w-10 stroke-[1.5]" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy sản phẩm</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Sản phẩm này không tồn tại hoặc đã bị xóa trước đó.
          </p>
        </div>
        <Link
          to="/seller/products"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách sản phẩm
        </Link>
      </div>
    );
  }

  // 3. 403 Forbidden (other seller's product)
  if (isProductForbidden) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white border border-red-200 rounded-2xl shadow-xs space-y-5">
        <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-2xl">
          <ShieldAlert className="h-10 w-10 stroke-[1.5]" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900">
            Bạn không có quyền chỉnh sửa sản phẩm này
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {forbiddenError || 'Chỉ người bán đã tạo sản phẩm mới có thể chỉnh sửa hoặc xóa.'}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/seller/products"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Về Kênh Người Bán
          </Link>
          {id && (
            <Link
              to={`/products/${id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
            >
              Xem trang chi tiết
            </Link>
          )}
        </div>
      </div>
    );
  }

  // 4. Generic load error in Edit mode
  if (isEditMode && isProductError) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white border border-red-200 rounded-2xl shadow-xs space-y-4">
        <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-2xl">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Không thể tải thông tin sản phẩm</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          {productError instanceof Error
            ? productError.message
            : 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void refetchProduct()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại
          </button>
          <Link
            to="/seller/products"
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
          >
            Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const imageItemErrors = Array.isArray(errors.images)
    ? errors.images.map((item) => item?.url?.message)
    : [];
  const imageRootError =
    errors.images && !Array.isArray(errors.images)
      ? (errors.images as { message?: string }).message
      : (errors.images as { root?: { message?: string } } | undefined)?.root?.message;

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/seller/products"
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            aria-label="Quay lại danh sách sản phẩm của người bán"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {isEditMode ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm mới'}
              </h1>
              {isEditMode && product && <StatusBadge status={product.status} size="sm" />}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {isEditMode
                ? 'Cập nhật thông tin, bộ ảnh hoặc chuyển trạng thái sẵn sàng đấu giá.'
                : 'Sản phẩm mới được tạo ở trạng thái Bản nháp (DRAFT). Bạn có thể bổ sung ảnh và chuyển sang READY sau.'}
            </p>
          </div>
        </div>

        {isEditMode && product && (
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeleteModalOpen(true);
            }}
            disabled={isReadOnly || deleteMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 bg-white text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa sản phẩm
          </button>
        )}
      </div>

      {/* Read-only lock banner when RESERVED / IN_AUCTION / SOLD */}
      {isReadOnly && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900"
          role="status"
        >
          <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold">Sản phẩm đang ở chế độ chỉ đọc</p>
            <p className="text-amber-800">{editability.reason}</p>
          </div>
        </div>
      )}

      {/* Feedback Banners */}
      {serverError && (
        <div
          className="flex items-start gap-2.5 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {successMessage && (
        <div
          className="flex items-center justify-between gap-2.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800"
          role="status"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          {id && (
            <Link
              to={`/products/${id}`}
              className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900 shrink-0"
            >
              Xem trang chi tiết
            </Link>
          )}
        </div>
      )}

      {/* Main Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6"
      >
        {/* Category Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="product-category"
              className="block text-sm font-semibold text-slate-800"
            >
              Danh mục sản phẩm <span className="text-red-500">*</span>
            </label>
            {isCategoriesError && (
              <button
                type="button"
                onClick={() => void refetchCategories()}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Tải lại danh mục
              </button>
            )}
          </div>

          {categories.length > 6 && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                disabled={isReadOnly}
                placeholder="Tìm nhanh danh mục..."
                aria-label="Tìm nhanh danh mục"
                className="block w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition disabled:opacity-60"
              />
            </div>
          )}

          <select
            id="product-category"
            disabled={isReadOnly || isLoadingCategories}
            aria-invalid={Boolean(errors.categoryId)}
            {...register('categoryId')}
            className={`block w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white outline-none transition ${
              errors.categoryId
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
            } disabled:bg-slate-100 disabled:text-slate-500`}
          >
            <option value="">
              {isLoadingCategories ? 'Đang tải danh mục...' : '-- Chọn danh mục --'}
            </option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {errors.categoryId && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {errors.categoryId.message}
            </p>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label
            htmlFor="product-title"
            className="block text-sm font-semibold text-slate-800"
          >
            Tiêu đề sản phẩm <span className="text-red-500">*</span>
          </label>
          <input
            id="product-title"
            type="text"
            disabled={isReadOnly}
            aria-invalid={Boolean(errors.title)}
            placeholder="Ví dụ: Đồng hồ cơ cổ điển Seiko Presage..."
            {...register('title')}
            className={`block w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${
              errors.title
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
            } disabled:bg-slate-100 disabled:text-slate-500`}
          />
          {errors.title && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {errors.title.message}
            </p>
          )}
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-slate-800">
            Tình trạng sản phẩm <span className="text-red-500">*</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {PRODUCT_CONDITION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                  isReadOnly ? 'opacity-65 cursor-not-allowed bg-slate-50' : 'hover:border-indigo-300'
                } border-slate-200`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    value={opt.value}
                    disabled={isReadOnly}
                    {...register('condition')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 pl-6">{opt.description}</span>
              </label>
            ))}
          </div>
          {errors.condition && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {errors.condition.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="product-description"
            className="block text-sm font-semibold text-slate-800"
          >
            Mô tả chi tiết <span className="text-red-500">*</span>
          </label>
          <textarea
            id="product-description"
            rows={5}
            disabled={isReadOnly}
            aria-invalid={Boolean(errors.description)}
            placeholder="Mô tả rõ nguồn gốc, thông số kỹ thuật, tình trạng thực tế và phụ kiện đi kèm..."
            {...register('description')}
            className={`block w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition resize-y ${
              errors.description
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
            } disabled:bg-slate-100 disabled:text-slate-500`}
          />
          {errors.description && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Images Field */}
        <div className="pt-2 border-t border-slate-100">
          <Controller
            control={control}
            name="images"
            render={({ field }) => (
              <ImageListField
                images={field.value}
                onChange={field.onChange}
                disabled={isReadOnly}
                itemErrors={imageItemErrors}
                rootError={imageRootError}
              />
            )}
          />
        </div>

        {/* Status Transition DRAFT <-> READY (Edit mode only when editable) */}
        {isEditMode && !isReadOnly && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <span className="block text-sm font-semibold text-slate-800">
              Trạng thái hiển thị
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetStatus('DRAFT')}
                className={`p-3.5 rounded-xl border text-left transition ${
                  effectiveTargetStatus === 'DRAFT'
                    ? 'border-purple-400 bg-purple-50/70 ring-1 ring-purple-300'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Bản nháp (DRAFT)</span>
                  <StatusBadge status="DRAFT" size="sm" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ẩn khỏi danh sách công khai. Bạn có thể tiếp tục chỉnh sửa sau.
                </p>
              </button>

              <button
                type="button"
                disabled={!readyCheck.allowed}
                onClick={() => {
                  if (readyCheck.allowed) {
                    setTargetStatus('READY');
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition ${
                  effectiveTargetStatus === 'READY'
                    ? 'border-sky-400 bg-sky-50/70 ring-1 ring-sky-300'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                } disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Sẵn sàng đấu giá (READY)
                  </span>
                  <StatusBadge status="READY" size="sm" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hiển thị công khai và có thể tạo phiên đấu giá từ sản phẩm này.
                </p>
              </button>
            </div>

            {!readyCheck.allowed && readyCheck.reason && (
              <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                {readyCheck.reason}
              </p>
            )}
          </div>
        )}

        {/* Submit Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
          <Link
            to="/seller/products"
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Hủy bỏ
          </Link>

          {!isReadOnly && (
            <button
              type="submit"
              disabled={isMutating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isEditMode ? (
                <>
                  <Save className="h-4 w-4" />
                  <span>{isMutating ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </>
              ) : (
                <>
                  <PackagePlus className="h-4 w-4" />
                  <span>{isMutating ? 'Đang tạo...' : 'Tạo sản phẩm nháp'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Unsaved Changes Blocker Dialog */}
      {blocker.state === 'blocked' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Bạn có thay đổi chưa lưu
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Nếu rời khỏi trang lúc này, các thông tin bạn vừa chỉnh sửa sẽ bị mất.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => blocker.reset()}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ở lại trang
              </button>
              <button
                type="button"
                onClick={() => blocker.proceed()}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                Rời khỏi trang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteProductModal
        isOpen={deleteModalOpen}
        productTitle={product?.title ?? ''}
        isDeleting={deleteMutation.isPending}
        errorMessage={deleteError}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
};

