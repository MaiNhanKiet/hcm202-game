"use client";

import { Button } from "@/components/ui/button";
import { GameBackdrop } from "../GameBackdrop";

export function RoundFail({ onRetry }: { onRetry: () => void }) {
  return (
    <GameBackdrop>
      <section className="grid min-h-screen place-items-center p-6">
        <div className="w-full max-w-md rounded-3xl border-4 border-[#1d4e63] bg-card p-8 text-center shadow-[8px_10px_0_#123846]">
          <h2 className="text-2xl font-bold">Hết mạng</h2>
          <Button
            type="button"
            size="lg"
            className="mt-8 h-12 cursor-pointer rounded-2xl px-8 text-base"
            onClick={onRetry}
          >
            Thử lại vòng này
          </Button>
        </div>
      </section>
    </GameBackdrop>
  );
}
