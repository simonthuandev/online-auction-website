import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useAppSelector } from '@/store';
import { productApi } from '@/api/product.api';
import type { Product } from '@/contracts/api.generated';
import { PRODUCT_QUERY_KEYS } from '../hooks/useProducts';
import { StatusBadge } from '../components/StatusBadge';
import { ConditionBadge } from '../components/ConditionBadge';
import { DEFAULT_PRODUCT_PLACEHOLDER } from '../components/ProductCard';
import { EmptyState } from '@/components/common/EmptyState';
import { DeleteProductModal } from './components/DeleteProductModal';
import { useRecentDraftIds } from './hooks/useRecentDraftIds';
import { useDeleteProduct } from './hooks/useSellerProductMutations';
import {
  getErrorStatusCode,
  isProductEditable,
} from './utils/productFormHelpers';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Eye,
  Gavel,
  CheckCircle2,
  Search,
  Lock,
  AlertCircle,
} from 'lucide-react';

interface SellerProductThumbProps {
  product: Product;
}

const SellerProductThumb: React.FC<SellerProductThumbProps> = ({ product }) => {
  const [erroredUrl, setErroredUrl] = useState<string | null>(null);
  const primaryImage =
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url;

  const src =
    primaryImage && erroredUrl !== primaryImage
      ? primaryImage
      : DEFAULT_PRODUCT_PLACEHOLDER;

  return (
    <img
      key={src}
      src={src}
      alt={product.title ?? 'Sản phẩm'}
      onError={() => {
        if (primaryImage) setErroredUrl(primaryImage);
      }}
      className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
    />
  );
};

export const SellerProductsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { draftIds, addDraftId, removeDraftId } = useRecentDraftIds(user?.id);
  const deleteMutation = useDeleteProduct(user?.id);

  const [lookupId, setLookupId] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const flashToast = (location.state as { toastMessage?: string } | null)?.toastMessage;
  const [dismissedToast, setDismissedToast] = useState(false);

  const productQueries = useQueries({
    queries: draftIds.map((id) => ({
      queryKey: PRODUCT_QUERY_KEYS.detail(id),
      queryFn: () => productApi.getProduct(id),
      staleTime: 1000 * 30,
      retry: (failureCount: number, error: unknown) => {
        if (getErrorStatusCode(error) === 404) return false;
        return failureCount < 1;
      },
    })),
  });

  // Automatically prune IDs that return 404 or no longer belong to this seller
  useEffect(() => {
    productQueries.forEach((query, index) => {
      const targetId = draftIds[index];
      if (!targetId) return;

      if (query.isError && getErrorStatusCode(query.error) === 404) {
        removeDraftId(targetId);
      } else if (
        query.isSuccess &&
        query.data &&
        user?.id &&
        query.data.sellerId !== user.id
      ) {
        removeDraftId(targetId);
      }
    });
  }, [productQueries, draftIds, user?.id, removeDraftId]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    const trimmed = lookupId.trim();
    if (!trimmed) return;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      setLookupError('Mã sản phẩm phải là UUID hợp lệ.');
      return;
    }
    addDraftId(trimmed);
    setLookupId('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Không thể xóa sản phẩm. Vui lòng thử lại.');
      }
    }
  };

  const isLoadingAny = productQueries.some((q) => q.isLoading);
  const loadedProducts = productQueries
    .map((q) => q.data)
    .filter(
      (p): p is Product =>
        Boolean(p) && (!user?.id || p?.sellerId === user.id)
    );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Kênh Người Bán — Sản phẩm của tôi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Quản lý các sản phẩm bản nháp (DRAFT) và sản phẩm đã tạo gần đây
            </p>
          </div>
        </div>

        <Link
          to="/seller/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Tạo sản phẩm mới
        </Link>
      </div>

      {/* Flash Toast Banner */}
      {flashToast && !dismissedToast && (
        <div
          className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800"
          role="status"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{flashToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setDismissedToast(true)}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Quick Add Product by ID (helps open DRAFT created on another session) */}
      <form
        onSubmit={handleLookupSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Nhập UUID sản phẩm để mở lại bản nháp từ thiết bị khác..."
              aria-label="Nhập UUID sản phẩm"
              className="block w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shrink-0"
          >
            Thêm vào danh sách
          </button>
        </div>
        {lookupError && (
          <p className="text-xs text-red-600 flex items-center gap-1" role="alert">
            <AlertCircle className="h-3.5 w-3.5" />
            {lookupError}
          </p>
        )}
      </form>

      {/* Loading Skeleton */}
      {isLoadingAny && loadedProducts.length === 0 && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="h-20 w-20 rounded-xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingAny && loadedProducts.length === 0 && (
        <EmptyState
          title="Chưa có sản phẩm nào gần đây"
          description="Danh sách này lưu các sản phẩm (bao gồm bản nháp DRAFT) bạn đã tạo trên trình duyệt này. Hãy tạo sản phẩm đầu tiên để bắt đầu đấu giá."
          actionText="Tạo sản phẩm mới"
          onAction={() => {
            navigate('/seller/products/new');
          }}
        />
      )}

      {/* Product List */}
      {loadedProducts.length > 0 && (
        <div className="space-y-3">
          {loadedProducts.map((product) => {
            const editability = isProductEditable(product.status);
            const canEditOrDelete = editability.editable;

            return (
              <div
                key={product.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <SellerProductThumb product={product} />

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={product.status} size="sm" />
                      <ConditionBadge condition={product.condition} size="sm" />
                      {product.category?.name && (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {product.category.name}
                        </span>
                      )}
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      <Link
                        to={`/products/${product.id}`}
                        className="hover:text-indigo-600 transition"
                      >
                        {product.title ?? 'Chưa có tiêu đề'}
                      </Link>
                    </h2>

                    {!canEditOrDelete && editability.reason && (
                      <p className="text-[11px] text-amber-700 flex items-center gap-1">
                        <Lock className="h-3 w-3 shrink-0" />
                        <span>{editability.reason}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    to={`/products/${product.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Xem
                  </Link>

                  {canEditOrDelete ? (
                    <Link
                      to={`/seller/products/${product.id}/edit`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Sửa
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={editability.reason}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-400 cursor-not-allowed"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Sửa
                    </button>
                  )}

                  {product.status === 'READY' && (
                    <Link
                      to={`/seller/auctions/new?productId=${product.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                    >
                      <Gavel className="h-3.5 w-3.5" />
                      Tạo đấu giá
                    </Link>
                  )}

                  <button
                    type="button"
                    disabled={!canEditOrDelete}
                    title={!canEditOrDelete ? editability.reason : 'Xóa sản phẩm'}
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(product);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-white text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteProductModal
        isOpen={Boolean(deleteTarget)}
        productTitle={deleteTarget?.title ?? ''}
        isDeleting={deleteMutation.isPending}
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
};
