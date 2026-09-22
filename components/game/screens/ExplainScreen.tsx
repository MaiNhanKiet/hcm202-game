"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GameBackdrop } from "../GameBackdrop";

export function ExplainScreen({
  explanation,
  onContinue,
}: {
  explanation: string;
  onContinue: () => void;
}) {
  return (
    <GameBackdrop>
      <section className="grid min-h-screen place-items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl rounded-3xl border-4 border-[#1d4e63] bg-card p-8 text-center shadow-[8px_10px_0_#123846]"
        >
          <p className="text-left text-lg leading-relaxed">{explanation}</p>
          <Button
            type="button"
            size="lg"
            className="mt-8 h-12 cursor-pointer rounded-2xl px-8 text-base"
            onClick={onContinue}
          >
            Tiếp tục
          </Button>
        </motion.div>
      </section>
    </GameBackdrop>
  );
}
