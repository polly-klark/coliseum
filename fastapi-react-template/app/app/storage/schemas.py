from pydantic import BaseModel
from typing import Optional

class AppConfigBase(BaseModel):
    key: str
    value: str
