import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@/contracts/api.generated';
import { StatusBadge } from './StatusBadge';
import { ConditionBadge } from './ConditionBadge';
import { Tag, ArrowRight } from 'lucide-react';

export interface ProductCardProps {
  product: Product;
}

export const DEFAULT_PRODUCT_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [imageError, setImageError] = useState(false);

  // Primary image priority: image with isPrimary === true -> first image -> fallback
  const primaryImage =
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url;

  const displayImageSrc =
    !imageError && primaryImage ? primaryImage : DEFAULT_PRODUCT_PLACEHOLDER;

  return (
    <div className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200">
      {/* Thumbnail Container */}
      <Link
        to={`/products/${product.id}`}
        className="relative block aspect-4/3 overflow-hidden bg-slate-100"
        tabIndex={-1}
      >
        <img
          key={displayImageSrc}
          src={displayImageSrc}
          alt={product.title ?? 'Sản phẩm'}
          loading="lazy"
          onError={() => setImageError(true)}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Status Badge overlay on image */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={product.status} size="sm" />
        </div>
      </Link>

      {/* Card Content */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Category & Condition */}
        <div className="flex items-center justify-between gap-2 mb-2 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-medium truncate">
            <Tag className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{product.category?.name ?? 'Chưa phân loại'}</span>
          </div>
          <ConditionBadge condition={product.condition} size="sm" />
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-900 line-clamp-2 text-sm sm:text-base mb-2 group-hover:text-indigo-600 transition-colors">
          <Link to={`/products/${product.id}`} className="outline-hidden focus:underline">
            {product.title ?? 'Chưa có tiêu đề'}
          </Link>
        </h3>

        {/* Description Snippet */}
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
          {product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
        </p>

        {/* Action Link */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1">
            Xem chi tiết
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>

          {product.images && product.images.length > 1 && (
            <span className="text-[11px] text-slate-400">
              {product.images.length} ảnh
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

