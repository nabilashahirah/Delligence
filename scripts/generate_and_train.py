"""
Generate synthetic dental appointment data and train a wait-time prediction model.

Run once from the project root:
    python scripts/generate_and_train.py

Output: models/wait_time_model.pkl

The model predicts appointment *duration* (minutes) given:
    - appointment type  (categorical → integer index)
    - dentist           (categorical → integer index)
    - hour of day       (9–17)
    - day of week       (0=Mon … 4=Fri)
    - queue depth       (patients ahead at check-in time)

Swap this script for one that pulls real MongoDB data when enough records exist.
"""

import os
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib

np.random.seed(42)
N = 2000

APPT_TYPES = ['checkup', 'cleaning', 'filling', 'extraction', 'root-canal', 'consultation', 'other']
DENTISTS   = ['Dr. Amir', 'Dr. Sarah', 'Dr. Wong', 'Dr. Priya']

# Realistic (mean, std) duration in minutes per appointment type
TYPE_BASE: dict[str, tuple[float, float]] = {
    'checkup':      (20.0, 4.0),
    'cleaning':     (45.0, 8.0),
    'filling':      (60.0, 12.0),
    'extraction':   (40.0, 10.0),
    'root-canal':   (90.0, 20.0),
    'consultation': (15.0, 4.0),
    'other':        (30.0, 8.0),
}

# Dentist speed multipliers  (< 1 = faster, > 1 = slower)
DENTIST_SPEED: dict[str, float] = {
    'Dr. Amir':  1.00,
    'Dr. Sarah': 0.90,   # 10 % faster
    'Dr. Wong':  1.10,   # 10 % slower
    'Dr. Priya': 0.95,
}

# Appointment type probabilities (must sum to 1)
TYPE_PROBS = [0.25, 0.15, 0.20, 0.10, 0.08, 0.12, 0.10]

# ── Generate synthetic records ────────────────────────────────────────────────
records = []
for _ in range(N):
    t_idx  = int(np.random.choice(len(APPT_TYPES), p=TYPE_PROBS))
    d_idx  = np.random.randint(0, len(DENTISTS))
    hour   = int(np.random.choice(range(9, 18)))  # clinic hours 09:00–17:00
    dow    = np.random.randint(0, 5)               # Mon–Fri
    qdepth = np.random.randint(0, 8)               # 0–7 patients ahead

    appt_type = APPT_TYPES[t_idx]
    dentist   = DENTISTS[d_idx]

    mean_dur, std_dur = TYPE_BASE[appt_type]
    speed        = DENTIST_SPEED[dentist]
    hour_factor  = 1.05 if hour >= 14 else 1.0   # afternoon fatigue +5 %
    depth_factor = 1.0 + qdepth * 0.01            # deeper queue +1 % per patient

    actual = np.random.normal(mean_dur * speed * hour_factor * depth_factor, std_dur)
    actual = max(5.0, actual)

    records.append([t_idx, d_idx, hour, dow, qdepth, actual])

data = np.array(records)
X, y = data[:, :5], data[:, 5]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ── Train ─────────────────────────────────────────────────────────────────────
model = GradientBoostingRegressor(
    n_estimators=200, max_depth=4, learning_rate=0.05,
    subsample=0.8, random_state=42,
)
model.fit(X_train, y_train)

mae = mean_absolute_error(y_test, model.predict(X_test))
print(f"Test MAE: {mae:.1f} min  (on {len(X_test)} held-out samples)")

# ── Save ──────────────────────────────────────────────────────────────────────
os.makedirs('models', exist_ok=True)
model_path = os.path.join('models', 'wait_time_model.pkl')
joblib.dump(model, model_path)
print(f"Model saved: {model_path}")

# ── Sanity-check predictions ──────────────────────────────────────────────────
print("\nSample predictions:")
print(f"  {'Type':<15} {'Dentist':<12} {'Hour':>5} {'DoW':>4} {'Depth':>6}   {'Predicted':>10}")
samples = [
    ('checkup',      'Dr. Amir',   9, 0, 0),
    ('checkup',      'Dr. Sarah',  9, 0, 0),
    ('cleaning',     'Dr. Wong',  10, 1, 2),
    ('filling',      'Dr. Priya', 11, 2, 1),
    ('root-canal',   'Dr. Wong',  15, 3, 4),
    ('extraction',   'Dr. Amir',  14, 4, 3),
    ('consultation', 'Dr. Sarah', 16, 0, 0),
]
for t, d, h, dow_, q in samples:
    feat = [[APPT_TYPES.index(t), DENTISTS.index(d), h, dow_, q]]
    pred = model.predict(feat)[0]
    print(f"  {t:<15} {d:<12} {h:>5} {dow_:>4} {q:>6}   {pred:>9.1f} min")
