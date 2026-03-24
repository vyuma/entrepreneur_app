from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class ActivityCreate(BaseModel):
    activity_date_start: date
    activity_date_end: date
    event_name: str
    outcome: str
    claim_text: str
    total_participants: int = Field(ge=1)


class ActivityApprove(BaseModel):
    points: int = Field(ge=0)


class ActivityResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    user_id: str
    activity_date_start: date
    activity_date_end: date
    event_name: str
    outcome: str
    claim_text: str
    total_participants: int
    status: str
    points_awarded: Optional[int]
    reviewed_at: Optional[datetime]
    created_at: datetime
