import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .database import Base, engine
from .routers import admin, articles, locations, live, settings

Base.metadata.create_all(bind=engine)

# Lightweight migration: add columns that don't exist yet in an older database.
def _ensure_columns():
    inspector = inspect(engine)
    if not inspector.has_table("articles"):
        return
    columns = {c["name"] for c in inspector.get_columns("articles")}
    statements = []
    if "scheduled_at" not in columns:
        statements.append("ALTER TABLE articles ADD COLUMN scheduled_at TIMESTAMP NULL")
    if "video_url" not in columns:
        statements.append("ALTER TABLE articles ADD COLUMN video_url VARCHAR(500) NULL DEFAULT ''")
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))

_ensure_columns()

MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

app = FastAPI(title="Ebonyi News Forum API", version="1.0.0",
              description="News, history and community archive for Ebonyi State.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5180"],
    allow_origin_regex=r"http://localhost:\d+",  # dev convenience: any localhost port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
app.include_router(articles.router)
app.include_router(locations.router)
app.include_router(admin.router)
app.include_router(live.router)
app.include_router(settings.router)

@app.get("/")
def health():
    return {"name": "Ebonyi News Forum API", "status": "running"}
