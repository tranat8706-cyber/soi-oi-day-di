"use client";

import { useEffect } from "react";

/**
 * Giữ màn hình luôn sáng trong suốt ván chơi (Screen Wake Lock API).
 * Wake lock tự nhả khi tab bị ẩn, nên xin lại mỗi khi tab hiện trở lại.
 * Một số trình duyệt chỉ cấp sau cử chỉ người dùng, nên cũng thử lại ở lần chạm đầu.
 */
export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        /* bị từ chối (pin yếu, chưa có gesture...) — thử lại sau */
      }
    };

    const onVisibility = () => void acquire();
    const onFirstTouch = () => void acquire();

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointerdown", onFirstTouch, { once: true });

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", onFirstTouch);
      void sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
