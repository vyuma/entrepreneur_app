from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.core import discord as discord_api
from app.models.user import User
from app.schemas.user import UserCreate, UserChannelUpdate, UserResponse

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def _setup_new_user(user_id: str, discord_id: str, username: str, created_at: str) -> None:
    """新規ユーザーのチャンネル作成・DB更新・管理者通知をバックグラウンドで実行"""
    try:
        channel_id = discord_api.create_user_channel(discord_id, username)
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.discord_channel_id = channel_id
                db.commit()
        finally:
            db.close()
        discord_api.post_admin_notification(discord_id, username, created_at)
    except Exception as e:
        print(f"[Discord setup error] {e}")


@router.post("", response_model=UserResponse)
def upsert_user(
    body: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = db.query(User).filter(User.discord_id == body.discord_id).first()
    is_new = user is None
    if is_new:
        user = User(
            discord_id=body.discord_id,
            username=body.username,
            display_name=body.display_name,
            avatar_url=body.avatar_url,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if is_new:
        background_tasks.add_task(
            _setup_new_user,
            user_id=user.id,
            discord_id=user.discord_id,
            username=user.username,
            created_at=user.created_at.isoformat(),
        )

    return user


@router.get("/me", response_model=UserResponse)
def get_me(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = db.query(User).filter(User.discord_id == discord_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{discord_id}/channel", response_model=UserResponse)
def update_channel(discord_id: str, body: UserChannelUpdate, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = db.query(User).filter(User.discord_id == discord_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.discord_channel_id = body.discord_channel_id
    db.commit()
    db.refresh(user)
    return user
