import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";

/** ポートフォリオのMarkdownをバックエンドから取得して返す（内部トークンを隠すため） */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const session = await auth();
  const viewer = session?.user.discordId;

  try {
    const data = await apiFetch(
      `/api/portfolio/${userId}/markdown${viewer ? `?viewer_discord_id=${viewer}` : ""}`,
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    const status = message.includes("403") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
