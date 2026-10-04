# NinimumAdmin

Ninimum administration web application built with React + TypeScript + Vite + Material UI.

## Current backend

The local `.env` points to:

```env
VITE_API_BASE_URL=http://95.182.118.233:8083
```

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Implemented modules

- Persistent admin login/session
- Uzbek default language + Russian + English
- Live dashboard
- Orders: list, search/filter, detail, order/payment status update
- Products: list/filter, create, edit, active/featured, stock/pricing, fiscal package, image add/delete
- Categories: create/edit/activate/deactivate
- Customers: search/filter, enable/disable
- Subscriptions: search/filter/status + tariff create/edit
- Delivery: delivery jobs, courier assignment/status + courier create/enable/disable
- Reviews: moderation
- Product questions: list/filter, answer/edit answer, show/hide
- Marketing: promotions, home banners, coupons
- Settings: app config + admin account creation/enable/disable


## Global backend loading
Admin write actions (create/update/delete/status/save) automatically show a centered blocking loading overlay until the backend request finishes. Read-only page/list loading keeps its existing local loader, and Fiscal MXIK search POST requests explicitly skip the global overlay.


## Inline product status loading
The Products Faol/Nofaol switch is explicitly excluded from the global blocking loader. It keeps its existing per-row spinner while the status request is in progress.


## Production deployment under /admin/

- Vite base: `/admin/`
- React BrowserRouter basename follows `import.meta.env.BASE_URL`, so routes stay under `/admin/*`.
- `.env.production` uses the same origin (`http://95.182.118.233`) for API calls. Nginx proxies `/ninimum/api/v1/*` and `/uploads/*` to the Spring Boot backend through the existing port-80 server block, avoiding cross-origin/CORS issues with port 8083.

## Responsive/mobile admin

This build keeps the desktop layout and adds responsive behavior for phones/tablets:
- temporary slide-out navigation drawer on smaller screens
- compact sticky mobile header and accessible language selector
- one-column forms/dialog layouts on phones
- mobile-sized dialog spacing and actions
- touch-friendly controls and pagination
- wide management tables scroll horizontally on small screens instead of breaking the page
- dashboard cards/charts shrink and stack for phone widths
- login page has a dedicated mobile header/layout

Production deployment base remains `/admin/` and `.env.production` points to `http://95.182.118.233`.


## Administrator roles and sessions

- `SUPER_ADMIN`: the sole owner; full access, including administrator creation/status and application settings.
- `ADMIN`: products, categories, orders, and delivery operations only. New accounts are always created with this role.
- Server authorization enforces permissions even when UI navigation is bypassed.
- The owner account cannot be disabled through the administrator status API.
- A new login replaces the previous session for that account. Visible browser windows revalidate every 30 seconds and when focused. Session messages support Uzbek, Russian, and English.
- Category creation no longer offers the parent-category selector. Existing category hierarchy remains editable.

### Deploy together with the backend

1. Back up the production database, backend artifact, and existing `/admin/` files.
2. Inspect `admin_users.role` and ensure it supports `SUPER_ADMIN` (VARCHAR or a compatible ENUM).
3. Confirm exactly one active account has login ID `test`, then run the backend's `admin-roles-sessions.sql` against the production database.
4. Deploy and restart the updated backend before publishing this frontend. Existing administrators must log in again.
5. Build with Node 22.23.2 or a version compatible with Vite 8, and publish `dist/` using the existing Nginx `/admin/` setup.
6. Verify owner login, restricted login, forbidden administrator-management requests, and rejection of an older token after a second login.

The current UI-library migration already has TypeScript system-prop errors in the original source. The role/session changes add no new TypeScript error signatures; production Vite build passes.
