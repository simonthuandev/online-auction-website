# Online Auction Web (`online-auction-web`)

Frontend Web client cho hệ thống **Online Auction Platform**, xây dựng bằng React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, Redux Toolkit, và Socket.IO Client.

---

## 1. Yêu cầu & Tech Stack

- **Node.js**: >= 20.x
- **Package Manager**: `npm`
- **Build tool**: Vite + TypeScript
- **Styling**: Tailwind CSS v4 + `@tailwindcss/vite` + `lucide-react`
- **Routing**: `react-router-dom` v7 với Route Guards (`ProtectedRoute`, `RoleRoute`)
- **Server State**: `@tanstack/react-query` v5
- **Client State**: `@reduxjs/toolkit` + `react-redux`
- **HTTP Client**: `axios` với cơ chế Single-Flight Refresh Token (Promise Lock Mutex)
- **Realtime**: `socket.io-client` (Singleton namespaces `/auctions` & `/notifications`)
- **Form & Validation**: `react-hook-form` + `zod`
- **Contract Type Generation**: `openapi-typescript`

---

## 2. Cấu trúc thư mục

```text
online-auction-web/
├── contracts/                  # Contract gốc từ Backend (OpenAPI JSON + socket.json)
├── scripts/
│   └── sync-contracts.mjs      # Script đồng bộ & sinh types tự động
├── src/
│   ├── api/                    # Lớp HTTP client
│   │   └── client.ts           # Axios instance, single-flight refresh token mutex, error envelope
│   ├── components/             # UI Components dùng chung
│   │   └── layout/
│   │       ├── MainLayout.tsx  # Khung layout chính (Header, Main, Footer)
│   │       └── Navbar.tsx      # Thanh điều hướng, menu theo role, placeholder search/bell/user
│   ├── contracts/              # Types tự động sinh từ OpenAPI Backend
│   │   ├── api.generated.ts    # Types hợp nhất của toàn bộ microservices
│   │   ├── openapi/*.json      # Bản sao OpenAPI JSON từ BE
│   │   └── socket.json         # Quy ước sự kiện Socket.IO
│   ├── features/               # Module nghiệp vụ theo domain
│   │   ├── admin/              # Bảng điều khiển Quản trị (Admin Console)
│   │   ├── auctions/           # Danh sách, chi tiết phòng đấu giá, đặt giá realtime
│   │   ├── auth/               # Đăng nhập, đăng ký, hồ sơ cá nhân
│   │   ├── home/               # Trang chủ giới thiệu hệ thống
│   │   ├── notifications/      # Trung tâm thông báo
│   │   ├── orders/             # Quản lý đơn hàng
│   │   └── products/           # Danh mục, sản phẩm, Seller Studio
│   ├── lib/                    # Các utilities & helper lõi
│   │   ├── idempotency.ts      # UUID v4 generator cho header Idempotency-Key
│   │   ├── money.ts            # BigInt VND utilities (formatVnd, compareVnd, addVnd)
│   │   ├── socket.ts           # Singletons auctionSocket & notifSocket
│   │   ├── time.ts             # UTC <-> Local (GMT+7) conversions, countdown
│   │   └── tokenStorage.ts     # Lưu trữ và truy xuất token an toàn
│   ├── routes/
│   │   └── Guards.tsx          # ProtectedRoute, RoleRoute, AnonymousRoute
│   ├── store/                  # Redux Toolkit store (authSlice, uiSlice)
│   ├── App.tsx                 # Cấu hình Router & Routes
│   └── main.tsx                # Bootstrap React app, QueryClient & Socket wiring
├── .env.example                # Mẫu biến môi trường
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Biến môi trường (`.env`)

Sao chép file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

| Biến | Mặc định | Mô tả |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Địa chỉ KrakenD API Gateway |
| `VITE_SOCKET_AUCTION_URL` | `http://localhost:3003/auctions` | WebSocket trực tiếp tới Auction Service |
| `VITE_SOCKET_NOTIF_URL` | `http://localhost:3006/notifications` | WebSocket trực tiếp tới Notification Service |
| `VITE_ENABLE_VNPAY` | `false` | Bật/tắt phương thức thanh toán VNPay |

> **Lưu ý Realtime WebSocket:** KrakenD CE không forward WebSocket. Client kết nối trực tiếp tới cổng service `:3003` và `:3006` với handshake header `auth: { token: accessToken }`.

---

## 4. Hướng dẫn chạy và phát triển

### 4.1 Cài đặt dependencies

```bash
npm install
```

### 4.2 Đồng bộ Types từ Backend Contracts

Khi Backend cập nhật file OpenAPI hoặc WebSocket contract trong `contracts/`:

```bash
npm run contracts:sync
```

Lệnh này sẽ:
1. Sao chép các file `contracts/openapi/*.json` và `contracts/socket.json` vào `src/contracts/`.
2. Hợp nhất paths và schemas từ tất cả microservices (`auth`, `product`, `auction`, `order`, `payment`, `notification`).
3. Tự động sinh `src/contracts/api.generated.ts` với đầy đủ type TypeScript chặt chẽ.

### 4.3 Kiểm tra kiểu dữ liệu (Typecheck) & Lint

```bash
npm run typecheck
npm run lint
```

### 4.4 Chạy môi trường phát triển (Dev)

```bash
npm run dev
```

Truy cập giao diện tại: `http://localhost:5173`.

### 4.5 Build Production

```bash
npm run build
```

---

## 5. Quy ước kỹ thuật cốt lõi

1. **Tiền tệ VND (`src/lib/money.ts`):** Sử dụng chuỗi số nguyên và tính toán hoàn toàn bằng `BigInt`. Không dùng kiểu `number` của JS để tránh mất độ chính xác.
2. **Thời gian (`src/lib/time.ts`):** Mọi thời gian gửi lên API phải ở chuẩn ISO 8601 UTC (`toUtcIso`). Đồng hồ đếm ngược tính trực tiếp từ độ lệch thời gian UTC so với hiện tại.
3. **Idempotency-Key (`src/lib/idempotency.ts`):** Bắt buộc cho `POST /api/auctions`, `POST /api/auctions/{id}/bids`, `POST /api/payments`. Sinh UUID v4 và giữ nguyên key khi user retry do lỗi mạng.
4. **Single-Flight Refresh Token (`src/api/client.ts`):** Axios interceptor tích hợp khóa Promise (Mutex). Khi nhiều request đồng thời nhận `401`, chỉ duy nhất 1 request `POST /api/auth/refresh` được phát đi; các request còn lại chờ token mới rồi tự động replay.
5. **REST là nguồn sự thật, Socket chỉ để cập nhật tức thời:** Khi Socket kết nối lại (`reconnect`), hệ thống tự động kích hoạt `queryClient.invalidateQueries()` để kéo lại dữ liệu mới nhất từ REST.
