import logging

import discord
from discord.ext import commands, tasks

from app.bot_competitions import setup_competition_commands
from app.bot_goals import setup_goal_commands
from app.bot_todos import setup_todo_commands
from app.core import discord as discord_api
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.activity import Activity
from app.models.time_log import TimeLog
from app.models.user import User
from app.services.activity_review import approve_activity, get_activity_or_404, reject_activity
from app.services.time_parse import format_duration, parse_minutes, praise_for

logger = logging.getLogger(__name__)
POLL_SECONDS = 5


def _build_activity_embed(activity: Activity, user: User) -> discord.Embed:
    return discord.Embed.from_dict(
        discord_api.build_activity_embed(
            activity_id=activity.id,
            discord_id=user.discord_id,
            username=user.display_name or user.username,
            event_name=activity.event_name,
            outcome=activity.outcome,
            claim_text=activity.claim_text,
            total_participants=activity.total_participants,
            activity_date_start=activity.activity_date_start.isoformat(),
            activity_date_end=activity.activity_date_end.isoformat(),
            status=activity.status,
            points_awarded=activity.points_awarded,
        )
    )


def _build_reviewed_embed(
    activity: Activity,
    user: User,
    reviewer_id: str | None,
    reviewer_name: str | None,
) -> discord.Embed:
    return discord.Embed.from_dict(
        discord_api.build_activity_embed(
            activity_id=activity.id,
            discord_id=user.discord_id,
            username=user.display_name or user.username,
            event_name=activity.event_name,
            outcome=activity.outcome,
            claim_text=activity.claim_text,
            total_participants=activity.total_participants,
            activity_date_start=activity.activity_date_start.isoformat(),
            activity_date_end=activity.activity_date_end.isoformat(),
            status=activity.status,
            reviewer_id=reviewer_id,
            reviewer_name=reviewer_name,
            points_awarded=activity.points_awarded,
        )
    )


def _can_review(interaction: discord.Interaction) -> bool:
    user = interaction.user
    if isinstance(user, discord.Member):
        perms = user.guild_permissions
        return perms.administrator or perms.manage_guild
    return False


async def _notify_result(bot: commands.Bot, user: User, status: str, points: int | None) -> None:
    try:
        discord_user = await bot.fetch_user(int(user.discord_id))
        if status == "approved":
            message = f"活動実績が承認されました。付与ポイント: {points or 0} pt"
        else:
            message = "活動実績は却下されました。"
        await discord_user.send(message)
    except Exception as exc:
        logger.warning("Failed to DM user %s: %s", user.discord_id, exc)


async def _apply_review(
    bot: commands.Bot,
    interaction: discord.Interaction,
    activity_id: str,
    action: str,
    points: int | None = None,
) -> str:
    if not _can_review(interaction):
        return "管理権限を持つユーザーのみ操作できます。"

    db = SessionLocal()
    try:
        activity = get_activity_or_404(db, activity_id)
        user = db.query(User).filter(User.id == activity.user_id).first()
        if not user:
            return "ユーザーが見つかりません。"

        reviewer_name = interaction.user.display_name if isinstance(interaction.user, discord.Member) else interaction.user.name
        if action == "approve":
            if points is None:
                return "ポイントが指定されていません。"
            activity = approve_activity(db, activity, points)
        else:
            activity = reject_activity(db, activity)

        embed = _build_reviewed_embed(activity, user, str(interaction.user.id), reviewer_name)
        if interaction.message is not None:
            await interaction.message.edit(embed=embed, view=None)
        elif activity.discord_message_id:
            channel = bot.get_channel(int(settings.DISCORD_ADMIN_CHANNEL_ID))
            if channel is None:
                channel = await bot.fetch_channel(int(settings.DISCORD_ADMIN_CHANNEL_ID))
            if hasattr(channel, "fetch_message"):
                message = await channel.fetch_message(int(activity.discord_message_id))
                await message.edit(embed=embed, view=None)

        await _notify_result(bot, user, activity.status, activity.points_awarded)
        if activity.status == "approved":
            return f"承認しました。{activity.points_awarded or 0} pt を付与しました。"
        return "却下しました。"
    except Exception as exc:
        logger.exception("Failed to review activity %s", activity_id)
        return str(getattr(exc, "detail", exc))
    finally:
        db.close()


class ApproveActivityModal(discord.ui.Modal, title="ポイントを入力"):
    points = discord.ui.TextInput(
        label="付与ポイント",
        placeholder="10",
        required=True,
        max_length=5,
    )

    def __init__(self, bot: commands.Bot, activity_id: str):
        super().__init__(timeout=None)
        self.bot = bot
        self.activity_id = activity_id

    async def on_submit(self, interaction: discord.Interaction) -> None:
        try:
            points = int(self.points.value)
            if points < 0:
                raise ValueError
        except ValueError:
            await interaction.response.send_message("0以上の整数を入力してください。", ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True)
        message = await _apply_review(self.bot, interaction, self.activity_id, "approve", points)
        await interaction.followup.send(message, ephemeral=True)


