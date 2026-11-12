from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import LocalGovernment, Community
from ..schemas import LocationOut

router = APIRouter(prefix="/api/locations", tags=["locations"])

@router.get("/lgas", response_model=list[LocationOut])
def get_lgas(db: Session = Depends(get_db)):
    return db.query(LocalGovernment).order_by(LocalGovernment.name).all()

@router.get("/communities", response_model=list[LocationOut])
def get_communities(lga: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Community)
    if lga:
        query = query.join(LocalGovernment).filter(LocalGovernment.slug == lga)
    return query.order_by(Community.name).all()
