from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import SiteSetting
from .admin import verify_admin

router = APIRouter(tags=["settings"])

LOGO_KEY = "logo_url"

# Every site text/image the admin panel may edit. Anything outside this list is ignored.
ALLOWED_KEYS = {
    "logo_url",
    "site_name", "site_tagline", "topbar_text", "topbar_location",
    "hero_eyebrow", "hero_title", "hero_subtitle", "hero_cta_primary", "hero_cta_secondary", "hero_bg",
    "news_title", "news_subtitle",
    "features",
    "history_title", "history_text", "history_items",
    "contribute_title", "contribute_text", "contribute_email",
    "footer_about", "footer_values",
    "social_facebook", "social_instagram", "social_youtube",
    "ads_enabled", "ads_max_per_page",
}


def _all_settings(db: Session) -> dict[str, str]:
    rows = db.query(SiteSetting).filter(SiteSetting.key.in_(ALLOWED_KEYS)).all()
    return {row.key: row.value for row in rows}


def _upsert(db: Session, key: str, value: str) -> None:
    row = db.get(SiteSetting, key)
    if row is None:
        db.add(SiteSetting(key=key, value=value))
    else:
        row.value = value


@router.get("/api/branding")
def public_branding(db: Session = Depends(get_db)):
    """Public: all editable site branding/content, for the frontend."""
    return _all_settings(db)


@router.get("/api/admin/settings", dependencies=[Depends(verify_admin)])
def get_settings(db: Session = Depends(get_db)):
    return _all_settings(db)


class SettingsIn(BaseModel):
    values: dict[str, str]


@router.put("/api/admin/settings", dependencies=[Depends(verify_admin)])
def put_settings(payload: SettingsIn, db: Session = Depends(get_db)):
    """Upsert branding/content keys. Unknown keys are ignored; unset keys keep their value."""
    for key, value in payload.values.items():
        if key in ALLOWED_KEYS:
            _upsert(db, key, value)
    db.commit()
    return _all_settings(db)
