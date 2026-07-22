"""管理者権限の判定。

権限レベルは3段階:
- master : 環境変数 MASTER_DISCORD_ID で指定された唯一のユーザー。
           権限の付与/剥奪ができるのは master のみ。DBを書き換えても奪えない。
- admin  : users.role == "admin"。運営操作（イベント追加・ポイント付与・
           ユーザー削除・ポートフォリオ設定）ができる。
- member : 一般ユーザー。

すべての管理APIは discord_id をクエリで受け取り、ここで実際の権限を照合する。
フロントは Server Action 経由でセッション由来の discord_id しか渡さないため、
クライアントから他人になりすますことはできない。
"""

from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

ROLE_MASTER = "master"
ROLE_ADMIN = "admin"
ROLE_MEMBER = "member"


@dataclass
class Actor:
    """管理APIの操作者。"""

    discord_id: str
    role: str
    user: Optional[User]

    @property
    def is_master(self) -> bool:
        return self.role == ROLE_MASTER

    @property
    def is_admin(self) -> bool:
        # master は admin の権限をすべて含む
        return self.role in (ROLE_ADMIN, ROLE_MASTER)


def verify_token(x_internal_token: str = Header(...)) -> None:
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


def resolve_role(user: Optional[User], discord_id: str) -> str:
    """環境変数の master を最優先で判定する。"""
    master_id = settings.MASTER_DISCORD_ID
    if master_id and discord_id == master_id:
        return ROLE_MASTER
    if user is None:
        return ROLE_MEMBER
    # 削除済みユーザーは権限を失う
    if user.deleted_at is not None:
        return ROLE_MEMBER
    return user.role if user.role in (ROLE_ADMIN, ROLE_MEMBER) else ROLE_MEMBER


def get_actor(
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
) -> Actor:
    """discord_id から操作者を解決する。権限チェックはしない。"""
    user = db.query(User).filter(User.discord_id == discord_id).first()
    return Actor(discord_id=discord_id, role=resolve_role(user, discord_id), user=user)


def require_admin(actor: Actor = Depends(get_actor)) -> Actor:
    if not actor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作には管理者権限が必要です",
        )
    return actor


def require_master(actor: Actor = Depends(get_actor)) -> Actor:
    if not actor.is_master:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作には master 権限が必要です",
        )
    return actor
