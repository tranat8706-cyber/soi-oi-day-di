"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, LoaderCircle, X } from "lucide-react";
import { useGameStore, type Player } from "@/store/gameStore";
import { compressAvatar } from "@/utils/imageCompress";
import { track } from "@/utils/analytics";
import { FolkAvatar, avatarSeedOf } from "@/components/FolkAvatar";

interface Props {
  player: Player;
  index: number;
}

export function PlayerRow({ player, index }: Props) {
  const renamePlayer = useGameStore((s) => s.renamePlayer);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const setPlayerAvatar = useGameStore((s) => s.setPlayerAvatar);
  const rerollAvatar = useGameStore((s) => s.rerollAvatar);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await compressAvatar(file);
      setPlayerAvatar(player.id, dataUrl);
      track("avatar_captured", { bytes: Math.round((dataUrl.length * 3) / 4) });
    } catch (err) {
      console.error("Không nén được ảnh", err);
    } finally {
      setBusy(false);
    }
  };

  // Tên tạm "Người 3" hiện thành ô trống có gợi ý, để Quản trò thấy ngay chỗ cần điền.
  const temp = /^Người \d+$/.test(player.name);
  const shown = temp ? "" : player.name;

  const commitName = (el: HTMLInputElement) => {
    const next = el.value.trim();
    if (!next) el.value = shown;
    else if (next !== player.name) renamePlayer(player.id, next);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="flex items-center gap-3 border-b border-line py-2"
    >
      <span className="w-7 shrink-0 font-mono text-xs tabular-nums text-ash">
        {String(index + 1).padStart(2, "0")}
      </span>

      <span className="relative shrink-0">
        <button
          type="button"
          onClick={() => (player.avatarBase64 ? fileRef.current?.click() : rerollAvatar(player.id))}
          aria-label={player.avatarBase64 ? `Chụp lại ảnh cho ${player.name}` : `Đổi avatar ngẫu nhiên cho ${player.name}`}
          className="relative grid size-16 place-items-center overflow-hidden rounded-full border border-line bg-ink-2 transition-colors active:scale-95 active:border-bone"
        >
          {player.avatarBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL, next/image không cần thiết
            <img src={player.avatarBase64} alt="" className="size-full object-cover grayscale-[35%]" />
          ) : (
            <FolkAvatar seed={avatarSeedOf(player)} />
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-ink/70">
              <LoaderCircle className="size-5 animate-spin text-bone" />
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => (player.avatarBase64 ? setPlayerAvatar(player.id, undefined) : fileRef.current?.click())}
          aria-label={player.avatarBase64 ? `Bỏ ảnh, dùng avatar pixel cho ${player.name}` : `Chụp ảnh cho ${player.name}`}
          className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border border-line bg-ink text-bone active:bg-ink-2"
        >
          {player.avatarBase64 ? <X className="size-3.5" strokeWidth={2.5} /> : <Camera className="size-3.5" strokeWidth={2} />}
        </button>
      </span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onFile}
      />

      <input
        key={player.name}
        defaultValue={shown}
        placeholder={`${player.name} · điền tên`}
        aria-label={`Tên người chơi ${index + 1}`}
        onBlur={(e) => commitName(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
          if (e.key === "Escape") {
            e.currentTarget.value = shown;
            e.currentTarget.blur();
          }
        }}
        autoComplete="off"
        autoCapitalize="words"
        className={`h-14 min-w-0 flex-1 rounded-xl border px-3 text-xl font-medium text-bone outline-none placeholder:text-base placeholder:font-normal placeholder:text-ash/60 focus:border-bone ${
          temp ? "border-dashed border-ash/50 bg-ink-2" : "border-transparent bg-transparent focus:bg-ink-2"
        }`}
      />

      <button
        type="button"
        onClick={() => removePlayer(player.id)}
        aria-label={`Xóa ${player.name}`}
        className="grid size-16 shrink-0 place-items-center text-ash transition-colors active:text-blood"
      >
        <X className="size-5" strokeWidth={1.5} />
      </button>
    </motion.li>
  );
}
