import type { GameRound } from "@/lib/game/content/types";

export function RoundIntro({
  round,
  lives,
  rewards,
  onBegin,
}: {
  round: GameRound;
  lives: number;
  rewards: string[];
  onBegin: () => void;
}) {
  return (
    <section className="grid min-h-screen place-items-center gap-4 p-8 text-center">
      <div>
        <h2 className="text-3xl font-semibold">{round.title}</h2>
        <p className="mt-2">{round.subtitle}</p>
        <p className="mt-4">Mạng: {lives}</p>
        <p>Mảnh mã: {rewards.length ? rewards.join(", ") : "chưa có"}</p>
      </div>
      <button type="button" className="rounded-full bg-teal-700 px-6 py-3 text-white" onClick={onBegin}>
        Vào vòng
      </button>
    </section>
  );
}
