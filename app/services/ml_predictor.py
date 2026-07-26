"""
ML-based appointment duration predictor.

Loads models/wait_time_model.pkl on startup. Gracefully falls back to the
statistical model in prediction.py when the file is missing.

To retrain on real data:
    python scripts/generate_and_train.py          # mock data (current)
    python scripts/train_from_db.py               # real data (future)
"""

import os
import numpy as np
from loguru import logger

APPT_TYPES = ['checkup', 'cleaning', 'filling', 'extraction', 'root-canal', 'consultation', 'other']
DENTISTS   = ['Dr. Amir', 'Dr. Sarah', 'Dr. Wong', 'Dr. Priya']

_MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'wait_time_model.pkl')
_model = None


def load() -> bool:
    global _model
    path = os.path.abspath(_MODEL_PATH)
    if not os.path.exists(path):
        logger.warning("ML model not found at {} — statistical fallback active", path)
        return False
    try:
        import joblib
        _model = joblib.load(path)
        logger.info("ML wait-time model loaded from {}", path)
        return True
    except Exception as e:
        logger.error("Failed to load ML model: {}", e)
        return False


def is_loaded() -> bool:
    return _model is not None


def predict_duration(
    appt_type: str,
    dentist: str,
    hour: int,
    day_of_week: int,
    queue_depth: int,
) -> int | None:
    """Return predicted appointment duration in minutes, or None if model not loaded."""
    if _model is None:
        return None
    t_idx = APPT_TYPES.index(appt_type) if appt_type in APPT_TYPES else len(APPT_TYPES) - 1
    d_idx = DENTISTS.index(dentist)     if dentist   in DENTISTS   else 0
    X     = np.array([[t_idx, d_idx, hour, day_of_week, queue_depth]], dtype=float)
    return max(5, int(_model.predict(X)[0]))
