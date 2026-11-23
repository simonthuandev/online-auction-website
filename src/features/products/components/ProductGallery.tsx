import React, { useState, useCallback } from 'react';
import { DEFAULT_PRODUCT_PLACEHOLDER } from './ProductCard';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

export interface ProductGalleryProps {
  images?: Array<{ url: string; isPrimary: boolean }>;
  productTitle?: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images = [],
  productTitle = 'Sản phẩm',
}) => {
  // Sort or prioritize primary image first
  const sortedImages = React.useMemo(() => {
    if (!images || images.length === 0) return [];
    return [...images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  }, [images]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const [prevImages, setPrevImages] = useState(images);

  // Reset selected index when image list changes
  if (images !== prevImages) {
    setPrevImages(images);
    setSelectedIndex(0);
    setFailedUrls(new Set());
  }

  const handleNext = useCallback(() => {
    if (sortedImages.length <= 1) return;
    setSelectedIndex((prev) => (prev + 1) % sortedImages.length);
  }, [sortedImages.length]);

  const handlePrev = useCallback(() => {
    if (sortedImages.length <= 1) return;
    setSelectedIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
  }, [sortedImages.length]);

  // Keyboard navigation when gallery container is focused
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    }
  };

  const markImageFailed = (url: string) => {
    setFailedUrls((prev) => new Set(prev).add(url));
  };

  if (sortedImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center aspect-4/3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-400">
        <ImageIcon className="h-12 w-12 stroke-[1.5] mb-2" />
        <span className="text-xs">Sản phẩm chưa có hình ảnh</span>
      </div>
    );
  }

  const currentImage = sortedImages[selectedIndex];
  const isCurrentFailed = failedUrls.has(currentImage?.url);
  const displaySrc =
    !isCurrentFailed && currentImage?.url
      ? currentImage.url
      : DEFAULT_PRODUCT_PLACEHOLDER;

  return (
    <div
      className="space-y-4 focus:outline-hidden"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Thư viện ảnh sản phẩm. Dùng phím mũi tên trái/phải để chuyển ảnh."
    >
      {/* Big Main Image Container */}
      <div className="relative aspect-4/3 w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 group">
        <img
          key={displaySrc}
          src={displaySrc}
          alt={`${productTitle} - Ảnh ${selectedIndex + 1}`}
          onError={() => markImageFailed(currentImage.url)}
          className="h-full w-full object-contain p-2 sm:p-4 transition-all duration-200"
        />

        {/* Primary indicator badge */}
        {currentImage?.isPrimary && (
          <div className="absolute top-3 left-3 px-2 py-0.5 bg-indigo-600/90 text-white text-[11px] font-semibold rounded-md shadow-xs backdrop-blur-xs">
            Ảnh đại diện chính
          </div>
        )}

        {/* Counter badge */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-slate-900/70 text-white text-xs font-medium rounded-full shadow-xs backdrop-blur-xs">
          {selectedIndex + 1} / {sortedImages.length}
        </div>

        {/* Navigation Arrows for big display */}
        {sortedImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-md transition opacity-80 group-hover:opacity-100 focus:opacity-100"
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-md transition opacity-80 group-hover:opacity-100 focus:opacity-100"
              aria-label="Ảnh kế tiếp"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Strip */}
      {sortedImages.length > 1 && (
        <div
          className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin"
          role="tablist"
          aria-label="Danh sách hình thu nhỏ"
        >
          {sortedImages.map((img, index) => {
            const isFailed = failedUrls.has(img.url);
            const thumbSrc =
              !isFailed && img.url ? img.url : DEFAULT_PRODUCT_PLACEHOLDER;
            const isSelected = index === selectedIndex;

            return (
              <button
                key={`${img.url}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                role="tab"
                aria-selected={isSelected}
                aria-label={`Xem ảnh ${index + 1}`}
                className={`relative shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={thumbSrc}
                  alt={`Hình thu nhỏ ${index + 1}`}
                  loading="lazy"
                  onError={() => markImageFailed(img.url)}
                  className="h-full w-full object-cover"
                />
                {img.isPrimary && (
                  <span className="absolute bottom-0 inset-x-0 bg-indigo-600 text-white text-[9px] font-bold text-center py-0.5 leading-none">
                    Chính
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
