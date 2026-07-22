"""起動時にDBスキーマが最新か確認する。

未適用のマイグレーションがあると `no such column` のような分かりにくい
エラーが実行時に出るため、起動時点で明示的に警告する。
"""

import logging
from pathlib import Path

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory

from app.core.database import engine

logger = logging.getLogger(__name__)

# back/app/core/schema_check.py → back/
BASE_DIR = Path(__file__).resolve().parents[2]


def check_schema_is_current() -> bool:
    """DBのリビジョンが最新かどうかを返す。判定できない場合は True 扱い。"""
    try:
        config = Config(str(BASE_DIR / "alembic.ini"))
        config.set_main_option("script_location", str(BASE_DIR / "alembic"))
        script = ScriptDirectory.from_config(config)
        head = script.get_current_head()

        with engine.connect() as conn:
            current = MigrationContext.configure(conn).get_current_revision()
    except Exception as exc:
        logger.warning("スキーマ確認をスキップしました: %s", exc)
        return True

    if current == head:
        return True

    logger.error(
        "DBスキーマが古いままです (DB: %s / 最新: %s)。"
        "`alembic upgrade head` を実行してから起動してください。",
        current or "未初期化",
        head,
    )
    return False
