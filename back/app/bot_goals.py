"""目標の Discord スラッシュコマンド。

- /goal <目標> [期限] : 目標を作成し、続けて詳細入力のUI（モーダル）を出す
- /goals              : 自分の進行中の目標を一覧表示

タイトルはコマンドのテキスト引数で受け取り、詳細と期限はモーダルから任意で入力する。
編集・達成はアプリ側（/goals ページ）でも行える。
"""

import logging

import discord
from discord import app_commands
from discord.ext import commands

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.goal import GOAL_ACHIEVED, GOAL_ACTIVE, GOAL_DROPPED, Goal
from app.models.user import User
from app.services import goals as service

logger = logging.getLogger(__name__)

BRAND_GREEN = 0x2EA84A
BRAND_ORANGE = 0xE85A1C
BRAND_BLUE = 0x1D6FCE
# 一覧に出す目標の最大件数
LIST_LIMIT = 15
# 残り日数がこれ以下なら色を変えて急かす
URGENT_DAYS = 7

STATUS_MARKS = {
    GOAL_ACTIVE: "🎯",
    GOAL_ACHIEVED: "🏆",
    GOAL_DROPPED: "🗂️",
}


def _find_user(db, discord_id: str) -> User | None:
    return db.query(User).filter(User.discord_id == discord_id).first()


def _deadline_text(goal: Goal) -> str:
    """期限と残り日数を人が読める形にする。"""
    if goal.target_date is None:
        return "期限なし"
    left = service.days_left(goal)
    date_text = goal.target_date.strftime("%Y/%m/%d")
    if left is None:
        return date_text
    if left < 0:
        return f"{date_text}（{-left}日超過）"
    if left == 0:
        return f"{date_text}（今日まで）"
    return f"{date_text}（あと{left}日）"


def _goal_embed(goal: Goal) -> discord.Embed:
    left = service.days_left(goal)
    if goal.status == GOAL_ACHIEVED:
        color = BRAND_GREEN
    elif left is not None and left <= URGENT_DAYS:
        color = BRAND_ORANGE
    else:
        color = BRAND_BLUE

    embed = discord.Embed(
        title=f"{STATUS_MARKS.get(goal.status, '🎯')} {goal.title}",
        description=goal.detail or "（詳細は未入力）",
        color=color,
    )
    embed.add_field(name="期限", value=_deadline_text(goal), inline=True)
    embed.set_footer(text=f"アプリで編集・達成: {settings.APP_URL}/goals")
    return embed


class GoalDetailModal(discord.ui.Modal, title="目標の詳細を入力"):
    """詳細と期限（どちらも任意）を入力するモーダル。"""

    def __init__(self, goal: Goal):
        super().__init__(timeout=600)
        self.goal_id = goal.id
        self.title_input = discord.ui.TextInput(
            label="目標",
            default=goal.title,
            required=True,
            max_length=service.TITLE_MAX,
        )
        self.detail_input = discord.ui.TextInput(
            label="詳細（任意）",
            style=discord.TextStyle.paragraph,
            default=goal.detail or "",
            placeholder="達成の基準・そのために何をするかなど",
            required=False,
            max_length=1000,
        )
        self.deadline_input = discord.ui.TextInput(
            label="期限（任意・2026-12-31 の形式）",
            default=goal.target_date.isoformat() if goal.target_date else "",
            placeholder="2026-12-31",
            required=False,
            max_length=10,
        )
        self.add_item(self.title_input)
        self.add_item(self.detail_input)
        self.add_item(self.deadline_input)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        db = SessionLocal()
        try:
            user = _find_user(db, str(interaction.user.id))
            if user is None:
                await interaction.response.send_message(
                    "アプリにログインしていません。", ephemeral=True
                )
                return

            raw_deadline = (self.deadline_input.value or "").strip()
            goal = service.update_goal(
                db,
                user.id,
                self.goal_id,
                title=self.title_input.value,
                # 空文字を渡すと詳細が消える（意図的に消せるようにする）
                detail=self.detail_input.value,
                target_date=service.parse_target_date(raw_deadline),
                # 期限欄を空にしたら期限を外す
                clear_target_date=not raw_deadline,
            )
            await interaction.response.send_message(
                content="目標を更新しました。",
                embed=_goal_embed(goal),
                view=GoalActionView(goal.id),
                ephemeral=True,
            )
        except service.GoalError as exc:
            await interaction.response.send_message(str(exc), ephemeral=True)
        except Exception:
            logger.exception("Failed to update goal %s", self.goal_id)
            await interaction.response.send_message(
                "更新に失敗しました。", ephemeral=True
            )
        finally:
            db.close()


