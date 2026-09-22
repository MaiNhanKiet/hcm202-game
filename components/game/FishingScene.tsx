"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { drawFishingScene } from "./drawFishingScene";
import { FishingHud } from "./FishingHud";
import { POND } from "@/lib/game/fishing/constants";
import { canCast, prepPhase, remainingCountdown, type PrepPhase } from "@/lib/game/fishing/countdown";
import { spawnFish } from "@/lib/game/fishing/fish";
import { createScene, stepScene } from "@/lib/game/fishing/step";
import type { HookPhase, SceneInput, SceneState } from "@/lib/game/fishing/types";
import type { GameContent } from "@/lib/game/content/types";
import { currentQuestion, currentRound } from "@/lib/game/session/selectors";
import type { SessionAction, SessionState } from "@/lib/game/session/types";

type FishingSlotProps = {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  content: GameContent;
};


export function FishingScene({ state, dispatch, content }: FishingSlotProps) {
  const question = currentQuestion(state, content);
  const round = currentRound(state, content);
  const roundNumber = state.roundIndex + 1;
  const questionNumber = state.questionIndex + 1;
  const totalRounds = content.rounds.length;
  const totalQuestions = round?.questions.length ?? 0;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const inputRef = useRef<SceneInput>({
    pointer: null,
    charging: false,
    chargeMs: 0,
    reel: false,
    castNow: false,
    reelFull: false,
  });
  const chargeStartedAt = useRef<number | null>(null);
  const hudRef = useRef({ hookPhase: "idle" as HookPhase, charging: false, charge: 0 });
  const [hookPhase, setHookPhase] = useState<HookPhase>("idle");
  const [charging, setCharging] = useState(false);
  const [charge, setCharge] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [prep, setPrep] = useState<PrepPhase>("question");
  const [fishingReady, setFishingReady] = useState(false);
  const fishingReadyRef = useRef(false);
  const countdownRef = useRef(5);
  const prepRef = useRef<PrepPhase>("question");
  const countdownStartedAt = useRef<number | null>(null);
  const playStartedAt = useRef<number | null>(null);
  const [playElapsedMs, setPlayElapsedMs] = useState(0);
  const [lastCaught, setLastCaught] = useState<{ id: string; text: string } | null>(
    null,
  );
  const lastCaughtText =
    question && lastCaught?.id === question.id ? lastCaught.text : null;
  const questionRef = useRef(question);
  questionRef.current = question;

  useEffect(() => {
    if (playStartedAt.current == null) {
      playStartedAt.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (!question) return;
    sceneRef.current = createScene(
      spawnFish(
        question.options.map((option) => ({
          optionId: option.id,
          text: option.text,
          isCorrect: question.correctAnswerIds.includes(option.id),
        })),
      ),
    );
    hudRef.current = { hookPhase: "idle", charging: false, charge: 0 };
    countdownStartedAt.current = Date.now();
    countdownRef.current = 5;
    prepRef.current = "question";
    fishingReadyRef.current = false;
    setCountdown(5);
    setPrep("question");
    setFishingReady(false);
  }, [question?.id]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (playStartedAt.current != null) {
        setPlayElapsedMs(Date.now() - playStartedAt.current);
      }
      const started = countdownStartedAt.current;
      if (started == null) return;
      const elapsed = Date.now() - started;
      const nextCount = remainingCountdown(elapsed);
      const nextPrep = prepPhase(elapsed);
      const ready = canCast(elapsed);
      if (nextCount !== countdownRef.current) {
        countdownRef.current = nextCount;
        setCountdown(nextCount);
      }
      if (nextPrep !== prepRef.current) {
        prepRef.current = nextPrep;
        setPrep(nextPrep);
      }
      if (ready !== fishingReadyRef.current) {
        fishingReadyRef.current = ready;
        setFishingReady(ready);
      }
    }, 200);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (sceneRef.current) {
        sceneRef.current.paused = document.visibilityState !== "visible";
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!fishingReadyRef.current) return;
      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        inputRef.current.reel = event.type === "keydown";
      }
      if (event.type === "keydown" && (event.key === "r" || event.key === "R")) {
        inputRef.current.reelFull = true;
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let alive = true;
    let last = performance.now();
    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (countdownStartedAt.current != null) {
        const elapsed = Date.now() - countdownStartedAt.current;
        const nextCount = remainingCountdown(elapsed);
        const nextPrep = prepPhase(elapsed);
        const ready = canCast(elapsed);
        if (nextCount !== countdownRef.current) {
          countdownRef.current = nextCount;
          setCountdown(nextCount);
        }
        if (nextPrep !== prepRef.current) {
          prepRef.current = nextPrep;
          setPrep(nextPrep);
        }
        if (ready !== fishingReadyRef.current) {
          fishingReadyRef.current = ready;
          setFishingReady(ready);
        }
      }
      if (!fishingReadyRef.current) {
        inputRef.current.charging = false;
        inputRef.current.castNow = false;
        inputRef.current.reel = false;
        inputRef.current.reelFull = false;
      }
      if (chargeStartedAt.current !== null) {
        inputRef.current.chargeMs = now - chargeStartedAt.current;
      }
      if (!sceneRef.current) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const { scene, events } = stepScene(sceneRef.current, inputRef.current, dt);
      sceneRef.current = scene;
      inputRef.current.castNow = false;
      inputRef.current.reelFull = false;
      for (const event of events) {
        if (!questionRef.current) continue;
        const current = questionRef.current;
        if (event.type === "fish-bite") {
          const option = current.options.find((item) => item.id === event.optionId);
          setLastCaught({
            id: current.id,
            text: option?.text ?? event.optionId,
          });
          if (!current.correctAnswerIds.includes(event.optionId)) {
            dispatch({ type: "SCORE_CATCH", optionId: event.optionId });
          }
        }
        if (event.type === "fish-landed") {
          dispatch({ type: "SCORE_CATCH", optionId: event.optionId });
        }
      }
      const nextPhase = sceneRef.current.hook.phase;
      const nextCharging = inputRef.current.charging;
      const nextCharge = sceneRef.current.rod.power;
      if (
        hudRef.current.hookPhase !== nextPhase ||
        hudRef.current.charging !== nextCharging ||
        Math.abs(hudRef.current.charge - nextCharge) > 0.04
      ) {
        hudRef.current = {
          hookPhase: nextPhase,
          charging: nextCharging,
          charge: nextCharge,
        };
        setHookPhase(nextPhase);
        setCharging(nextCharging);
        setCharge(nextCharge);
      }
      drawFishingScene(
        ctx,
        sceneRef.current,
        canvas.width,
        canvas.height,
        state.hintedOptionId,
        state.characterId,
        now,
      );
      if (alive && typeof requestAnimationFrame === "function") {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [dispatch, question?.id, state.hintedOptionId]);

  if (!question) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#061820] text-foreground">
      <FishingHud
        question={question}
        state={state}
        lastCaughtText={lastCaughtText}
        hookPhase={hookPhase}
        prep={prep}
        countdown={countdown}
        playElapsedMs={playElapsedMs}
        charging={charging}
        charge={charge}
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
      />
      <div
        role="region"
        aria-label="fishing-scene"
        className="h-screen w-full"
        onContextMenu={(event) => event.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          width={POND.xMax + 40}
          height={POND.yMax + 20}
          className="h-full w-full cursor-crosshair"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const scaleX = event.currentTarget.width / rect.width;
            const scaleY = event.currentTarget.height / rect.height;
            inputRef.current.pointer = {
              x: (event.clientX - rect.left) * scaleX,
              y: (event.clientY - rect.top) * scaleY,
            };
          }}
          onPointerDown={(event) => {
            if (!fishingReadyRef.current) return;
            if (event.button === 2) {
              event.preventDefault();
              return;
            }
            if (event.button !== 0) return;
            const phase = sceneRef.current?.hook.phase;
            if (phase === "in-water" || phase === "flying" || phase === "reeling") {
              inputRef.current.reel = true;
              return;
            }
            if (phase !== "idle") return;
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              /* pointer capture is optional */
            }
            inputRef.current.charging = true;
            chargeStartedAt.current = performance.now();
            hudRef.current = { ...hudRef.current, charging: true, charge: 0 };
            setCharging(true);
            setCharge(0);
          }}
          onPointerUp={(event) => {
            if (event.button !== 0) return;
            inputRef.current.reel = false;
            try {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            } catch {
              /* ignore */
            }
            if (inputRef.current.charging) {
              inputRef.current.castNow = true;
              inputRef.current.chargeMs = chargeStartedAt.current
                ? performance.now() - chargeStartedAt.current
                : 0;
            }
            inputRef.current.charging = false;
            chargeStartedAt.current = null;
            hudRef.current = { ...hudRef.current, charging: false };
            setCharging(false);
          }}
          onPointerCancel={(event) => {
            try {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            } catch {
              /* ignore */
            }
            inputRef.current.reel = false;
            inputRef.current.charging = false;
            chargeStartedAt.current = null;
            hudRef.current = { ...hudRef.current, charging: false };
            setCharging(false);
          }}
        />
      </div>
    </div>
  );
}
