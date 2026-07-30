import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

// PKCE等の認証フロー中 Cookie は削除しない
const PKCE_COOKIE_NAMES = [
  "authjs.pkce.code_verifier",
  "__Secure-authjs.pkce.code_verifier",
  "authjs.state",
  "__Secure-authjs.state",
  "authjs.nonce",
  "__Secure-authjs.nonce",
];

function hasSessionCookie(request: NextRequest) {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
}

function hasPkceCookie(request: NextRequest) {
  return PKCE_COOKIE_NAMES.some((name) => request.cookies.has(name));
}

/**
 * auth() でラップすると、Auth.js が読み直したセッションの Set-Cookie が
 * ここで返すレスポンスに引き継がれる。これで Cookie の有効期限がリクエストごとに
 * 延長され（ローリング更新）、アプリを使い続けている間はログインが切れない。
 * 素で `await auth()` を呼ぶと更新後の Set-Cookie が捨てられるため、
 * 初回サインインから maxAge 経過で必ず再ログインになってしまう。
 */
export const proxy = auth((request) => {
  const session = request.auth;
  const { pathname } = request.nextUrl;
  // 公開ポートフォリオは未ログインでも閲覧できる（非公開かどうかはAPI側で判定）
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/portfolio");

  // 復号できない古いセッションCookie（AUTH_SECRET 変更後など）が残っていて
  // PKCEフロー中でない場合のみ削除する
  if (!session && hasSessionCookie(request) && !hasPkceCookie(request)) {
    const res = NextResponse.redirect(new URL("/", request.url));
    for (const name of SESSION_COOKIE_NAMES) {
      res.cookies.delete(name);
    }
    return res;
  }

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
});

export const config = {
  // /api, /_next/*, favicon.ico, 拡張子付きの静的ファイル (image.png 等) は除外
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)$).*)",
  ],
};
