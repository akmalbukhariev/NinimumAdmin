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
