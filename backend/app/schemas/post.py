from datetime import datetime

from pydantic import BaseModel, Field

from app.models import PostStatus
from app.schemas.common import ORMModel


class PostBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    camera_url: str | None = Field(default=None, max_length=500)
    status: PostStatus = PostStatus.free


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    camera_url: str | None = Field(default=None, max_length=500)
    status: PostStatus | None = None


class PostRead(ORMModel):
    id: int
    name: str
    camera_url: str | None
    status: PostStatus
    created_at: datetime
