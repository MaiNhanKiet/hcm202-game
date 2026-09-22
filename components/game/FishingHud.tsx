import type { GameQuestion } from "@/lib/game/content/types";
import { optionTag } from "@/lib/game/fishing/appearance";
import type { SessionState } from "@/lib/game/session/types";

export function FishingHud({
  question,
  state,
  lastCaughtText,
  onAbility,
  onReelFull,
}: {
  question: GameQuestion;
  state: SessionState;
  lastCaughtText: string | null;
  onAbility: () => void;
  onReelFull: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>Mạng: {state.lives}</p>
        <p>Mảnh mã: {state.unlockedRewards.join(", ") || "—"}</p>
        <button
          type="button"
          className="pointer-events-auto rounded bg-teal-800 px-3 py-1"
          aria-label="dùng năng lực"
          disabled={state.abilityUsed}
          onClick={onAbility}
        >
          Dùng năng lực
        </button>
        <button
          type="button"
          className="pointer-events-auto rounded bg-teal-800 px-3 py-1"
          onClick={onReelFull}
        >
          Kéo hết dây
        </button>
      </div>
      <h2 className="max-w-3xl text-xl font-semibold">{question.question}</h2>
      <p>{question.instruction}</p>
      {question.type === "multiple" ? (
        <p>
          Đã câu: {state.caughtCorrectIds.length}/{question.correctAnswerIds.length}
        </p>
      ) : null}
      {lastCaughtText ? <p>Vừa bắt: {lastCaughtText}</p> : null}
      <ol className="pointer-events-none mt-1 max-w-xl list-none space-y-1 text-sm">
        {question.options.map((option, index) => (
          <li key={option.id}>
            <span className="font-semibold">{optionTag(index)}.</span> {option.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
