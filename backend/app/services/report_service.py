from datetime import datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AlertStatus, Game, GamingSession, MismatchAlert, Post, SessionStatus, Worker
from app.schemas import DashboardReport, GameUsage, MatchTotals, RevenueBreakdown


def get_dashboard_report(db: Session) -> DashboardReport:
    today = datetime.utcnow().date()
    start = datetime.combine(today, time.min)
    end = start + timedelta(days=1)

    today_totals = db.execute(
        select(
            func.coalesce(func.sum(GamingSession.expected_amount), 0),
            func.coalesce(func.sum(GamingSession.paid_amount), 0),
        ).where(GamingSession.start_time >= start, GamingSession.start_time < end)
    ).one()

    active_sessions_count = db.scalar(
        select(func.count()).select_from(GamingSession).where(GamingSession.status == SessionStatus.active)
    )
    open_alerts_count = db.scalar(select(func.count()).select_from(MismatchAlert).where(MismatchAlert.status == AlertStatus.open))

    revenue_by_worker = [
        RevenueBreakdown(id=row[0], name=row[1], expected_revenue=float(row[2] or 0), paid_revenue=float(row[3] or 0))
        for row in db.execute(
            select(
                Worker.id,
                Worker.name,
                func.coalesce(func.sum(GamingSession.expected_amount), 0),
                func.coalesce(func.sum(GamingSession.paid_amount), 0),
            )
            .join(GamingSession, GamingSession.worker_id == Worker.id)
            .where(GamingSession.start_time >= start, GamingSession.start_time < end)
            .group_by(Worker.id, Worker.name)
            .order_by(func.coalesce(func.sum(GamingSession.expected_amount), 0).desc())
        )
    ]

    revenue_by_post = [
        RevenueBreakdown(id=row[0], name=row[1], expected_revenue=float(row[2] or 0), paid_revenue=float(row[3] or 0))
        for row in db.execute(
            select(
                Post.id,
                Post.name,
                func.coalesce(func.sum(GamingSession.expected_amount), 0),
                func.coalesce(func.sum(GamingSession.paid_amount), 0),
            )
            .join(GamingSession, GamingSession.post_id == Post.id)
            .where(GamingSession.start_time >= start, GamingSession.start_time < end)
            .group_by(Post.id, Post.name)
            .order_by(func.coalesce(func.sum(GamingSession.expected_amount), 0).desc())
        )
    ]

    most_played_games = [
        GameUsage(id=row[0], name=row[1], sessions_count=int(row[2] or 0))
        for row in db.execute(
            select(Game.id, Game.name, func.count(GamingSession.id))
            .join(GamingSession, GamingSession.game_id == Game.id)
            .where(GamingSession.start_time >= start, GamingSession.start_time < end)
            .group_by(Game.id, Game.name)
            .order_by(func.count(GamingSession.id).desc())
        )
    ]

    match_totals = db.execute(
        select(
            func.coalesce(func.sum(GamingSession.detected_match_count), 0),
            func.coalesce(func.sum(GamingSession.declared_match_count), 0),
        ).where(GamingSession.start_time >= start, GamingSession.start_time < end)
    ).one()

    expected = float(today_totals[0] or 0)
    paid = float(today_totals[1] or 0)

    return DashboardReport(
        today_expected_revenue=round(expected, 2),
        today_paid_revenue=round(paid, 2),
        today_difference=round(paid - expected, 2),
        active_sessions_count=int(active_sessions_count or 0),
        open_alerts_count=int(open_alerts_count or 0),
        revenue_by_worker=revenue_by_worker,
        revenue_by_post=revenue_by_post,
        most_played_games=most_played_games,
        detected_vs_declared_matches=MatchTotals(detected=int(match_totals[0] or 0), declared=int(match_totals[1] or 0)),
    )
