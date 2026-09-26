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
