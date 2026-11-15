"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, LoaderCircle, Share2, X } from "lucide-react";
import { renderStory, type StoryData } from "@/utils/storyImage";

/** Nút tạo ảnh Story 9:16 của ván, xem trước rồi chia sẻ hoặc tải về. */
export function ShareStory({ data }: { data: () => StoryData }) {
  const [busy, setBusy] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const make = async () => {
    setBusy(true);
    try {
      setBlob(await renderStory(data()));
    } finally {
      setBusy(false);
    }
  };

  const file = () => new File([blob!], "soi-oi-day-di-story.png", { type: "image/png" });
  const canShare = typeof navigator !== "undefined" && !!blob && !!navigator.canShare?.({ files: [file()] });

  const share = async () => {
    try {
      await navigator.share({ files: [file()], title: "Sói ơi dậy đi!" });
    } catch {
      /* người dùng đóng bảng chia sẻ */
    }
  };

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "soi-oi-day-di-story.png";
    a.click();
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={make}
        disabled={busy}
        whileTap={{ scale: 0.97 }}
        className="flex h-20 w-full items-center justify-between rounded-2xl bg-linear-to-r from-[#d94a8c] via-blood to-[#f59e0b] px-6 text-bone"
      >
        <span className="text-left">
          <span className="block pt-[0.1em] font-display text-[clamp(1.4rem,6vw,1.9rem)] uppercase leading-[1.08]">Share Story ván này</span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-bone/80">Ảnh 9:16 · đăng Insta, TikTok, Zalo</span>
        </span>
        {busy ? <LoaderCircle className="size-7 animate-spin" /> : <Share2 className="size-7 shrink-0" strokeWidth={2} />}
      </motion.button>

      <AnimatePresence>
        {url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 px-safe pb-safe pt-safe"
            role="dialog"
            aria-modal="true"
            aria-label="Xem trước ảnh Story"
          >
            <button
              type="button"
              onClick={() => setBlob(null)}
              aria-label="Đóng"
              className="absolute right-2 top-2 grid size-16 place-items-center text-bone"
            >
              <X className="size-7" strokeWidth={1.5} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh blob vừa vẽ */}
            <img src={url} alt="Ảnh Story của ván" className="max-h-[72dvh] w-auto rounded-2xl shadow-2xl" />
            <div className="flex w-full max-w-md gap-3">
              {canShare && (
                <button
                  type="button"
                  onClick={share}
                  className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-bone font-display text-2xl uppercase text-ink"
                >
                  <Share2 className="size-5" strokeWidth={2} /> Chia sẻ
                </button>
              )}
              <button
                type="button"
                onClick={download}
                className={`flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl font-display text-2xl uppercase ${
                  canShare ? "border border-line text-bone" : "bg-bone text-ink"
                }`}
              >
                <Download className="size-5" strokeWidth={2} /> Tải về
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
