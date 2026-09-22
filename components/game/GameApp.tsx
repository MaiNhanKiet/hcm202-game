"use client";

import type { ComponentType, Dispatch } from "react";
import { useReducer } from "react";
import type { GameContent } from "@/lib/game/content/types";
import { createSession, sessionReducer } from "@/lib/game/session/reducer";
import { currentQuestion, currentRound } from "@/lib/game/session/selectors";
import type { SessionAction, SessionState } from "@/lib/game/session/types";
import { FishingScene } from "./FishingScene";
import { CharacterSelect } from "./screens/CharacterSelect";
import { DataError } from "./screens/DataError";
import { ExplainScreen } from "./screens/ExplainScreen";
import { RoundClear } from "./screens/RoundClear";
import { RoundFail } from "./screens/RoundFail";
import { RoundIntro } from "./screens/RoundIntro";
import { TitleScreen } from "./screens/TitleScreen";
import { WinScreen } from "./screens/WinScreen";

export type FishingSlotProps = {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  content: GameContent;
};

export function StubFishing({ state, dispatch, content }: FishingSlotProps) {
  const question = currentQuestion(state, content);
  if (!question) return null;
  return (
    <div className="flex min-h-screen flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>Mạng: {state.lives}</p>
        <p>Mảnh mã: {state.unlockedRewards.join(", ") || "—"}</p>
        <button
          type="button"
          aria-label="dùng năng lực"
          disabled={state.abilityUsed}
          onClick={() => dispatch({ type: "USE_ABILITY" })}
        >
          Dùng năng lực
        </button>
      </div>
      <h2>{question.question}</h2>
      <p>{question.instruction}</p>
      {question.type === "multiple" ? (
        <p>
          Đã câu: {state.caughtCorrectIds.length}/{question.correctAnswerIds.length}
        </p>
      ) : null}
      <div role="region" aria-label="fishing-scene" className="flex flex-wrap gap-2">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={state.hintedOptionId === option.id}
            onClick={() => dispatch({ type: "SCORE_CATCH", optionId: option.id })}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GameApp({
  content,
  FishingSlot = FishingScene,
}: {
  content: GameContent;
  FishingSlot?: ComponentType<FishingSlotProps>;
}) {
  const [state, dispatch] = useReducer(
    (current: SessionState, action: SessionAction) =>
      sessionReducer(current, action, content),
    content,
    createSession,
  );
  const round = currentRound(state, content);
  const question = currentQuestion(state, content);

  if (state.screen === "title") {
    return <TitleScreen onStart={() => dispatch({ type: "START" })} />;
  }
  if (state.screen === "character") {
    return (
      <CharacterSelect
        onSelect={(characterId) =>
          dispatch({ type: "SELECT_CHARACTER", characterId })
        }
      />
    );
  }
  if (state.screen === "round-intro" && round) {
    return (
      <RoundIntro
        round={round}
        lives={state.lives}
        rewards={state.unlockedRewards}
        onBegin={() => dispatch({ type: "BEGIN_ROUND" })}
      />
    );
  }
  if (state.screen === "fishing") {
    return <FishingSlot state={state} dispatch={dispatch} content={content} />;
  }
  if (state.screen === "explain") {
    const explanation =
      state.explainMode === "peek"
        ? (state.lastWrongExplanation ?? "")
        : (question?.explanation ?? state.lastWrongExplanation ?? "");
    return (
      <ExplainScreen
        explanation={explanation}
        onContinue={() => dispatch({ type: "CONTINUE_AFTER_EXPLAIN" })}
      />
    );
  }
  if (state.screen === "round-fail") {
    return <RoundFail onRetry={() => dispatch({ type: "RETRY_ROUND" })} />;
  }
  if (state.screen === "round-clear" && round) {
    return (
      <RoundClear
        reward={round.reward}
        onContinue={() => dispatch({ type: "CONTINUE_AFTER_CLEAR" })}
      />
    );
  }
  if (state.screen === "win") {
    return <WinScreen rewards={state.unlockedRewards} />;
  }
  if (state.screen === "data-error") {
    return <DataError />;
  }
  return <DataError />;
}
