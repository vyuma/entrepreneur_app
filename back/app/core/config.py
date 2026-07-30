from typing import Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    DISCORD_BOT_TOKEN: str
    DISCORD_GUILD_ID: str
    DISCORD_ADMIN_CHANNEL_ID: str
    DISCORD_CATEGORY_ID: str
    DISCORD_INTRO_CHANNEL_ID: Optional[str] = None
    INTERNAL_API_SECRET: str
    # nuestar コンペAPI 用のトークン（x-admin-token ヘッダに乗せる）
    ADMIN_API_TOKEN: Optional[str] = None
    # master 権限を持つ唯一のユーザーの Discord ID。DBからは変更できない
    MASTER_DISCORD_ID: Optional[str] = None
    # Discord から開くアプリのURL（TODO の「アプリで開く」や times の案内文で使う）
    APP_URL: str = "https://entrepreneur-app.vercel.app"

    @field_validator("APP_URL")
    @classmethod
    def _strip_trailing_slash(cls, value: str) -> str:
        """末尾の / を落とす。f"{APP_URL}/todos" が // にならないようにする。"""
        return value.rstrip("/")


settings = Settings()
