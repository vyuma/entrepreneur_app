"""個人 TODO の Discord スラッシュコマンド。

- /todo <タイトル> : TODO を作成し、続けて詳細入力のUI（モーダル）を出す
- /todos           : 自分の未完了 TODO を一覧表示

タイトルはコマンドのテキスト引数で受け取り、詳細はモーダルから任意で入力する。
チェックと編集はアプリ側（/todos ページ）でも行える。
"""

import logging

import discord
from discord import app_commands
from discord.ext import commands

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.todo import Todo
from app.models.user import User
from app.services import todos as service

logger = logging.getLogger(__name__)

BRAND_GREEN = 0x2EA84A
# 一覧に出す未完了 TODO の最大件数
LIST_LIMIT = 15


def _todo_embed(todo: Todo) -> discord.Embed:
    embed = discord.Embed(
        title=f"{'✅' if todo.is_done else '📝'} {todo.title}",
        description=todo.detail or "（詳細は未入力）",
        color=BRAND_GREEN,
    )
    embed.set_footer(text=f"アプリで編集・チェック: {settings.APP_URL}/todos")
    return embed


def _find_user(db, discord_id: str) -> User | None:
    return db.query(User).filter(User.discord_id == discord_id).first()


class TodoDetailModal(discord.ui.Modal, title="TODO の詳細を入力"):
    """詳細（任意）を入力するモーダル。空のまま送信しても問題ない。"""

    def __init__(self, todo_id: str, todo_title: str, current_detail: str | None):
        super().__init__(timeout=600)
        self.todo_id = todo_id
        # 何のTODOを編集しているか分かるようにタイトルも触れるようにしておく
        self.title_input = discord.ui.TextInput(
            label="タイトル",
            default=todo_title,
            required=True,
            max_length=service.TITLE_MAX,
        )
        self.detail_input = discord.ui.TextInput(
            label="詳細（任意）",
            style=discord.TextStyle.paragraph,
            default=current_detail or "",
            placeholder="メモ・手順・期限などを自由に書けます",
            required=False,
            max_length=1000,
        )
        self.add_item(self.title_input)
        self.add_item(self.detail_input)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        db = SessionLocal()
        try:
            user = _find_user(db, str(interaction.user.id))
            if user is None:
                await interaction.response.send_message(
                    "アプリにログインしていません。", ephemeral=True
                )
                return

            todo = service.update_todo(
                db,
                user.id,
                self.todo_id,
                title=self.title_input.value,
                # 空文字を渡すと詳細が消える（意図的に消せるようにする）
                detail=self.detail_input.value,
            )
            await interaction.response.send_message(
                content="TODO を更新しました。",
                embed=_todo_embed(todo),
                view=TodoActionView(todo.id),
                ephemeral=True,
            )
        except service.TodoError as exc:
            await interaction.response.send_message(str(exc), ephemeral=True)
        except Exception:
            logger.exception("Failed to update todo %s", self.todo_id)
            await interaction.response.send_message(
                "更新に失敗しました。", ephemeral=True
            )
        finally:
            db.close()


