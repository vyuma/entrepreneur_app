from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.schema_check import check_schema_is_current
from app.models import *  # noqa: F401, F403 — Baseにモデルを登録
from app.routers import (
    users,
    members,
    profile,
    activities,
    time_logs,
    points,
    competitions,
    dashboard,
    portfolio,
    admin,
    login_bonus,
    tier,
    nuestar_events,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # スキーマは Alembic だけが管理する。
    # ここで create_all() を呼ぶと「テーブルは作るが列は追加しない」ため、
    # 新しいマイグレーションと衝突して table already exists で失敗する。
    # 起動前に `alembic upgrade head` を実行すること。
    check_schema_is_current()
    yield


app = FastAPI(title="Entrepreneur App API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(members.router, prefix="/api/members", tags=["members"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])
app.include_router(time_logs.router, prefix="/api/time-logs", tags=["time-logs"])
app.include_router(points.router, prefix="/api/points", tags=["points"])
app.include_router(competitions.router, prefix="/api/competitions", tags=["competitions"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(login_bonus.router, prefix="/api/login-bonus", tags=["login-bonus"])
app.include_router(tier.router, prefix="/api/tier", tags=["tier"])
app.include_router(nuestar_events.router, prefix="/api/events", tags=["nuestar-events"])


@app.get("/health")
def health():
    return {"status": "ok"}
