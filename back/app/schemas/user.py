from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class UserCreate(BaseModel):
    discord_id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserChannelUpdate(BaseModel):
    discord_channel_id: str


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    discord_id: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    business_desc: Optional[str]
    sns_links: Optional[dict]
    discord_channel_id: Optional[str]
    portfolio_public: bool = False
    display_tier: Optional[str] = None
    created_at: datetime
