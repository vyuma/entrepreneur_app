from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.point_log import PointLog
from app.models.competition_entry import CompetitionEntry
from app.models.user_skill import UserSkill
from app.schemas.member import MemberResponse
from app.schemas.competition import SkillCreate, SkillResponse
from app.services.competition_entry import user_or_404

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid token")


def _to_response(
    user: User,
    activity_points: int,
    total_minutes: int,
    *,
    skills: list[str] | None = None,
    achievement_count: int = 0,
) -> MemberResponse:
    time_points = total_minutes // 60
    return MemberResponse(
        id=user.id,
        discord_id=user.discord_id,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        business_desc=user.business_desc,
        sns_links=user.sns_links,
        created_at=user.created_at,
        total_points=activity_points + time_points,
        total_hours=total_minutes // 60,
        skills=skills or [],
        achievement_count=achievement_count,
        portfolio_public=bool(user.portfolio_public),
    )


@router.get("", response_model=list[MemberResponse])
def list_members(sort: str = "created_at", db: Session = Depends(get_db), _=Depends(verify_token)):
    """sort: created_at / points / hours / achievements / name"""
    from app.models.time_log import TimeLog
    # 論理削除されたユーザーは一覧・ランキングから除外する
    users = db.query(User).filter(User.deleted_at.is_(None)).all()
    point_totals = dict(
        db.query(PointLog.user_id, func.sum(PointLog.points))
        .group_by(PointLog.user_id).all()
    )
    time_totals = dict(
        db.query(TimeLog.user_id, func.sum(TimeLog.minutes))
        .group_by(TimeLog.user_id).all()
    )
    achieve_totals = dict(
        db.query(CompetitionEntry.user_id, func.count(CompetitionEntry.id))
        .filter(CompetitionEntry.status == "achieve")
        .group_by(CompetitionEntry.user_id).all()
    )
    skills_by_user: dict[str, list[str]] = {}
    for s in db.query(UserSkill).all():
        skills_by_user.setdefault(s.user_id, []).append(s.label)

    result = [
        _to_response(
            u,
            point_totals.get(u.id, 0),
            time_totals.get(u.id, 0),
            skills=skills_by_user.get(u.id, []),
            achievement_count=achieve_totals.get(u.id, 0),
        )
        for u in users
    ]

    if sort == "points":
        result.sort(key=lambda x: x.total_points, reverse=True)
    elif sort == "hours":
        result.sort(key=lambda x: x.total_hours, reverse=True)
    elif sort == "achievements":
        result.sort(key=lambda x: x.achievement_count, reverse=True)
    elif sort == "name":
        result.sort(key=lambda x: (x.display_name or x.username).lower())
    else:
        result.sort(key=lambda x: x.created_at, reverse=True)
    return result


@router.get("/ranking", response_model=list[MemberResponse])
def ranking(limit: int = 20, db: Session = Depends(get_db), _=Depends(verify_token)):
    """ポイント順のランキング。"""
    members = list_members(sort="points", db=db)
    return members[:limit]


@router.get("/skills", response_model=list[str])
def list_all_skills(db: Session = Depends(get_db), _=Depends(verify_token)):
    """フィルタ用の全スキルタグ（重複排除）。"""
    labels = {s.label for s in db.query(UserSkill).all()}
    return sorted(labels)


@router.get("/skills/me", response_model=list[SkillResponse])
def my_skills(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = user_or_404(db, discord_id)
    return db.query(UserSkill).filter(UserSkill.user_id == user.id).all()


@router.post("/skills", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def add_skill(
    discord_id: str,
    body: SkillCreate,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    label = body.label.strip()
    existing = (
        db.query(UserSkill)
        .filter(UserSkill.user_id == user.id, UserSkill.label == label)
        .first()
    )
    if existing:
        return existing

    skill = UserSkill(user_id=user.id, label=label, source="self")
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: str,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    skill = db.query(UserSkill).filter(UserSkill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    if skill.user_id != user.id:
        raise HTTPException(status_code=403, detail="削除できるのは本人のみです")
    db.delete(skill)
    db.commit()


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(member_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    from app.models.time_log import TimeLog
    user = (
        db.query(User)
        .filter(User.id == member_id, User.deleted_at.is_(None))
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")
    activity_pts = db.query(func.sum(PointLog.points)).filter(PointLog.user_id == user.id).scalar() or 0
    minutes = db.query(func.sum(TimeLog.minutes)).filter(TimeLog.user_id == user.id).scalar() or 0
    achievements = (
        db.query(func.count(CompetitionEntry.id))
        .filter(CompetitionEntry.user_id == user.id, CompetitionEntry.status == "achieve")
        .scalar() or 0
    )
    skills = [s.label for s in db.query(UserSkill).filter(UserSkill.user_id == user.id).all()]
    return _to_response(
        user, activity_pts, minutes, skills=skills, achievement_count=achievements
    )
