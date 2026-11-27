import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/api/product.api';
import { auctionApi } from '@/api/auction.api';
import type { Product } from '@/contracts/api.generated';
import { formatVnd } from '@/lib/money';
import { toUtcIso } from '@/lib/time';
import { generateIdempotencyKey } from '@/lib/idempotency';
import {
  formatDatetimeLocal,
  validateAuctionTime,
  validateAuctionPrices,
} from '../utils/auctionHelpers';
import { DEFAULT_PRODUCT_PLACEHOLDER } from '@/features/products/components/ProductCard';
import { ConditionBadge } from '@/features/products/components/ConditionBadge';
import { StatusBadge } from '@/features/products/components/StatusBadge';
import {
  Gavel,
  Calendar,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Package,
  ArrowLeft,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react';

export const CreateAuctionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productIdFromUrl = searchParams.get('productId');

  // 1. Fetch READY products for selection
  const {
    data: readyProductsPage,
    isLoading: isLoadingReadyProducts,
  } = useQuery({
    queryKey: ['seller', 'products', 'ready-list'],
    queryFn: () => productApi.getProducts({ status: 'READY', pageSize: 50 }),
    staleTime: 1000 * 30,
  });

  // 2. Fetch specific product if productId is in URL query param
  const {
    data: initialProduct,
    isLoading: isLoadingInitialProduct,
  } = useQuery({
    queryKey: ['product', 'detail', productIdFromUrl],
    queryFn: () => (productIdFromUrl ? productApi.getProduct(productIdFromUrl) : null),
    enabled: Boolean(productIdFromUrl),
    staleTime: 1000 * 30,
  });

  // Form states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [prevInitialProduct, setPrevInitialProduct] = useState<Product | null | undefined>(undefined);

  // Synchronize initial product from URL when fetched without setState in effect
  if (initialProduct !== prevInitialProduct) {
    setPrevInitialProduct(initialProduct);
    if (initialProduct?.status === 'READY' && !selectedProduct) {
      setSelectedProduct(initialProduct);
    }
  }

  const [startingPrice, setStartingPrice] = useState<string>('1000000');
  const [bidIncrement, setBidIncrement] = useState<string>('50000');

  // Times in HTML5 datetime-local format (YYYY-MM-DDTHH:mm)
  const [startTime, setStartTime] = useState<string>(() =>
    formatDatetimeLocal(new Date(Date.now() + 60 * 1000))
  );
  const [endTime, setEndTime] = useState<string>(() =>
    formatDatetimeLocal(new Date(Date.now() + 24 * 3600 * 1000))
  );

  // Search filter inside product selector modal/dropdown
  const [productSearch, setProductSearch] = useState<string>('');

  // Idempotency key state:
  // Preserved across retries on network error; reset on value change or success
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    generateIdempotencyKey()
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter ready products by search keyword
  const readyProducts = useMemo(() => {
    const list = readyProductsPage?.items ?? [];
    if (!productSearch.trim()) return list;
    const q = productSearch.toLowerCase().trim();
    return list.filter((p) => (p.title ?? '').toLowerCase().includes(q));
  }, [readyProductsPage?.items, productSearch]);

  // Handle price changes & refresh idempotency key
  const handleStartingPriceChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setStartingPrice(cleaned);
    setErrorMessage(null);
    setIdempotencyKey(generateIdempotencyKey());
  };

  const handleBidIncrementChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setBidIncrement(cleaned);
    setErrorMessage(null);
    setIdempotencyKey(generateIdempotencyKey());
  };

  // Quick preset helpers for demo & testing:
  const handlePresetStartTime = (minutesFromNow: number) => {
    const target = new Date(Date.now() + minutesFromNow * 60 * 1000);
    setStartTime(formatDatetimeLocal(target));
    setErrorMessage(null);
    setIdempotencyKey(generateIdempotencyKey());
  };

  const handlePresetEndTime = (minutesFromStart: number) => {
    const baseMs = startTime ? new Date(startTime).getTime() : Date.now();
    const target = new Date(baseMs + minutesFromStart * 60 * 1000);
    setEndTime(formatDatetimeLocal(target));
    setErrorMessage(null);
    setIdempotencyKey(generateIdempotencyKey());
  };

  // Form submission handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      setErrorMessage(null);

      // 1. Validate Product
      if (!selectedProduct) {
        setErrorMessage('Vui lòng chọn một sản phẩm ở trạng thái sẵn sàng (READY).');
        return;
      }

      if (selectedProduct.status !== 'READY') {
        setErrorMessage(
          `Sản phẩm "${selectedProduct.title}" hiện ở trạng thái ${selectedProduct.status}. Chỉ có thể tạo phiên đấu giá cho sản phẩm READY.`
        );
        return;
      }

      // 2. Validate Prices
      const priceValidation = validateAuctionPrices(startingPrice, bidIncrement);
      if (!priceValidation.isValid) {
        setErrorMessage(priceValidation.error || 'Giá tiền không hợp lệ.');
        return;
      }

      // 3. Validate Times
      const timeValidation = validateAuctionTime(startTime, endTime);
      if (!timeValidation.isValid) {
        setErrorMessage(timeValidation.error || 'Thời gian phiên đấu giá không hợp lệ.');
        return;
      }

      setIsSubmitting(true);

      try {
        // Convert local times to standard ISO UTC strings
        const payload = {
          productId: selectedProduct.id,
          startingPrice,
          bidIncrement,
          startTime: toUtcIso(startTime),
          endTime: toUtcIso(endTime),
        };

        // Call POST /api/auctions with Idempotency-Key
        const createdAuction = await auctionApi.createAuction(payload, idempotencyKey);

        // Success: 202 Accepted (INITIALIZING) -> navigate directly to auction room
        navigate(`/auctions/${createdAuction.id}`);
      } catch (err: unknown) {
        const axiosError = err as {
          response?: { status?: number; data?: { code?: string; message?: string } };
          message?: string;
        };
        const status = axiosError.response?.status;
        const beMessage = axiosError.response?.data?.message;

        if (status === 409) {
          setErrorMessage(
            beMessage ||
              'Sản phẩm này đã có phiên đấu giá đang diễn ra hoặc đang trong quá trình khởi tạo. Vui lòng chọn sản phẩm khác.'
          );
        } else if (status === 400) {
          setErrorMessage(
            beMessage ||
              'Thông tin phiên đấu giá không hợp lệ. Vui lòng kiểm tra lại giá và thời gian.'
          );
        } else if (status === 403) {
          setErrorMessage(
            beMessage || 'Bạn không có quyền tạo phiên đấu giá cho sản phẩm này.'
          );
        } else {
          setErrorMessage(
            beMessage ||
              axiosError.message ||
              'Không thể kết nối đến máy chủ. Vui lòng bấm thử lại.'
          );
          // Keep same idempotencyKey on network retry
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      selectedProduct,
      startingPrice,
      bidIncrement,
      startTime,
      endTime,
      idempotencyKey,
      navigate,
    ]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Gavel className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tạo phiên đấu giá mới
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Khởi tạo phiên đấu giá cho sản phẩm sẵn sàng (READY) của bạn
            </p>
          </div>
        </div>

        <Link
          to="/seller/products"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-2xs self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quản lý sản phẩm</span>
        </Link>
      </div>

      {/* Warning if URL product exists but is not READY */}
      {initialProduct && initialProduct.status !== 'READY' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">
              Sản phẩm &ldquo;{initialProduct.title}&rdquo; chưa sẵn sàng
            </h4>
            <p className="text-xs text-amber-700 mt-1">
              Sản phẩm này hiện đang có trạng thái{' '}
              <span className="font-bold">{initialProduct.status}</span>. Chỉ có sản phẩm ở
              trạng thái <span className="font-bold">READY</span> mới có thể tạo phiên đấu giá.
              Vui lòng hoàn thiện sản phẩm hoặc chọn sản phẩm khác dưới đây.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <h4 className="font-bold">Không thể tạo phiên đấu giá</h4>
            <p className="mt-0.5 text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Product Selection */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
                1
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Chọn sản phẩm đấu giá (READY)
              </h2>
            </div>

            {selectedProduct && (
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
              >
                Đổi sản phẩm khác
              </button>
            )}
          </div>

          {/* Selected Product Card Preview */}
          {selectedProduct ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-emerald-200/80 rounded-2xl">
              <div className="flex items-center gap-3.5">
                <img
                  src={
                    selectedProduct.images?.find((i) => i.isPrimary)?.url ||
                    selectedProduct.images?.[0]?.url ||
                    DEFAULT_PRODUCT_PLACEHOLDER
                  }
                  alt={selectedProduct.title ?? 'Sản phẩm'}
                  className="h-16 w-16 rounded-xl object-cover border border-slate-200 bg-white"
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {selectedProduct.title ?? 'Chưa có tiêu đề'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedProduct.status} size="sm" />
                    <ConditionBadge condition={selectedProduct.condition} size="sm" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Sẵn sàng đấu giá</span>
              </div>
            </div>
          ) : (
            /* Product Picker Grid */
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Tìm theo tên sản phẩm READY..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              {isLoadingReadyProducts || isLoadingInitialProduct ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Đang nạp danh sách sản phẩm READY...
                </div>
              ) : readyProducts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <Package className="h-8 w-8 mx-auto text-slate-400 stroke-1" />
                  <p className="text-xs font-semibold text-slate-700">
                    Không có sản phẩm nào ở trạng thái READY
                  </p>
                  <p className="text-2xs text-slate-500 max-w-sm mx-auto">
                    Để tạo phiên đấu giá, bạn cần có ít nhất một sản phẩm đã được chuyển sang
                    trạng thái READY (đã có ảnh và đầy đủ thông tin).
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/seller/products/new"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                    >
                      Tạo sản phẩm mới ngay
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {readyProducts.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(prod);
                        setErrorMessage(null);
                        setIdempotencyKey(generateIdempotencyKey());
                      }}
                      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/30 transition text-left group"
                    >
                      <img
                        src={
                          prod.images?.find((i) => i.isPrimary)?.url ||
                          prod.images?.[0]?.url ||
                          DEFAULT_PRODUCT_PLACEHOLDER
                        }
                        alt={prod.title ?? 'Sản phẩm'}
                        className="h-12 w-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">
                          {prod.title ?? 'Chưa có tiêu đề'}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <ConditionBadge condition={prod.condition} size="sm" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Pricing Setup (BigInt VND) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
              2
            </span>
            <h2 className="text-base font-bold text-slate-900">Thiết lập giá đấu (VND)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Starting Price */}
            <div className="space-y-2">
              <label
                htmlFor="starting-price-input"
                className="text-xs font-semibold text-slate-700 flex items-center justify-between"
              >
                <span>Giá khởi điểm:</span>
                <span className="text-2xs font-bold text-indigo-600">
                  {formatVnd(startingPrice || '0')}
                </span>
              </label>

              <div className="relative">
                <input
                  id="starting-price-input"
                  type="text"
                  inputMode="numeric"
                  value={startingPrice}
                  onChange={(e) => handleStartingPriceChange(e.target.value)}
                  placeholder="1000000"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ₫
                </span>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['500000', '1000000', '5000000', '10000000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleStartingPriceChange(preset)}
                    className="px-2 py-1 text-2xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  >
                    {formatVnd(preset)}
                  </button>
                ))}
              </div>
            </div>

            {/* Bid Increment */}
            <div className="space-y-2">
              <label
                htmlFor="bid-increment-input"
                className="text-xs font-semibold text-slate-700 flex items-center justify-between"
              >
                <span>Bước giá tối thiểu:</span>
                <span className="text-2xs font-bold text-emerald-600">
                  +{formatVnd(bidIncrement || '0')}
                </span>
              </label>

              <div className="relative">
                <input
                  id="bid-increment-input"
                  type="text"
                  inputMode="numeric"
                  value={bidIncrement}
                  onChange={(e) => handleBidIncrementChange(e.target.value)}
                  placeholder="50000"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ₫
                </span>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['50000', '100000', '200000', '500000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleBidIncrementChange(preset)}
                    className="px-2 py-1 text-2xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  >
                    +{formatVnd(preset)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Time Schedule & Demo Presets */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
              3
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Thời gian tổ chức phiên đấu giá
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Start Time */}
            <div className="space-y-2">
              <label
                htmlFor="start-time-input"
                className="text-xs font-semibold text-slate-700 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Thời gian bắt đầu:
                </span>
              </label>

              <input
                id="start-time-input"
                type="datetime-local"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setErrorMessage(null);
                  setIdempotencyKey(generateIdempotencyKey());
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />

              {/* Demo / Testing quick presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-3xs text-slate-400 font-semibold flex items-center gap-0.5">
                  <Zap className="h-3 w-3 text-amber-500" /> Demo:
                </span>
                <button
                  type="button"
                  onClick={() => handlePresetStartTime(1)}
                  className="px-2 py-1 text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-100 transition"
                >
                  +1 phút
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetStartTime(5)}
                  className="px-2 py-1 text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-100 transition"
                >
                  +5 phút
                </button>
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <label
                htmlFor="end-time-input"
                className="text-xs font-semibold text-slate-700 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Thời gian kết thúc:
                </span>
              </label>

              <input
                id="end-time-input"
                type="datetime-local"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setErrorMessage(null);
                  setIdempotencyKey(generateIdempotencyKey());
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />

              {/* Quick End Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-3xs text-slate-400 font-semibold flex items-center gap-0.5">
                  <Clock className="h-3 w-3 text-indigo-500" /> Thời lượng:
                </span>
                <button
                  type="button"
                  onClick={() => handlePresetEndTime(15)}
                  className="px-2 py-1 text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                >
                  +15 phút
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetEndTime(60)}
                  className="px-2 py-1 text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                >
                  +1 giờ
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetEndTime(24 * 60)}
                  className="px-2 py-1 text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                >
                  +1 ngày
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions (Anti double-click) */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
          <Link
            to="/seller/products"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition text-center"
          >
            Hủy bỏ
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || !selectedProduct}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Đang khởi tạo phiên (202 Accepted)...</span>
              </>
            ) : (
              <>
                <Gavel className="h-4 w-4" />
                <span>Tạo phiên đấu giá</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
