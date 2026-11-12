from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import LiveSession
from ..schemas import LiveOut, LiveStart
from .admin import verify_admin

router = APIRouter(prefix="/api/live", tags=["live"])


@router.get("/active", response_model=LiveOut | None)
def active_session(db: Session = Depends(get_db)):
    """Public: the live session currently on air, if any."""
    return db.query(LiveSession).filter(LiveSession.is_active.is_(True)).order_by(LiveSession.started_at.desc()).first()


@router.post("/start", response_model=LiveOut, status_code=201, dependencies=[Depends(verify_admin)])
def start_session(payload: LiveStart, db: Session = Depends(get_db)):
    # End any session that is already on air, then start the new one.
    for session in db.query(LiveSession).filter(LiveSession.is_active.is_(True)):
        session.is_active = False
        session.ended_at = datetime.utcnow()
    live = LiveSession(title=payload.title, url=payload.url, is_active=True)
    db.add(live)
    db.commit()
    db.refresh(live)
    return live


@router.post("/end", dependencies=[Depends(verify_admin)])
def end_session(db: Session = Depends(get_db)):
    sessions = db.query(LiveSession).filter(LiveSession.is_active.is_(True)).all()
    if not sessions:
        raise HTTPException(status_code=404, detail="No live session on air")
    for session in sessions:
        session.is_active = False
        session.ended_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "ended": len(sessions)}
