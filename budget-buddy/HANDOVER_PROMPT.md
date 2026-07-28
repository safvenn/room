# Handover Prompt for AI Agent — Budget Buddy Today's Changes

Copy and paste the prompt below into your target AI agent in the new repository:

```markdown
Hi! I need you to implement all recent bug fixes, features, and architectural updates from another version of the Budget Buddy project into this repository.

Here is the exact summary of work done today, broken down by feature area and file path. Please review your existing codebase and apply these exact changes:

---

### 1. Edit Expense Feature (Full Stack)
- **Backend Schemas (`backend/app/api/expenses/schemas.py`)**:
  - Add `ExpenseUpdate` model (all fields optional: `title`, `description`, `amount`, `payment_method`, `category`, `expense_date`).
- **Backend Repository (`backend/app/api/expenses/repository.py`)**:
  - Add `update(expense_id, updates)` method for MongoDB `$set` with `updated_at: datetime.now(timezone.utc)`.
- **Backend Service (`backend/app/api/expenses/service.py`)**:
  - Add `update_expense(expense_id, data, current_user)` method. Only allow the payer (`paid_by == current_user.id`) to update.
- **Backend Routes (`backend/app/api/expenses/routes.py`)**:
  - Register `PATCH /expenses/{expense_id}` route. Place it *after* `/splits/...` routes to avoid route parameter shadowing.
- **Frontend Types (`frontend/src/types/index.ts`)**:
  - Add `ExpenseUpdate` interface.
- **Frontend Services (`frontend/src/api/services.ts`)**:
  - Add `expensesAPI.update(id, data)` endpoint call.
- **Frontend Page (`frontend/src/pages/EditExpensePage.tsx`)**:
  - Create full Edit Expense page component. Pre-populate form fields from `expensesAPI.get(id)`. Show a diff note if amount changed ("Was ₹X"). Send only modified fields on submit.
- **Frontend Router (`frontend/src/App.tsx`)**:
  - Register `/edit-expense/:id` protected route.
- **Frontend History (`frontend/src/pages/HistoryPage.tsx`)**:
  - Add edit pencil icon button next to delete button on expense cards (visible for payer only). Clicking navigates to `/edit-expense/${exp.id}`.

---

### 2. Reactive Auth Store, Token Refresh & App Freeze Fixes
- **Auth Store (`frontend/src/store/auth.ts`)**:
  - Rewrite `useAuthStore` using React 18 `useSyncExternalStore` primitive instead of module variable. This ensures all components immediately re-render on auth changes (fixes frozen UI after idle token expiry).
  - Export `getAuth()` and `subscribeToAuth()` for non-React callers.
- **API Interceptor (`frontend/src/api/client.ts`)**:
  - Update 401 response interceptor: on failed token refresh, clear localStorage keys (`access_token`, `refresh_token`, `user`) and dispatch `window.dispatchEvent(new Event('storage'))` to trigger store re-read.
- **App Shell & Default Route (`frontend/src/App.tsx`)**:
  - Add `AppShell` component wrapping routes. Validates stored token on mount via `authAPI.me()`. If token is invalid/expired, logs out user and redirects to `/login`.
  - Change default landing route for authenticated users to `/add-expense` (instead of `/dashboard`).
- **Auth Pages (`LoginPage.tsx`, `RegisterPage.tsx`)**:
  - Change post-auth navigation target from `/dashboard` to `/add-expense`.
- **Profile Page (`frontend/src/pages/ProfilePage.tsx`)**:
  - Replace silent `if (!user) return null;` with `<Navigate to="/login" replace />`.
- **TopBar (`frontend/src/components/layout/TopBar.tsx`)**:
  - Add 2-minute module-level cache for notifications (`NOTIF_TTL_MS`) to prevent unnecessary API calls on every page navigation.
- **BottomNav (`frontend/src/components/layout/BottomNav.tsx`)**:
  - Change active tab matching from `pathname.startsWith(to)` to exact match `pathname === to`.

---

### 3. PWA Installation & Service Worker Caching
- **PWA Manifest (`frontend/public/manifest.json`)**:
  - Create web app manifest with `start_url: "/add-expense"`, display `standalone`, theme color, and app icons.
- **Service Worker (`frontend/public/sw.js`)**:
  - Cache-first strategy for static app shell (`/`, `/add-expense`, `/manifest.json`, static assets).
  - Network-first strategy for API requests (`/api/*`).
- **HTML Entry (`frontend/index.html`)**:
  - Link manifest and register service worker on window load. Add mobile web app meta tags.

---

### 4. GPay & UPI Payment Deeplink Fix
- **UPI Deep Link Utility (`frontend/src/utils/upi.ts`)**:
  - Create UPI helper utility.
  - Generate Android `intent://` URLs for Google Pay (`package=com.google.android.apps.nbu.paisa.user`), PhonePe, and BHIM to avoid Chrome "Not secure" error on mobile `upi://` deep links.
  - Provide fallback to QR code generation via Google Charts / QR Server API for desktop / missing UPI app.
  - Ensure payment URL launch uses `window.location.href` directly inside a user click event (synchronous user gesture).
- **Backend User Model & Schemas (`backend/app/api/users/schemas.py`)**:
  - Add `upi_id: Optional[str]` to `UserPublic` and `UserUpdateRequest`.
- **Frontend Profile (`frontend/src/pages/ProfilePage.tsx`)**:
  - Add UPI ID text input (`name@okaxis`) to let users save their payment address.
- **Settlements Page (`frontend/src/pages/SettlementsPage.tsx`)**:
  - Rewrite page to show bottom-sheet UPI modal with QR code, direct app launch buttons (GPay/PhonePe/BHIM), and "Record Settlement" button once paid. Fetch recipient friend's `upi_id`.

---

### 5. Timezone Fixes
- **Backend Expense Dates (`backend/app/api/expenses/repository.py` & `service.py`)**:
  - Store `expense_date` as ISO string (`YYYY-MM-DD`) instead of midnight UTC `datetime` object, preventing day-shifting in IST (+05:30) timezones.

---

Please inspect our codebase, compare with these specifications, and implement these changes step by step!
```
