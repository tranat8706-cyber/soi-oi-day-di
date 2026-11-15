import { memo } from "react";
import { folkAvatar, type Shape } from "@/utils/folkAvatar";

function draw(s: Shape, key: number) {
  const paint = { fill: s.fill, stroke: s.stroke, strokeWidth: s.sw, opacity: "op" in s ? s.op : undefined };
  switch (s.t) {
    case "path":
      return <path key={key} d={s.d} strokeDasharray={s.dash} strokeLinecap="round" strokeLinejoin="round" {...paint} />;
    case "circle":
      return <circle key={key} cx={s.cx} cy={s.cy} r={s.r} {...paint} />;
    case "ellipse":
      return <ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...paint} />;
  }
}

/** Avatar chân dung khắc gỗ cho người chưa có ảnh. Cố định theo seed. */
export const FolkAvatar = memo(function FolkAvatar({ seed, className = "" }: { seed: string; className?: string }) {
  const { bg, shapes } = folkAvatar(seed);
  return (
    <svg viewBox="7 5 86 86" className={`size-full ${className}`} aria-hidden>
      <rect x="0" y="0" width="100" height="100" fill={bg} />
      {shapes.map(draw)}
    </svg>
  );
});

/** Seed avatar của một người chơi (đổi được bằng cách chạm vào avatar). */
export const avatarSeedOf = (p: { id: string; avatarSeed?: string }) => p.avatarSeed ?? p.id;
