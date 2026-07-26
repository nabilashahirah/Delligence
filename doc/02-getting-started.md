# 02 - Getting Started

## Prerequisites

- **Python 3.10+** (for FastAPI backend)
- **Node.js 18+** (for Vite/React frontend)
- **MongoDB** — either a MongoDB Atlas cluster or a local `mongod` instance

## Backend Setup

```powershell
# From project root
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the project root:

```
ENV=development
PORT=8000
MONGO_URI=mongodb://localhost:27017/dentelligence
LOG_LEVEL=INFO
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_MINUTES=10080
GEMINI_API_KEY=your_google_gemini_api_key
```

| Variable | Description | Default |
| --- | --- | --- |
| `ENV` | Deploy environment (`development` / `production`) | `development` |
| `PORT` | Backend HTTP port | `8000` |
| `MONGO_URI` | MongoDB connection string | — (required) |
| `LOG_LEVEL` | loguru level | `INFO` |
| `JWT_SECRET` | Secret used to sign JWT tokens | — (required) |
| `JWT_EXPIRES_MINUTES` | Token lifetime in minutes | `10080` (7 days) |
| `GEMINI_API_KEY` | Google Gemini API key for AI chat | — (required for `/ai`) |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot token from @BotFather | — (optional; disables Telegram if empty) |
| `TELEGRAM_BOT_USERNAME` | Bot username without `@` (e.g. `DentelligenceBot`) | — |
| `TELEGRAM_WEBHOOK_SECRET` | Shared secret for webhook verification | — (optional but recommended) |
| `PUBLIC_PORTAL_URL` | Public URL where patients open the portal | `http://localhost:5173/portal` |
| `REMINDER_HOURS_BEFORE` | Hours before appointment to send reminder | `24` |
| `SCHEDULER_INTERVAL_MINUTES` | How often the reminder scanner runs | `5` |

### Seed the Database

```powershell
python seed.py         # Create admin@dentelligence.com / secret123
python seed_demo.py    # (optional) Load demo patients + appointments
```

### Train the ML Model (optional)

```powershell
python scripts/generate_and_train.py
# Produces models/wait_time_model.pkl
```

Without a trained model, the system falls back to historical averages or scheduled durations.

### Run the Backend

```powershell
uvicorn app.main:app --reload --port 8000
```

- API root: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/api/docs`
- Health check: `http://localhost:8000/health`

## Frontend Setup

```powershell
cd client
npm install
npm run dev
```

Vite dev server default: `http://localhost:5173` (see [04-frontend.md](04-frontend.md) for any proxy config).

### Frontend Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Default Login

After `seed.py`:

- **Email:** `admin@dentelligence.com`
- **Password:** `secret123`

To reset, run `python reset_password.py` (sets to `Admin@123`).