class ActivityReviewView(discord.ui.View):
    def __init__(self, bot: commands.Bot, activity_id: str):
        super().__init__(timeout=None)
        self.bot = bot
        self.activity_id = activity_id

        approve_button = discord.ui.Button(
            label="承認",
            style=discord.ButtonStyle.success,
            custom_id=f"activity:approve:{activity_id}",
        )
        approve_button.callback = self._approve
        self.add_item(approve_button)

        reject_button = discord.ui.Button(
            label="却下",
            style=discord.ButtonStyle.danger,
            custom_id=f"activity:reject:{activity_id}",
        )
        reject_button.callback = self._reject
        self.add_item(reject_button)

    async def _approve(self, interaction: discord.Interaction) -> None:
        if not _can_review(interaction):
            await interaction.response.send_message("管理権限を持つユーザーのみ操作できます。", ephemeral=True)
            return
        await interaction.response.send_modal(ApproveActivityModal(self.bot, self.activity_id))

    async def _reject(self, interaction: discord.Interaction) -> None:
        if not _can_review(interaction):
            await interaction.response.send_message("管理権限を持つユーザーのみ操作できます。", ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True)
        message = await _apply_review(self.bot, interaction, self.activity_id, "reject")
        await interaction.followup.send(message, ephemeral=True)

    async def on_error(self, interaction: discord.Interaction, error: Exception, item: discord.ui.Item) -> None:
        logger.exception("Activity review interaction failed", exc_info=error)
        if interaction.response.is_done():
            await interaction.followup.send("処理に失敗しました。", ephemeral=True)
        else:
            await interaction.response.send_message("処理に失敗しました。", ephemeral=True)


class EntrepreneurBot(commands.Bot):
    def __init__(self) -> None:
        intents = discord.Intents.default()
        intents.guilds = True
        intents.messages = True
        intents.message_content = True
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self) -> None:
        await self._restore_pending_views()
        self.activity_poll.start()
        try:
            # TODO・目標の Cog を先に登録しておく。コマンドのギルド同期は
            # setup_competition_commands の最後でまとめて行われる。
            await setup_todo_commands(self)
            await setup_goal_commands(self)
        except Exception:
            logger.exception("Failed to register todo/goal commands")
        try:
            await setup_competition_commands(self)
        except Exception:
            logger.exception("Failed to register competition commands")

    async def on_ready(self) -> None:
        logger.info("Bot logged in as %s", self.user)

    async def on_message(self, message: discord.Message) -> None:
        """ユーザー専用チャンネルでの時間記録メッセージを処理"""
        if message.author.bot:
            return

        db = SessionLocal()
        try:
            # 送信者のDiscord IDでユーザーを検索
            user = db.query(User).filter(User.discord_id == str(message.author.id)).first()
            if not user or not user.discord_channel_id:
                return
            # 送信されたチャンネルが本人の専用チャンネルか確認
            if str(message.channel.id) != user.discord_channel_id:
                return

            minutes = parse_minutes(message.content)
            if minutes > 0:
                db.add(TimeLog(user_id=user.id, minutes=minutes))
                db.commit()
                await message.add_reaction("✅")
                await message.reply(
                    f"{format_duration(minutes)}を記録しました！{praise_for(minutes)}",
                    mention_author=False,
                )
        except Exception:
            logger.exception("Failed to process time log message")
        finally:
            db.close()

    async def _restore_pending_views(self) -> None:
        db = SessionLocal()
        try:
            activities = (
                db.query(Activity)
                .filter(Activity.status == "pending")
                .filter(Activity.discord_message_id.isnot(None))
                .all()
            )
            for activity in activities:
                self.add_view(ActivityReviewView(self, activity.id), message_id=int(activity.discord_message_id))
        finally:
            db.close()

    async def _admin_channel(self) -> discord.abc.Messageable:
        channel = self.get_channel(int(settings.DISCORD_ADMIN_CHANNEL_ID))
        if channel is None:
            channel = await self.fetch_channel(int(settings.DISCORD_ADMIN_CHANNEL_ID))
        return channel

    @tasks.loop(seconds=POLL_SECONDS)
    async def activity_poll(self) -> None:
        if not self.is_ready():
            return

        db = SessionLocal()
        try:
            pending = (
                db.query(Activity, User)
                .join(User, User.id == Activity.user_id)
                .filter(Activity.status == "pending")
                .filter(Activity.discord_message_id.is_(None))
                .order_by(Activity.created_at.asc())
                .all()
            )
            if not pending:
                return

            channel = await self._admin_channel()
            for activity, user in pending:
                view = ActivityReviewView(self, activity.id)
                message = await channel.send(embed=_build_activity_embed(activity, user), view=view)
                activity.discord_message_id = str(message.id)
                db.commit()
        except Exception:
            logger.exception("Failed to publish pending activities")
            db.rollback()
        finally:
            db.close()

    @activity_poll.before_loop
    async def before_activity_poll(self) -> None:
        await self.wait_until_ready()


bot = EntrepreneurBot()
