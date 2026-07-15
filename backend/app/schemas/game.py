from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models import GameCategory, PricingMode
from app.schemas.common import ORMModel


class GameBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    ai_label: str | None = Field(default=None, max_length=120)
    category: GameCategory
    pricing_mode: PricingMode
    price_per_match: float | None = Field(default=None, ge=0)
    price_per_hour: float | None = Field(default=None, ge=0)
    billing_unit_minutes: int | None = Field(default=None, ge=1)
    price_per_time_unit: float | None = Field(default=None, ge=0)
    is_active: bool = True

    @model_validator(mode="after")
    def validate_price(self) -> "GameBase":
        if self.pricing_mode == PricingMode.per_match and self.price_per_match is None:
            raise ValueError("price_per_match is required for per_match games")
        if (
            self.pricing_mode == PricingMode.per_time
            and self.price_per_time_unit is None
            and self.price_per_hour is None
        ):
            raise ValueError("price_per_time_unit or price_per_hour is required for per_time games")
        return self


class GameCreate(GameBase):
    pass


class GameUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    ai_label: str | None = Field(default=None, max_length=120)
    category: GameCategory | None = None
    pricing_mode: PricingMode | None = None
    price_per_match: float | None = Field(default=None, ge=0)
    price_per_hour: float | None = Field(default=None, ge=0)
    billing_unit_minutes: int | None = Field(default=None, ge=1)
    price_per_time_unit: float | None = Field(default=None, ge=0)
    is_active: bool | None = None


class GameRead(ORMModel):
    id: int
    name: str
    ai_label: str | None
    category: GameCategory
    pricing_mode: PricingMode
    price_per_match: float | None
    price_per_hour: float | None
    billing_unit_minutes: int | None
    price_per_time_unit: float | None
    is_active: bool
    created_at: datetime
