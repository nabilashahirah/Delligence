# 07 - Authentication & Roles

## Overview

- **Scheme:** stateless JWT (HS256) issued at login.
- **Storage (client):** `localStorage` via Zustand store.
- **Transport:** `Authorization: Bearer <token>` header on every request (attached by Axios interceptor).
- **Lifetime:** `JWT_EXPIRES_MINUTES` (default 10080 min = 7 days).

## Login Flow

1. Frontend `POST /api/v1/auth/login` with `{email, password}`.
2. Backend loads Staff by email → verifies bcrypt hash → issues JWT.
3. Response: `{token, staff}`. Frontend calls `setAuth(staff, token)`.
4. All subsequent requests include the token.
5. On `401`, Axios interceptor calls `logout()` and redirects to `/login`.

## JWT Payload

```json
{
  "sub": "<staff_id>",
  "role": "admin|dentist|receptionist",
  "exp": <unix_ts>
}
```

## Server-Side Auth — [app/dependencies/auth.py](../app/dependencies/auth.py)

- `get_current_user(Authorization=Header(...))` — decodes token, loads Staff, raises `401` if invalid / expired / inactive.
- `require_role(*roles)` — factory returning a dependency that raises `403` if the user's role is not in the allowed set.

Usage:
```python
@router.delete("/{id}", dependencies=[Depends(require_role("admin"))])
async def delete_patient(...): ...
```

## Roles

| Role | Typical Permissions |
| --- | --- |
| `admin` | Full access, staff management |
| `dentist` | Patient, appointment, treatment access |
| `receptionist` | Patient + appointment + queue management |

Role enforcement is applied per-route via `require_role`. Public portal routes (`/api/v1/public/*`) skip auth entirely.

## Password Hashing

`bcrypt` (rounds default) via `app/services/auth.py`. Hashed passwords are stored in `staff.password` and never returned (excluded in schemas).
