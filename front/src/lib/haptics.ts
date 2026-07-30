/**
 * 触覚フィードバック。
 *
 * 完了のような「体で分かってほしい」操作に短い振動を添える。
 * Vibration API 非対応（iOS Safari など）では何も起きないだけなので、
 * 呼び出し側で分岐する必要はない。
 * 動きを減らす設定の人には振動も出さない。
 */
function canVibrate(): boolean {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return false;
  }
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** 完了したときの短い「トン」 */
export function hapticSuccess(): void {
  if (canVibrate()) navigator.vibrate(18);
}

/** 取り消し・失敗したときの二度打ち */
export function hapticCancel(): void {
  if (canVibrate()) navigator.vibrate([12, 40, 12]);
}
