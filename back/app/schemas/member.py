from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MemberResponse(BaseModel):
    id: str
    discord_id: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    business_desc: Optional[str]
    sns_links: Optional[dict]
    created_at: datetime
    total_points: int = 0
    total_hours: int = 0
    skills: list[str] = []
    achievement_count: int = 0
    portfolio_public: bool = False
