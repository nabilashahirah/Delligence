# 08 - Real-Time & WebSockets

## Endpoint

`ws://<host>:8000/ws` — handled by [app/routers/ws.py](../app/routers/ws.py).

## Connection Manager

[app/utils/ws_manager.py](../app/utils/ws_manager.py) exposes a singleton `ConnectionManager`:

- `connect(ws)` / `disconnect(ws)`
- `broadcast(payload: dict)` — sends the JSON payload to every active client.

## Event Types

### `refresh`
```json
{ "event": "refresh" }
```
Frontend invalidates queries: `queue`, `appointments`, `dashboard-stats`, `portal`.

### `queue_update`
```json
{ "event": "queue_update", "queue": [ ...queueItems ] }
```
Frontend merges the payload directly into React Query's `['queue']` cache (no network refetch).

## When Are Events Broadcast?

| Trigger | Event |
| --- | --- |
| Appointment created / updated / cancelled | `refresh` |
| Status transition (`checked-in`, `in-progress`, `completed`, etc.) | `queue_update` |
| Wait-time recalculation (`services/prediction.recalculate_queue`) | `queue_update` |
| Portal self check-in / self cancel | `refresh` + `queue_update` |

## Frontend Hook

[client/src/hooks/useRealtimeSync.js](../client/src/hooks/useRealtimeSync.js):

- Opens the socket on mount, closes on unmount.
- Auto-reconnects after 3 seconds if the socket closes.
- Handles both event types described above.

Mount the hook once inside the authenticated layout so it lives for the whole session.
