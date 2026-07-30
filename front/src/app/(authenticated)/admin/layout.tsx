import Link from "next/link";
import { getAdminMe } from "@/lib/admin";

const TABS = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/users", label: "ユーザー" },
  { href: "/admin/points", label: "ポイント" },
  { href: "/admin/events", label: "イベント" },
  { href: "/admin/morning", label: "朝活" },
  { href: "/admin/logs", label: "監査ログ" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getAdminMe();

  // 権限が無ければ中身を一切描画しない（データ取得も走らせない）
  if (!me.is_admin) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          管理者専用ページです
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          このページを表示する権限がありません。
        </p>
        <Link
          href="/dashboard"
          className="mt-2 rounded-full px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "var(--brand-green)" }}
        >
          ホームに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          管理
        </h1>
        <span
          className="rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{
            backgroundColor: me.is_master
              ? "var(--brand-orange)"
              : "var(--brand-blue)",
          }}
        >
          {me.is_master ? "master" : "admin"}
        </span>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-full border border-zinc-300 px-3.5 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
