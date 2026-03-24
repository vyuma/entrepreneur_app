import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/")

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <nav className="border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-semibold text-black dark:text-zinc-50">
            Nagoya University Entrepreneur Club
          </span>
          <div className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <a href="/dashboard" className="hover:text-black dark:hover:text-zinc-50">
              ダッシュボード
            </a>
            <a href="/members" className="hover:text-black dark:hover:text-zinc-50">
              メンバー
            </a>
            <a href="/activities" className="hover:text-black dark:hover:text-zinc-50">
              活動実績
            </a>
            <a href="/points" className="hover:text-black dark:hover:text-zinc-50">
              ポイント
            </a>
            <a href="/profile" className="hover:text-black dark:hover:text-zinc-50">
              プロフィール
            </a>
            <span className="text-zinc-400">

              {session.user.name}
              {session.user.image && (
                <img
                  src={session.user.image
                    .replace("size=1024", "size=32")
                    .replace("s=1024", "s=32")}
                  alt="User Avatar"
                  className="ml-2 inline-block h-6 w-6 rounded-full"
                />
              )
                  }
            </span>

          </div>
          
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
