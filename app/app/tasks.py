from celery import Celery
import os

import storage.models as models, storage.schemas as schemas
from storage.database import SessionLocal

celery_broker_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')

celery = Celery(
    __name__,
    broker=celery_broker_url,
    backend=celery_broker_url
)

@celery.task    
def hello_world_task():
    print("Hello, World!")
    