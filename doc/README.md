# Dentelligence Documentation

Full technical documentation for the **Dentelligence** dental clinic management system.

## What is Dentelligence?

A full-stack dental clinic management platform with:
- Real-time patient queue management (WebSocket-driven)
- ML-powered wait-time prediction
- Self-service patient portal (booking, check-in, cancellation)
- Appointment lifecycle management with conflict detection
- Treatment recording with per-tooth surface tracking
- AI assistant (Google Gemini) for staff to query live clinic metrics
- Role-based access control (admin, dentist, receptionist)

## Documentation Index

| Document | Description |
| --- | --- |
| [01 - Overview & Architecture](01-overview.md) | High-level architecture, tech stack, system diagram |
| [02 - Getting Started](02-getting-started.md) | Setup, installation, running the app locally |
| [03 - Backend](03-backend.md) | FastAPI backend: structure, services, config |
| [04 - Frontend](04-frontend.md) | React frontend: pages, routing, state, real-time sync |
| [05 - Database & Models](05-database-models.md) | MongoDB schemas via Beanie ODM |
| [06 - API Reference](06-api-reference.md) | All REST endpoints, request/response shapes |
| [07 - Authentication & Roles](07-auth.md) | JWT auth flow, role-based access |
| [08 - Real-Time & WebSockets](08-realtime.md) | WebSocket protocol and frontend sync |
| [09 - AI & ML](09-ai-ml.md) | Gemini chat integration + wait-time prediction model |
| [10 - Scripts & Utilities](10-scripts.md) | Seeding, admin, and training scripts |
| [11 - Deployment](11-deployment.md) | Env vars, production concerns |
| [12 - Changelog](12-changelog.md) | Documentation changelog |
| [13 - Notifications (Telegram)](13-notifications.md) | Telegram bot setup, reminder + queue alerts, promo blasts |
| [14 - Features & Progress](14-features-progress.md) | Full feature list and current status |

## Keeping Documentation Up-to-Date

**Important:** This documentation must be updated whenever the codebase changes.

When you (Claude) work on this project, after any of the following, update the relevant doc:

| Change | File(s) to update |
| --- | --- |
| New/changed API route | [06-api-reference.md](06-api-reference.md) |
| New/changed Beanie model | [05-database-models.md](05-database-models.md) |
| New backend service or router | [03-backend.md](03-backend.md) |
| New frontend page/component/route | [04-frontend.md](04-frontend.md) |
| Auth or role change | [07-auth.md](07-auth.md) |
| WebSocket event change | [08-realtime.md](08-realtime.md) |
| ML model or AI prompt change | [09-ai-ml.md](09-ai-ml.md) |
| New env var / config | [02-getting-started.md](02-getting-started.md), [11-deployment.md](11-deployment.md) |
| Notification channel / template change | [13-notifications.md](13-notifications.md) |
| Feature completed / started / dropped | [14-features-progress.md](14-features-progress.md) |
| Route / page / component added | [04-frontend.md](04-frontend.md) |
| Design system / brand / copy tone change | [04-frontend.md](04-frontend.md) design-system section |
| Any change | Add a dated entry in [12-changelog.md](12-changelog.md) |
