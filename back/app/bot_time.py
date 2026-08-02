"""作業時間報告の Discord スラッシュコマンド。

- /time 時間 分       : 作業時間を記録する（どちらか片方だけでも可）
- /time テキスト:...  : 「3時間20分」のような文章でも記録できる

自分専用チャンネルへのメッセージ投稿でも記録できるが（bot.py の on_message）、
チャンネルを問わず使えて記録内容も明示できるよう、コマンドからも報告できる。
"""

import logging

import discord
from discord import app_commands
from discord.ext import commands

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.time_log import TimeLog
from app.models.user import User
from app.services.time_parse import (
    MAX_MINUTES,
    format_duration,
    parse_minutes,
    praise_for,
)

logger = logging.getLogger(__name__)

BRAND_GREEN = 0x2EA84A


def _find_user(db, discord_id: str) -> User | None:
    return db.query(User).filter(User.discord_id == discord_id).first()


def _resolve_minutes(hours: int | None, minutes: int | None, text: str | None) -> int:
    """コマンドの入力から記録する分数を決める。

    時間・分の指定があればそれを優先し、無ければテキストを解析する。
    """
    total = (hours or 0) * 60 + (minutes or 0)
    if total == 0 and text:
        total = parse_minutes(text)
    return min(total, MAX_MINUTES)


class TimeCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="time", description="作業時間を報告します")
    @app_commands.describe(
        hours="作業した時間数（例: 2）",
        minutes="作業した分数（例: 30）",
        text="「3時間20分」のような文章でも記録できます",
    )
    @app_commands.rename(hours="時間", minutes="分", text="テキスト")
    async def time(
        self,
        interaction: discord.Interaction,
        hours: app_commands.Range[int, 0, 12] | None = None,
        minutes: app_commands.Range[int, 0, 720] | None = None,
        text: str | None = None,
    ) -> None:
        total = _resolve_minutes(hours, minutes, text)
        if total <= 0:
            await interaction.response.send_message(
                "記録する時間を読み取れませんでした。"
                "`時間` か `分` を指定するか、「3時間20分」のように入力してください。",
                ephemeral=True,
            )
            return

        db = SessionLocal()
        try:
            user = _find_user(db, str(interaction.user.id))
            if user is None:
                await interaction.response.send_message(
                    "アプリにログインしていません。", ephemeral=True
                )
                return

            db.add(TimeLog(user_id=user.id, minutes=total))
            db.commit()
        except Exception:
            logger.exception("Failed to record time log from slash command")
            db.rollback()
            await interaction.response.send_message(
                "記録に失敗しました。", ephemeral=True
            )
            return
        finally:
            db.close()

        embed = discord.Embed(
            title=f"⏱️ {format_duration(total)}を記録しました！",
            description=praise_for(total),
            color=BRAND_GREEN,
        )
        embed.set_footer(text=f"記録を見る: {settings.APP_URL}/dashboard")
        await interaction.response.send_message(embed=embed)


async def setup_time_commands(bot: commands.Bot) -> None:
    """Bot に Cog を登録する。コマンドの同期は呼び出し側でまとめて行う。"""
    await bot.add_cog(TimeCog(bot))
