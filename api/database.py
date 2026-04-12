from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
_using_sqlite_fallback = False

if not DATABASE_URL:
    print("⚠️  DATABASE_URL not found — falling back to local SQLite (./local.db)")
    DATABASE_URL = "sqlite:///./local.db"
    _using_sqlite_fallback = True

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def seed_sqlite_defaults():
    """Create a default root/root admin user when running on the SQLite fallback."""
    if not _using_sqlite_fallback:
        return

    import bcrypt
    from models import User, RoleEnum

    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == "root").first():
            return
        hashed = bcrypt.hashpw(b"root", bcrypt.gensalt()).decode("utf-8")
        root = User(
            username="root",
            email="root@localhost",
            hashed_password=hashed,
            role=RoleEnum.admin,
            valid=True,
            initial_capital=10000.0,
        )
        db.add(root)
        db.commit()
        print("✅  Default user created — username: root  password: root")
    finally:
        db.close()
