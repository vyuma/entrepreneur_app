"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * アプリ内でカメラを開いて本のバーコード（ISBN）を読み取る。
 *
 * - まず標準の BarcodeDetector を試し、無ければ ZXing を動的に読み込む
 *   （ZXing は約200KBあるため、スキャナを開いた人だけが読み込む）
 * - 日本の書籍は下段に価格用のバーコード（192...）が並ぶので、
 *   978/979 で始まるものだけを採用する
 * - カメラは背面（environment）を優先し、閉じたら必ず停止する
 */

type Props = {
  /** ISBN を読み取れたときに呼ばれる */
  onDetected: (isbn: string) => void;
  /** 読み取り中かどうか（親が照会中は一時停止する） */
  paused?: boolean;
};

type Status = "idle" | "starting" | "scanning" | "denied" | "unsupported";

/** 書籍のバーコードか（価格バーコードなどを弾く） */
function isBookBarcode(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 13 && /^97[89]/.test(digits);
}

export default function IsbnScanner({ onDetected, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  // 同じコードを連続で拾わないよう、直前の値を覚えておく
  const lastRef = useRef<string>("");
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const handle = useCallback(
    (raw: string) => {
      if (pausedRef.current) return;
      const digits = raw.replace(/\D/g, "");
      if (!isBookBarcode(digits) || digits === lastRef.current) return;
      lastRef.current = digits;
      // 読み取れたことを触覚でも伝える
      navigator.vibrate?.(20);
      onDetected(digits);
    },
    [onDetected],
  );

  /** カメラを止める。閉じ忘れるとランプが点いたままになるので必ず通す */
  const stop = useCallback(() => {
    stopScanRef.current?.();
    stopScanRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("starting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError(
        "このブラウザではカメラを使えません。ISBNを手入力してください。",
      );
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      setStatus("denied");
      setError(
        name === "NotAllowedError"
          ? "カメラの使用が許可されませんでした。ブラウザの設定で許可するか、ISBNを手入力してください。"
          : "カメラを起動できませんでした。ISBNを手入力してください。",
      );
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    // iOS Safari でインライン再生させるために必要
    video.setAttribute("playsinline", "true");
    await video.play().catch(() => undefined);
    setStatus("scanning");

    // 標準APIが使えるならそれを使う（追加の読み込みが要らない）
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (o: {
          formats: string[];
        }) => {
          detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;

    if (Detector) {
      const detector = new Detector({ formats: ["ean_13"] });
      let raf = 0;
      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          for (const code of codes) handle(code.rawValue);
        } catch {
          // フレームによっては失敗するので黙って次へ
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      stopScanRef.current = () => cancelAnimationFrame(raf);
      return;
    }

    // 非対応ブラウザ（iOS Safari など）は ZXing を読み込んで読み取る
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoElement(video, (result) => {
        if (result) handle(result.getText());
      });
      stopScanRef.current = () => controls.stop();
    } catch {
      setStatus("unsupported");
      setError(
        "バーコードの読み取りを開始できませんでした。ISBNを手入力してください。",
      );
    }
  }, [handle]);

  // 画面を離れるときは必ずカメラを止める
  useEffect(() => stop, [stop]);

  const active = status === "starting" || status === "scanning";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={active ? stop : start}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{
            backgroundColor: active ? "#a1a1aa" : "var(--brand-green)",
          }}
        >
          {active ? "カメラを閉じる" : "📷 カメラでISBNを読み取る"}
        </button>
        {status === "scanning" && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            本の裏表紙のバーコード（978から始まる方）を枠に入れてください
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--brand-orange)" }}>
          {error}
        </p>
      )}

      {active && (
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-black dark:border-zinc-800">
          {/* biome-ignore lint/a11y/useMediaCaption: カメラのライブ映像に字幕は無い */}
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-56 w-full object-cover sm:h-72"
          />
          {/* 読み取り枠の目安 */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2"
            style={{ borderColor: "var(--brand-green)" }}
          />
          {status === "starting" && (
            <span className="absolute inset-0 grid place-items-center text-sm text-white">
              カメラを起動しています...
            </span>
          )}
        </div>
      )}
    </div>
  );
}