class TodoActionView(discord.ui.View):
    """作成直後に出すボタン。詳細入力と完了操作ができる。"""

    def __init__(self, todo_id: str):
        super().__init__(timeout=600)
        self.todo_id = todo_id

        detail_button = discord.ui.Button(
            label="詳細を入力", style=discord.ButtonStyle.primary, emoji="📝"
        )
        detail_button.callback = self._open_detail
        self.add_item(detail_button)

        done_button = discord.ui.Button(
            label="完了にする", style=discord.ButtonStyle.success, emoji="✅"
        )
        done_button.callback = self._complete
        self.add_item(done_button)

        self.add_item(
            discord.ui.Button(
                label="アプリで開く",
                style=discord.ButtonStyle.link,
                url=f"{settings.APP_URL}/todos",
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
            todo = service.get_todo(db, user.id, self.todo_id)
            await interaction.response.send_modal(
                TodoDetailModal(todo.id, todo.title, todo.detail)
            )
        except service.TodoError as exc:
            await interaction.response.send_message(str(exc), ephemeral=True)
        finally:
            db.close()

    async def _complete(self, interaction: discord.Interaction) -> None:
        db = SessionLocal()
        try:
            user = _find_user(db, str(interaction.user.id))
            if user is None:
                await interaction.response.send_message(
                    "アプリにログインしていません。", ephemeral=True
                )
                return
            todo = service.set_done(db, user.id, self.todo_id, True)
            await interaction.response.send_message(
                content="完了にしました 🎉",
                embed=_todo_embed(todo),
                ephemeral=True,
            )
        except service.TodoError as exc:
            await interaction.response.send_message(str(exc), ephemeral=True)
        finally:
            db.close()

    async def on_error(
        self,
        interaction: discord.Interaction,
        error: Exception,
        item: discord.ui.Item,
    ) -> None:
        logger.exception("Todo interaction failed", exc_info=error)
        if not interaction.response.is_done():
            await interaction.response.send_message("処理に失敗しました。", ephemeral=True)


class TodoCog(commands.Cog):
    """個人 TODO の作成・一覧。"""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="todo", description="TODO を作成します")
    @app_commands.describe(title="やること（詳細はこのあとUIで任意入力できます）")
    async def todo(self, interaction: discord.Interaction, title: str) -> None:
        db = SessionLocal()
        try:
            user = _find_user(db, str(interaction.user.id))
            if user is None:
                await interaction.response.send_message(
                    "アプリにログインしていません。先にWebアプリでログインしてください。",
                    ephemeral=True,
                )
                return

            todo = service.create_todo(db, user, title, source="discord")
            # タイトルだけで作成は完了している。詳細はここから任意で足せる。
            await interaction.response.send_message(
                content=(
                    "TODO を作成しました。詳細を足したい場合は「詳細を入力」を押してください。"
                ),
                embed=_todo_embed(todo),
                view=TodoActionView(todo.id),
                ephemeral=True,
            )
        except service.TodoError as exc:
            await interaction.response.send_message(str(exc), ephemeral=True)
        except Exception:
            logger.exception("Failed to create todo")
            await interaction.response.send_message(
                "作成に失敗しました。", ephemeral=True
            )
        finally:
            db.close()

    @app_commands.command(name="todos", description="自分の未完了 TODO を表示します")
    async def todos(self, interaction: discord.Interaction) -> None:
        db = SessionLocal()
        try:
            user = _find_user(db, str(interaction.user.id))
            if user is None:
                await interaction.response.send_message(
                    "アプリにログインしていません。", ephemeral=True
                )
                return

            items = [t for t in service.list_todos(db, user.id) if not t.is_done]
            embed = discord.Embed(title="未完了の TODO", color=BRAND_GREEN)
            if not items:
                embed.description = "未完了の TODO はありません 🎉"
            else:
                for todo in items[:LIST_LIMIT]:
                    embed.add_field(
                        name=f"📝 {todo.title}",
                        value=todo.detail or "—",
                        inline=False,
                    )
                if len(items) > LIST_LIMIT:
                    embed.set_footer(
                        text=f"ほか {len(items) - LIST_LIMIT} 件。全部見る: {settings.APP_URL}/todos"
                    )
                else:
                    embed.set_footer(text=f"アプリで編集・チェック: {settings.APP_URL}/todos")

            await interaction.response.send_message(embed=embed, ephemeral=True)
        except Exception:
            logger.exception("Failed to list todos")
            await interaction.response.send_message(
                "取得に失敗しました。", ephemeral=True
            )
        finally:
            db.close()


async def setup_todo_commands(bot: commands.Bot) -> None:
    """Bot に Cog を登録する。コマンドの同期は呼び出し側でまとめて行う。"""
    await bot.add_cog(TodoCog(bot))
