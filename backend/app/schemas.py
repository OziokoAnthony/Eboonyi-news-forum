from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ArticleCreate(BaseModel):
    title: str
    slug: str
    summary: str = ""
    body: str
    category: str
    article_type: str = "news"
    author: str = "Editorial Desk"
    source_note: str = ""
    image_url: str = ""
    video_url: str = ""
    lga_id: int | None = None
    community_id: int | None = None
    verified: bool = False
    published: bool = False
    scheduled_at: datetime | None = None

class ArticleOut(ArticleCreate):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LocationOut(BaseModel):
    id: int
    name: str
    slug: str
    lga_id: int | None = None
    model_config = ConfigDict(from_attributes=True)

class LiveOut(BaseModel):
    id: int
    title: str
    url: str
    is_active: bool
    started_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LiveStart(BaseModel):
    title: str
    url: str
