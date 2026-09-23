# NinimumAdmin

Ninimum administration web app.

## Stack

- React + TypeScript
- Vite
- Material UI
- Existing Ninimum Spring Boot backend
- Existing MariaDB database (through Spring Boot only)

## Implemented in this version

- Real admin login using `POST /ninimum/api/v1/admin/login`
- Persistent admin session in the browser
- Session validation using `GET /ninimum/api/v1/admin/me`
- Protected admin routes
- Logout
- Default Uzbek UI
- Russian and English language switching
- Language choice persistence
- Dashboard using real backend/MariaDB data through `GET /ninimum/api/v1/admin/dashboard`
- Real revenue, order, customer and active-subscription totals
- Real 7-day paid sales
- Real today's order statuses
- Real recent orders
- Real low-stock products

## Local development

The default local API address is configured in `.env`:

```env
VITE_API_BASE_URL=http://localhost:8083
```

Run the Spring Boot backend in IntelliJ first, then in this folder:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The app will redirect to `/login` if there is no valid saved admin session.

## Session behavior

After a successful login, the access token and basic admin profile are saved in browser local storage under `ninimum_admin_session`.

On a later browser/app start, NinimumAdmin calls `/admin/me` to validate the saved token. Invalid/expired/inactive admin sessions are removed automatically. A temporary network/backend outage does not erase the saved session.

## Languages

The first launch defaults to Uzbek. The selected language is saved in local storage under `ninimum_admin_language`.

Available languages:

- Uzbek
- Russian
- English

## Required backend update

This frontend expects the accompanying backend patch, which adds:

- access token in the admin-login JSON response
- admin status/role validation
- `GET /ninimum/api/v1/admin/me`
- `GET /ninimum/api/v1/admin/dashboard`
- admin route protection
- browser exposure of authentication response headers

Apply the `NinimumBackendAdminPatch` files to the latest Ninimum backend before testing this version.
