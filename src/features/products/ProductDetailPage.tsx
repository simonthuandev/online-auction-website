import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduct } from './hooks/useProducts';
import { useAppSelector } from '@/store';
import { ProductGallery } from './components/ProductGallery';
import { StatusBadge } from './components/StatusBadge';
import { ConditionBadge } from './components/ConditionBadge';
import { ApiError } from '@/api/client';
import {
  Tag,
  ChevronRight,
  ArrowLeft,
  Edit,
  Gavel,
  AlertCircle,
  FileQuestion,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const { data: product, isLoading, isError, error, refetch } = useProduct(id);

  // Check if error is specifically 404 Not Found
  const errorStatus =
    error instanceof ApiError
      ? error.statusCode
      : error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode?: number }).statusCode
        : error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

  const isNotFound =
    (error instanceof ApiError && (error.statusCode === 404 || error.code === 'NOT_FOUND')) ||
    errorStatus === 404;

  // Owner action check per specification:
  // 1. Authenticated
  // 2. Has role SELLER or ADMIN
  // 3. Current user is the owner (product.sellerId === user.id)
  // 4. Product status is either DRAFT or READY
  const isSellerOrAdmin = user?.role === 'SELLER' || user?.role === 'ADMIN';
  const isOwner = Boolean(
    isAuthenticated && isSellerOrAdmin && product && user?.id === product.sellerId
  );
  const canModify = Boolean(
    isOwner && product && (product.status === 'DRAFT' || product.status === 'READY')
  );

  // 1. Loading Skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="h-4 bg-slate-200 rounded-md w-48" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Gallery skeleton */}
          <div className="space-y-4">
            <div className="aspect-4/3 bg-slate-200 rounded-2xl" />
            <div className="flex gap-3">
              <div className="h-16 w-16 bg-slate-200 rounded-xl" />
              <div className="h-16 w-16 bg-slate-200 rounded-xl" />
              <div className="h-16 w-16 bg-slate-200 rounded-xl" />
            </div>
          </div>

          {/* Details skeleton */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded-md w-24" />
              <div className="h-8 bg-slate-200 rounded-md w-3/4" />
            </div>
            <div className="h-20 bg-slate-200 rounded-xl" />
            <div className="h-32 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // 2. 404 Not Found Screen
  if (isNotFound || (!product && !isLoading && !isError)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
        <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-2xl">
          <FileQuestion className="h-10 w-10 stroke-[1.5]" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900">
            Sản phẩm không tồn tại
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Sản phẩm bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc đường dẫn không hợp lệ.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách sản phẩm</span>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Generic Error State (e.g. 500 or offline)
  if (isError || !product) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-2xl">
          <AlertCircle className="h-10 w-10 stroke-[1.5]" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Không thể tải thông tin sản phẩm
        </h2>
        <p className="text-xs text-slate-500">
          {error?.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Thử lại
          </button>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
          >
            Về danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto whitespace-nowrap py-1">
        <Link to="/" className="hover:text-indigo-600 transition">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <Link to="/products" className="hover:text-indigo-600 transition">
          Sản phẩm
        </Link>
        {product.category?.name && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <Link
              to={`/products?categoryId=${product.categoryId}`}
              className="hover:text-indigo-600 transition"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-900 truncate max-w-xs">
          {product.title}
        </span>
      </nav>

      {/* Main Product Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Image Gallery (7 cols) */}
        <div className="lg:col-span-7">
          <ProductGallery images={product.images} productTitle={product.title} />
        </div>

        {/* Right Column: Product Info & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Header Info */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={product.status} size="md" />
              <ConditionBadge condition={product.condition} size="md" />
              {product.category?.name && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-md">
                  <Tag className="h-3 w-3 text-slate-400" />
                  {product.category.name}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
              {product.title}
            </h1>
          </div>

          {/* Description Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Mô tả chi tiết sản phẩm
            </h2>
            <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {product.description || 'Chưa có mô tả cho sản phẩm này.'}
            </div>
          </div>

          {/* Status & Auction Notes */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Quy chuẩn đấu giá:</span>
                <p className="mt-0.5 text-slate-500">
                  Sản phẩm đã được kiểm tra tính hợp lệ trước khi đưa vào hệ thống sàn đấu giá.
                </p>
              </div>
            </div>

            {product.status === 'IN_AUCTION' && (
              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
                <Clock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-700">Đang có phiên đấu giá:</span>
                  <p className="mt-0.5 text-slate-500">
                    Sản phẩm này hiện đang được đấu giá trực tuyến trong phòng đấu giá.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Owner Actions (Only for owner seller when DRAFT or READY) */}
          {canModify && (
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Thao tác của Người Bán (Chủ sở hữu)
                </span>
              </div>
              <p className="text-xs text-indigo-700">
                Bạn là chủ sở hữu của sản phẩm này. Bạn có thể chỉnh sửa thông tin hoặc đưa sản phẩm lên sàn đấu giá:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Edit Product Button */}
                <Link
                  to={`/seller/products/${product.id}/edit`}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-300 bg-white text-indigo-700 text-xs font-semibold hover:bg-indigo-50 transition shadow-xs"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Sửa sản phẩm</span>
                </Link>

                {/* Create Auction Button */}
                <Link
                  to={`/seller/auctions/new?productId=${product.id}`}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-xs"
                >
                  <Gavel className="h-3.5 w-3.5" />
                  <span>Tạo phiên đấu giá</span>
                </Link>
              </div>
            </div>
          )}

          {/* Back to Products link */}
          <div className="pt-2">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại danh sách sản phẩm</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
