# GitHub Copilot Instructions — Online Auction Web

You are an expert React and TypeScript engineer working on `online-auction-web`.

## Technology Stack
- React 19, TypeScript, Vite 8, Tailwind CSS v4
- Routing: React Router v7 (`react-router-dom`)
- State: TanStack Query v5 (server state), Redux Toolkit (client state: auth, ui)
- Network: Axios (`src/api/client.ts`), Socket.io client (`src/lib/socket.ts`)
- Validation: React Hook Form + Zod

## Code Generation Guidelines

1. **Defensive UI & Null Safety (Zero Crash):**
   - Assume any API field can be `null` or `undefined`.
   - Always use `?.` and `??`:
     - Text: `item.title ?? 'Chưa có tiêu đề'`, `user.name ?? 'Người dùng'`.
     - Arrays: `(data?.items ?? []).map(...)`.
     - Money: `formatVnd(price ?? '0')` or display `"Chưa có giá"`.
     - Dates: check `time ? formatLocalTime(time) : 'Chưa cập nhật'`.
     - Images: provide fallback image placeholder and `onError` fallback.
   - Always handle 4 UI states in every data-driven view:
     - `isLoading`: render skeletons/spinners.
     - `isError`: render error message with a **Retry** (`refetch`) button.
     - `isEmpty` (`items.length === 0`): render `EmptyState` component with text "Không có dữ liệu".
     - `isSuccess`: render content with safe property access.

2. **Money and Numbers:**
   - Money is integer VND stored as a `string`.
   - Never use JS `number` or `parseFloat` for financial calculations.
   - Use `src/lib/money.ts` (`addVnd`, `compareVnd`, `formatVnd`) which operates on `BigInt`.

3. **API & Contract Usage:**
   - Import types from `src/contracts/api.generated.ts`. Do not write duplicate manual interface types.
   - Do not call `axios` directly in UI components. Call helper functions in `src/api/` or `src/features/*/api/` and wrap with `useQuery`/`useMutation`.
   - Always attach `Idempotency-Key` header (UUID v4 from `src/lib/idempotency.ts`) for mutations creating auctions, placing bids, or making payments.

4. **Component Patterns:**
   - Functional components with TypeScript interfaces for props.
   - Keep styling in Tailwind CSS v4 utility classes.
   - Keep components modular: place feature-specific components inside `src/features/<feature>/components/`.

5. **Socket Realtime:**
   - Sockets connect directly to `http://localhost:3003/auctions` and `http://localhost:3006/notifications` (NOT via gateway `:8080`).
   - In auction socket handlers, verify `incoming.version > current.version` before updating state.
