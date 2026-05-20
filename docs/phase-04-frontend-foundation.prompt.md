---
mode: agent
description: Phase 4 — Frontend Foundation: Auth, Routing, State Management, and API Client
---

# Phase 4: Frontend Foundation

## Context

The backend API is fully functional from Phase 3. This phase restructures the React frontend in `apps/web` to connect to the real API, replacing all in-memory mock state. The POC prototype code in `src/state/PrototypeState.tsx` and `src/mocks/mockData.ts` will be removed.

## Goal

Establish the frontend architecture: authentication flow, role-based routing, a typed API client, global auth state, and the base UI shell — all wired to the live backend.

---

## 1. API Client (`src/lib/api.ts`)

Use **Axios** to create a configured API client instance:

```ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: {"Content-Type": "application/json"},
});
```

### Request Interceptor

Attach the JWT token from local storage (or Zustand auth store) to every request:

```ts
apiClient.interceptors.request.use(config => {
  const token = getToken(); // from auth store
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Response Interceptor

On 401, clear the auth store and redirect to `/login`:

```ts
apiClient.interceptors.response.use(
  res => res,
  error => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
```

---

## 2. Auth Store (Zustand — `src/state/authStore.ts`)

```ts
interface AuthState {
  token: string | null;
  user: {
    userId: string;
    email: string;
    role: "STORE" | "WAREHOUSE";
    storeId?: string;
  } | null;
  selectedStoreId: string | null; // for WAREHOUSE role switching context
  login: (token: string, user: AuthState["user"]) => void;
  logout: () => void;
  setSelectedStoreId: (storeId: string) => void;
}
```

**Persistence**: Use Zustand's `persist` middleware with `localStorage`. Store `token` and `user` — do **not** store sensitive data beyond what is needed.

---

## 3. API Query Hooks (`src/features/auth/`)

Create a typed hook for auth:

**`useLogin` mutation** (`src/features/auth/useLogin.ts`):

- Uses `@tanstack/react-query` `useMutation`
- Calls `POST /api/auth/login` with `{ email, password }`
- On success: calls `authStore.login(token, user)` and navigates to the appropriate dashboard based on role
- On error: returns the error message from the API response body

---

## 4. Routing (`src/routes/`)

Use **React Router v7** with a layout-based route structure. Replace the current flat route files with:

```
src/routes/
├── index.tsx           # Root router definition
├── ProtectedRoute.tsx  # Auth guard component
├── RoleRoute.tsx       # Role-based guard component
├── LoginPage.tsx       # Public login page
├── store/
│   ├── StoreLayout.tsx           # Store shell with nav
│   ├── StoreDashboard.tsx
│   ├── StoreInventory.tsx
│   ├── StoreCustomerOrders.tsx
│   ├── StoreRecentCustomerOrders.tsx
│   └── StoreReorder.tsx
└── warehouse/
    ├── WarehouseLayout.tsx       # Warehouse shell with nav
    ├── WarehouseDashboard.tsx
    ├── WarehouseMonitor.tsx
    └── WarehouseShipping.tsx
```

### Route Tree (`src/routes/index.tsx`)

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />

  {/* Protected: STORE role */}
  <Route element={<ProtectedRoute />}>
    <Route element={<RoleRoute allowedRoles={["STORE"]} />}>
      <Route element={<StoreLayout />}>
        <Route path="/store" element={<StoreDashboard />} />
        <Route path="/store/inventory" element={<StoreInventory />} />
        <Route path="/store/orders" element={<StoreCustomerOrders />} />
        <Route path="/store/orders/history" element={<StoreRecentCustomerOrders />} />
        <Route path="/store/reorder" element={<StoreReorder />} />
      </Route>
    </Route>

    {/* Protected: WAREHOUSE role */}
    <Route element={<RoleRoute allowedRoles={["WAREHOUSE"]} />}>
      <Route element={<WarehouseLayout />}>
        <Route path="/warehouse" element={<WarehouseDashboard />} />
        <Route path="/warehouse/monitor" element={<WarehouseMonitor />} />
        <Route path="/warehouse/shipping" element={<WarehouseShipping />} />
      </Route>
    </Route>
  </Route>

  {/* Redirect root to login */}
  <Route path="/" element={<Navigate to="/login" replace />} />
  <Route path="*" element={<Navigate to="/login" replace />} />
</Routes>
```

### `ProtectedRoute.tsx`

- Reads `token` from auth store
- If no token, redirects to `/login`
- Otherwise renders `<Outlet />`

### `RoleRoute.tsx`

- Reads `user.role` from auth store
- If role not in `allowedRoles`, redirects to the correct dashboard for the user's actual role
- Otherwise renders `<Outlet />`

---

## 5. Login Page (`src/routes/LoginPage.tsx`)

Rebuild the login page to use the real API:

- Form fields: `email` (text input) and `password` (password input)
- Client-side validation: both fields required
- Submit calls `useLogin` mutation
- Show inline error message from API on failure
- Show loading state on the submit button while mutation is pending
- Remove the role-selector dropdown — role comes from the API response
- On success, navigate to `/store` or `/warehouse` based on `user.role`

---

## 6. App Shell Components

### `StoreLayout.tsx`

- Top navigation bar with links: Dashboard, Inventory, New Order, Order History, Reorder
- Show current store name (fetch from `/api/stores/:storeId` using user's `storeId`)
- Logout button: calls `authStore.logout()` and navigates to `/login`
- `<Outlet />` for child routes

### `WarehouseLayout.tsx`

- Top navigation bar with links: Dashboard, Monitor, Shipping
- Store selector dropdown (for viewing branch-specific data): fetches `/api/stores` and sets `selectedStoreId` in auth store
- Logout button
- `<Outlet />` for child routes

---

## 7. React Query Setup (`src/main.tsx`)

Wrap the app with `QueryClientProvider`:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
```

---

## 8. Shared API Hook Conventions

All data fetching hooks should follow these conventions:

- File location: `src/features/<domain>/use<Resource>.ts`
- Use `useQuery` for reads, `useMutation` for writes
- Query keys: `['resource', ...params]` — e.g., `['inventory', storeId]`
- Invalidate relevant queries after mutations (e.g., invalidate `['inventory']` after serving an order)
- Extract the error message from `error.response?.data?.error?.message` for display

---

## 9. Cleanup

Remove the following files that are no longer needed:

- `src/state/PrototypeState.tsx`
- `src/state/prototypeStateContext.ts`
- `src/state/usePrototypeState.ts`
- `src/mocks/mockData.ts`
- `src/routes/LandingPage.tsx` (if replaced by root redirect)

---

## Acceptance Criteria

- [ ] Login with valid STORE credentials → redirected to `/store`
- [ ] Login with valid WAREHOUSE credentials → redirected to `/warehouse`
- [ ] Login with wrong credentials → inline error message displayed
- [ ] Navigating to `/store` without a token → redirected to `/login`
- [ ] WAREHOUSE user navigating to `/store/*` → redirected to `/warehouse`
- [ ] Logout clears auth store and redirects to `/login`
- [ ] JWT token is attached to every API request as `Authorization: Bearer <token>`
- [ ] On 401 response, user is logged out and redirected to `/login`
- [ ] Page refresh retains auth session (Zustand persist)
- [ ] All prototype mock state files are removed
- [ ] TypeScript compiles with zero errors
