"use client";

import { GameBackdrop } from "../GameBackdrop";

export function WinScreen({ rewards }: { rewards: string[] }) {
  return (
    <GameBackdrop>
      <section className="grid min-h-screen place-items-center p-6">
        <div className="w-full max-w-md rounded-3xl border-4 border-[#1d4e63] bg-card p-8 text-center shadow-[8px_10px_0_#123846]">
          <h2 className="text-3xl font-bold">Giải mã quyền lực</h2>
          <ul className="mt-6 space-y-2 text-lg">
            {rewards.map((reward) => (
              <li key={reward}>{reward}</li>
            ))}
          </ul>
        </div>
      </section>
    </GameBackdrop>
  );
}
