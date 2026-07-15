from pydantic import BaseModel


class RevenueBreakdown(BaseModel):
    id: int
    name: str
    expected_revenue: float
    paid_revenue: float


class GameUsage(BaseModel):
    id: int
    name: str
    sessions_count: int


class MatchTotals(BaseModel):
    detected: int
    declared: int


class DashboardReport(BaseModel):
    today_expected_revenue: float
    today_paid_revenue: float
    today_difference: float
    active_sessions_count: int
    open_alerts_count: int
    revenue_by_worker: list[RevenueBreakdown]
    revenue_by_post: list[RevenueBreakdown]
    most_played_games: list[GameUsage]
    detected_vs_declared_matches: MatchTotals
