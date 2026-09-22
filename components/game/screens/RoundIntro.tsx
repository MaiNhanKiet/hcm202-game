"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { GameRound } from "@/lib/game/content/types";
import { GameBackdrop } from "../GameBackdrop";

const RULES = [
  {
    step: "1",
    title: "Đọc câu hỏi",
    detail: "Mỗi cá mang một đáp án (A, B, C…). Câu đúng cần bắt đúng cá.",
  },
  {
    step: "2",
    title: "Quăng câu",
    detail:
      "Giữ chuột trái, kéo trong vùng quạt trắng để chỉnh lực, rồi thả để quăng.",
  },
  {
    step: "3",
    title: "Kéo cần & tránh nguy hiểm",
    detail:
      "Giữ chuột trái để kéo mồi lên. Tránh bom, rác, rong và lưới — câu trúng sẽ mất mạng. Vòng càng cao vật cản càng dày.",
  },
] as const;

export function RoundIntro({
  round,
  roundNumber,
  totalRounds,
  lives,
  rewards,
  onBegin,
}: {
  round: GameRound;
  roundNumber: number;
  totalRounds: number;
  lives: number;
  rewards: string[];
  onBegin: () => void;
}) {
  return (
    <GameBackdrop>
      <section className="grid min-h-screen place-items-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] border-4 border-[#1d4e63] bg-card/95 shadow-[10px_12px_0_#123846]"
        >
          <div className="border-b-4 border-[#1d4e63]/25 bg-[linear-gradient(135deg,#f7e7c8_0%,#e8f4f8_55%,#d5eef3_100%)] px-6 py-5 sm:px-8 sm:py-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
              Vòng {roundNumber}/{totalRounds}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#123846] sm:text-4xl">
              {round.title}
            </h2>
            <p className="mt-2 max-w-xl text-base text-[#3a5560] sm:text-lg">
              {round.subtitle}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border-2 border-[#1d4e63]/35 bg-white/80 px-3 py-1 text-sm font-semibold text-[#123846]">
                ♥ {lives} mạng
              </span>
              <span className="rounded-full border-2 border-[#1d4e63]/35 bg-white/80 px-3 py-1 text-sm font-semibold text-[#123846]">
                {round.questions.length} câu hỏi
              </span>
              <span className="rounded-full border-2 border-[#1d4e63]/35 bg-white/80 px-3 py-1 text-sm font-medium text-[#3a5560]">
                Phần thưởng: {round.reward}
              </span>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5 sm:px-8 sm:py-6">
            <div>
              <h3 className="text-sm font-bold tracking-[0.16em] text-primary uppercase">
                Luật chơi
              </h3>
              <ol className="mt-3 grid gap-3">
                {RULES.map((rule, index) => (
                  <motion.li
                    key={rule.step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * index + 0.15 }}
                    className="flex gap-3 rounded-2xl border-2 border-[#1d4e63]/20 bg-[#f4fafb] p-3 sm:p-3.5"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#1d4e63] text-sm font-bold text-white">
                      {rule.step}
                    </span>
                    <div>
                      <p className="font-semibold text-[#123846]">{rule.title}</p>
                      <p className="mt-0.5 text-sm leading-snug text-[#4a6570]">
                        {rule.detail}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-3 border-t-2 border-dashed border-[#1d4e63]/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Mảnh mã đã có:{" "}
                <span className="font-medium text-foreground">
                  {rewards.length ? rewards.join(", ") : "chưa có"}
                </span>
              </p>
              <Button
                type="button"
                size="lg"
                aria-label="vào vòng"
                className="h-12 cursor-pointer rounded-2xl px-8 text-base font-semibold"
                onClick={onBegin}
              >
                Vào câu cá
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </GameBackdrop>
  );
}
