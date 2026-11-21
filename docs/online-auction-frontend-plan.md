# Kế hoạch thực thi Frontend (Web & Mobile) — Online Auction

> Tài liệu chia việc xây dựng Frontend (Web + Mobile) cho 3 thành viên dựa trên trạng thái Backend MVP sau checkpoint **D7** (Auth, Product, Auction, Order, Payment COD, Notification đã hoàn thiện; VNPay `PAY-04` triển khai ở D9).
>
> **Phân công:**
> - **TV1 (Lead / Web)** — Khởi tạo 2 repo khung (`FD0–FD1`), Auth & Profile, Auction Realtime, Seller tạo Auction, Admin Console (Web).
> - **TV2 (Web)** — Category & Product công khai, Seller quản lý Product, Order, Payment (COD + khung sẵn VNPay), Notification (Web).
> - **TV3 (Mobile — React Native)** — Toàn bộ ứng dụng Mobile song hành theo tiến độ Web (Auth, Explore Product, Auction Room Realtime, Order & COD, Notification). TV3 làm solo Mobile dựa trên kinh nghiệm React Native thực tế, lược bỏ bớt các phần nặng quản trị (Admin Console, Seller Studio phức tạp).
>
> Mã issue dạng `[WEB-AUC-01]`, `[MOB-AUC-01]` dùng làm title; "Ngày" (`FD0`…`FD8`) là **một checkpoint merge**, không ép cứng 24 giờ. Issue chỉ bắt đầu khi dependency **hard** đã merge vào `main` (dự án merge trực tiếp vào `main`, không dùng branch `dev`).

---

## 1. Quy tắc làm việc & Kiến trúc đảm bảo Scale

### 1.1 Quy tắc git & Definition of Done
- **Một issue = một owner = một PR**; reviewer là thành viên khác. Branch: `feat/<scope>/<mã-issue>-<slug>` (ví dụ: `feat/auction/WEB-AUC-02-realtime-bid`). Merge trực tiếp vào `main` qua GitHub PR sau khi CI chạy xanh.
- **Phụ thuộc:** **Hard** = phải merge trước (cần bộ khung/module của issue kia); **Soft** = chỉ cần khi kiểm chứng chéo Web ↔ Mobile (vẫn code và test độc lập với Backend thật trước được).
- **Definition of Done (mọi issue Frontend):**
  1. Đúng tính năng cốt lõi, gọi đúng endpoint và khớp 100% schema trong `contracts/openapi/*.json` & `contracts/socket.json` của Backend.
  2. Không gọi `axios` trực tiếp trong component UI; mọi giao tiếp mạng đi qua `src/api/*.api.ts` và custom hooks trong `src/features/*/hooks/`.
  3. Xử lý đủ 4 trạng thái UI: `loading`, `empty` (hiển thị component `EmptyState` với text "Không có dữ liệu" hoặc mô tả ngữ cảnh phù hợp), `error` (bắt lỗi mạng, timeout, hoặc error envelope của BE; có nút Thử lại), `success`. Tuyệt đối áp dụng lập trình phòng thủ (null safety, `?.`, `??`), không để văng app khi dữ liệu API null/undefined hoặc khi Backend chưa bật.
  4. Không hard-code URL/secret; cấu hình qua `.env` (`.env.example` được cập nhật nếu thêm biến mới).
  5. Chạy xanh `npm run typecheck`, `npm run lint`, và `npm run build` (Web) / khởi chạy không lỗi trên Emulator hoặc Expo Go (Mobile).
- **Thiết kế giao diện (UI/UX):** Do từng owner chủ động thiết kế (màu sắc, bố cục), miễn đảm bảo đủ tính năng cốt lõi, dễ thao tác (responsive trên Web, chuẩn safe-area/keyboard trên Mobile) và đạt toàn bộ tiêu chí nghiệm thu của từng issue.

### 1.2 Tech Stack đã chốt

| Hạng mục | Web (`online-auction-web`) | Mobile (`online-auction-mobile`) | Lý do chọn |
| --- | --- | --- | --- |
| **Core** | **Vite + React (Function + Hooks) + TypeScript** | **Expo (Managed Workflow) + React Native + TypeScript** | Build nhanh, TypeScript phát hiện ngay điểm gãy khi Backend sửa contract |
| **Styling** | **Tailwind CSS** + `lucide-react` | **NativeWind** *(hoặc `StyleSheet` chuẩn theo sở trường TV3)* | Tailwind thay Bootstrap vì màn đấu giá realtime cần tùy biến badge, countdown, highlight nhảy giá linh hoạt và gọn nhẹ |
| **Routing** | **React Router (`react-router-dom` v6/v7)** | **React Navigation** (Native Stack + Bottom Tabs) | Chuẩn hiện đại, hỗ trợ Route Guard theo role và Deep Linking dễ dàng |
| **Server State** | **TanStack Query (React Query)** | **TanStack Query (React Query)** | Quản lý cache, phân trang, infinite scroll, refetch khi reconnect; tránh nhồi dữ liệu API vào Redux |
| **Client State** | **Redux Toolkit (RTK)** *(gọn: `auth`, `socketStatus`, `ui`)* | **Redux Toolkit (RTK)** *(hoặc Context nhẹ cho `auth`)* | Đúng định hướng nhóm, giữ store tinh gọn, đồng nhất giữa Web và Mobile |
| **HTTP & Realtime** | **Axios** + **`socket.io-client`** | **Axios** + **`socket.io-client`** | Dễ gắn interceptor single-flight refresh token và header `Idempotency-Key` |
| **Form & Validate** | **React Hook Form + Zod** | **React Hook Form + Zod** | Chia sẻ được schema validate (tiền nguyên dương, URL ảnh, thời gian) giữa Web & Mobile |
| **Contract Sync** | **`openapi-typescript`** | **`openapi-typescript`** (dùng chung file sinh từ OpenAPI) | Chìa khóa để maintain: khi BE thay đổi API, chạy 1 lệnh sync types → TypeScript báo đỏ chính xác những chỗ cần cập nhật |

### 1.3 Cấu trúc thư mục chuẩn (Feature-based, đồng bộ giữa 2 repo)

```text
src/
├── api/                  # Lớp gọi API thô: client.ts, auth.api.ts, product.api.ts, auction.api.ts...
├── contracts/            # Copy contracts/openapi/*.json từ BE + file api.generated.ts
├── features/             # Chia theo đúng 6 domain của Backend để dễ đối chiếu
│   ├── auth/             # components/, hooks/, pages/ (hoặc screens/)
│   ├── products/
│   ├── auctions/
│   ├── orders/
│   ├── payments/
│   ├── notifications/
│   └── admin/            # Chỉ có ở Web
├── lib/                  # socket.ts, money.ts (BigInt VND), time.ts (UTC -> GMT+7), idempotency.ts
├── store/                # authSlice.ts, uiSlice.ts (Redux Toolkit)
├── components/           # UI dùng chung (Button, Modal, Pagination, StatusBadge, EmptyState)
└── routes/               # (hoặc navigation/ trên Mobile)
```

---

## 2. Quy ước kỹ thuật Frontend bắt buộc (đối chiếu chặt chẽ Backend sau D7)

