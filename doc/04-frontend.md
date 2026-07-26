# 04 - Frontend

React 19 SPA in [client/](../client/) built with Vite.

## Entry Points

- [client/src/main.jsx](../client/src/main.jsx) — mounts `<App />` into the DOM root.
- [client/src/App.jsx](../client/src/App.jsx) — configures `BrowserRouter`, React Query client, top-level routes, and global providers (`RealtimeSync`, `Toaster`, `AIChatWidget`).

## Routing

Uses `react-router-dom` v7.

### Public

| Route | Component | Notes |
| --- | --- | --- |
| `/` | `LandingPage` | Marketing landing with dual CTAs. Auto-redirects to `/dashboard` if a valid JWT is in `localStorage`. |
| `/login` | `LoginPage` | Staff sign-in |
| `/portal` | `PortalLandingPage` | Customer portal entry — enter IC to continue |
| `/portal/book` | `PortalBookPage` | Book / register |
| `/portal/confirmation/:id` | `PortalConfirmationPage` | Live queue snapshot, self check-in / cancel, Telegram link button |
| `/portal/queue` | `PortalQueuePage` | Look up your queue position by IC |
| `/portal/walkin` | `PortalWalkInPage` | Walk-in registration flow |

### Staff (protected — wrapped in `ProtectedRoute`)

| Route | Component |
| --- | --- |
| `/dashboard` | `DashboardPage` |
| `/patients` | `PatientsPage` |
| `/patients/new` | `NewPatientPage` |
| `/patients/:id` | `PatientDetailPage` |
| `/patients/:id/edit` | `EditPatientPage` |
| `/appointments` | `AppointmentsPage` |
| `/appointments/new` | `NewAppointmentPage` |
| `/calendar` | `CalendarPage` |
| `/queue` | `QueuePage` |
| `/treatments/new` | `NewTreatmentPage` |
| `/messages` | `MessagesPage` — Telegram broadcast + history + AI drafter |

`ProtectedRoute` checks `token` in the Zustand store. If missing → redirect to `/login`.

## State Management

### Auth Store — [client/src/store/authStore.js](../client/src/store/authStore.js)

Zustand store with:
- `user` — staff object
- `token` — JWT string
- `setAuth(user, token)` — persists to `localStorage`
- `logout()` — clears state + `localStorage`

### Server State — TanStack React Query v5

Common query keys:
- `['queue']`
- `['appointments', date, search]`
- `['patients', search]`
- `['dashboard-stats']`
- `['patient', id]`
- `['messages']` / `['message-stats']`
- `['telegram-status', ic]`

Mutations invalidate the affected keys. Default `staleTime`: 60s.

## API Client ([client/src/api/](../client/src/api/))

- `axios.js` — Axios instance with `baseURL: '/api/v1'`. Request interceptor attaches the JWT; response interceptor logs out on 401 and redirects to `/login`.
- One module per resource: `auth.api.js`, `patients.api.js`, `appointments.api.js`, `queue.api.js`, `treatments.api.js`, `portal.api.js`, `dashboard.api.js`, `ai.api.js`, `telegram.api.js`, `messages.api.js`.

## Real-Time Sync — [client/src/hooks/useRealtimeSync.js](../client/src/hooks/useRealtimeSync.js)

Opens a WebSocket to `ws://<host>:8000/ws`. Handlers:

| Event | Action |
| --- | --- |
| `refresh` | Invalidates `queue`, `appointments`, `dashboard-stats`, `portal` queries |
| `queue_update` | Merges the payload directly into the `['queue']` cache (optimistic) |

Auto-reconnects after 3 seconds on close. See [08-realtime.md](08-realtime.md).

## Components ([client/src/components/](../client/src/components/))

- **Layout:** `AppLayout` (sidebar + `<Outlet />`), `ProtectedRoute`, `Sidebar`.
- **UI primitives:** `Card`, `Button`, `Badge`, `Input`.
- **AIChatWidget:** floating gradient bubble bottom-right. Speech-bubble chat UI, pulse ring, glassmorphic header, typing dots. Calls `/api/v1/ai/chat`.
- **LinkTelegramButton:** shown on portal confirmation page. Opens `t.me/<bot>?start=<token>` deep link, polls linking status every 4s.

## Design System

### Colors
- **Brand:** PINK `#FF2D8F` · PURPLE `#A855F7` · GOLD `#F7C873`
- **Dark surface:** `#0D0B21` (sidebar, landing, portal, login-left panel)
- **Light surface:** `#fff` on `#fafafa` / `#faf5ff` (staff pages)
- **Purple border tint:** `#f3e8ff` on light cards

### Patterns
- **Rounded 2xl / 3xl cards** with soft box-shadows (`rgba(168,85,247,0.06)`).
- **Gradient buttons** use `linear-gradient(135deg, PINK, PURPLE)` with matching drop-shadows.
- **Glassmorphic cards** on dark surfaces: `background: rgba(255,255,255,0.04–0.08)` + `backdropFilter: blur(20px)` + `border: 1px solid rgba(255,255,255,0.08)`.
- **Radial glow blobs** in the background of dark hero sections (pink top-left, purple bottom-right, gold center).
- **Icon tiles**: `w-9/w-11 rounded-xl/2xl` with matching gradient background and a drop-shadow.

### Public pages theme (dark)
- `/` (Landing), `/portal/*`, `/login` (left panel) all use `#0D0B21` + glow blobs + glassmorphic cards for a consistent unauthenticated experience.
- The staff app inside `AppLayout` is light on white for readability during long working sessions.

### Copy tone
The public-facing pages are **domain-agnostic** — no references to "clinic", "dental", or "patient" in marketing copy. The internal staff app still uses domain terms (dentist, appointment, treatment) where they aid clarity.

## Build

`npm run build` produces `client/dist/`. Serve as static files behind any HTTP server; API calls should be proxied to the FastAPI backend at `/api/v1/*` and `/ws`.
