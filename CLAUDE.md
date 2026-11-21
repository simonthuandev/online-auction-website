# CLAUDE.md — Online Auction Web

Web frontend for Online Auction platform built with React 19, TypeScript, Vite 8, Tailwind CSS v4, React Router v7, TanStack Query v5, Redux Toolkit, Axios, and Socket.IO.

## Commands

```bash
npm run dev               # Start Vite dev server on http://localhost:5173
npm run typecheck         # TypeScript check (tsc -b) - MUST PASS
npm run lint              # ESLint check (eslint .)
npm run build             # Build production bundle (tsc -b && vite build)
npm run contracts:sync    # Sync contracts and generate src/contracts/api.generated.ts
npm run test:platform     # Run platform unit/smoke tests
```

## Architecture & Code Organization

- **Feature-based modules:** `src/features/<feature>/` (`components/`, `hooks/`, `pages/`, `mocks/`).
- **Core API & Interceptors:** `src/api/client.ts` contains Axios with single-flight refresh token mutex. Do not call Axios directly in UI components.
- **Contracts:** Generated types in `src/contracts/api.generated.ts`. Never edit generated files by hand.
- **Routing:** React Router v7 in `src/routes/` with `ProtectedRoute` and `RoleRoute` in `Guards.tsx`.
- **State Management:** TanStack Query for server state; Redux Toolkit (`src/store/`) for minimal client state (`auth`, `ui`).

## Critical Rules

1. **Defensive Coding & Zero-Crash:**
   - Always use optional chaining (`?.`) and nullish coalescing (`??`) on API data.
   - Fallback arrays: `(data?.items ?? []).map(...)`.
   - Fallback strings: `item.title ?? 'Chưa có tiêu đề'`, `user.name ?? 'Người dùng'`.
   - Never crash when backend is offline/unreachable: show friendly Error message with a **Retry** button (`refetch()`).
   - When list is empty, show `EmptyState` component with text "Không có dữ liệu".
   - Fallback image when `thumbnail` or `avatarUrl` is null; add `onError` handler.
2. **Money & Time:**
   - Money is integer string VND. Never use JS floating numbers for money arithmetic. Use `src/lib/money.ts` (`BigInt`).
   - Dates are ISO UTC strings. Convert to local time for display using `src/lib/time.ts`.
3. **Backend Gotchas:**
   - Sockets connect directly to ports: `http://localhost:3003/auctions` and `http://localhost:3006/notifications` (NOT gateway `:8080`).
   - `Idempotency-Key` header required on `POST /api/auctions`, `POST /api/auctions/{id}/bids`, `POST /api/payments`.
   - `POST /api/auth/logout` requires `{ refreshToken: string }` in body.
   - `Auction` schema has no `leadingBidderId`. Derive from `bids[0]?.bidderId` in `GET /api/auctions/{id}/bids`.
4. **Git Workflow:**
   - Branch: `feat/<scope>/<issue>-<slug>`.
   - Always merge directly to `main` via PR (no `dev` branch).
   - Ensure `npm run typecheck` and `npm run lint` pass cleanly before submitting PR.
