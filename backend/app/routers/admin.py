import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Article
from ..schemas import ArticleCreate, ArticleOut

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
# backend/media — parents[2] from backend/app/routers/admin.py
MEDIA_DIR = Path(__file__).resolve().parents[2] / "media"
MAX_IMAGE_MB = 10
MAX_VIDEO_MB = 120


def verify_admin(x_admin_token: str = Header(default="")):
    """Simple header-token gate. Replace with real auth/roles before public launch."""
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN is not configured on the server")
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")


router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(verify_admin)])


@router.get("/session")
def check_session():
    return {"ok": True}


@router.post("/upload")
def upload_media(file: UploadFile, kind: str = Query(default="image", pattern="^(image|video)$")):
    """Upload an image or video; returns a /media/... URL for article fields."""
    os.makedirs(MEDIA_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower()[:10]
    content_type = file.content_type or ""

    if kind == "image":
        allowed = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"}
        if not (content_type.startswith("image/") or ext in allowed):
            raise HTTPException(status_code=400, detail="File is not a supported image")
        max_bytes = MAX_IMAGE_MB * 1024 * 1024
    else:
        allowed = {".mp4", ".webm", ".ogg", ".mov", ".m4v"}
        if not (content_type.startswith("video/") or ext in allowed):
            raise HTTPException(status_code=400, detail="File is not a supported video")
        max_bytes = MAX_VIDEO_MB * 1024 * 1024

    name = f"{uuid.uuid4().hex}{ext or ('.mp4' if kind == 'video' else '.jpg')}"
    path = MEDIA_DIR / name
    size = 0
    with open(path, "wb") as out:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                out.close()
                os.remove(path)
                raise HTTPException(status_code=413, detail=f"File too large (max {MAX_IMAGE_MB if kind == 'image' else MAX_VIDEO_MB} MB)")
            out.write(chunk)
    return {"url": f"/media/{name}", "size": size}


def ensure_unique_slug(db: Session, slug: str, exclude_id: int | None = None):
    query = db.query(Article).filter(Article.slug == slug)
    if exclude_id is not None:
        query = query.filter(Article.id != exclude_id)
    if query.first():
        raise HTTPException(status_code=409, detail=f"Slug '{slug}' already exists")


@router.get("/articles", response_model=list[ArticleOut])
def admin_list_articles(limit: int = 200, db: Session = Depends(get_db)):
    """All articles, including drafts and unpublished."""
    return db.query(Article).order_by(Article.created_at.desc()).limit(limit).all()


@router.post("/articles", response_model=ArticleOut, status_code=201)
def admin_create_article(payload: ArticleCreate, db: Session = Depends(get_db)):
    ensure_unique_slug(db, payload.slug)
    article = Article(**payload.model_dump())
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.put("/articles/{article_id}", response_model=ArticleOut)
def admin_update_article(article_id: int, payload: ArticleCreate, db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    ensure_unique_slug(db, payload.slug, exclude_id=article_id)
    for field, value in payload.model_dump().items():
        setattr(article, field, value)
    db.commit()
    db.refresh(article)
    return article


class PublishPatch(BaseModel):
    published: bool


@router.patch("/articles/{article_id}/publish", response_model=ArticleOut)
def admin_set_published(article_id: int, payload: PublishPatch, db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article.published = payload.published
    db.commit()
    db.refresh(article)
    return article


@router.delete("/articles/{article_id}", status_code=204)
def admin_delete_article(article_id: int, db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    return None
