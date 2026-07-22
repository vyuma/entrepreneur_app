const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const INTERNAL_TOKEN = process.env.INTERNAL_API_SECRET!;

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": INTERNAL_TOKEN,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }

  // 204 No Content や空ボディ（DELETE 系）は JSON にできないので null を返す
  if (res.status === 204) return null;
  const body = await res.text();
  if (!body) return null;
  return JSON.parse(body);
}
