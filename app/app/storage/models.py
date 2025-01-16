from sqlalchemy import Column, Integer, String, Boolean
from storage.database import Base

class AppConfig(Base):
    __tablename__ = "config"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String)
    value = Column(String)
