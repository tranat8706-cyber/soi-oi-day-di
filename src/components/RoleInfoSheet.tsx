"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { getRole, isWolfRole, type RoleId } from "@/constants/roles";
import { useArt } from "@/hooks/useArt";
import { THEMES, cardSrc } from "@/constants/themes";

/** Bảng trượt giới thiệu một vai: ảnh lá bài + chức năng. Dùng khi cả bàn đang chọn bộ bài. */
export function RoleInfoSheet({ id, onClose, classic = false }: { id: RoleId | null; onClose: () => void; classic?: boolean }) {
  const art = useArt();
  // Phần giới thiệu (Sổ tay) luôn dùng bộ Truyền thống.
  const card = (rid: RoleId) => (classic ? cardSrc(THEMES.classic, rid) : art.card(rid));
  const role = getRole(id);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  return (
    <AnimatePresence>
      {role && (
        <>
          <motion.div
            key="role-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-[2px]"
          />
          <motion.div
            key="role-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={role.name}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[88dvh] max-w-xl overflow-y-auto rounded-t-[28px] border-t border-line bg-ink-2 px-safe pb-safe"
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-line" />
            <div className="flex items-start justify-between gap-3 pt-4">
              <div>
                <p className={`font-mono text-[11px] uppercase tracking-[0.25em] ${isWolfRole(role.id) ? "text-blood" : "text-ash"}`}>
                  {isWolfRole(role.id) ? "Phe Sói" : "Phe Làng"}
                </p>
                <h2
                  className={`mt-1 pt-[0.1em] font-display text-[clamp(2.5rem,12vw,3.5rem)] uppercase leading-[1.15] ${
                    isWolfRole(role.id) ? "text-blood" : "text-bone"
                  }`}
                >
                  {role.name}
                </h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Đóng" className="-mr-4 grid size-16 place-items-center text-ash active:text-bone">
                <X className="size-6" strokeWidth={1.5} />
              </button>
            </div>
            <div className="mt-3 flex gap-4 pb-8">
              {card(role.id) && (
                <span className="relative block aspect-9/16 w-28 shrink-0 overflow-hidden rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
                  <Image src={card(role.id)!} alt="" fill sizes="112px" className="object-cover" />
                </span>
              )}
              <p className="text-base leading-relaxed text-bone/85">{role.description}</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
