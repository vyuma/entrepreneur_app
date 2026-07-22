"use client";

import { useState, useTransition } from "react";
import { togglePortfolioVisibility } from "@/actions/settings";

export default function PortfolioActions({
  userId,
  isPublic,
}: {
  userId: string;
  isPublic: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const toggle = (checked: boolean) => {
    const fd = new FormData();
    fd.set("user_id", userId);
    if (checked) fd.set("public", "on");
    startTransition(() => {
      void togglePortfolioVisibility(fd);
    });
  };

  const copyMarkdown = async () => {
    const res = await fetch(`/api/portfolio/${userId}/markdown`);
    if (!res.ok) return;
    const { markdown } = await res.json();
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 print:hidden">
      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          defaultChecked={isPublic}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          className="h-4 w-4 accent-[var(--brand-green)]"
        />
        公開する（未ログインでも閲覧可）
      </label>

      <button
        type="button"
        onClick={copyMarkdown}
        className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {copied ? "コピーしました" : "Markdownをコピー"}
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--brand-green)" }}
      >
        PDFで保存
      </button>
    </div>
  );
}
