"""コンペ関連の Discord スラッシュコマンドと通知。

- /competitions : 締切が近いコンペを3件表示
- /entry <url>  : 応募エントリを登録
- 締切3日前リマインド
- 成果 (achieve) 登録時のお祝い通知
"""

import logging
from datetime import date, datetime, timezone

import discord
from discord import app_commands
from discord.ext import commands, tasks

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.competition_entry import CompetitionEntry
from app.models.user import User
from app.services import competitions as comp_api

logger = logging.getLogger(__name__)

# 締切の何日前にリマインドするか
REMIND_DAYS = 3
# リマインド・お祝いの巡回間隔（秒）
NOTIFY_INTERVAL = 60 * 30

BRAND_GREEN = 0x2EA84A
BRAND_ORANGE = 0xE85A1C
BRAND_BLUE = 0x1D6FCE


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _competition_embed(items: list[dict]) -> discord.Embed:
    embed = discord.Embed(
        title="締切が近いコンペ",
        color=BRAND_GREEN,
    )
    if not items:
        embed.description = "締切が近いコンペは見つかりませんでした。"
        return embed

    for c in items:
        deadline = c.get("deadline_date") or c.get("event_date_date") or "日程未定"
        prize = c.get("prize") or (
            f"{c['prize_amount']:,}円" if c.get("prize_amount") else "—"
        )
        embed.add_field(
            name=c.get("name") or "（名称不明）",
            value=f"締切: {deadline}\n賞金: {prize}\n{c.get('url', '')}",
            inline=False,
        )
    return embed


async def _user_channel(bot: commands.Bot, user: User) -> discord.abc.Messageable | None:
    """ユーザー専用チャンネル。無ければ None。"""
    if not user.discord_channel_id:
        return None
    try:
        channel = bot.get_channel(int(user.discord_channel_id))
        if channel is None:
            channel = await bot.fetch_channel(int(user.discord_channel_id))
        return channel
    except Exception:
        logger.exception("Failed to resolve channel for user %s", user.id)
        return None


