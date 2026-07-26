# 10 - Scripts & Utilities

All scripts assume the venv is activated and `.env` is populated.

## [seed.py](../seed.py)

Creates the initial admin account if none exists.

- Email: `admin@dentelligence.com`
- Password: `secret123`
- Role: `admin`

```powershell
python seed.py
```

## [seed_demo.py](../seed_demo.py)

Populates realistic demo data:

- 8 patients with Malaysian names, ICs, contacts
- ~60 completed historical appointments (past 3 weeks) with `actual_wait_minutes` recorded
- Today's live queue: 1 in-progress + 2 checked-in + 3 scheduled

Useful for demoing the queue view and giving the ML fallback historical averages to work with.

```powershell
python seed_demo.py
```

## [reset_password.py](../reset_password.py)

Resets the admin password to `Admin@123`.

```powershell
python reset_password.py
```

## [fix_staff.py](../fix_staff.py)

Sets `is_active=True` on every staff document. Used to recover from staff accounts stuck as inactive.

```powershell
python fix_staff.py
```

## [scripts/generate_and_train.py](../scripts/generate_and_train.py)

Generates 2000 synthetic appointments and trains a `GradientBoostingRegressor` to predict appointment durations. Writes `models/wait_time_model.pkl`.

Features: type, dentist, hour, day of week, queue depth.

```powershell
python scripts/generate_and_train.py
```

Re-run whenever you want to retrain (e.g., after collecting more real data).
