"use client";

import { useEffect, useState } from "react";

/**
 * ダークモードかどうかを返す。
 * グラフの色はモードごとに検証済みの別ステップを使うため、自動反転させない。
 */
export function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return dark;
}
