from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
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
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DBファイル・テーブルが存在しなければ自動作成
    Base.metadata.create_all(bind=engine)
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


@app.get("/health")
def health():
    return {"status": "ok"}
