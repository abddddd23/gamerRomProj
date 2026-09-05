from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import DetectionEventCreate, DetectionEventResult
from app.services.detection_service import create_detection_event


router = APIRouter(prefix="/detection-events", tags=["detection-events"])


@router.post("", response_model=DetectionEventResult, status_code=status.HTTP_201_CREATED)
def post_detection_event(
    payload: DetectionEventCreate,
    db: Session = Depends(get_db),
) -> DetectionEventResult:
    event, session = create_detection_event(db, payload)
    return DetectionEventResult(event=event, session=session)
