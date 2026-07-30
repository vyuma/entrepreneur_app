import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Book(Base):
    """団体で共有する本。ISBN ごとに1冊だけ持つ。

    同じ本を複数人が登録した場合もレコードは1つで、
    誰が登録したかは BookRegistration 側に積み上がる。
    """

    __tablename__ = "books"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # 13桁のISBN（ハイフンなし）。10桁で入力されても13桁に正規化して保存する
    isbn13: Mapped[str] = mapped_column(String(13), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    authors: Mapped[str | None] = mapped_column(String(300), nullable=True)
    publisher: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # "2024-05" のような部分的な値も来るため文字列で持つ
    published_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 最初に登録した人
    added_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class BookRegistration(Base):
    """誰がその本を本棚に置いたかの記録。1ユーザー1冊1回。"""

    __tablename__ = "book_registrations"
    __table_args__ = (
        UniqueConstraint("user_id", "book_id", name="uq_book_registration_user_book"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("books.id"), nullable=False, index=True
    )
    # 一言コメント（任意）
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class BookReview(Base):
    """本への感想。同じ本に複数人が投稿でき、みんなに見える。"""

    __tablename__ = "book_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    book_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("books.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    # 5段階の評価（任意）
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
