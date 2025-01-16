from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///../data/storage.db"  # Используйте PostgreSQL или другую СУБД по мере необходимости

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}, 
    pool_size=10,      # Увеличьте размер пула
    max_overflow=20,   # Увеличьте лимит на переполнение
    pool_timeout=30    # Увеличьте таймаут
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Зависимость для получения сессии базы данных
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()