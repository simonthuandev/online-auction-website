import React, { useState } from 'react';
import type { ProductImageInput } from '@/api/product.api';
import { DEFAULT_PRODUCT_PLACEHOLDER } from '../../components/ProductCard';
import { setPrimaryImageAt, validateHttpImageUrl } from '../utils/productFormHelpers';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  Image as ImageIcon,
  Info,
} from 'lucide-react';

interface ImagePreviewThumbProps {
  url: string;
  index: number;
}

const ImagePreviewThumb: React.FC<ImagePreviewThumbProps> = ({ url, index }) => {
  const [erroredUrl, setErroredUrl] = useState<string | null>(null);
  const trimmed = url.trim();
  const isValid = validateHttpImageUrl(trimmed);
  const hasFailed = erroredUrl === trimmed;
  const src = isValid && !hasFailed ? trimmed : DEFAULT_PRODUCT_PLACEHOLDER;

  return (
    <div className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
      <img
        key={src}
        src={src}
        alt={`Xem trước ảnh ${index + 1}`}
        onError={() => {
          if (trimmed) setErroredUrl(trimmed);
        }}
        className="h-full w-full object-cover"
      />
    </div>
  );
};

export interface ImageListFieldProps {
  images: ProductImageInput[];
  onChange: (nextImages: ProductImageInput[]) => void;
  disabled?: boolean;
  itemErrors?: Array<string | undefined>;
  rootError?: string;
}

export const ImageListField: React.FC<ImageListFieldProps> = ({
  images,
  onChange,
  disabled = false,
  itemErrors = [],
  rootError,
}) => {
  const handleAddRow = () => {
    if (disabled || images.length >= 20) return;
    // If adding the very first image, auto-suggest it as primary
    const isFirst = images.length === 0;
    onChange([...images, { url: '', isPrimary: isFirst }]);
  };

  const handleUrlChange = (index: number, nextUrl: string) => {
    if (disabled) return;
    const next = images.map((img, i) =>
      i === index ? { ...img, url: nextUrl } : img
    );
    onChange(next);
  };

  const handleTogglePrimary = (index: number) => {
    if (disabled) return;
    const target = images[index];
    if (target?.isPrimary) {
      // Allow unchecking if user wants none selected
      onChange(
        images.map((img, i) => (i === index ? { ...img, isPrimary: false } : img))
      );
    } else {
      // Radio-like behavior: only 1 primary at a time
      onChange(setPrimaryImageAt(images, index));
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    if (disabled) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const next = images.filter((_, i) => i !== index);
    onChange(next);
  };

  const primaryCount = images.filter((img) => img.isPrimary).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="block text-sm font-semibold text-slate-800">
            Hình ảnh sản phẩm ({images.length}/20)
          </label>
          <p className="text-xs text-slate-500">
            Nhập URL ảnh công khai (http/https). Chọn tối đa 1 ảnh chính làm ảnh đại diện.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddRow}
          disabled={disabled || images.length >= 20}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm ảnh
        </button>
      </div>

      {images.length === 1 && images[0]?.isPrimary && (
        <div className="flex items-center gap-2 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
          <Info className="h-4 w-4 shrink-0 text-sky-600" />
          <span>
            Sản phẩm chỉ có 1 ảnh nên ảnh này được tự động chọn làm <strong>Ảnh chính</strong>.
          </span>
        </div>
      )}

      {rootError && (
        <p className="text-xs font-medium text-red-600" role="alert">
          {rootError}
        </p>
      )}

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-300 rounded-2xl bg-slate-50/70 text-center">
          <ImageIcon className="h-8 w-8 text-slate-400 mb-2 stroke-[1.5]" />
          <p className="text-xs font-medium text-slate-600">
            Chưa có hình ảnh nào. Bạn có thể lưu bản nháp (DRAFT) trước hoặc thêm ảnh ngay.
          </p>
          {!disabled && (
            <button
              type="button"
              onClick={handleAddRow}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm URL ảnh đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {images.map((img, index) => {
            const errorMsg = itemErrors[index];
            return (
              <div
                key={index}
                className={`p-3 rounded-xl border transition ${
                  img.isPrimary
                    ? 'border-indigo-300 bg-indigo-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <ImagePreviewThumb url={img.url} index={index} />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`product-image-url-${index}`}
                          className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          Ảnh #{index + 1}
                        </label>
                      </div>
                      <input
                        id={`product-image-url-${index}`}
                        type="url"
                        value={img.url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        disabled={disabled}
                        placeholder="https://example.com/product-image.jpg"
                        aria-invalid={Boolean(errorMsg)}
                        className={`block w-full px-3 py-2 text-sm rounded-lg border outline-none transition ${
                          errorMsg
                            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                        } disabled:bg-slate-100 disabled:text-slate-500`}
                      />
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-1.5 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePrimary(index)}
                      disabled={disabled}
                      aria-pressed={img.isPrimary}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        img.isPrimary
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="Chọn làm ảnh chính"
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${img.isPrimary ? 'fill-current' : ''}`}
                      />
                      <span>{img.isPrimary ? 'Ảnh chính' : 'Đặt làm chính'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMove(index, -1)}
                      disabled={disabled || index === 0}
                      aria-label={`Di chuyển ảnh ${index + 1} lên`}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMove(index, 1)}
                      disabled={disabled || index === images.length - 1}
                      aria-label={`Di chuyển ảnh ${index + 1} xuống`}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      disabled={disabled}
                      aria-label={`Xóa ảnh ${index + 1}`}
                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium" role="alert">
                    {errorMsg}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {images.length > 0 && primaryCount === 0 && (
        <p className="text-xs text-amber-700 font-medium">
          Chưa chọn ảnh chính. Bạn vẫn có thể lưu bản nháp (DRAFT), nhưng cần chọn 1 ảnh chính để chuyển sang READY.
        </p>
      )}
    </div>
  );
};

