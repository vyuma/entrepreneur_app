from typing import Optional
from pydantic import BaseModel


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    business_desc: Optional[str] = None
    sns_links: Optional[dict] = None
