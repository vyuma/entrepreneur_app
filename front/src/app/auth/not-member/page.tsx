export default function NotMemberPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          アクセスできません
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          このアプリを利用するには、Discordサーバーへの参加が必要です。
        </p>
        <a
          href="/"
          className="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          トップに戻る
        </a>
      </div>
    </div>
  );
}
