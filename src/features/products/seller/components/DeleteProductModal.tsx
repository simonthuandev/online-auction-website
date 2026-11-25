import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface DeleteProductModalProps {
  isOpen: boolean;
  productTitle: string;
  isDeleting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  isOpen,
  productTitle,
  isDeleting = false,
  errorMessage,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-product-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="delete-product-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Xác nhận xóa sản phẩm
              </h3>
              <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Đóng hộp thoại"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            Bạn có chắc chắn muốn xóa sản phẩm{' '}
            <span className="font-bold text-slate-900">&ldquo;{productTitle}&rdquo;</span>?
            Dữ liệu sản phẩm và danh sách ảnh sẽ bị xóa khỏi hệ thống.
          </p>

          {errorMessage && (
            <div
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700"
              role="alert"
            >
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? 'Đang xóa...' : 'Xóa sản phẩm'}
          </button>
        </div>
      </div>
    </div>
  );
};

