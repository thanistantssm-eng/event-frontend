# Eventora Frontend

Angular frontend for the Event Parking Reservation System API.

## Applications

- Customer/Organizer web entry: `http://localhost:4200`
- Separate Admin entry: `http://127.0.0.1:4300`
- Backend API default: `http://localhost:5118/api`

The public application does not expose an Admin Login link. The admin entry redirects public URLs to `/admin/login` and its protected routes require an API-issued JWT with the `Admin` role.

## Run locally

Start the backend first, then in this repository:

```bash
npm install
npm start
```

In a second terminal, start the admin entry:

```bash
npm run start:admin
```

The API base URL is configured at runtime in `public/api-config.js`, so deployments can change it without rebuilding Angular.

## Implemented API-backed flows

- Password → email OTP → JWT authentication and role-based routing
- Published public event discovery and event details
- Customer profile, dashboard, bookings, optional parking, payment OTP, receipts, QR and notifications
- Organizer-owned event list, draft creation, approval submission, bookings, sales reports and notifications
- Admin dashboards, events, publication, organizer verification, approvals, users, properties, categories, bookings, payments, parking and reports

Features not exposed by the backend, such as saved favorites, local preference settings, social sign-in, password reset and public contact submission, are not simulated with browser storage or fake success messages.

## Verification

```bash
npm run build
npm test -- --watch=false
```

If Vitest workers are constrained on Windows, set `VITEST_MIN_THREADS=1` and `VITEST_MAX_THREADS=1` before running the test command.