1. **Tiền tệ là `string` số nguyên VND (dùng `BigInt`, không dùng `number` JS):** Backend quy định tiền tệ là chuỗi số nguyên VND (`pattern: ^(0|[1-9][0-9]{0,15})$`) và validate `> 0`. Dùng helper `src/lib/money.ts` (`BigInt`) để so sánh và cộng bước giá (`currentPrice + bidIncrement`), format hiển thị (`1.500.000 ₫`), khi gửi lên API luôn chuyển lại thành `string`.
2. **Giờ UTC ↔ Local (GMT+7):** Backend lưu và trả thời gian dạng ISO UTC (`date-time`). Mọi input chọn `startTime`/`endTime` phải đổi sang ISO UTC (`toISOString()`) trước khi gửi; đồng hồ đếm ngược tính hiệu số trực tiếp từ timestamp UTC so với giờ hiện tại.
3. **`Idempotency-Key` bắt buộc cho các POST quan trọng:** `POST /api/auctions`, `POST /api/auctions/{id}/bids`, `POST /api/payments` đều yêu cầu header `Idempotency-Key` (chuỗi 8–128 ký tự, khuyến nghị UUID v4). Mỗi lượt thao tác sinh 1 UUID; giữ nguyên key nếu request bị timeout và user bấm thử lại cùng dữ liệu đó; chỉ tạo key mới khi đổi dữ liệu hoặc bắt đầu lượt mới.
4. **Single-Flight Refresh Token (chống race condition):** Backend `AUTH-03` chặn hai request refresh dùng cùng một token và thu hồi cả token family nếu phát hiện tái sử dụng token cũ. Axios interceptor **bắt buộc có khóa promise (mutex)**: nhiều request song song cùng nhận `401` chỉ phát **đúng 1** request `POST /api/auth/refresh`, các request còn lại chờ token mới rồi replay.
5. **Đăng xuất (`POST /api/auth/logout`) bắt buộc gửi refreshToken trong body:** Schema backend yêu cầu `{ "refreshToken": "..." }`. Khi user đăng xuất, FE phải lấy `refreshToken` gửi lên BE trước, sau đó mới xóa token trong local storage / SecureStore và ngắt kết nối socket.
6. **Đổi Role có hiệu lực ở lần refresh/login kế tiếp:** Access token sống 15 phút vẫn mang role cũ; khi Admin đổi role cho user, chỉ cần refresh token hoặc đăng nhập lại là nhận role mới.
7. **REST là nguồn sự thật, Socket chỉ để cập nhật tức thời & phải lọc `version`:**
   - Các sự kiện socket: `auction:bid_updated`, `auction:status_changed`, `notification:new`.
   - `Auction.version` tăng `+1` sau mỗi event `started`, `bid`, `ended`. UI phòng đấu giá **chỉ cập nhật state khi `incoming.version > current.version`** để tránh gói tin đến trễ ghi đè giá mới hơn.
   - Khi Socket mất kết nối rồi nối lại (`reconnect`), luôn gọi `queryClient.invalidateQueries` để đồng bộ lại từ REST.
8. **Socket kết nối thẳng vào service ports, KHÔNG đi qua KrakenD:**
   - Namespace `/auctions` kết nối trực tiếp cổng Auction Service (`http://localhost:3003/auctions`).
   - Namespace `/notifications` kết nối trực tiếp cổng Notification Service (`http://localhost:3006/notifications`).
   - KrakenD CE không forward WebSocket. Frontend cấu hình 2 biến môi trường riêng: `VITE_SOCKET_AUCTION_URL` và `VITE_SOCKET_NOTIF_URL`.
   - Token truyền qua `auth: { token: accessToken }`. Khi token hết hạn, server tự disconnect; client refresh token và reconnect.
9. **Nhận diện Người dẫn đầu (`leadingBidderId`) & Người thắng (`winnerId`):**
   - Trong `contracts/openapi/auction.json`, schema `Auction` **không chứa trường `leadingBidderId`** (trường này chỉ nằm trong DB nội bộ của Auction Service).
   - FE xác định người đang dẫn đầu phiên đấu giá bằng cách: lấy `bidderId` của bid đầu tiên trong danh sách `GET /api/auctions/{id}/bids` (danh sách được BE sắp xếp mới nhất lên đầu: `bids[0].bidderId`), hoặc từ trường `bidderId` của payload sự kiện realtime `auction:bid_updated`.
   - So sánh `bids[0]?.bidderId === currentUser?.id`: nếu trùng thì hiển thị badge *"Bạn đang dẫn đầu"* và **khóa nút Bid** để tránh gửi request bị Backend trả lỗi `409 CONFLICT`.
   - Khi phiên chuyển sang `ENDED`, schema `Auction` trả về `winnerId` và `finalPrice`.
10. **Trạng thái hủy Auction & Fallback UI:**
    - Schema `Auction` trả về `status: 'CANCELLED'` nếu worker không giữ được hàng, nhưng không chứa trường `initializationError` trong OpenAPI. FE bắt `status === 'CANCELLED'` và hiển thị thông báo thân thiện: *"Phiên đấu giá bị hủy do không thể giữ sản phẩm hoặc xảy ra xung đột"*.
11. **Chi tiết Đơn hàng & Thời gian thanh toán:**
    - Schema `Order` trong `contracts/openapi/order.json` chứa: `id, auctionId, productId, buyerId, sellerId, totalAmount, currency, status, productTitle, productThumbnail`. Enum status gồm 4 trạng thái: `PENDING_PAYMENT`, `PAID`, `CANCELLED`, `COMPLETED`.
    - `Order` không chứa trường `paidAt` trong OpenAPI. FE nhận biết đơn đã thanh toán qua `order.status === 'PAID'` (hoặc `COMPLETED`). Nếu cần hiển thị thời gian thanh toán cụ thể, FE gọi `GET /api/payments/order/{orderId}` (trả về thông tin Payment đã `SUCCESS`).
12. **Ánh xạ Lỗi Database sang HTTP từ Backend:**
    - Unique constraint vi phạm → `409 CONFLICT` (ví dụ: tạo 2 auction cùng 1 sản phẩm, người dẫn đầu tự bid tiếp).
    - Foreign key / quan hệ sai → `409 CONFLICT`.
    - CHECK constraint vi phạm → `400 INVALID_REQUEST` (ví dụ: `startingPrice <= 0`, `bidIncrement <= 0`, `endTime <= startTime`).
    - Bản ghi không tìm thấy → `404 NOT_FOUND`.
    - Backend trả Error envelope chuẩn: `{ "code": "...", "message": "...", "requestId": "..." }`. FE hiển thị trực tiếp `error.response.data.message`.

### 2.1 Quy chuẩn Lập trình Phòng thủ & Độc lập Backend (Defensive UI, Mock Fixtures & Crash Prevention)

Nhằm đảm bảo Web và Mobile có thể phát triển giao diện hoàn toàn độc lập, mượt mà ngay cả khi Backend đang kiểm thử, chưa khởi động Docker hoặc API trả dữ liệu thiếu/rỗng:

1. **Nguyên tắc "Zero-Crash" (Null Safety & Safe Navigation):**
   - **Luôn dùng Optional Chaining (`?.`) và Nullish Coalescing (`??`)** khi render dữ liệu từ API:
     - **Chuỗi văn bản:** `item.title ?? 'Chưa có tiêu đề'`, `user.name ?? 'Người dùng'`, `product.description || 'Chưa có mô tả'`.
     - **Mảng danh sách:** Luôn fallback mảng rỗng: `(data?.items ?? []).map(...)`. Tuyệt đối không viết `data.items.map(...)` dẫn đến lỗi trắng trang `TypeError: Cannot read properties of undefined (reading 'map')`.
     - **Giá trị số / Tiền tệ:** Không truyền trực tiếp giá trị chưa kiểm tra vào hàm format tiền: dùng `formatVnd(price ?? '0')` hoặc hiển thị `"0 ₫"` / `"Chưa có giá"`.
     - **Ngày tháng / Thời gian:** Kiểm tra `time ? formatLocalTime(time) : 'Chưa xác định'`, không để hàm parse date nhận `null/undefined` gây lỗi runtime `Invalid Date`.
     - **Ảnh & Avatar & Thumbnail:** Luôn có ảnh placeholder mặc định khi `thumbnail` hoặc `avatarUrl` là `null`; gắn handler `onError` để fallback ảnh mặc định nếu URL ảnh bị hỏng/404.
2. **Chuẩn hóa 4 trạng thái giao diện (Loading, Empty, Error, Success):**
   - **Loading State:** Sử dụng Skeleton hoặc Spinner mượt mà; tuyệt đối không để màn hình trống trơn khi đang nạp dữ liệu.
   - **Empty State:** Khi danh sách rỗng (`items.length === 0`) hoặc object không có dữ liệu, hiển thị component `EmptyState` dùng chung với icon trực quan và thông điệp thân thiện: *"Không có dữ liệu"*, *"Chưa có sản phẩm nào"*, *"Chưa có lượt đặt giá nào"*, v.v. (kèm nút thao tác bổ sung nếu có).
   - **Error / Offline State:** Khi Backend chưa bật, mất mạng (`ERR_NETWORK`, `ECONNREFUSED`) hoặc server lỗi (`500/502/503`), không throw unhandled error. Hiển thị thông báo thân thiện: *"Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau"* kèm nút **"Thử lại" (Retry)** gọi lại `refetch()`.
   - **Success State:** Render dữ liệu với đầy đủ các fallback an toàn.
