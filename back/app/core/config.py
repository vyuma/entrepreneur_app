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


settings = Settings()
