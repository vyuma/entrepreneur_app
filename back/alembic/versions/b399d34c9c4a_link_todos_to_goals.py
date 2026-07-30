"""link todos to goals

Revision ID: b399d34c9c4a
Revises: 6468a14b57e5
Create Date: 2026-07-30 21:59:09.073597

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b399d34c9c4a'
down_revision: Union[str, Sequence[str], None] = '6468a14b57e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite は ALTER TABLE で外部キーを追加できないため batch モードを使う
    # （テーブルを作り直して制約を付ける。名前も明示しないと SQLite で落ちる）
    with op.batch_alter_table("todos") as batch:
        batch.add_column(sa.Column("goal_id", sa.String(length=36), nullable=True))
        batch.create_foreign_key(
            "fk_todos_goal_id_goals", "goals", ["goal_id"], ["id"]
        )
    op.create_index(op.f("ix_todos_goal_id"), "todos", ["goal_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_todos_goal_id"), table_name="todos")
    with op.batch_alter_table("todos") as batch:
        batch.drop_constraint("fk_todos_goal_id_goals", type_="foreignkey")
        batch.drop_column("goal_id")