3. **Chiến lược Mock Fixtures (Hỗ trợ code UI độc lập không cần bật Backend):**
   - Mỗi domain tạo sẵn file mock fixtures nhẹ (`src/features/<feature>/mocks/<feature>.mock.ts`) tuân thủ đúng schema trong `api.generated.ts`.
   - Khi Backend chưa chạy hoặc dev muốn code giao diện nhanh: có thể dùng mock data làm `initialData` / `placeholderData` trong TanStack Query hoặc trả về từ service mock, đảm bảo team xem được toàn bộ layout, tương tác UI và responsive mà không bị phụ thuộc vào việc bật Docker stack backend.
4. **ErrorBoundary bảo vệ cấp độ Trang:**
   - Mọi Route chính (Web) và Screen chính (Mobile) phải được bọc trong `ErrorBoundary`. Nếu một component con gặp lỗi render bất ngờ, ErrorBoundary sẽ hiển thị màn hình fallback cứu hộ thay vì làm sập toàn bộ ứng dụng.

---

## 3. Phân định Scope Web vs Mobile & Lưu ý đặc thù OS cho TV3

| Nhóm tính năng | Web (TV1 & TV2) | Mobile (TV3) | Lưu ý kỹ thuật / OS cho TV3 (React Native) |
| --- | --- | --- | --- |
| Auth & Profile | Đầy đủ | Đầy đủ | Lưu `accessToken` / `refreshToken` bằng **`expo-secure-store`** (Keychain/Keystore), **không dùng `AsyncStorage`**. Có Splash Screen khôi phục phiên khi mở app |
| Khám phá SP & Đấu giá | Đầy đủ (Filter + Pagination) | Đầy đủ | Dùng `FlatList` với **Infinite Scroll (`onEndReached`)** và **Pull-to-Refresh (`RefreshControl`)** thay cho phân trang số `1 2 3` |
| Phòng đấu giá Realtime & Đặt Bid | Đầy đủ | **Đầy đủ (ưu tiên cao nhất)** | Bọc thanh đặt giá bằng `KeyboardAvoidingView` + `SafeAreaView` (không bị bàn phím che nút Bid); gắn **Haptic Feedback** khi bid thành công / bị `OUTBID`; lắng nghe **`AppState`** (`background → active`) + **`NetInfo`** để reconnect Socket & refetch REST vì iOS/Android ngắt socket khi app xuống nền |
| Đơn hàng & Thanh toán COD | Đầy đủ (Buyer + Seller) | Đầy đủ (xem đơn + tạo COD) | Cấu hình sẵn **Deep Linking** (scheme `auctionapp://payment-return`, `auctionapp://orders/:id`) để D9 cắm luồng VNPay quay lại đúng app |
| Thông báo Realtime | Chuông + Dropdown + Trang riêng | Tab riêng + Badge + In-app Banner | Khi app đang mở và nhận `notification:new`, hiện toast/banner kèm rung nhẹ; bấm vào nhảy thẳng tới màn hình Auction/Order theo `metadata` |
| Seller tạo/sửa Product & tạo Auction | **Đầy đủ (Web làm chính)** | **Rút gọn / Giai đoạn 2** | Form nhập nhiều URL ảnh + chọn giờ chi tiết trên mobile kém tiện; MVP Mobile tập trung trải nghiệm **Buyer** và **Seller theo dõi trạng thái** |
| Admin Console (Category, Role, COD confirm) | **Web Only** | **Bỏ qua** | Nghiệp vụ quản trị dùng trên desktop, không đưa lên Mobile |
| Kết nối mạng Dev Local | `http://localhost:8080` (REST), `http://localhost:3003` & `:3006` (Socket) | **Khác biệt theo môi trường chạy** | Android Emulator: `http://10.0.2.2:PORT`; iOS Simulator: `http://localhost:PORT`; thiết bị thật: IP LAN. Android dev cần bật `usesCleartextTraffic` khi dùng HTTP |

---

## 4. Backlog chi tiết

### Epic `[FE-PLAT]` — Khởi tạo 2 Repo & Bộ khung chuẩn (`FD0–FD1`, TV1 đảm nhận)

| | |
| --- | --- |
| **Owner** | TV1 |
| **Điều kiện đóng epic** | 2 issue Done; cả 3 thành viên clone và chạy xanh Web + Mobile nối được vào Backend local |

#### `[FE-PLAT-01]` Khởi tạo Repo Web (`online-auction-web`) + Chuẩn hóa Gateway CORS

| | |
| --- | --- |
| **Owner / Ngày** | **TV1** / **FD0** |
| **Phụ thuộc** | Hard: Backend hoàn thành tới D7 |
| **Đầu ra** | Repo `online-auction-web`, `README.md`, `src/api/client.ts`, `src/lib/*`, `src/store/*`, `src/contracts/*`, cập nhật CORS ở BE (nếu thiếu) |

**Task**
- Kiểm tra cấu hình CORS tại `krakend/krakend.json` và socket facade ở repo Backend: cho phép origin `http://localhost:5173`, các method `GET/POST/PATCH/PUT/DELETE/OPTIONS`, và các header `Authorization`, `Content-Type`, `Idempotency-Key`.
- Khởi tạo **Vite + React + TypeScript + Tailwind CSS + ESLint/Prettier**.
- Cài đặt: `react-router-dom`, `@tanstack/react-query`, `@reduxjs/toolkit`, `react-redux`, `axios`, `socket.io-client`, `react-hook-form`, `zod`, `lucide-react`, `openapi-typescript`.
- Tạo script `npm run contracts:sync`: đọc `contracts/openapi/*.json` (copy vào `src/contracts/openapi/`) và sinh `src/contracts/api.generated.ts`.
- Dựng sẵn 5 module lõi dùng chung cho TV1 & TV2:
  1. `src/api/client.ts`: Axios baseURL từ `VITE_API_BASE_URL` (gateway `:8080`), gắn Bearer token, cơ chế **single-flight refresh token** khi gặp `401` (logout sạch nếu refresh thất bại), chuẩn hóa error envelope của BE.
  2. `src/lib/socket.ts`: **2 socket singleton** — `auctionSocket` (`VITE_SOCKET_AUCTION_URL` → `http://localhost:3003/auctions`) và `notifSocket` (`VITE_SOCKET_NOTIF_URL` → `http://localhost:3006/notifications`) theo `contracts/socket.json`; gửi token xác thực qua `auth.token`; tự reconnect và kích hoạt invalidate query.
  3. `src/lib/money.ts` & `src/lib/time.ts`: `formatVnd`, `compareVnd`, `addVnd` (dùng `BigInt`), `toUtcIso`, `formatLocalTime`, `getRemainingMs`.
  4. `src/lib/idempotency.ts`: sinh UUID v4 cho header `Idempotency-Key`.
  5. `src/routes/Guards.tsx` & `MainLayout`: `ProtectedRoute`, `RoleRoute` (`SELLER`, `ADMIN`), khung Navbar (tìm kiếm, menu theo role, placeholder Chuông thông báo & User menu).
- Tạo `.env.example` (`VITE_API_BASE_URL`, `VITE_SOCKET_AUCTION_URL`, `VITE_SOCKET_NOTIF_URL`, `VITE_ENABLE_VNPAY=false`) và `README.md` hướng dẫn chạy local.

**Nghiệm thu**
- `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run build` pass.
- Gọi thử `GET /api/categories` và `POST /api/auth/login` bằng tài khoản seed qua gateway `:8080` không dính lỗi CORS.
- Gọi thử socket `http://localhost:3003/auctions` và `http://localhost:3006/notifications` từ browser không lỗi CORS/origin.
- Test giả lập 3 request song song hết hạn access token: chỉ phát **đúng 1** request `POST /api/auth/refresh`, cả 3 request cũ tự replay thành công.

---

#### `[FE-PLAT-02]` Khởi tạo Repo Mobile (`online-auction-mobile`) cho TV3

