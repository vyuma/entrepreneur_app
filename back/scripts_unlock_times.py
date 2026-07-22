"""既存の times チャンネルをすべて公開（閲覧可・本人のみ書き込み）に直す。

使い方:  uv run python scripts_unlock_times.py
"""

from app.core import discord as discord_api
from app.core.database import SessionLocal
from app.models.user import User


def main() -> None:
    db = SessionLocal()
    try:
        users = (
            db.query(User)
            .filter(User.discord_channel_id.isnot(None), User.deleted_at.is_(None))
            .all()
        )
        print(f"対象: {len(users)}件")
        ok = 0
        for user in users:
            try:
                discord_api.unlock_user_channel(user.discord_channel_id, user.discord_id)
                print(f"  ✓ times-{user.username}")
                ok += 1
            except Exception as exc:
                print(f"  × times-{user.username}: {exc}")
        print(f"完了: {ok}/{len(users)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
