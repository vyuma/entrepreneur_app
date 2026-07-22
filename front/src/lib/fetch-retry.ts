type RetryOptions = {
  retries?: number;
  timeoutMs?: number;
};

/**
 * タイムアウトと再試行つきの fetch。
 * 429 / 5xx / ネットワークエラーのみ再試行し、429 は Retry-After を尊重する。
 * 最後まで失敗した場合は例外ではなく null を返す（呼び出し側でログインを止めないため）。
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  { retries = 2, timeoutMs = 5000 }: RetryOptions = {},
): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });

      // 再試行しても結果が変わらないもの（4xx）はそのまま返す
      if (res.status !== 429 && res.status < 500) return res;
      if (attempt === retries) return res;

      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 4000)
          : 300 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, waitMs));
    } catch (err) {
      if (attempt === retries) {
        console.error(`[fetchWithRetry] ${url} failed:`, err);
        return null;
      }
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
    }
  }
  return null;
}
