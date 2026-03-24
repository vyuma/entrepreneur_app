from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core import discord as discord_api
from app.models.user import User
from app.schemas.user import UserResponse
from app.schemas.profile import ProfileUpdate

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.put("", response_model=UserResponse)
def update_profile(
    discord_id: str,
    body: ProfileUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = db.query(User).filter(User.discord_id == discord_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.display_name is not None:
        user.display_name = body.display_name
    if body.bio is not None:
        user.bio = body.bio
    if body.business_desc is not None:
        user.business_desc = body.business_desc
    if body.sns_links is not None:
        user.sns_links = body.sns_links

    db.commit()
    db.refresh(user)

    background_tasks.add_task(
        discord_api.post_intro,
        discord_id=user.discord_id,
        display_name=user.display_name or user.username,
        bio=user.bio or "",
        business_desc=user.business_desc or "",
        sns_links=user.sns_links or {},
        avatar_url=user.avatar_url or "",
    )

    return user
