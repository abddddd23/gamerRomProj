# Gaming Room Manager — 0.9.0-beta

Gaming Room Manager tracks posts, sessions, games, payments, shifts, reports, and mismatch alerts. The AI/camera model is external; it submits authenticated events to the API.

## For testers: Windows standalone edition

Run `GamingRoomManager-Setup-x64.exe`, complete installation, launch the application, and create the first administrator account. No Python, Node.js, PostgreSQL, Docker, Git, or terminal commands are required. The app stores local data in `%LOCALAPPDATA%\GamingRoomManager`; use **About → Create database backup** before uninstalling.

See [tester installation instructions](docs/INSTALLATION.md).

## Stack

- Backend: FastAPI, SQLAlchemy 2.0, Alembic, JWT authentication
- Frontend: React, TypeScript, Vite, React Router, Axios
- Developer runtime: Docker Compose with PostgreSQL, backend, and frontend
- Standalone runtime: FastAPI serves the production UI and uses SQLite under LocalAppData

## Developer mode: Docker/PostgreSQL

```bash
docker compose up --build
```

The frontend runs at http://localhost:5173 and the API at http://localhost:8000.

## Developer mode: local backend/frontend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy ..\.env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
cd frontend; npm run build
```

## Windows installer build (developers)

Install Python, Node.js, and Inno Setup, then run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build_windows.ps1
```

The build runs checks, packages the Python runtime with PyInstaller, creates the Inno Setup installer, and writes `release\SHA256SUMS.txt`. See [detailed build instructions](docs/BUILD_WINDOWS.md).

## AI integration

AI workers call `POST /api/detection-events` with a worker/admin bearer token. They never access the database directly. See [AI integration](docs/AI_INTEGRATION.md).