class CompetitionCog(commands.Cog):
    """コンペ検索・応募登録・リマインドをまとめた Cog。"""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        # 同一エントリに何度もリマインドしないための記録 (entry_id -> 送信日)
        self._reminded: dict[str, date] = {}
        self._celebrated: set[str] = set()
        self.notify_loop.start()

    async def cog_unload(self) -> None:
        self.notify_loop.cancel()

    @app_commands.command(
        name="competitions", description="締切が近いコンペを3件表示します"
    )
    async def competitions(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(thinking=True)
        try:
            items, _at = comp_api.list_competitions(upcoming=True, sort="deadline")
        except comp_api.CompetitionAPIError:
            await interaction.followup.send(
                "コンペ情報を取得できませんでした。時間をおいてお試しください。"
            )
            return

        await interaction.followup.send(embed=_competition_embed(items[:3]))

    @app_commands.command(name="entry", description="コンペの応募エントリを登録します")
    @app_commands.describe(url="コンペのURL", name="コンペ名（省略時はURLから推定）")
    async def entry(
        self,
        interaction: discord.Interaction,
        url: str,
        name: str | None = None,
    ) -> None:
        await interaction.response.defer(thinking=True, ephemeral=True)

        db = SessionLocal()
        try:
            user = (
                db.query(User).filter(User.discord_id == str(interaction.user.id)).first()
            )
            if not user:
                await interaction.followup.send(
                    "アプリにログインしていません。先にWebアプリでログインしてください。",
                    ephemeral=True,
                )
                return

            existing = (
                db.query(CompetitionEntry)
                .filter(
                    CompetitionEntry.user_id == user.id,
                    CompetitionEntry.url == url,
                )
                .first()
            )
            if existing:
                await interaction.followup.send(
                    "このコンペは既に登録済みです。", ephemeral=True
                )
                return

            # 外部APIから同じURLのコンペを探してメタ情報を補完する
            deadline = None
            event_day = None
            competition_id = None
            resolved_name = name
            try:
                items, _at = comp_api.list_competitions(upcoming=False, sort="deadline")
                match = next((c for c in items if c.get("url") == url), None)
                if match:
                    competition_id = match.get("id")
                    resolved_name = resolved_name or match.get("name")
                    deadline = match.get("deadline_date")
                    event_day = match.get("event_date_date")
            except comp_api.CompetitionAPIError:
                pass

            entry = CompetitionEntry(
                user_id=user.id,
                competition_id=competition_id,
                url=url,
                name=resolved_name or url,
                status="challenge",
                deadline_date=deadline,
                event_date_date=event_day,
            )
            db.add(entry)
            db.commit()

            await interaction.followup.send(
                f"「{entry.name}」を応募として登録しました。", ephemeral=True
            )
        except Exception:
            logger.exception("Failed to create entry from Discord")
            db.rollback()
            await interaction.followup.send("登録に失敗しました。", ephemeral=True)
        finally:
            db.close()

    @tasks.loop(seconds=NOTIFY_INTERVAL)
    async def notify_loop(self) -> None:
        """締切リマインドと成果のお祝いを送信する。"""
        if not self.bot.is_ready():
            return

        db = SessionLocal()
        try:
            today = date.today()
            entries = (
                db.query(CompetitionEntry, User)
                .join(User, User.id == CompetitionEntry.user_id)
                .all()
            )

            for entry, user in entries:
                if entry.status in ("challenge", "wait"):
                    await self._maybe_remind(entry, user, today)
                elif entry.status == "achieve":
                    await self._maybe_celebrate(entry, user)
        except Exception:
            logger.exception("Failed to run competition notify loop")
        finally:
            db.close()

    async def _maybe_remind(
        self, entry: CompetitionEntry, user: User, today: date
    ) -> None:
        deadline = _parse_date(entry.deadline_date)
        if deadline is None:
            return
        days_left = (deadline - today).days
        if days_left != REMIND_DAYS:
            return
        if self._reminded.get(entry.id) == today:
            return

        channel = await _user_channel(self.bot, user)
        if channel is None:
            return

        embed = discord.Embed(
            title="締切が近づいています",
            description=f"**{entry.name}**\n締切まで残り{days_left}日（{deadline}）\n{entry.url}",
            color=BRAND_ORANGE,
        )
        await channel.send(f"<@{user.discord_id}>", embed=embed)
        self._reminded[entry.id] = today

    async def _maybe_celebrate(self, entry: CompetitionEntry, user: User) -> None:
        if entry.id in self._celebrated:
            return
        # 直近24時間以内に確定したものだけを祝う（起動時の一斉送信を防ぐ）
        if entry.decided_at is None:
            self._celebrated.add(entry.id)
            return
        decided = entry.decided_at
        if decided.tzinfo is None:
            decided = decided.replace(tzinfo=timezone.utc)
        if (datetime.now(timezone.utc) - decided).total_seconds() > 86400:
            self._celebrated.add(entry.id)
            return

        channel = await _user_channel(self.bot, user)
        if channel is None:
            self._celebrated.add(entry.id)
            return

        embed = discord.Embed(
            title="🎉 成果おめでとうございます！",
            description=(
                f"**{entry.name}**\n"
                f"{entry.result or '成果を獲得しました'}\n\n"
                "活動実績として自動申請されました。管理者の承認をお待ちください。"
            ),
            color=BRAND_BLUE,
        )
        await channel.send(f"<@{user.discord_id}>", embed=embed)
        self._celebrated.add(entry.id)

    @notify_loop.before_loop
    async def before_notify_loop(self) -> None:
        await self.bot.wait_until_ready()


async def setup_competition_commands(bot: commands.Bot) -> None:
    """Bot に Cog を登録し、スラッシュコマンドをギルドへ同期する。"""
    await bot.add_cog(CompetitionCog(bot))
    guild = discord.Object(id=int(settings.DISCORD_GUILD_ID))
    bot.tree.copy_global_to(guild=guild)
    await bot.tree.sync(guild=guild)
