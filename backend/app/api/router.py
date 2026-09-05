from fastapi import APIRouter

from app.api import alerts, auth, detection_events, games, payments, posts, reports, sessions, shifts, system, workers


api_router = APIRouter(prefix="/api")
api_router.include_router(system.router)
api_router.include_router(auth.router)
api_router.include_router(workers.router)
api_router.include_router(posts.router)
api_router.include_router(games.router)
api_router.include_router(sessions.router)
api_router.include_router(payments.router)
api_router.include_router(detection_events.router)
api_router.include_router(alerts.router)
api_router.include_router(shifts.router)
api_router.include_router(reports.router)
