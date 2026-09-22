"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GameBackdrop } from "../GameBackdrop";

const HIGHLIGHTS = [
  "Câu cá mang đáp án tư tưởng Hồ Chí Minh",
  "Kéo quạt trắng để chỉnh lực quăng",
  "Bắt đúng cá — giải mã từng vòng",
] as const;

export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <GameBackdrop>
      <section className="relative grid min-h-screen place-items-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl text-center"
        >
          <motion.p
            className="text-sm font-semibold tracking-[0.28em] text-[#123846] uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            HCM202
          </motion.p>
          <h1 className="mt-3 text-5xl leading-[1.05] font-bold tracking-tight text-[#0c2f3a] drop-shadow-[0_2px_0_rgba(255,255,255,0.35)] sm:text-6xl">
            Câu Cá Tri Thức
          </h1>
          <p className="mt-3 text-lg text-[#234652] sm:text-xl">
            Giải mã quyền lực — học tư tưởng qua từng lần quăng câu
          </p>

          <ul className="mx-auto mt-7 flex max-w-md flex-col gap-2 text-left">
            {HIGHLIGHTS.map((line, index) => (
              <motion.li
                key={line}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.08 }}
                className="rounded-2xl border-2 border-[#1d4e63]/35 bg-card/90 px-4 py-2.5 text-sm font-medium text-[#123846] shadow-[4px_4px_0_#123846] sm:text-base"
              >
                {line}
              </motion.li>
            ))}
          </ul>

          <motion.div
            className="mt-8"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
          >
            <Button
              type="button"
              size="lg"
              aria-label="bắt đầu game"
              className="h-12 cursor-pointer rounded-2xl px-10 text-base font-semibold shadow-[5px_5px_0_#123846] sm:h-14 sm:text-lg"
              onClick={onStart}
            >
              Bắt đầu hành trình
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </GameBackdrop>
  );
}
