"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, LoaderCircle, X } from "lucide-react";
import { useGameStore, type Player } from "@/store/gameStore";
import { compressAvatar } from "@/utils/imageCompress";
import { track } from "@/utils/analytics";

interface Props {
  player: Player;
  index: number;
}

export function PlayerRow({ player, index }: Props) {
  const renamePlayer = useGameStore((s) => s.renamePlayer);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const setPlayerAvatar = useGameStore((s) => s.setPlayerAvatar);
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

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label={player.avatarBase64 ? `Chụp lại ảnh cho ${player.name}` : `Chụp ảnh cho ${player.name}`}
        className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-ink-2 text-ash transition-colors active:border-bone"
      >
        {player.avatarBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL, next/image không cần thiết
          <img src={player.avatarBase64} alt="" className="size-full object-cover grayscale-[35%]" />
        ) : (
          <Camera className="size-5" strokeWidth={1.5} />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-ink/70">
            <LoaderCircle className="size-5 animate-spin text-bone" />
          </span>
        )}
      </button>
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
