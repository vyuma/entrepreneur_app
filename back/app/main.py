from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import users, members, profile, activities, time_logs, points

app = FastAPI(title="Entrepreneur App API")

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


@app.get("/health")
def health():
    return {"status": "ok"}
