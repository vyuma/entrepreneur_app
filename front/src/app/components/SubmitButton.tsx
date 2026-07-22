"use client";

import { useFormStatus } from "react-dom";

/**
 * Server Action 用の送信ボタン。
 *
 * 送信中は自動で disabled になり、ラベルとカーソルが変わる。
 * これがないと処理中も押せてしまい、ユーザーが反応が無いと感じて
 * 何度も押す（＝二重送信する）ことになる。
 */
export default function SubmitButton({
  children,
  pendingLabel = "送信中...",
  className = "",
  style,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      style={style}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
