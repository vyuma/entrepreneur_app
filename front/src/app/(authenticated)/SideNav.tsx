"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type SVGProps, useEffect, useState } from "react";

const LOGO_SRC = "/image.png" as const;
// サイドバーの幅は w-64 (16rem)。layout.tsx の lg:pl-64 と対応している

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

function EventsIcon(props: IconProps) {
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
      <path d="M12 3.5 14.3 8l5 .7-3.6 3.5.9 5-4.6-2.4L7.4 17.2l.9-5L4.7 8.7l5-.7L12 3.5Z" />
      <path d="M6 21h12" />
    </svg>
  );
}

function MorningIcon(props: IconProps) {
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
      {/* 地平線から昇る朝日 */}
      <circle cx="12" cy="14" r="3.5" />
      <path d="M2.5 18h19" />
      <path d="M12 6.5V4.5" />
      <path d="M5.6 7.6 4.2 6.2" />
      <path d="M18.4 7.6l1.4-1.4" />
      <path d="M3.5 14h-1" />
      <path d="M21.5 14h-1" />
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

function GoalIcon(props: IconProps) {
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
      {/* 的（ターゲット）*/}
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

function MenuIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  Icon: (p: IconProps) => React.ReactElement;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "ダッシュボード", Icon: DashboardIcon },
  { href: "/morning", label: "朝活", Icon: MorningIcon },
  { href: "/todos", label: "TODO・目標", Icon: GoalIcon },
  { href: "/events", label: "NueStar", Icon: EventsIcon },
  { href: "/competitions", label: "コンペ", Icon: CompetitionsIcon },
  { href: "/achievements", label: "成果", Icon: AchievementsIcon },
  { href: "/members", label: "メンバー", Icon: MembersIcon },
  { href: "/activities", label: "活動実績", Icon: ActivitiesIcon },
  { href: "/points", label: "ポイント", Icon: PointsIcon },
  { href: "/profile", label: "プロフィール", Icon: ProfileIcon },
];

const ADMIN_ITEM: NavItem = { href: "/admin", label: "管理", Icon: AdminIcon };

/** 現在のパスがその項目に属するか（配下のページでも点灯させる） */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <Link
      href="/dashboard"
      className="group flex items-center"
      aria-label="NueStar"
    >
      <span className="relative block h-10 w-32 shrink-0 overflow-hidden">
        <Image
          src={LOGO_SRC}
          alt="NueStar logo"
          fill
          priority
          sizes="128px"
          className="scale-[2.1] object-contain object-center transition-transform duration-500 group-hover:scale-[2.2]"
        />
      </span>
    </Link>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-lg py-2.5 pl-4 pr-3 text-sm tracking-wide transition-colors ${
        active
          ? "bg-zinc-100 font-medium text-black dark:bg-zinc-800/70 dark:text-zinc-50"
          : "text-zinc-600 hover:bg-zinc-100/70 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50"
      }`}
    >
      {/* 選択中は左端にブランドカラーの縦インジケータを出す */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[var(--brand-green)] to-[var(--brand-orange)] transition-all duration-200 ${
          active ? "h-6 opacity-100" : "h-2 opacity-0 group-hover:opacity-40"
        }`}
      />
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ${
          active ? "" : "group-hover:scale-110"
        }`}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function UserBadge({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) {
  return (
    <Link
      href="/profile"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40"
    >
      {image && (
        <span className="shrink-0 rounded-full bg-gradient-to-br from-[var(--brand-green)] via-[var(--brand-yellow)] to-[var(--brand-orange)] p-px shadow-[0_0_8px_-2px_var(--brand-green)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image
              .replace("size=1024", "size=64")
              .replace("s=1024", "s=64")}
            alt="User Avatar"
            className="block h-7 w-7 rounded-full bg-white dark:bg-zinc-900"
          />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {name}
      </span>
    </Link>
  );
}

/**
 * 縦型のサイドバーナビ。
 *
 * lg 以上では左側に固定表示し、全項目にラベルを出す（横並びだと項目数が
 * 増えるほどラベルを畳まざるを得なかったため縦に変更した）。
 * lg 未満は上部バー + 左からのドロワーに切り替える。
 */
export default function SideNav({
  isAdmin,
  userName,
  userImage,
}: {
  isAdmin: boolean;
  userName?: string | null;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  // ドロワーを開いている間は背後をスクロールさせない。Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const nav = (onNavigate?: () => void) => (
    <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );

  return (
    <>
      {/* --- デスクトップ: 固定サイドバー --- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-200/80 bg-white/80 backdrop-blur-md lg:flex dark:border-zinc-800/80 dark:bg-zinc-950/70">
        {/* 右端のブランドグラデーションライン */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[var(--brand-orange)] to-transparent opacity-60"
        />
        <div className="flex h-16 shrink-0 items-center px-4">
          <Logo />
        </div>
        {nav()}
        <div className="shrink-0 border-t border-zinc-200/80 p-2 dark:border-zinc-800/80">
          <UserBadge name={userName} image={userImage} />
        </div>
      </aside>

      {/* --- モバイル: 上部バー --- */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/80 px-3 backdrop-blur-md lg:hidden dark:border-zinc-800/80 dark:bg-zinc-950/70">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-orange)] to-transparent opacity-60"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="メニューを開く"
          aria-expanded={open}
          className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <Logo />
        <Link href="/profile" aria-label="プロフィール" className="shrink-0">
          {userImage ? (
            <span className="block rounded-full bg-gradient-to-br from-[var(--brand-green)] via-[var(--brand-yellow)] to-[var(--brand-orange)] p-px">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={userImage
                  .replace("size=1024", "size=64")
                  .replace("s=1024", "s=64")}
                alt="User Avatar"
                className="block h-7 w-7 rounded-full bg-white dark:bg-zinc-900"
              />
            </span>
          ) : (
            <ProfileIcon className="h-6 w-6 text-zinc-500" />
          )}
        </Link>
      </header>

      {/* --- モバイル: ドロワー --- */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            style={{ animation: "drawer-in 220ms cubic-bezier(.2,.8,.3,1)" }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between px-3">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="メニューを閉じる"
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {nav(() => setOpen(false))}
            <div className="shrink-0 border-t border-zinc-200 p-2 dark:border-zinc-800">
              <UserBadge name={userName} image={userImage} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
