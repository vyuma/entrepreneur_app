from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# --- イベント ---


class EventCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    event_date: Optional[date] = None
    venue: Optional[str] = None
    slide_required: bool = True
    # タイムテーブルの開始時刻 "20:00"
    start_time: Optional[str] = None
    buffer_seconds: int = Field(default=60, ge=0, le=1800)


class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[date] = None
    venue: Optional[str] = None
    slide_required: Optional[bool] = None
    phase: Optional[str] = None
    start_time: Optional[str] = None
    buffer_seconds: Optional[int] = Field(default=None, ge=0, le=1800)


class EventSummary(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    description: Optional[str]
    event_date: Optional[date]
    venue: Optional[str]
    phase: str
    slide_required: bool
    start_time: Optional[str]
    buffer_seconds: int
    created_at: datetime
    # 全発表の所要時間合計（転換込み・秒）
    total_seconds: int = 0
    # 一覧表示用の集計
    entry_count: int = 0
    approved_count: int = 0
    vote_count: int = 0
    # 閲覧者の状態
    my_entry_status: Optional[str] = None
    has_voted: bool = False


# --- 申込 ---


class EntryApply(BaseModel):
    # 発表テーマ（30文字程度を想定）
    title: str = Field(min_length=1, max_length=120)
    summary: Optional[str] = None
    # チーム名もしくは個人名
    team_name: str = Field(min_length=1, max_length=80)
    # 発表者のDiscordネーム（複数可）
    presenters: str = Field(min_length=1, max_length=200)
    talk_seconds: int = Field(ge=10, le=3600)
    qa_seconds: int = Field(default=0, ge=0, le=3600)


class SlideSubmit(BaseModel):
    slide_url: str = Field(min_length=1)


class EntryReview(BaseModel):
    approve: bool
    reject_reason: Optional[str] = None


class EventEntryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    event_id: str
    user_id: str
    title: str
    summary: Optional[str]
    team_name: Optional[str]
    presenters: Optional[str]
    talk_seconds: int
    qa_seconds: int
    order_index: Optional[int]
    scheduled_at: Optional[str]
    status: str
    slide_url: Optional[str]
    reject_reason: Optional[str]
    created_at: datetime
    # 発表者の表示用
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    # 結果発表後、または管理者にのみ入る
    vote_count: Optional[int] = None
    rank: Optional[int] = None
    # 閲覧者がこの発表に投票したか
    voted_by_me: bool = False
    # 受賞した賞
    awards: list["AwardResponse"] = []


# --- 投票 ---


class VoteCreate(BaseModel):
    entry_id: str
    comment: Optional[str] = Field(default=None, max_length=200)


class VoterRow(BaseModel):
    """管理者向け：誰がまだ投票していないか把握する用。"""

    user_id: str
    name: str
    voted: bool


class EventDetail(BaseModel):
    event: EventSummary
    entries: list[EventEntryResponse]
    # 自分の申込（あれば）
    my_entry: Optional[EventEntryResponse] = None
    # 自分が投票した発表のID
    my_vote_entry_id: Optional[str] = None
    # 結果を見られる状態か（発表済み or 管理者）
    results_visible: bool = False
    is_admin: bool = False
    # 管理者のみ
    pending_entries: list[EventEntryResponse] = []
    voters: list[VoterRow] = []
    timetable: list["TimetableRow"] = []
    awards: list["AwardResponse"] = []


# --- タイムテーブル ---


class TimetableRow(BaseModel):
    entry_id: str
    order: int
    start_time: Optional[str]
    end_time: Optional[str]
    talk_seconds: int
    qa_seconds: int
    duration_seconds: int
    duration_label: str
    # 管理者が時刻を固定した行か
    is_fixed: bool


class OrderUpdate(BaseModel):
    """並べ替え後の entry_id を先頭から順に並べたもの。"""

    entry_ids: list[str]


class ScheduleUpdate(BaseModel):
    # "20:15" または null（自動計算に戻す）
    scheduled_at: Optional[str] = None


class EntryTimeUpdate(BaseModel):
    """管理者が発表時間を調整する。"""

    talk_seconds: Optional[int] = Field(default=None, ge=10, le=3600)
    qa_seconds: Optional[int] = Field(default=None, ge=0, le=3600)


# --- 賞 ---


class AwardCreate(BaseModel):
    entry_id: str
    name: str = Field(min_length=1, max_length=60)
    note: Optional[str] = None
    # 授与と同時に付けるアントレポイント
    points: int = Field(default=0, ge=0, le=1000)


class AwardResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    entry_id: str
    name: str
    note: Optional[str]
    points: int
    created_at: datetime
    # 表示用
    entry_title: Optional[str] = None
    winner_name: Optional[str] = None