| | |
| --- | --- |
| **Owner / Ngày** | **TV1** / **FD1** |
| **Phụ thuộc** | Hard: `FE-PLAT-01` (tái sử dụng `api.generated.ts`, `money.ts`, `time.ts`, logic Axios/Socket) |
| **Đầu ra** | Repo `online-auction-mobile`, `README.md`, `src/api/*`, `src/lib/*`, `src/navigation/*`, `src/storage/tokenStorage.ts` |

**Task**
- Khởi tạo **Expo (TypeScript template)**, cài đặt: `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `react-native-safe-area-context`, `react-native-screens`, `@tanstack/react-query`, `@reduxjs/toolkit`, `react-redux`, `axios`, `socket.io-client`, `expo-secure-store`, `@react-native-community/netinfo`, `expo-haptics`, `react-hook-form`, `zod` (và `nativewind` nếu thống nhất dùng với TV3).
- Đồng bộ `src/contracts/api.generated.ts`, `src/lib/money.ts`, `src/lib/time.ts`, `src/lib/idempotency.ts` từ repo Web.
- Xây `src/storage/tokenStorage.ts` dùng **`expo-secure-store`** lưu `accessToken` và `refreshToken`.
- Xây `src/api/client.ts` (single-flight refresh token đọc/ghi qua `tokenStorage`).
- Xây `src/lib/socket.ts` tích hợp **`AppState` + `NetInfo`**: khi app chuyển từ `background/inactive → active` hoặc mạng phục hồi thì tự reconnect socket và gọi `queryClient.invalidateQueries()`. **2 socket instance** giống Web: `auctionSocket` và `notifSocket`.
- Xây khung điều hướng `RootNavigator`:
  - `AuthStack`: `Login`, `Register`.
  - `MainTabs`: `Explore`, `Auctions`, `Orders`, `Notifications`, `Profile` + Detail Stack (`ProductDetail`, `AuctionRoom`, `OrderDetail`).
- Cấu hình `app.json`: Deep Link scheme `"auctionapp"`, bật `usesCleartextTraffic: true` cho Android dev mode.
- Viết `README.md` ghi rõ cấu hình `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SOCKET_AUCTION_URL`, `EXPO_PUBLIC_SOCKET_NOTIF_URL` cho Android Emulator (`10.0.2.2`), iOS Simulator (`localhost`) và máy thật (IP LAN).

**Nghiệm thu**
- App chạy lên được trên Expo Go / Emulator với khung 5 Tabs placeholder.
- Gọi thử `GET /api/categories` tới Backend local thành công từ máy ảo/điện thoại.
- TV3 chỉ cần `npm install && npx expo start` là có thể bắt đầu code nghiệp vụ ngay từ `FD2`.

---

### Epic `[FE-AUTH]` — Xác thực, Phiên đăng nhập & Hồ sơ (`FD2`)

#### `[WEB-AUTH-01]` Luồng Auth (Login/Register/Logout) & Trang Hồ sơ cá nhân

| | |
| --- | --- |
| **Owner / Ngày** | **TV1** / **FD2** |
| **Phụ thuộc** | Hard: `FE-PLAT-01` |
| **Đầu ra** | `src/api/auth.api.ts`, `src/features/auth/*` (`LoginPage`, `RegisterPage`, `ProfilePage`) |

**Task & API**
- **Đăng nhập (`/login`) & Đăng ký (`/register`):** gọi `POST /api/auth/login`, `POST /api/auth/register`. Đăng nhập xong gọi `GET /api/auth/me` để nạp hồ sơ và role; hỗ trợ quay lại trang trước đó (`redirect`).
- **Đăng xuất:** lấy `refreshToken` gửi `POST /api/auth/logout` với body `{ refreshToken }`, sau đó xóa token khỏi storage, ngắt cả **2 socket** (auctionSocket & notifSocket), xóa toàn bộ cache TanStack Query (`queryClient.clear()`).
- **Trang Hồ sơ (`/profile`, protected):**
  - Hiển thị thông tin từ `GET /api/auth/me` (email và role chỉ đọc, không cho sửa).
  - Form cập nhật gọi `PATCH /api/auth/me`: chỉ gửi `name` (1–100 ký tự) và `avatarUrl` (`null` hoặc URL `http/https` ≤ 2048 ký tự); khóa nút Lưu khi form chưa thay đổi để tránh gửi body rỗng (BE trả `400`).
  - Xem trước avatar theo URL nhập vào (có ảnh mặc định fallback nếu URL lỗi).
- Xử lý tài khoản bị khóa (`isActive=false` → `401`): đăng xuất sạch, đẩy về `/login` kèm thông báo.

**Nghiệm thu**
- Reload (F5) vẫn giữ trạng thái đăng nhập; vào route protected hoặc route sai role bị chặn đúng.
- Cập nhật `name`/`avatarUrl` thành công, reload vẫn giữ giá trị mới; validate đúng lỗi ở client và hiển thị thông báo rõ khi BE trả `400`.
- Đăng xuất gửi đúng body `{ refreshToken }`, BE thu hồi session trong DB và không báo `400`.

---

#### `[MOB-AUTH-01]` Auth Stack, Khôi phục phiên & Hồ sơ Mobile

| | |
| --- | --- |
| **Owner / Ngày** | **TV3** / **FD2** |
| **Phụ thuộc** | Hard: `FE-PLAT-02` |
| **Đầu ra** | `src/api/auth.api.ts`, `src/features/auth/*` (`SplashScreen`, `LoginScreen`, `RegisterScreen`, `ProfileScreen`) |

**Task & API**
- **Splash / Bootstrap:** khi mở app, đọc token từ `SecureStore` → gọi `GET /api/auth/me` (interceptor tự refresh nếu access token hết hạn) → vào `MainTabs` hoặc `AuthStack`.
- **LoginScreen / RegisterScreen:** gọi `POST /api/auth/login`, `POST /api/auth/register`. Bọc `KeyboardAvoidingView` + `ScrollView` (`keyboardShouldPersistTaps="handled"`), hỗ trợ ẩn/hiện mật khẩu.
- **ProfileScreen:** hiển thị hồ sơ từ `GET /api/auth/me`, badge Role, form cập nhật `name` & `avatarUrl` qua `PATCH /api/auth/me`, nút Đăng xuất lấy `refreshToken` gửi `POST /api/auth/logout` rồi xóa `SecureStore` + disconnect cả 2 socket + clear cache.

**Nghiệm thu**
- Tắt hẳn app mở lại vẫn giữ phiên đăng nhập; logout xong mở lại vào màn Login.
- Sửa hồ sơ trên Mobile đồng bộ thấy ngay khi kiểm tra trên Web.

---

### Epic `[FE-CAT]` — Danh mục & Sản phẩm (`FD3–FD4`)

#### `[WEB-PROD-01]` Khám phá Danh mục & Sản phẩm công khai

| | |
| --- | --- |
| **Owner / Ngày** | **TV2** / **FD3** |
| **Phụ thuộc** | Hard: `FE-PLAT-01` |
| **Đầu ra** | `src/api/product.api.ts`, `src/features/products/*` (`ProductListPage`, `ProductDetailPage`) |

**Task & API** *(endpoint: `GET /api/categories`, `GET /api/categories/{id}`, `GET /api/products`, `GET /api/products/{id}`)*
- **Danh sách sản phẩm (`/products`, public):**
  - Lấy danh mục qua `GET /api/categories` (`page`, `pageSize`, `search`).
  - Gọi `GET /api/products` hỗ trợ lọc `categoryId`, `status`, `search` (debounce 300–400ms), phân trang `page`/`pageSize`. Đồng bộ filter lên URL (`useSearchParams`) để share link/F5 không mất trạng thái.
  - Hiển thị ảnh primary, tên, danh mục, tình trạng (`condition`: `NEW`, `USED`, `LIKE_NEW`), badge trạng thái (`READY`, `RESERVED`, `IN_AUCTION`, `SOLD`; lưu ý list public không trả `DRAFT`).
- **Chi tiết sản phẩm (`/products/:id`, public):**
  - Gọi `GET /api/products/{id}` (trả mọi trạng thái kể cả `DRAFT`, kèm `category` và mảng `images`).
  - Gallery xem nhiều ảnh, thông tin mô tả, trạng thái.
  - Nếu là đúng `SELLER` chủ sở hữu và sản phẩm đang `DRAFT`/`READY`: hiện nút sang trang Sửa sản phẩm hoặc Tạo phiên đấu giá.

**Nghiệm thu**
- Khách chưa đăng nhập duyệt, lọc, tìm kiếm và xem chi tiết bình thường; sản phẩm không tồn tại (`404`) có màn hình Not Found rõ ràng.

---

#### `[WEB-PROD-02]` Seller Studio — Tạo, Sửa, Xóa Sản phẩm & Quản lý Ảnh

| | |
| --- | --- |
| **Owner / Ngày** | **TV2** / **FD4** |
| **Phụ thuộc** | Hard: `WEB-PROD-01`, `WEB-AUTH-01` |
| **Đầu ra** | `src/features/products/seller/*` (`ProductFormPage`, `SellerProductsPage`) |

**Task & API** *(endpoint: `POST /api/products`, `PATCH /api/products/{id}`, `DELETE /api/products/{id}`)*
- Route chỉ dành cho `SELLER` (`/seller/products/new`, `/seller/products/:id/edit`).
- **Tạo sản phẩm (`POST /api/products`):** chọn Category từ `GET /api/categories`, nhập tiêu đề, mô tả, tình trạng (`condition`: `NEW`, `USED`, `LIKE_NEW`), mảng ảnh (URL + tick chọn `isPrimary`). Không gửi `sellerId` (BE tự lấy từ token).
- **Validate luật nghiệp vụ ngay trên Form:**
  - Tối đa **1** ảnh `isPrimary=true` (chọn ảnh mới làm primary tự bỏ tick ảnh cũ để tránh `400`).
  - Chuyển sang `READY` yêu cầu `≥ 1` ảnh và đúng `1` ảnh primary.
- **Sửa (`PATCH /api/products/{id}`) & Xóa (`DELETE /api/products/{id}`):**
  - Chỉ mở thao tác Sửa/Xóa/Đổi trạng thái `DRAFT ↔ READY` khi sản phẩm đang `DRAFT` hoặc `READY`. Nếu `RESERVED`/`IN_AUCTION`/`SOLD`, khóa thao tác kèm thông báo giải thích (tránh `409`).
  - Khi sửa ảnh: luôn gửi **toàn bộ** mảng ảnh mới (BE thay thế cả mảng trong một transaction).
- **Hỗ trợ UX cho `DRAFT`:** vì `GET /api/products` ẩn `DRAFT`, sau khi tạo xong điều hướng thẳng tới `/products/:id` (và có thể lưu danh sách ID nháp gần đây vào `localStorage` của seller để dễ mở lại).

**Nghiệm thu**
- Tạo `DRAFT` → thêm ảnh → chuyển `READY` thành công và xuất hiện trong danh sách công khai.
- Truy cập sửa/xóa sản phẩm của seller khác xử lý `403` tử tế; sản phẩm đang `IN_AUCTION` bị khóa sửa/xóa.

---

#### `[MOB-PROD-01]` Khám phá & Chi tiết Sản phẩm trên Mobile

| | |
| --- | --- |
| **Owner / Ngày** | **TV3** / **FD3–FD4** |
| **Phụ thuộc** | Hard: `FE-PLAT-02` · Soft: `WEB-PROD-02` |
| **Đầu ra** | `src/api/product.api.ts`, `src/features/products/*` (`ExploreScreen`, `ProductDetailScreen`) |

**Task & API** *(endpoint: `GET /api/categories`, `GET /api/products`, `GET /api/products/{id}`)*
- **ExploreScreen:** thanh Category cuộn ngang (`FlatList horizontal`) từ `GET /api/categories`; ô tìm kiếm có debounce + lọc trạng thái gọi `GET /api/products` bằng `useInfiniteQuery`; hỗ trợ `RefreshControl` (kéo làm mới) và `onEndReached` (tải thêm trang).
- **ProductDetailScreen:** gọi `GET /api/products/{id}`, carousel ảnh vuốt ngang, thông tin chi tiết và badge trạng thái.
- *(Scope Mobile)*: Không cần làm form tạo/sửa sản phẩm Seller ở MVP này.

**Nghiệm thu**
- Cuộn danh sách mượt, không lặp item khi tải trang mới; kéo refresh thấy ngay sản phẩm mới tạo từ Web.

---

### Epic `[FE-AUC]` — Phòng Đấu giá & Đặt giá Realtime (`FD3–FD5`)

#### `[WEB-AUC-01]` Danh sách Phiên đấu giá, Chi tiết & Lịch sử Bid

| | |
| --- | --- |
| **Owner / Ngày** | **TV1** / **FD3** |
| **Phụ thuộc** | Hard: `FE-PLAT-01` |
| **Đầu ra** | `src/api/auction.api.ts`, `src/features/auctions/*` (`AuctionListPage`, `AuctionDetailPage`, `CountdownTimer`, `BidHistoryList`) |

**Task & API** *(endpoint: `GET /api/auctions`, `GET /api/auctions/{id}`, `GET /api/auctions/{id}/bids`)*
- **Danh sách phiên (`/auctions`, public):** gọi `GET /api/auctions` hỗ trợ lọc `status` (`PENDING`, `ACTIVE`, `ENDED`), `search` theo `productTitle`, phân trang `page`/`pageSize` (BE tự ẩn `INITIALIZING`/`CANCELLED`). Card hiển thị `productThumbnail`, `productTitle`, `currentPrice` (format VND), trạng thái, đồng hồ đếm ngược.
- **Phòng đấu giá (`/auctions/:id`, public):**
  - Gọi song song `GET /api/auctions/{id}` (trả mọi trạng thái) và `GET /api/auctions/{id}/bids` (mới nhất trên cùng, phân trang).
  - Hiển thị giá khởi điểm, bước giá (`bidIncrement`), giá hiện tại.
  - **Xác định Người dẫn đầu:** Vì OpenAPI `Auction` không có trường `leadingBidderId`, FE lấy `bids[0]?.bidderId` từ danh sách bids (phần tử đầu tiên = bid mới nhất). So sánh với user hiện tại: nếu trùng thì gắn badge *"Bạn đang dẫn đầu"*.
  - Khi trạng thái là `ENDED`: hiển thị `winnerId` & `finalPrice`.
  - `CountdownTimer`: đếm lùi chuẩn theo ISO UTC; khi chạm `00:00:00`, tự refetch `GET /api/auctions/{id}` sau 1–2s để đồng bộ trạng thái chuyển pha.

**Nghiệm thu**
- Khách chưa login vẫn xem được danh sách, chi tiết và lịch sử bid; tiền định dạng chính xác bằng `BigInt`; phân trang bid ổn định.
- Nhận diện đúng người dẫn đầu dựa trên bid mới nhất.

---

#### `[WEB-AUC-02]` Đặt giá Realtime, Chống Double-Click & Đồng bộ Socket

| | |
| --- | --- |
| **Owner / Ngày** | **TV1** / **FD4** |
| **Phụ thuộc** | Hard: `WEB-AUC-01`, `WEB-AUTH-01` |
| **Đầu ra** | `src/features/auctions/components/BidBox.tsx`, `src/features/auctions/hooks/useAuctionSocket.ts` |

**Task & API** *(endpoint: `POST /api/auctions/{id}/bids`; socket: `/auctions` namespace)*
- **Tính mức giá tối thiểu (`BidBox`):**
  - Chưa có bid nào: tối thiểu = `startingPrice`.
  - Đã có bid: tối thiểu = `currentPrice + bidIncrement` (dùng `BigInt`).
  - Có nút tăng nhanh (`+1 bước`, `+2 bước`, `+5 bước`) để người dùng thao tác nhanh.
- **Ràng buộc UI khớp luật BE:**
  - Chưa đăng nhập → hiện nút đăng nhập.
  - Là `sellerId` → khóa form kèm thông báo "Bạn là người bán phiên này" (`403`).
  - Đang là người dẫn đầu (`bids[0]?.bidderId === currentUser?.id`) → khóa nút bid kèm thông báo *"Bạn đang dẫn đầu phiên"* để tránh nhận lỗi `409 CONFLICT`.
  - Phiên khác `ACTIVE` hoặc đã quá `endTime` → khóa form bid.
- **Gửi `POST /api/auctions/{id}/bids`:**
  - Đính kèm header `Idempotency-Key` (UUID v4); disable nút khi `isPending`; giữ nguyên key nếu mạng lỗi và user bấm thử lại.
  - Xử lý rõ các lỗi `400` (giá thấp hơn mức tối thiểu), `403` (seller tự bid), `409` (bị người khác bid đè / đang dẫn đầu / phiên đã đóng → tự refetch giá mới).
- **Socket (`useAuctionSocket`):**
  - Subscribe room theo `auctionId` bằng `auction:subscribe` emit với ack (theo `contracts/socket.json`).
  - Lắng nghe `auction:bid_updated` và `auction:status_changed`: **chỉ cập nhật khi `payload.version > current.version`**; highlight giá mới, cập nhật danh sách bid và cập nhật người dẫn đầu (`payload.bidderId`).
  - Khi Socket reconnect → tự `invalidateQueries` cả detail lẫn bid history rồi subscribe lại.
  - Cleanup: emit `auction:unsubscribe` khi unmount component.

**Nghiệm thu**
- Mở 2 trình duyệt (Bidder 1 & Bidder 2): đặt giá ở bên này → bên kia nhảy giá, cập nhật lịch sử và mức tối thiểu tức thì không cần F5.
- Phiên tự mở khóa bid khi `PENDING → ACTIVE` và tự đóng khi `ACTIVE → ENDED`.

---

#### `[WEB-AUC-03]` Seller Tạo phiên Đấu giá & Theo dõi Reservation (`202 INITIALIZING`)

| | |
| --- | --- |
| **Owner / Ngày** | **TV1** / **FD5** |
| **Phụ thuộc** | Hard: `WEB-AUC-01`, `WEB-PROD-02` |
| **Đầu ra** | `src/features/auctions/seller/CreateAuctionPage.tsx` |

**Task & API** *(endpoint: `POST /api/auctions`, `GET /api/auctions/{id}`)*
- Route chỉ dành cho `SELLER` (`/seller/auctions/new`, hỗ trợ nhận `?productId=...` từ trang sản phẩm).
- Form chọn sản phẩm `READY`, nhập `startingPrice`, `bidIncrement` (số nguyên VND `> 0`), chọn `startTime` (`≥ hiện tại`, có nút chọn nhanh `+1 phút` / `+5 phút` phục vụ test/demo) và `endTime > startTime` (gửi lên dạng ISO UTC).
- Gọi `POST /api/auctions` kèm header `Idempotency-Key`.
- **Xử lý chuẩn `202 Accepted` (`INITIALIZING`):**
  - Nhận `202` → chuyển ngay tới `/auctions/:id`.
  - Khi `status === 'INITIALIZING'`, tự poll `GET /api/auctions/{id}` mỗi 2s kèm trạng thái "Đang giữ sản phẩm và khởi tạo phiên...".
  - Khi worker BE xử lý xong: nếu chuyển sang `PENDING` → dừng polling và hiển thị phiên sẵn sàng; nếu chuyển sang `CANCELLED` → hiển thị thông báo "Phiên đấu giá bị hủy do không thể giữ sản phẩm hoặc xảy ra xung đột" và dừng polling.

**Nghiệm thu**
- Tạo phiên đấu giá từ sản phẩm `READY`: quan sát mượt vòng đời `INITIALIZING → PENDING → ACTIVE` không cần F5.
- Tạo trùng auction cho cùng 1 sản phẩm hiển thị lỗi `409` rõ ràng; double-click không sinh 2 phiên nhờ `Idempotency-Key`.

---

#### `[MOB-AUC-01]` Danh sách & Phòng Đấu giá Realtime trên Mobile

| | |
| --- | --- |
| **Owner / Ngày** | **TV3** / **FD5** |
| **Phụ thuộc** | Hard: `FE-PLAT-02`, `MOB-AUTH-01` · Soft: `WEB-AUC-03` |
| **Đầu ra** | `src/api/auction.api.ts`, `src/features/auctions/*` (`AuctionListScreen`, `AuctionRoomScreen`, `useAuctionSocket`) |

**Task & API** *(endpoint: `GET /api/auctions`, `GET /api/auctions/{id}`, `GET /api/auctions/{id}/bids`, `POST /api/auctions/{id}/bids`; socket: `/auctions` namespace)*
- **AuctionListScreen:** `FlatList` với tab lọc (`Đang diễn ra` = `ACTIVE`, `Sắp mở` = `PENDING`, `Đã kết thúc` = `ENDED`), gọi `GET /api/auctions`, pull-to-refresh + infinite scroll.
- **AuctionRoomScreen:**
  - Gọi `GET /api/auctions/{id}` & `GET /api/auctions/{id}/bids`; đếm ngược UTC; nút chọn nhanh `+1/+2/+5` bước giá; gọi `POST /api/auctions/{id}/bids` kèm `Idempotency-Key`.
  - Nhận diện người dẫn đầu từ `bids[0]?.bidderId`; nếu trùng user thì khóa nút bid.
  - Subscribe `auction:subscribe` với ack; lắng nghe `auction:bid_updated` & `auction:status_changed` có lọc `version > current.version`.
  - Cleanup `auction:unsubscribe` khi rời màn hình (`useFocusEffect` cleanup).
- **Yêu cầu đặc thù Mobile (bắt buộc):**
  - Thanh đặt giá neo cố định dưới đáy (sticky footer) bọc `KeyboardAvoidingView` (`behavior="padding"` trên iOS) + `SafeAreaView`.
  - **Haptics:** `Haptics.notificationAsync(Success)` khi đặt giá thành công và `Warning` khi đang mở phòng mà bị vượt giá (`OUTBID` socket event).
  - **Lifecycle OS:** khi app quay lại foreground (`AppState === 'active'`), tự rejoin room (subscribe lại) và refetch `GET /api/auctions/{id}` + `bids`.

**Nghiệm thu**
- Đấu giá trực tiếp 2 chiều giữa Mobile và Web: giá nhảy tức thì, rung phản hồi đúng ngữ cảnh.
- Đưa app xuống nền 10 giây trong lúc Web bid tiếp rồi mở lại → Mobile tự đồng bộ giá mới nhất.

---

### Epic `[FE-ORD]` — Đơn hàng & Thanh toán COD (`FD5–FD6`)

#### `[WEB-ORD-01]` Danh sách & Chi tiết Đơn hàng (Buyer & Seller)

| | |
| --- | --- |
| **Owner / Ngày** | **TV2** / **FD5** |
| **Phụ thuộc** | Hard: `FE-PLAT-01`, `WEB-AUTH-01` |
| **Đầu ra** | `src/api/order.api.ts`, `src/features/orders/*` (`OrderListPage`, `OrderDetailPage`) |

**Task & API** *(endpoint: `GET /api/orders`, `GET /api/orders/{id}`)*
- **Danh sách đơn (`/orders`, protected):** gọi `GET /api/orders` (BE tự trả đơn mà user là `buyerId` hoặc `sellerId`, `createdAt desc`), lọc `status` (`PENDING_PAYMENT`, `PAID`, `CANCELLED`, `COMPLETED`), phân trang; gắn nhãn rõ "Đơn mua" / "Đơn bán" (so sánh `buyerId` với `principal.sub` trong store).
- **Chi tiết đơn (`/orders/:id`, protected):** gọi `GET /api/orders/{id}` (xử lý `404` nếu người lạ truy cập). Hiển thị snapshot sản phẩm, tổng tiền thắng (`totalAmount` format VND), trạng thái (`status`). Nếu là Buyer và đơn `PENDING_PAYMENT`, hiển thị khối thanh toán (`WEB-PAY-01`).
- *(Lưu ý schema)*: `Order` trong OpenAPI không có trường `paidAt`. Hiển thị badge trạng thái `PAID` / `COMPLETED`. Nếu cần ngày thanh toán, gọi thêm `GET /api/payments/order/{orderId}`.

**Nghiệm thu**
- Thắng đấu giá xong cả Buyer và Seller đều thấy đơn `PENDING_PAYMENT`; user thứ 3 mở URL `/orders/:id` nhận màn hình `404`.

---

#### `[WEB-PAY-01]` Thanh toán Đơn hàng — Luồng COD & Khung sẵn cho VNPay (D9)

| | |
| --- | --- |
| **Owner / Ngày** | **TV2** / **FD6** |
| **Phụ thuộc** | Hard: `WEB-ORD-01` |
| **Đầu ra** | `src/api/payment.api.ts`, `src/features/payments/*` (`PaymentPanel`, `PaymentReturnPage`) |

**Task & API** *(endpoint: `GET /api/payments/order/{orderId}`, `POST /api/payments`, `POST /api/payments/{id}/cod/confirm`)*
- Tích hợp trong `OrderDetailPage` (hoặc `/orders/:id/pay`):
  - Gọi `GET /api/payments/order/{orderId}` để lấy trạng thái thanh toán hiện tại (nếu trả `404` nghĩa là chưa khởi tạo payment → hiện form chọn phương thức, không báo lỗi đỏ).
  - **Khởi tạo thanh toán (`POST /api/payments`):**
    - Body **chỉ gửi** `{ orderId, paymentMethod }` (`"COD"` hoặc `"VNPAY"`), tuyệt đối không gửi `amount`; kèm header `Idempotency-Key`.
    - **COD:** hiển thị trạng thái `PENDING`, mã tham chiếu (payment `id`), thời hạn (7 ngày), và hướng dẫn chờ Admin xác nhận thu tiền.
    - **VNPay (chuẩn bị cho D9):** kiểm soát bằng `VITE_ENABLE_VNPAY`. Khi `false` → hiển thị lựa chọn VNPay ở trạng thái disabled ("Sắp hỗ trợ"). Khi `true` → nhận URL thanh toán và điều hướng; nếu BE trả `501`, báo rõ cổng VNPay chưa cấu hình.
    - Xử lý `409` khi đã có attempt `PENDING` bằng phương thức khác hoặc đơn đã `SUCCESS`.
  - Tạo sẵn route placeholder `/payments/vnpay/return` (chờ D9 gọi `GET /api/payments/vnpay/return` để hiển thị kết quả; không tự đánh dấu đơn `PAID` mà refetch `GET /api/orders/{id}`).

**Nghiệm thu**
- Buyer tạo COD thành công → reload vẫn giữ nguyên trạng thái `PENDING` cũ.
- Khi Admin confirm COD → Order đổi `PAID`, Payment đổi `SUCCESS`.

---

#### `[MOB-ORD-01]` Đơn hàng & Thanh toán COD trên Mobile + Deep Link Scaffold

| | |
| --- | --- |
| **Owner / Ngày** | **TV3** / **FD6** |
| **Phụ thuộc** | Hard: `FE-PLAT-02`, `MOB-AUTH-01` |
| **Đầu ra** | `src/api/order.api.ts`, `src/api/payment.api.ts`, `src/features/orders/*` (`OrderListScreen`, `OrderDetailScreen`) |

**Task & API** *(endpoint: `GET /api/orders`, `GET /api/orders/{id}`, `GET /api/payments/order/{orderId}`, `POST /api/payments`)*
- **OrderListScreen:** `FlatList` gọi `GET /api/orders`, chip lọc nhanh theo trạng thái (`PENDING_PAYMENT`, `PAID`, `CANCELLED`, `COMPLETED`), nhãn "Đơn mua"/"Đơn bán", pull-to-refresh.
- **OrderDetailScreen:** gọi `GET /api/orders/{id}` và `GET /api/payments/order/{orderId}`.
  - Buyer với đơn `PENDING_PAYMENT`: bấm "Yêu cầu thanh toán COD" gọi `POST /api/payments` (`{ orderId, paymentMethod: "COD" }`) kèm `Idempotency-Key`; hiển thị trạng thái `PENDING`/`SUCCESS`/`EXPIRED`.
  - Phương thức VNPay ẩn hoặc disable theo `EXPO_PUBLIC_ENABLE_VNPAY=false`.
- **Deep Link Scaffold (OS):** cấu hình `linking` trong `NavigationContainer` cho `auctionapp://orders/:id` và `auctionapp://payment-return` để D9 mở cổng VNPay qua `expo-web-browser` và quay lại đúng màn hình app.

**Nghiệm thu**
- Buyer thắng đấu giá vào tab Đơn hàng tạo được yêu cầu COD; sau khi Admin xác nhận trên Web, kéo refresh trên Mobile thấy đơn đổi sang `PAID`.

---

### Epic `[FE-NOTIF]` — Trung tâm Thông báo Realtime (`FD7`)

#### `[WEB-NOTIF-01]` Chuông Thông báo, Trang Danh sách & Socket `notification:new`

| | |
| --- | --- |
| **Owner / Ngày** | **TV2** / **FD7** |
| **Phụ thuộc** | Hard: `FE-PLAT-01`, `WEB-AUTH-01` |
| **Đầu ra** | `src/api/notification.api.ts`, `src/features/notifications/*` (`NotificationBell`, `NotificationPage`, `useNotificationSocket`) |

**Task & API** *(endpoint: `GET /api/notifications`, `PATCH /api/notifications/{id}/read`; socket: `/notifications` namespace)*
- **API:** `GET /api/notifications` (phân trang, `createdAt desc`, hỗ trợ lọc `status=UNREAD` hoặc `READ`); `PATCH /api/notifications/{id}/read` khi click đọc (idempotent, optimistic update giảm badge chưa đọc).
  - Lấy count badge: gọi `GET /api/notifications?status=UNREAD&pageSize=1` và đọc `total` từ response — không tải toàn bộ danh sách rồi đếm client-side.
- **Socket (`notification:new`):** hiện Toast góc màn hình với nội dung tiếng Việt từ BE, tăng số badge chưa đọc, prepend vào danh sách (dedupe theo `notification.id`). Socket `/notifications` namespace tự join room `user:{sub}` phía server — client không cần emit join thêm.
- **Điều hướng theo `type` & `metadata`:** `OUTBID`/`AUCTION_WON`/`AUCTION_ENDED` → `/auctions/:auctionId`; `PAYMENT_SUCCESS` → `/orders/:orderId` (từ `metadata.orderId`).

**Nghiệm thu**
- Nhận `OUTBID`, `AUCTION_WON`, `AUCTION_ENDED`, `PAYMENT_SUCCESS` tức thì qua Toast + Chuông; click vào chuyển đúng trang đích và đổi trạng thái đã đọc.

---

#### `[MOB-NOTIF-01]` Tab Thông báo, Badge & In-App Banner trên Mobile

| | |
| --- | --- |
| **Owner / Ngày** | **TV3** / **FD7** |
| **Phụ thuộc** | Hard: `FE-PLAT-02`, `MOB-AUTH-01` |
| **Đầu ra** | `src/api/notification.api.ts`, `src/features/notifications/*` (`NotificationListScreen`, `useNotificationSocket`) |

**Task & API** *(endpoint: `GET /api/notifications`, `PATCH /api/notifications/{id}/read`; socket: `/notifications` namespace)*
- **NotificationListScreen:** `FlatList` gọi `GET /api/notifications`, lọc `Tất cả / Chưa đọc` (query `status=UNREAD`), pull-to-refresh + infinite scroll; click item gọi `PATCH /api/notifications/{id}/read` và điều hướng tới `AuctionRoom` hoặc `OrderDetail`.
- **Badge & Realtime:** gắn số lượng chưa đọc lên `tabBarBadge` (dùng `GET /api/notifications?status=UNREAD&pageSize=1` lấy `total`); nhận `notification:new` khi app đang mở thì hiện In-App Banner + rung nhẹ; khi app từ background quay lại foreground tự refetch `GET /api/notifications`.

**Nghiệm thu**
- Nhận đủ 4 loại thông báo, bấm vào điều hướng chính xác, trạng thái đã đọc đồng bộ giữa Mobile và Web.

---

### Epic `[FE-ADMIN]` — Trang Quản trị Hệ thống (Web Only, `FD7`)

#### `[WEB-ADMIN-01]` Admin Console — Category CRUD, Đổi Role & Xác nhận COD

| | |
| --- | --- |
| **Owner / Ngày** | **TV1** / **FD7** |
| **Phụ thuộc** | Hard: `WEB-AUTH-01`, `WEB-PROD-01`, `WEB-PAY-01` |
| **Đầu ra** | `src/api/admin.api.ts`, `src/features/admin/*` (`AdminLayout`, `CategoryManagerPage`, `UserRolePage`, `CodConfirmPage`) |

**Task & API** *(Route `/admin/*` bọc `RoleRoute` chỉ cho `ADMIN`; Mobile bỏ qua epic này)*
1. **Quản lý Danh mục (`/admin/categories`):** danh sách từ `GET /api/categories`, thêm (`POST /api/categories`), sửa (`PATCH /api/categories/{id}`), xóa (`DELETE /api/categories/{id}`). Xử lý rõ lỗi `409` khi trùng tên hoặc xóa danh mục đang có sản phẩm.
2. **Xác nhận COD (`/admin/cod`):**
   - Dựa trên API MVP hiện có: tra cứu Payment theo `orderId` qua `GET /api/payments/order/{orderId}` (quyền `ADMIN`) → hiển thị số tiền (`totalAmount`), người mua, trạng thái, hạn thanh toán → nút **"Xác nhận đã thu tiền COD"** gọi `POST /api/payments/{id}/cod/confirm` (có modal xác nhận trước khi bấm).
   - Thiết kế tách riêng component bảng/tra cứu để nếu sau này BE thêm endpoint list payment pending thì gắn vào dễ dàng.
3. **Phân quyền User (`/admin/users`):**
   - Form nhập `userId` (UUID) + chọn role mới (`USER`, `SELLER`, `ADMIN`) gọi `PATCH /api/admin/users/{id}/role`.
   - Xử lý rõ lỗi `409` (tự hạ quyền chính mình hoặc hạ `ADMIN` cuối cùng) và hiện ghi chú nhắc user refresh/login lại để áp dụng role mới.

**Nghiệm thu**
- User thường/Seller vào `/admin/*` bị chặn bởi Route Guard.
- Admin thao tác được đầy đủ Category CRUD, đổi role user seed, tra cứu và xác nhận COD → Order tự chuyển `PAID`, Buyer nhận thông báo `PAYMENT_SUCCESS`.

---

### Epic `[FE-INT]` — Tích hợp liên nền tảng & Chuẩn bị Demo (`FD8`)

#### `[FE-INT-01]` Golden Flow Web + Mobile & Kiểm thử Resilience UI

| | |
| --- | --- |
| **Owner / Ngày** | **TV1 (lead) + TV2 + TV3** / **FD8** |
| **Phụ thuộc** | Hard: toàn bộ các issue `FD0–FD7` |
| **Đầu ra** | Checklist kịch bản kiểm thử + fix bug liên nền tảng ở cả 2 repo + cập nhật `README.md` chạy full stack |

**Task**
- Chạy trọn **Golden Flow liên nền tảng** bằng giao diện thật:
  1. **Web (Admin):** tạo Category mới.
  2. **Web (Seller):** tạo Product `DRAFT` → thêm ảnh → bật `READY` → tạo phiên đấu giá ngắn (`+1 phút` mở, `+3 phút` đóng) → theo dõi `INITIALIZING → PENDING → ACTIVE`.
  3. **Web (Bidder 1)** & **Mobile (Bidder 2):** cùng mở phòng đấu giá → đấu giá qua lại realtime → kiểm tra countdown, highlight giá, Haptics Mobile, thông báo `OUTBID`.
  4. Phiên kết thúc (`ENDED`) → sản phẩm thành `SOLD`, người thắng nhận `AUCTION_WON`, Seller nhận `AUCTION_ENDED`.
  5. **Mobile (Bidder thắng):** vào tab Đơn hàng thấy `PENDING_PAYMENT` → tạo yêu cầu **COD**.
  6. **Web (Admin):** nhập `orderId` tại `/admin/cod` → xác nhận thu tiền COD → Order trên Mobile & Web chuyển `PAID`, thông báo `PAYMENT_SUCCESS` nổ realtime.
- **Test Resilience UI:**
  - Ngắt/bật lại mạng trên cả Web và Mobile → xác nhận Socket tự reconnect và REST đồng bộ lại giá mới.
  - Bấm đặt giá 2 lần thật nhanh → không phát sinh 2 bid khác nhau nhờ `Idempotency-Key` và disable state.
  - Thử thay đổi 1 field trong `contracts/openapi/*.json` → chạy `npm run contracts:sync` + `npm run typecheck` để xác minh khả năng bảo trì khi BE thay đổi.

**Nghiệm thu**
- Toàn bộ 6 bước Golden Flow chạy trơn tru giữa Web + Mobile + Backend Docker; không crash/lỗi console; không cần F5 ở các luồng realtime.

---

## 5. Bảng tổng hợp theo Planned Day (Checkpoint Merge)

| Day | TV1 — Lead / Web (Auth, Auction, Admin) | TV2 — Web (Product, Order, Payment, Notif) | TV3 — Mobile (React Native) | Checkpoint để qua ngày |
| --- | --- | --- | --- | --- |
| **FD0** | `FE-PLAT-01` Khung Web + CORS check (REST & 2 socket URL) | Đọc `contracts/openapi/product.json` + dựng wireframe nhanh | Đọc `contracts/socket.json` + chuẩn bị Emulator / Expo Go | Web skeleton chạy xanh, gọi API `:8080` và cả 2 socket không lỗi CORS |
| **FD1** | `FE-PLAT-02` Khung Mobile cho TV3 | Review PR `FE-PLAT-01` + chuẩn bị layout Product | Nhận repo Mobile, chạy thử gọi API trên máy ảo/điện thoại | Cả 2 repo skeleton merge `main`, 3 máy đều chạy được |
| **FD2** | `WEB-AUTH-01` Auth + Profile | Review chéo / dựng shared UI components | `MOB-AUTH-01` Auth Stack + SecureStore + Profile | Web & Mobile login/refresh/logout và sửa profile thành công |
| **FD3** | `WEB-AUC-01` Auction list/detail/bids | `WEB-PROD-01` Category & Product public | `MOB-PROD-01` Explore & Product detail (bắt đầu) | Duyệt sản phẩm và xem phòng đấu giá công khai chạy thật |
| **FD4** | `WEB-AUC-02` Bid realtime + Socket | `WEB-PROD-02` Seller Product CRUD | `MOB-PROD-01` Hoàn tất + review chéo | Web tạo SP `READY` và đặt giá realtime giữa 2 tab |
| **FD5** | `WEB-AUC-03` Seller tạo Auction (`202`) | `WEB-ORD-01` Danh sách & chi tiết Order | `MOB-AUC-01` Phòng đấu giá Realtime Mobile | Web tạo Auction; Web & Mobile đấu giá chéo realtime |
| **FD6** | Review PR TV2 & TV3 / fix edge cases | `WEB-PAY-01` Thanh toán COD (+ flag VNPay) | `MOB-ORD-01` Order & COD Mobile + Deep Link | Thắng đấu giá tạo được COD trên cả Web và Mobile |
| **FD7** | `WEB-ADMIN-01` Admin Console (Web only) | `WEB-NOTIF-01` Notification realtime Web | `MOB-NOTIF-01` Notification + Badge Mobile | Admin confirm COD → Order `PAID` → Thông báo nổ trên cả 2 nền tảng |
| **FD8** | `FE-INT-01` Golden Flow & Resilience (lead) | `FE-INT-01` Test chéo & fix bug Web | `FE-INT-01` Test chéo & fix bug Mobile | Chạy trọn luồng demo Web + Mobile không lỗi |

---

## 6. Lộ trình mở rộng sau khi Backend cập nhật thêm

- **Khi Backend xong `PAY-04` (VNPay, D9):** bật `VITE_ENABLE_VNPAY=true` và `EXPO_PUBLIC_ENABLE_VNPAY=true`, hoàn thiện màn hình Return (`WEB-PAY-01` & `MOB-ORD-01` qua `expo-web-browser` + Deep Link), không ảnh hưởng luồng COD hay Order hiện có.
- **Khi Backend bổ sung API mới** (Upload ảnh S3 presigned URL, danh sách User/Payment cho Admin, danh sách sản phẩm riêng của Seller có cả `DRAFT`, v.v.): copy lại file `contracts/openapi/*.json` → chạy `npm run contracts:sync` → bổ sung hàm trong `src/api/*.api.ts` và gắn vào đúng feature tương ứng mà không phải đập đi xây lại cấu trúc.
