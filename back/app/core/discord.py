import httpx
from app.core.config import settings

DISCORD_API = "https://discord.com/api/v10"

_bot_id_cache: str | None = None


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bot {settings.DISCORD_BOT_TOKEN}"}


def get_bot_id() -> str:
    """BotのユーザーIDを取得（キャッシュあり）"""
    global _bot_id_cache
    if _bot_id_cache:
        return _bot_id_cache
    with httpx.Client() as client:
        res = client.get(f"{DISCORD_API}/users/@me", headers=_headers())
        res.raise_for_status()
        _bot_id_cache = res.json()["id"]
    return _bot_id_cache


def _truncate(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    if limit <= 3:
        return value[:limit]
    return value[: limit - 3] + "..."


def build_activity_embed(
    *,
    activity_id: str,
    discord_id: str,
    username: str,
    event_name: str,
    outcome: str,
    claim_text: str,
    total_participants: int,
    activity_date_start: str,
    activity_date_end: str,
    status: str = "pending",
    reviewer_id: str | None = None,
    reviewer_name: str | None = None,
    points_awarded: int | None = None,
) -> dict:
    titles = {
        "pending": "Activity Submission",
        "approved": "Activity Approved",
        "rejected": "Activity Rejected",
    }
    colors = {
        "pending": 0xFEE75C,
        "approved": 0x57F287,
        "rejected": 0xED4245,
    }
    status_labels = {
        "pending": "Pending",
        "approved": "Approved",
        "rejected": "Rejected",
    }

    fields = [
        {"name": "Applicant", "value": f"<@{discord_id}> ({_truncate(username, 80)})", "inline": True},
        {"name": "Event", "value": _truncate(event_name, 1000), "inline": True},
        {"name": "Period", "value": f"{activity_date_start} - {activity_date_end}", "inline": False},
        {"name": "Outcome", "value": _truncate(outcome, 1000), "inline": False},
        {"name": "Claim", "value": _truncate(claim_text, 1000), "inline": False},
        {"name": "Participants", "value": str(total_participants), "inline": True},
        {"name": "Application ID", "value": activity_id, "inline": True},
        {"name": "Status", "value": status_labels.get(status, status), "inline": True},
    ]

    if points_awarded is not None:
        fields.append({"name": "Points", "value": f"{points_awarded} pt", "inline": True})

    if reviewer_id or reviewer_name:
        reviewer_value = reviewer_name or "Reviewer"
        if reviewer_id and reviewer_name:
            reviewer_value = f"<@{reviewer_id}> ({_truncate(reviewer_name, 80)})"
        elif reviewer_id:
            reviewer_value = f"<@{reviewer_id}>"
        fields.append({"name": "Reviewed By", "value": reviewer_value, "inline": True})

    embed = {
        "title": titles.get(status, "Activity Submission"),
        "color": colors.get(status, 0x5865F2),
        "fields": fields,
    }
    if status == "pending":
        embed["footer"] = {"text": "Use the buttons below to approve or reject this submission."}
    return embed


def build_activity_components(activity_id: str) -> list[dict]:
    return [
        {
            "type": 1,
            "components": [
                {
                    "type": 2,
                    "style": 3,
                    "label": "Approve",
                    "custom_id": f"activity:approve:{activity_id}",
                },
                {
                    "type": 2,
                    "style": 4,
                    "label": "Reject",
                    "custom_id": f"activity:reject:{activity_id}",
                },
            ],
        }
    ]


def create_user_channel(discord_id: str, username: str) -> str:
    """専用チャンネルを作成してチャンネルIDを返す"""
    bot_id = get_bot_id()
    VIEW_SEND = str(1 << 10 | 1 << 11)  # VIEW_CHANNEL + SEND_MESSAGES

    with httpx.Client() as client:
        res = client.post(
            f"{DISCORD_API}/guilds/{settings.DISCORD_GUILD_ID}/channels",
            headers=_headers(),
            json={
                "name": f"times-{username}",
                "type": 0,
                "parent_id": settings.DISCORD_CATEGORY_ID,
                "permission_overwrites": [
                    # @everyone: 閲覧を拒否
                    {"id": settings.DISCORD_GUILD_ID, "type": 0, "deny": "1024"},
                    # 本人: 閲覧・送信を許可
                    {"id": discord_id, "type": 1, "allow": VIEW_SEND},
                    # Bot: 閲覧・送信を許可
                    {"id": bot_id, "type": 1, "allow": VIEW_SEND},
                ],
            },
        )
        res.raise_for_status()
        return res.json()["id"]


def post_admin_notification(discord_id: str, username: str, created_at: str) -> None:
    """管理者チャンネルに参加通知を投稿"""
    with httpx.Client() as client:
        client.post(
            f"{DISCORD_API}/channels/{settings.DISCORD_ADMIN_CHANNEL_ID}/messages",
            headers=_headers(),
            json={
                "embeds": [
                    {
                        "title": "新メンバー参加",
                        "color": 0x5865F2,
                        "fields": [
                            {"name": "ユーザー名", "value": username, "inline": True},
                            {"name": "Discord", "value": f"<@{discord_id}>", "inline": True},
                            {"name": "参加日時", "value": created_at, "inline": False},
                        ],
                    }
                ]
            },
        )


def post_activity_notification(
    activity_id: str,
    discord_id: str,
    username: str,
    event_name: str,
    outcome: str,
    claim_text: str,
    total_participants: int,
    activity_date_start: str,
    activity_date_end: str,
) -> str:
    """管理者チャンネルに活動申請通知を投稿し、メッセージIDを返す"""
    with httpx.Client() as client:
        res = client.post(
            f"{DISCORD_API}/channels/{settings.DISCORD_ADMIN_CHANNEL_ID}/messages",
            headers=_headers(),
            json={
                "embeds": [
                    build_activity_embed(
                        activity_id=activity_id,
                        discord_id=discord_id,
                        username=username,
                        event_name=event_name,
                        outcome=outcome,
                        claim_text=claim_text,
                        total_participants=total_participants,
                        activity_date_start=activity_date_start,
                        activity_date_end=activity_date_end,
                    )
                ],
                "components": build_activity_components(activity_id),
            },
        )
        res.raise_for_status()
        return res.json()["id"]


def update_activity_notification(
    *,
    discord_message_id: str,
    activity_id: str,
    discord_id: str,
    username: str,
    event_name: str,
    outcome: str,
    claim_text: str,
    total_participants: int,
    activity_date_start: str,
    activity_date_end: str,
    status: str,
    reviewer_id: str | None = None,
    reviewer_name: str | None = None,
    points_awarded: int | None = None,
) -> None:
    with httpx.Client() as client:
        res = client.patch(
            f"{DISCORD_API}/channels/{settings.DISCORD_ADMIN_CHANNEL_ID}/messages/{discord_message_id}",
            headers=_headers(),
            json={
                "embeds": [
                    build_activity_embed(
                        activity_id=activity_id,
                        discord_id=discord_id,
                        username=username,
                        event_name=event_name,
                        outcome=outcome,
                        claim_text=claim_text,
                        total_participants=total_participants,
                        activity_date_start=activity_date_start,
                        activity_date_end=activity_date_end,
                        status=status,
                        reviewer_id=reviewer_id,
                        reviewer_name=reviewer_name,
                        points_awarded=points_awarded,
                    )
                ],
                "components": [],
            },
        )
        res.raise_for_status()


def post_intro(
    discord_id: str,
    display_name: str,
    bio: str,
    business_desc: str,
    sns_links: dict,
    avatar_url: str,
) -> None:
    """自己紹介チャンネルに Embed を投稿"""
    if not settings.DISCORD_INTRO_CHANNEL_ID:
        return

    fields = []
    if bio:
        fields.append({"name": "一言自己紹介", "value": bio, "inline": False})
    if business_desc:
        fields.append({"name": "事業・活動内容", "value": business_desc, "inline": False})
    if sns_links:
        links_str = "\n".join(f"{k}: {v}" for k, v in sns_links.items())
        fields.append({"name": "SNS", "value": links_str, "inline": False})

    embed: dict = {
        "title": display_name or "メンバー",
        "color": 0x57F287,
        "fields": fields,
        "footer": {"text": f"Discord ID: {discord_id}"},
    }
    if avatar_url:
        embed["thumbnail"] = {"url": avatar_url}

    with httpx.Client() as client:
        client.post(
            f"{DISCORD_API}/channels/{settings.DISCORD_INTRO_CHANNEL_ID}/messages",
            headers=_headers(),
            json={"embeds": [embed]},
        )
