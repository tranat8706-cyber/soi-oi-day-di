"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Moon, Sun, Vote, X } from "lucide-react";
import { ROLE_ORDER, ROLES, isWolfRole, type RoleId } from "@/constants/roles";
import { NEWBIE_OK } from "@/utils/balancer";
import { THEMES, cardSrc } from "@/constants/themes";
import { RoleInfoSheet } from "./RoleInfoSheet";

type Tab = "rules" | "roles";

/** Vai cơ bản: bàn nào cũng có. */
const CORE = new Set<RoleId>(["WOLF", "VILLAGER", "SEER"]);
/** Vai có cách thắng riêng, không theo phe. */
const SOLO = new Set<RoleId>(["WHITE_WOLF", "CUPID"]);
const SOLO_NOTE: Partial<Record<RoleId, string>> = {
  WHITE_WOLF: "Thắng một mình",
  CUPID: "Có thể tạo phe Cặp đôi",
};

const levelOf = (id: RoleId) => (CORE.has(id) || NEWBIE_OK.has(id as never) ? "Chiếu mới" : "Có số má");

/** Sổ tay: luật chơi cơ bản và toàn bộ vai trong app. Chuyền máy cho cả bàn đọc lúc chờ. */
export function Handbook({ open, onClose, onReplayGuide }: { open: boolean; onClose: () => void; onReplayGuide?: () => void }) {
  const [tab, setTab] = useState<Tab>("rules");
  const [info, setInfo] = useState<RoleId | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !info && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, info, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="handbook"
          role="dialog"
          aria-modal="true"
          aria-label="Sổ tay luật chơi và các vai"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 38 }}
          className="fixed inset-0 z-[60] flex flex-col bg-ink"
        >
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col overflow-hidden pt-safe">
            <header className="flex items-center justify-between px-safe pt-2">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-ash">
                <BookOpen className="size-4" strokeWidth={1.75} /> Sổ tay
              </p>
              <button type="button" onClick={onClose} aria-label="Đóng sổ tay" className="-mr-4 grid size-16 place-items-center text-bone">
                <X className="size-7" strokeWidth={1.5} />
              </button>
            </header>

            <div role="tablist" aria-label="Nội dung sổ tay" className="mx-5 grid grid-cols-2 gap-1 rounded-2xl border border-line p-1">
              {(
                [
                  ["rules", "Luật chơi"],
                  ["roles", `Các vai · ${ROLE_ORDER.length}`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`h-12 rounded-xl font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
                    tab === id ? "bg-bone text-ink" : "text-ash active:text-bone"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-safe pb-safe">
              {tab === "rules" ? <Rules onReplayGuide={onReplayGuide} /> : <Roles onPick={setInfo} />}
            </div>
          </div>
          <RoleInfoSheet id={info} onClose={() => setInfo(null)} classic />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-8 pt-[0.1em] font-display text-3xl uppercase leading-[1.15] text-bone">{children}</h3>
);

function Rules({ onReplayGuide }: { onReplayGuide?: () => void }) {
  return (
    <div className="pb-10">
      <h2 className="mt-6 pt-[0.1em] font-display text-[clamp(2.75rem,13vw,4.5rem)] uppercase leading-[1.15] text-bone">
        Chơi sao<span className="text-blood">?</span>
      </h2>
      <p className="mt-2 text-base leading-relaxed text-bone/80">
        Cả làng có vài con Sói đội lốt người. Ban đêm Sói lén cắn, ban ngày cả làng bàn nhau treo cổ kẻ đáng nghi. Không ai biết bài của
        ai, chỉ Quản trò biết hết.
      </p>

      <H>Ai thắng?</H>
      <ul className="mt-3 flex flex-col gap-2">
        <Win color="bg-[#f5c15a]" who="Phe Làng" how="Treo hoặc giết hết Sói." />
        <Win color="bg-blood" who="Phe Sói" how="Số Sói còn sống bằng hoặc nhiều hơn số người còn lại." />
        <Win color="bg-rose" who="Cặp đôi khác phe" how="Hai người yêu nhau sống sót tới cuối, mọi người khác chết hết." />
        <Win color="bg-bone" who="Sói trắng" how="Là người cuối cùng còn sống." />
      </ul>

      <H>Một vòng chơi</H>
      <ol className="mt-3 flex flex-col gap-3">
        <Step icon={Moon} title="Đêm" body="Cả làng nhắm mắt. Quản trò gọi từng vai dậy theo thứ tự: Sói chọn người cắn, Tiên tri soi, Bảo vệ che, Phù thủy cứu hoặc giết…" />
        <Step icon={Sun} title="Sáng" body="Cả làng mở mắt. Quản trò công bố đêm qua ai chết (hoặc không ai chết). Người chết rời cuộc chơi." />
        <Step icon={Vote} title="Ngày" body="Cả làng bàn bạc, tố nhau, bào chữa. Đếm 1-2-3 cùng chỉ tay; ai nhiều phiếu nhất lên giàn nói lời cuối, rồi cả làng biểu quyết treo hay tha." />
      </ol>
      <p className="mt-3 text-sm leading-snug text-ash">Lặp lại tới khi một phe thắng. App tự báo hết ván.</p>

      <H>Luật hay cãi nhau</H>
      <ul className="mt-3 flex flex-col gap-2 text-base leading-snug text-bone/85">
        <Rule>Người chết không được nói, không gợi ý, không làm mặt.</Rule>
        <Rule>Không được lật bài cho người khác xem, không thề thốt bằng bài.</Rule>
        <Rule>Ban đêm nhắm mắt thật, không hé. Quản trò thấy là phạt.</Rule>
        <Rule>Hòa phiếu, có lật bài người chết hay không: cả bàn chốt ở phần Luật chơi trước khi chia bài.</Rule>
        <Rule>Tự nhận vai thoải mái, nhưng nói dối cũng là một phần của trò chơi.</Rule>
      </ul>

      {onReplayGuide && (
        <button
          type="button"
          onClick={onReplayGuide}
          className="mt-8 flex min-h-16 w-full items-center justify-center rounded-2xl border border-line font-mono text-[11px] uppercase tracking-[0.18em] text-bone active:bg-ink-2"
        >
          Xem lại hướng dẫn cho Quản trò
        </button>
      )}
    </div>
  );
}

const Win = ({ color, who, how }: { color: string; who: string; how: string }) => (
  <li className="flex items-start gap-3 rounded-xl border border-line bg-ink-2 px-4 py-3">
    <span className={`mt-1.5 size-3 shrink-0 rounded-full ${color}`} />
    <span>
      <span className="block text-lg font-semibold text-bone">{who}</span>
      <span className="block text-sm leading-snug text-bone/75">{how}</span>
    </span>
  </li>
);

const Step = ({ icon: Icon, title, body }: { icon: typeof Moon; title: string; body: string }) => (
  <li className="flex gap-3">
    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-ink-2">
      <Icon className="size-5 text-bone" strokeWidth={1.75} />
    </span>
    <span>
      <span className="block pt-[0.1em] font-display text-2xl uppercase leading-[1.15] text-bone">{title}</span>
      <span className="block text-base leading-snug text-bone/80">{body}</span>
    </span>
  </li>
);

const Rule = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2">
    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-blood" />
    <span>{children}</span>
  </li>
);

function Roles({ onPick }: { onPick: (id: RoleId) => void }) {
  // Phần giới thiệu luôn dùng bộ Truyền thống (bộ mặc định), không theo bộ hình đang chọn.
  const card = (id: RoleId) => cardSrc(THEMES.classic, id);
  const groups: { title: string; tone: string; ids: RoleId[] }[] = [
    { title: "Phe Sói", tone: "text-blood", ids: ROLE_ORDER.filter((id) => isWolfRole(id) && !SOLO.has(id)) },
    { title: "Phe Làng", tone: "text-bone", ids: ROLE_ORDER.filter((id) => !isWolfRole(id) && !SOLO.has(id)) },
    { title: "Chơi theo cách riêng", tone: "text-rose", ids: ROLE_ORDER.filter((id) => SOLO.has(id)) },
  ];
  return (
    <div className="pb-10">
      <p className="mt-6 text-sm leading-snug text-ash">
        Chạm vào vai để đọc đầy đủ. Nhãn <span className="text-bone">Chiếu mới</span> là vai dễ, hợp bàn có người mới chơi.
      </p>
      {groups.map((g) => (
        <section key={g.title} className="mt-6">
          <p className={`font-mono text-[11px] uppercase tracking-[0.25em] ${g.tone}`}>
            {g.title} · {g.ids.length}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {g.ids.map((id) => {
              const role = ROLES[id];
              const src = card(id);
              const wolf = isWolfRole(id);
              const easy = levelOf(id) === "Chiếu mới";
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onPick(id)}
                    className={`flex w-full gap-3 rounded-2xl border p-2 pr-4 text-left active:scale-[0.99] ${
                      wolf ? "border-blood/40 bg-blood/5" : "border-line bg-ink-2"
                    }`}
                  >
                    <span className="relative aspect-9/16 w-14 shrink-0 overflow-hidden rounded-lg">
                      {src && <Image src={src} alt="" fill sizes="56px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1 py-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`pt-[0.1em] font-display text-2xl uppercase leading-[1.1] ${wolf ? "text-blood" : "text-bone"}`}>
                          {role.name}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${
                            easy ? "border-[#7fdcaa]/50 text-[#7fdcaa]" : "border-line text-ash"
                          }`}
                        >
                          {levelOf(id)}
                        </span>
                        {SOLO_NOTE[id] && (
                          <span className="rounded-full border border-rose/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-rose">
                            {SOLO_NOTE[id]}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 line-clamp-3 block text-sm leading-snug text-bone/75">{role.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
