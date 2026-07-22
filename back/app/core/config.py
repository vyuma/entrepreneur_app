from typing import Optional
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
    # 案内文に載せるアプリのURL
    APP_URL: str = "https://nuestar.yuma-dev.uk"


settings = Settings()
