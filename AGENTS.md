# Working Agreements & Architecture Rules — Online Auction Web

Repo: `online-auction-web`
Tech stack: **React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + React Router v7 + TanStack Query v5 + Redux Toolkit + Axios + Socket.IO Client**.

---

## 1. Development & Verification Commands

```bash
npm run dev               # Khởi chạy Vite dev server (http://localhost:5173)
npm run typecheck         # Kiểm tra kiểu dữ liệu TypeScript (tsc -b) — BẮT BUỘC CHẠY XANH
npm run lint              # Kiểm tra cú pháp và quy chuẩn lint (eslint .)
npm run build             # Build production bundle (tsc -b && vite build)
npm run contracts:sync    # Đọc contracts/openapi/*.json và sinh src/contracts/api.generated.ts
npm run test:platform     # Chạy smoke test các helper lõi và interceptor
```

> [!IMPORTANT]
> Mọi thay đổi code hoặc trước khi mở PR phải chạy xanh cả `npm run typecheck` và `npm run lint`. Tuyệt đối không commit khi có lỗi TypeScript hoặc ESLint.

---

## 2. Cấu trúc Thư mục Chuẩn (Feature-Based)

```text
src/
├── api/                  # Axios client cấu hình gốc (client.ts), single-flight refresh token mutex
├── contracts/            # api.generated.ts (sinh tự động từ contracts/openapi/*.json)
├── components/           # UI components dùng chung (EmptyState, ErrorBoundary, Button, Modal, Pagination, Badges)
│   ├── common/
│   └── layout/           # MainLayout, Navbar, Footer
├── features/             # Chia module theo domain nghiệp vụ
│   ├── auth/             # components/, hooks/, pages/, mocks/
│   ├── products/
│   ├── auctions/
│   ├── orders/
│   ├── payments/
│   ├── notifications/
│   └── admin/            # Admin Console (Web Only: Categories, Roles, COD Confirm)
├── lib/                  # Helper lõi: money.ts (BigInt), time.ts (UTC), idempotency.ts (UUID v4), socket.ts
├── routes/               # Guards.tsx (ProtectedRoute, RoleRoute), router cấu hình React Router
└── store/                # Redux Toolkit: authSlice.ts, uiSlice.ts
```

---

## 3. Quy chuẩn Lập trình Phòng thủ & Độc lập Backend (BẮT BUỘC)

Frontend phải chạy mượt mà, **không bao giờ bị văng app (zero-crash)** ngay cả khi Backend chưa bật, đang kiểm thử hoặc API trả dữ liệu rỗng:

1. **Null Safety & Safe Navigation:**
   - Luôn dùng Optional Chaining (`?.`) và Nullish Coalescing (`??`) cho mọi dữ liệu lấy từ API.
   - Text fallback: `item.title ?? 'Chưa có tiêu đề'`, `user.name ?? 'Người dùng'`, `product.description || 'Chưa có mô tả'`.
   - List fallback: Luôn fallback mảng rỗng `(data?.items ?? []).map(...)`. Cấm viết `data.items.map(...)`.
   - Money: Không truyền trực tiếp giá trị rỗng vào format tiền: `formatVnd(price ?? '0')` hoặc hiển thị `"0 ₫"`.
   - Date: Kiểm tra tồn tại trước khi parse: `time ? formatLocalTime(time) : 'Chưa cập nhật'`.
   - Image fallback: Luôn có ảnh placeholder mặc định khi `thumbnail` hoặc `avatarUrl` là `null`; gắn handler `onError` để thay bằng ảnh mặc định nếu URL ảnh bị 404/hỏng.
2. **Đủ 4 trạng thái UI chuẩn:**
   - **Loading:** Hiển thị Skeleton hoặc Spinner, không để màn hình trống trơn.
   - **Empty:** Khi mảng rỗng (`items.length === 0`), hiển thị component `EmptyState` với thông điệp rõ ràng: `"Không có dữ liệu"`, `"Chưa có sản phẩm nào"`, v.v.
   - **Error / Offline:** Bắt lỗi kết nối mạng (`ERR_NETWORK`, `ECONNREFUSED`, `500/502/503`). Hiển thị thông báo thân thiện: *"Không thể kết nối đến máy chủ. Vui lòng thử lại sau"* kèm nút **"Thử lại" (Retry)** gọi lại `refetch()`.
   - **Success:** Render dữ liệu với đầy đủ các fallback an toàn.
3. **Mock Data Fixtures:**
   - Khi Backend chưa sẵn sàng, dùng mock fixtures tại `src/features/<feature>/mocks/` làm `initialData` hoặc fallback để dev giao diện độc lập.

---

## 4. Ràng buộc Nghiệp vụ & Khớp Hợp đồng Backend

1. **Contract-First:**
   - Tất cả kiểu dữ liệu DTO/Model lấy từ `src/contracts/api.generated.ts`. Không tự định nghĩa lại types trùng với contract Backend.
   - Không sửa tay file `api.generated.ts`. Khi có thay đổi hợp đồng, cập nhật `contracts/openapi/*.json` rồi chạy `npm run contracts:sync`.
2. **Tiền tệ VND (BigInt):**
   - Tiền tệ là chuỗi số nguyên VND (`string`), không dùng `number` JS để tránh sai số thập phân.
   - Mọi tính toán cộng bước giá, so sánh giá dùng `src/lib/money.ts` (`addVnd`, `compareVnd`).
3. **Thời gian ISO UTC:**
   - Backend lưu và trả ISO UTC. Mọi input gửi lên BE phải đổi qua `.toISOString()`.
4. **Idempotency-Key:**
   - Bắt buộc gắn header `Idempotency-Key` (UUID v4 từ `src/lib/idempotency.ts`) cho `POST /api/auctions`, `POST /api/auctions/{id}/bids`, `POST /api/payments`.
5. **Đăng xuất (`POST /api/auth/logout`):**
   - Phải gửi body `{ refreshToken: string }` trước khi xóa token ở client.
6. **Socket.IO:**
   - **Không đi qua gateway :8080**. Kết nối trực tiếp:
     - `auctionSocket`: `http://localhost:3003/auctions`
     - `notifSocket`: `http://localhost:3006/notifications`
   - Nhớ lọc `payload.version > current.version` trước khi cập nhật state đấu giá.
7. **Người dẫn đầu đấu giá:**
   - Schema `Auction` không có trường `leadingBidderId`. FE xác định người dẫn đầu qua `bids[0]?.bidderId` từ `GET /api/auctions/{id}/bids` hoặc event `auction:bid_updated`. Nếu trùng user hiện tại thì khóa nút bid (tránh 409).

---

## 5. Quy tắc Git & Pull Request

- Branch naming: `feat/<scope>/<issue>-<slug>` (ví dụ: `feat/auction/WEB-AUC-01-auction-list`).
- Commit message: Tuân theo Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`).
- **Merge trực tiếp vào nhánh `main`** qua Pull Request (dự án không dùng nhánh `dev`).
