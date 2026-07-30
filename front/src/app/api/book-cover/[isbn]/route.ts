import type { NextRequest } from "next/server";

/**
 * 書影の中継。
 *
 * 日本語書籍の書影を配っているサイトは、ブラウザから直接読むと弾かれる:
 * - 国会図書館(ndlsearch) は CloudFront の WAF が同一サイトの Referer を要求するため、
 *   うちのアプリから <img src> で読むと必ず 403 になる
 * - 版元ドットコムも素の <img> では条件が変わることがある
 *
 * そこでサーバー側で適切なヘッダを付けて取得し、同一オリジンとして配り直す。
 * 見つからなければ 404 を返し、画面側はタイトルの代替表示に切り替わる。
 */

// 画像として妥当と判断する最小サイズ。404 画像やプレースホルダを弾く
const MIN_IMAGE_BYTES = 1000;
const FETCH_TIMEOUT_MS = 8000;
// 見つかった書影は長めに、見つからない場合も短く CDN に覚えさせる
const CACHE_HIT = "public, max-age=86400, s-maxage=2592000, immutable";
const CACHE_MISS = "public, max-age=3600, s-maxage=3600";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** ISBN から組み立てられる書影の候補。上から順に試す */
function candidates(isbn: string): { url: string; headers: HeadersInit }[] {
  return [
    {
      // 版元ドットコム。解像度が高いことが多いので最初に見る
      url: `https://www.hanmoto.com/bd/img/${isbn}.jpg`,
      headers: { "User-Agent": BROWSER_UA, Accept: "image/*,*/*;q=0.8" },
    },
    {
      // 国会図書館サーチ。同一サイトの Referer が無いと WAF に弾かれる
      url: `https://ndlsearch.ndl.go.jp/thumbnail/${isbn}.jpg`,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "image/*,*/*;q=0.8",
        Referer: "https://ndlsearch.ndl.go.jp/",
      },
    },
  ];
}

/** openBD に出版社登録の書影があればその URL を返す */
async function openBdCover(isbn: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const items = (await res.json()) as
      | ({ summary?: { cover?: string } } | null)[]
      | null;
    const cover = items?.[0]?.summary?.cover;
    return cover ? cover : null;
  } catch {
    return null;
  }
}

async function tryFetchImage(
  url: string,
  headers: HeadersInit,
): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    if (!res.headers.get("content-type")?.startsWith("image")) return null;

    const buffer = await res.arrayBuffer();
    // 404 のかわりに小さなダミー画像を返すサイトがあるため大きさで弾く
    if (buffer.byteLength < MIN_IMAGE_BYTES) return null;

    return new Response(buffer, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": CACHE_HIT,
      },
    });
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ isbn: string }> },
) {
  const { isbn: raw } = await params;
  const isbn = raw.replace(/\D/g, "");

  // 書籍の ISBN 以外は取りに行かない（任意のURLを踏ませないため、
  // 外部URLは受け取らず ISBN から組み立てたものだけを使う）
  if (isbn.length !== 13 || !/^97[89]/.test(isbn)) {
    return new Response("Invalid ISBN", { status: 400 });
  }

  for (const { url, headers } of candidates(isbn)) {
    const hit = await tryFetchImage(url, headers);
    if (hit) return hit;
  }

  // 出版社が openBD に登録している書影が最後の望み
  const cover = await openBdCover(isbn);
  if (cover) {
    const hit = await tryFetchImage(cover, { "User-Agent": BROWSER_UA });
    if (hit) return hit;
  }

  return new Response("Not Found", {
    status: 404,
    headers: { "Cache-Control": CACHE_MISS },
  });
}
