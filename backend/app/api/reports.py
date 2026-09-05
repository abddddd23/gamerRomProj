from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.db.session import get_db
from app.models import Worker
from app.schemas import DashboardReport
from app.services.report_service import get_dashboard_report


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/dashboard", response_model=DashboardReport)
def dashboard_report(db: Session = Depends(get_db), _: Worker = Depends(require_admin)) -> DashboardReport:
    return get_dashboard_report(db)
