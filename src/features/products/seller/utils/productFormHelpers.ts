import { z } from 'zod';
import type {
  CreateProductInput,
  ProductImageInput,
  UpdateProductInput,
} from '../../../../api/product.api.ts';
import type { ProductCondition, ProductStatus } from '../../../../contracts/api.generated.ts';

export const PRODUCT_CONDITION_OPTIONS: ReadonlyArray<{
  value: ProductCondition;
  label: string;
  description: string;
}> = [
  { value: 'NEW', label: 'Mới 100%', description: 'Sản phẩm nguyên hộp, chưa qua sử dụng' },
  { value: 'LIKE_NEW', label: 'Như mới (99%)', description: 'Đã mở hộp hoặc dùng lướt, không trầy xước' },
  { value: 'USED', label: 'Đã sử dụng', description: 'Sản phẩm đã qua sử dụng, còn hoạt động tốt' },
];

export function validateHttpImageUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const productImageItemSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập URL ảnh')
    .max(2048, 'URL ảnh tối đa 2048 ký tự')
    .refine(validateHttpImageUrl, 'URL ảnh phải bắt đầu bằng http:// hoặc https:// hợp lệ'),
  isPrimary: z.boolean(),
});

export const productFormSchema = z.object({
  categoryId: z
    .string()
    .trim()
    .min(1, 'Vui lòng chọn danh mục')
    .uuid('Danh mục không hợp lệ'),
  title: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tiêu đề sản phẩm')
    .max(255, 'Tiêu đề tối đa 255 ký tự'),
  description: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mô tả sản phẩm')
    .max(5000, 'Mô tả tối đa 5000 ký tự'),
  condition: z.enum(['NEW', 'USED', 'LIKE_NEW']),
  images: z
    .array(productImageItemSchema)
    .max(20, 'Tối đa 20 ảnh cho mỗi sản phẩm')
    .superRefine((images, ctx) => {
      // Check duplicate URLs
      const seen = new Map<string, number>();
      let primaryCount = 0;

      images.forEach((img, index) => {
        const normalized = img.url.trim().toLowerCase();
        if (normalized) {
          const prevIndex = seen.get(normalized);
          if (prevIndex !== undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'URL ảnh này bị trùng với ảnh khác',
              path: [index, 'url'],
            });
          } else {
            seen.set(normalized, index);
          }
        }
        if (img.isPrimary) {
          primaryCount += 1;
        }
      });

      if (primaryCount > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Chỉ được chọn tối đa 1 ảnh chính',
          path: ['root'],
        });
      }
    }),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

/**
 * Radio-like primary selection: ensures at most 1 image has isPrimary = true.
 */
export function setPrimaryImageAt(
  images: ProductImageInput[],
  targetIndex: number
): ProductImageInput[] {
  return images.map((img, idx) => ({
    ...img,
    isPrimary: idx === targetIndex,
  }));
}

/**
 * Checks whether a product can transition to READY status.
 * Requires >= 1 image, valid URLs, and exactly 1 primary image.
 */
export function canTransitionToReady(images: ProductImageInput[]): {
  allowed: boolean;
  reason?: string;
} {
  if (!images || images.length === 0) {
    return {
      allowed: false,
      reason: 'Cần ít nhất 1 ảnh và chọn đúng 1 ảnh chính để chuyển sang trạng thái Sẵn sàng đấu giá (READY).',
    };
  }

  const hasInvalidUrl = images.some((img) => !validateHttpImageUrl(img.url));
  if (hasInvalidUrl) {
    return {
      allowed: false,
      reason: 'Tất cả ảnh phải có URL http/https hợp lệ trước khi chuyển sang READY.',
    };
  }

  const primaryCount = images.filter((img) => img.isPrimary).length;
  if (primaryCount !== 1) {
    return {
      allowed: false,
      reason: 'Cần chọn đúng 1 ảnh chính (isPrimary) để chuyển sang trạng thái Sẵn sàng đấu giá (READY).',
    };
  }

  return { allowed: true };
}

/**
 * Checks whether a product status allows editing, status toggling, or deletion.
 */
export function isProductEditable(status?: ProductStatus | string): {
  editable: boolean;
  reason?: string;
} {
  if (!status || status === 'DRAFT' || status === 'READY') {
    return { editable: true };
  }

  switch (status) {
    case 'RESERVED':
      return {
        editable: false,
        reason: 'Sản phẩm đang được giữ chỗ cho một phiên đấu giá nên không thể chỉnh sửa hoặc xóa.',
      };
    case 'IN_AUCTION':
      return {
        editable: false,
        reason: 'Sản phẩm đang trong phiên đấu giá trực tuyến nên không thể chỉnh sửa hoặc xóa.',
      };
    case 'SOLD':
      return {
        editable: false,
        reason: 'Sản phẩm đã được bán thành công nên không thể chỉnh sửa hoặc xóa.',
      };
    default:
      return {
        editable: false,
        reason: `Trạng thái hiện tại (${status}) không cho phép chỉnh sửa hoặc xóa.`,
      };
  }
}

/**
 * Builds strict POST /api/products payload.
 * Never includes sellerId or status (BE sets sellerId from token and status to DRAFT).
 */
export function buildCreateProductPayload(values: ProductFormValues): CreateProductInput {
  const sanitizedImages = normalizeImagesForSubmit(values.images);
  return {
    categoryId: values.categoryId.trim(),
    title: values.title.trim(),
    description: values.description.trim(),
    condition: values.condition,
    images: sanitizedImages,
  };
}

/**
 * Builds strict PATCH /api/products/{id} payload.
 * Always includes full images array for atomic replacement on BE.
 * Only permits status DRAFT or READY when specified.
 */
export function buildUpdateProductPayload(
  values: ProductFormValues,
  targetStatus?: 'DRAFT' | 'READY'
): UpdateProductInput {
  const sanitizedImages = normalizeImagesForSubmit(values.images);
  const payload: UpdateProductInput = {
    categoryId: values.categoryId.trim(),
    title: values.title.trim(),
    description: values.description.trim(),
    condition: values.condition,
    images: sanitizedImages,
  };

  if (targetStatus === 'DRAFT' || targetStatus === 'READY') {
    payload.status = targetStatus;
  }

  return payload;
}

function normalizeImagesForSubmit(images: ProductImageInput[]): ProductImageInput[] {
  let primaryAssigned = false;
  return images.map((img) => {
    const isPrimary = Boolean(img.isPrimary) && !primaryAssigned;
    if (isPrimary) {
      primaryAssigned = true;
    }
    return {
      url: img.url.trim(),
      isPrimary,
    };
  });
}

/**
 * Extracts HTTP status code from ApiError or Axios-like error objects.
 */
export function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  if ('statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
    return (error as { statusCode: number }).statusCode;
  }
  if (
    'response' in error &&
    (error as { response?: { status?: unknown } }).response &&
    typeof (error as { response: { status?: unknown } }).response.status === 'number'
  ) {
    return (error as { response: { status: number } }).response.status;
  }
  return undefined;
}

