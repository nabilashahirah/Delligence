# 05 - Database & Models

MongoDB collections modelled with **Beanie**. Sources: [app/models/](../app/models/).

## Patient — [app/models/patient.py](../app/models/patient.py)

| Field | Type | Notes |
| --- | --- | --- |
| `first_name` | str | indexed (composite w/ last_name) |
| `last_name` | str | |
| `date_of_birth` | date | |
| `gender` | str | male / female / other |
| `id_type` | str | `ic` or `passport` |
| `id_number` | str | **unique** |
| `phone` | str | indexed |
| `email` | str? | |
| `address` | str? | |
| `medical_history` | dict | `{allergies, conditions, medications, notes}` |
| `registered_at` | datetime | default = now |
| `is_active` | bool | soft-delete flag |
| `telegram_chat_id` | str? | set after patient links via deep link |
| `telegram_link_token` | str? | one-time token for `/start` payload |
| `telegram_linked_at` | datetime? | when linking completed |
| `telegram_optout` | bool | `/stop` sets to true |

## Staff — [app/models/staff.py](../app/models/staff.py)

| Field | Type | Notes |
| --- | --- | --- |
| `name` | str | |
| `email` | EmailStr | **unique** |
| `password` | str | bcrypt hash; excluded from API responses |
| `role` | str | `admin`, `dentist`, `receptionist` |
| `is_active` | bool | |
| `created_at` | datetime | |

## Appointment — [app/models/appointment.py](../app/models/appointment.py)

| Field | Type | Notes |
| --- | --- | --- |
| `patient_id` | PydanticObjectId | ref to Patient |
| `dentist` | str | dentist name |
| `scheduled_at` | datetime | |
| `duration_minutes` | int | default scheduled duration |
| `type` | str | `checkup`, `cleaning`, `filling`, `extraction`, `root-canal`, `consultation`, `other` |
| `status` | str | `scheduled`, `checked-in`, `in-progress`, `completed`, `cancelled`, `no-show` |
| `notes` | str? | |
| `cancellation_reason` | str? | |
| `walk_in` | bool | |
| `predicted_wait_minutes` | int? | populated by ML predictor |
| `actual_wait_minutes` | int? | recorded when appointment starts |
| `checked_in_at` | datetime? | |
| `started_at` | datetime? | |
| `completed_at` | datetime? | |

**Indexes:** `scheduled_at + status`, `patient_id + scheduled_at`, `dentist + scheduled_at`.

**Status transitions:** see [03-backend.md](03-backend.md#status-transition-rules).

## Treatment — [app/models/treatment.py](../app/models/treatment.py)

| Field | Type | Notes |
| --- | --- | --- |
| `appointment_id` | PydanticObjectId | **unique** |
| `patient_id` | PydanticObjectId | indexed |
| `dentist` | str | |
| `procedure` | str | |
| `teeth` | list[ToothRecord] | see below |
| `diagnosis` | str? | |
| `findings` | str? | |
| `prescriptions` | list[Prescription] | see below |
| `cost` | float? | |
| `follow_up_date` | date? | |
| `attachments` | list[str] | URLs/paths |
| `created_at` | datetime | |

## MessageLog — [app/models/message_log.py](../app/models/message_log.py)

Audit log for every notification the system sends. Also used for deduplication (don't send the same `event` twice per appointment).

| Field | Type | Notes |
| --- | --- | --- |
| `patient_id` | PydanticObjectId? | who received it |
| `appointment_id` | PydanticObjectId? | which appointment (for reminders/queue events) |
| `channel` | str | `telegram` (only channel today) |
| `event` | str | `reminder_24h`, `checked_in`, `you_are_next`, `called_in`, `promo` |
| `text` | str | actual message body |
| `status` | str | `sent`, `failed`, `skipped` (opt-out) |
| `error` | str? | error message on failure |
| `sent_at` | datetime | |

**Indexes:** `appointment_id + event` (dedup), `patient_id + sent_at`, `sent_at`.

## Sub-schemas

**ToothRecord:**
```
{ tooth_number: int, surfaces: [mesial|distal|occlusal|buccal|lingual], notes?: str }
```

**Prescription:**
```
{ drug: str, dosage: str, frequency: str, duration: str }
```
