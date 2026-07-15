from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models import Role
from app.schemas.common import ORMModel


class WorkerBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    username: str = Field(min_length=3, max_length=80)
    email: str = Field(min_length=3, max_length=255)
    phone_number: str = Field(min_length=1, max_length=40)
    role: Role = Role.worker
    is_active: bool = True


class WorkerCreate(WorkerBase):
    temporary_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def validate_password_match(self) -> "WorkerCreate":
        if self.temporary_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class WorkerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    username: str | None = Field(default=None, min_length=3, max_length=80)
    email: str | None = Field(default=None, min_length=3, max_length=255)
    phone_number: str | None = Field(default=None, min_length=1, max_length=40)
    role: Role | None = None
    is_active: bool | None = None


class WorkerRead(ORMModel):
    id: int
    name: str
    username: str
    email: str
    phone_number: str
    role: Role
    is_active: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime
