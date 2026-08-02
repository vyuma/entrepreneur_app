"""add morning roulette and rescale points

Revision ID: c1d7f4a90b52
Revises: e42a2d501cb9
Create Date: 2026-08-03 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d7f4a90b52'
down_revision: Union[str, Sequence[str], None] = 'e42a2d501cb9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('morning_settings', sa.Column('roulette_enabled', sa.Boolean(), server_default='1', nullable=False))
    op.add_column('morning_settings', sa.Column('roulette_min_points', sa.Integer(), server_default='1', nullable=False))
    op.add_column('morning_settings', sa.Column('roulette_max_points', sa.Integer(), server_default='5', nullable=False))
    op.add_column('morning_checkins', sa.Column('roulette_points', sa.Integer(), server_default='0', nullable=False))

    _rescale()


def _rescale() -> None:
    """既存の設定行を新しいポイント配分（朝活5pt基準）に合わせる。"""
    op.get_bind().execute(
        sa.text(
            "UPDATE morning_settings SET"
            " base_points = 5,"
            " task_points = 1,"
            " streak_bonus_per_day = 1,"
            " streak_bonus_max = 5,"
            " lucky_min_points = 3,"
            " lucky_max_points = 10,"
            " post_points = 3"
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('morning_checkins', 'roulette_points')
    op.drop_column('morning_settings', 'roulette_max_points')
    op.drop_column('morning_settings', 'roulette_min_points')
    op.drop_column('morning_settings', 'roulette_enabled')