class GoalActionView(discord.ui.View):
    """作成直後に出すボタン。詳細入力と達成操作ができる。"""

    def __init__(self, goal_id: str):
        super().__init__(timeout=600)
        self.goal_id = goal_id

        detail_button = discord.ui.Button(
            label="詳細・期限を入力", style=discord.ButtonStyle.primary, emoji="📝"
        )
        detail_button.callback = self._open_detail
        self.add_item(detail_button)

        achieve_button = discord.ui.Button(
            label="達成した", style=discord.ButtonStyle.success, emoji="🏆"
        )
        achieve_button.callback = self._achieve
        self.add_item(achieve_button)

        self.add_item(
            discord.ui.Button(
                label="アプリで開く",
                style=discord.ButtonStyle.link,
                url=f"{settings.APP_URL}/goals",
            )
        )

    async def _open_detail(self, interaction: discord.Interaction) -> None:
        db = SessionLocal()
        try:
            user = _find_user(db, str(interaction.user.id))
            if user is None:
                await interaction.response.send_message(
                    "アプリにログインしていません。", ephemeral=True
                )
                return
            goal = service.get_goal(db, user.id, self.goal_id)
            await interaction.response.send_modal(GoalDetailModal(goal))
        except service.GoalError as exc:
            await interaction.response.send_message(str(exc), ephemeral=True)
        finally:
            db.close()

    async def _achieve(self, interaction: discord.Interaction) -> None:
        db = SessionLocal()
        try:
            user = _find_user(db, str(interaction.user.id))
            if user is None:
                await interaction.response.send_message(
                    "アプリにログインしていません。", ephemeral=True
                )
                return
            goal = service.set_status(db, user.id, self.goal_id, GOAL_ACHIEVED)
            await interaction.response.send_message(
                content="目標を達成しました！おめでとうございます 🎉",
                embed=_goal_embed(goal),
                ephemeral=True,
            )
        except service.GoalError as exc:
            await interaction.response.send_message(str(exc), ephemeral=True)
        finally:
            db.close()

    async def on_error(
        self,
        interaction: discord.Interaction,
        error: Exception,
        item: discord.ui.Item,
    ) -> None:
        logger.exception("Goal interaction failed", exc_info=error)
        if not interaction.response.is_done():
            await interaction.response.send_message("処理に失敗しました。", ephemeral=True)


class GoalCog(commands.Cog):
    """目標の作成・一覧。"""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="goal", description="目標を立てます")
    @app_commands.describe(
        goal="目標（詳細と期限はこのあとUIで任意入力できます）",
        deadline="期限（任意・2026-12-31 の形式）",
    )
    async def goal(
        self,
        interaction: discord.Interaction,
        goal: str,
        deadline: str | None = None,
    ) -> None:
        db = SessionLocal()
        try:
            user = _find_user(db, str(interaction.user.id))
            if user is None:
                await interaction.response.send_message(
                    "アプリにログインしていません。先にWebアプリでログインしてください。",
                    ephemeral=True,
                )
                return

            target_date = service.parse_target_date(deadline)
            created = service.create_goal(
                db, user, goal, target_date=target_date, source="discord"
            )
            # 目標だけで作成は完了している。詳細と期限はここから任意で足せる。
            await interaction.response.send_message(
                content=(
                    "目標を立てました。詳細や期限を足したい場合は"
                    "「詳細・期限を入力」を押してください。"
                ),
                embed=_goal_embed(created),
                view=GoalActionView(created.id),
                ephemeral=True,
            )
        except service.GoalError as exc:
            await interaction.response.send_message(str(exc), ephemeral=True)
        except Exception:
            logger.exception("Failed to create goal")
            await interaction.response.send_message(
                "作成に失敗しました。", ephemeral=True
            )
        finally:
            db.close()

    @app_commands.command(name="goals", description="自分の目標を表示します")
    async def goals(self, interaction: discord.Interaction) -> None:
        db = SessionLocal()
        try:
            user = _find_user(db, str(interaction.user.id))
            if user is None:
                await interaction.response.send_message(
                    "アプリにログインしていません。", ephemeral=True
                )
                return

            items = [
                g
                for g in service.list_goals(db, user.id)
                if g.status != GOAL_DROPPED
            ]
            embed = discord.Embed(title="目標", color=BRAND_BLUE)
            if not items:
                embed.description = (
                    "まだ目標がありません。`/goal 目標` で立てられます。"
                )
            else:
                for goal in items[:LIST_LIMIT]:
                    mark = STATUS_MARKS.get(goal.status, "🎯")
                    embed.add_field(
                        name=f"{mark} {goal.title}",
                        value=f"{_deadline_text(goal)}\n{goal.detail or '—'}",
                        inline=False,
                    )
                if len(items) > LIST_LIMIT:
                    embed.set_footer(
                        text=(
                            f"ほか {len(items) - LIST_LIMIT} 件。"
                            f"全部見る: {settings.APP_URL}/goals"
                        )
                    )
                else:
                    embed.set_footer(
                        text=f"アプリで編集・達成: {settings.APP_URL}/goals"
                    )

            await interaction.response.send_message(embed=embed, ephemeral=True)
        except Exception:
            logger.exception("Failed to list goals")
            await interaction.response.send_message(
                "取得に失敗しました。", ephemeral=True
            )
        finally:
            db.close()


async def setup_goal_commands(bot: commands.Bot) -> None:
    """Bot に Cog を登録する。コマンドの同期は呼び出し側でまとめて行う。"""
    await bot.add_cog(GoalCog(bot))
