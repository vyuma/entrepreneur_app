"use client"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-zinc-500 dark:text-zinc-400">
        データの読み込みに失敗しました。バックエンドが起動しているか確認してください。
      </p>
      <button
        onClick={reset}
        className="rounded-full border border-zinc-300 px-5 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        再試行
      </button>
    </div>
  )
}
