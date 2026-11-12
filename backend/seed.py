from app.database import Base, engine, SessionLocal
from app.models import LocalGovernment, Article

LGAS = [
    "Abakaliki", "Afikpo North", "Afikpo South", "Ebonyi", "Ezza North",
    "Ezza South", "Ikwo", "Ishielu", "Ivo", "Izzi", "Ohaozara", "Ohaukwu", "Onicha"
]

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    for name in LGAS:
        slug = name.lower().replace(" ", "-")
        if not db.query(LocalGovernment).filter_by(slug=slug).first():
            db.add(LocalGovernment(name=name, slug=slug))
    db.commit()
    if not db.query(Article).first():
        db.add(Article(
            title="Welcome to Ebonyi News Forum",
            slug="welcome-to-ebonyi-news-forum",
            summary="A growing digital archive for the stories, people, communities and history of Ebonyi State.",
            body="This is demonstration content. Replace it with a properly researched and verified editorial article. Every historical entry should carry its sources and verification status.",
            category="Community",
            article_type="history",
            author="Editorial Desk",
            source_note="Demo content — not a historical claim.",
            verified=False,
            published=True,
        ))
        db.commit()
finally:
    db.close()
print("Database seeded.")
