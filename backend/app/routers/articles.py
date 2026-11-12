from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from ..database import get_db
from ..models import Article
from ..schemas import ArticleCreate, ArticleOut
from .admin import verify_admin

router = APIRouter(prefix="/api/articles", tags=["articles"])

def visible_now():
    """Published now, OR scheduled and the scheduled time has arrived (auto-publish)."""
    return or_(
        Article.published.is_(True),
        and_(Article.scheduled_at.isnot(None), Article.scheduled_at <= datetime.utcnow()),
    )

@router.get("/", response_model=list[ArticleOut])
def list_articles(
    lga: str | None = None,
    community: str | None = None,
    category: str | None = None,
    article_type: str | None = None,
    q: str | None = Query(default=None, description="Search title, summary and body"),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Article).filter(visible_now())
    if lga:
        query = query.join_from(Article, __import__("app.models", fromlist=["LocalGovernment"]).LocalGovernment).filter(
            __import__("app.models", fromlist=["LocalGovernment"]).LocalGovernment.slug == lga
        )
    if community:
        query = query.join_from(Article, __import__("app.models", fromlist=["Community"]).Community).filter(
            __import__("app.models", fromlist=["Community"]).Community.slug == community
        )
    if category:
        query = query.filter(Article.category == category)
    if article_type:
        query = query.filter(Article.article_type == article_type)
    if q:
        term = f"%{q}%"
        query = query.filter(or_(Article.title.ilike(term), Article.summary.ilike(term), Article.body.ilike(term)))
    return query.order_by(Article.created_at.desc()).limit(limit).all()

@router.get("/{slug}", response_model=ArticleOut)
def get_article(slug: str, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.slug == slug, visible_now()).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@router.post("/", response_model=ArticleOut, status_code=201, dependencies=[Depends(verify_admin)])
def create_article(payload: ArticleCreate, db: Session = Depends(get_db)):
    # Protected with the admin token; replace with real auth/roles before public launch.
    from .admin import ensure_unique_slug
    ensure_unique_slug(db, payload.slug)
    article = Article(**payload.model_dump())
    db.add(article)
    db.commit()
    db.refresh(article)
    return article
