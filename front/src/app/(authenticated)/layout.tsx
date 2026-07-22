import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { SVGProps } from "react";
import { auth } from "@/auth";
import { getAdminMe } from "@/lib/admin";

const LOGO_SRC = "/image.png" as const;

type IconProps = SVGProps<SVGSVGElement>;

function DashboardIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function MembersIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M21.5 19a4.5 4.5 0 0 0-6.6-3.5" />
    </svg>
  );
}

function ActivitiesIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M5 5H3a3 3 0 0 0 4 3" />
      <path d="M19 5h2a3 3 0 0 1-4 3" />
      <path d="M9 21h6" />
      <path d="M12 14v7" />
    </svg>
  );
}

function PointsIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3l1.9 4.6L18.5 9l-3.6 3.1.9 4.7L12 14.6l-3.8 2.2.9-4.7L5.5 9l4.6-1.4L12 3Z" />
      <path d="M19 17l.7 1.6L21.5 19l-1.5 1 .3 1.7L19 21l-1.3.7.3-1.7-1.5-1 1.8-.4L19 17Z" />
    </svg>
  );
}

function CompetitionsIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 3v3" />
      <path d="M16 3v3" />
      <circle cx="8.5" cy="14" r="1" />
      <circle cx="15.5" cy="17" r="1" />
    </svg>
  );
}

function AchievementsIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 5h5v15H4z" />
      <path d="M9.5 5h5v10h-5z" />
      <path d="M15 5h5v7h-5z" />
    </svg>
  );
}

function AdminIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3l7.5 3v5.5c0 4.3-3 8.2-7.5 9.5-4.5-1.3-7.5-5.2-7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ProfileIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3.2" />
      <path d="M5.5 19a6.7 6.7 0 0 1 13 0" />
    </svg>
  );
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const navItems = [
    { href: "/dashboard", label: "ダッシュボード", Icon: DashboardIcon },
    { href: "/competitions", label: "コンペ", Icon: CompetitionsIcon },
    { href: "/achievements", label: "成果", Icon: AchievementsIcon },
    { href: "/members", label: "メンバー", Icon: MembersIcon },
    { href: "/activities", label: "活動実績", Icon: ActivitiesIcon },
    { href: "/points", label: "ポイント", Icon: PointsIcon },
    { href: "/profile", label: "プロフィール", Icon: ProfileIcon },
  ];

  // 管理リンクは権限を持つ人にだけ見せる（本体の保護は /admin 側で行う）
  const me = await getAdminMe();
  if (me.is_admin) {
    navItems.push({ href: "/admin", label: "管理", Icon: AdminIcon });
  }

  return (
    <div className="bg-grid min-h-screen bg-zinc-50 dark:bg-black">
      <nav className="relative border-b border-zinc-200/80 bg-white/80 px-4 py-2 backdrop-blur-md sm:px-6 dark:border-zinc-800/80 dark:bg-zinc-950/70">
        {/* 上端のスキャンライン */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-green)] to-transparent opacity-50"
        />
        {/* 下端のブランドグラデーションライン */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-orange)] to-transparent opacity-60"
        />
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="group flex items-center"
            aria-label="NueStar"
          >
            <span className="relative block h-10 w-32 overflow-hidden sm:h-12 sm:w-44">
              <Image
                src={LOGO_SRC}
                alt="NueStar logo"
                fill
                priority
                sizes="(min-width: 640px) 176px, 128px"
                className="scale-[2.1] object-contain object-center transition-transform duration-500 group-hover:scale-[2.2]"
              />
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-zinc-600 sm:gap-4 dark:text-zinc-400">
            {navItems.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                title={label}
                className="group relative flex items-center gap-1.5 rounded-md px-2 py-1.5 tracking-wide transition-colors hover:text-black dark:hover:text-zinc-50"
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="hidden lg:inline">{label}</span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-orange)] transition-transform duration-300 group-hover:scale-x-100"
                />
              </Link>
            ))}
            <span className="ml-1 flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] md:inline">
                {session.user.name}
              </span>
              {session.user.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <span className="rounded-full bg-gradient-to-br from-[var(--brand-green)] via-[var(--brand-yellow)] to-[var(--brand-orange)] p-px shadow-[0_0_8px_-2px_var(--brand-green)]">
                  <img
                    src={session.user.image
                      .replace("size=1024", "size=32")
                      .replace("s=1024", "s=32")}
                    alt="User Avatar"
                    className="block h-6 w-6 rounded-full bg-white dark:bg-zinc-900"
                  />
                </span>
              )}
            </span>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
