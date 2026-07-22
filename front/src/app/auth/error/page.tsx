const MESSAGES: Record<string, { title: string; body: string }> = {
  discord_unavailable: {
    title: "Discord に接続できませんでした",
    body: "Discord 側が混み合っているか、一時的に応答していません。少し時間をおいてもう一度お試しください。",
  },
  discord: {
    title: "Discord の確認に失敗しました",
    body: "サーバー参加状況を確認できませんでした。もう一度ログインをお試しください。",
  },
  no_token: {
    title: "ログインが完了しませんでした",
    body: "Discord の認可が途中で中断されたようです。もう一度お試しください。",
  },
  config: {
    title: "設定エラー",
    body: "アプリの設定に問題があります。運営に連絡してください。",
  },
  Configuration: {
    title: "設定エラー",
    body: "アプリの設定に問題があります。運営に連絡してください。",
  },
  AccessDenied: {
    title: "アクセスが拒否されました",
    body: "Discord 側でアクセスを許可しなかったか、参加条件を満たしていません。",
  },
  Verification: {
    title: "リンクの有効期限が切れています",
    body: "もう一度ログインをやり直してください。",
  },
};

const FALLBACK = {
  title: "ログインでエラーが発生しました",
  body: "時間をおいてもう一度お試しください。解決しない場合は運営に連絡してください。",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = params.reason ?? params.error;
  const key = Array.isArray(raw) ? raw[0] : raw;
  const { title, body } = (key && MESSAGES[key]) || FALLBACK;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span
          className="h-1 w-16 rounded-full"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--brand-green), var(--brand-orange))",
          }}
        />
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          {title}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">{body}</p>

        <a
          href="/"
          className="mt-2 rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--brand-green)" }}
        >
          もう一度ログインする
        </a>

        {key ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            エラーコード: {key}
          </p>
        ) : null}
      </div>
    </div>
  );
}
