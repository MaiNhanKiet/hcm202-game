"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { FishingHud } from "./FishingHud";
import { chargePower } from "@/lib/game/fishing/cast";
import { POND } from "@/lib/game/fishing/constants";
import { fleeWrong, spawnFish } from "@/lib/game/fishing/fish";
import { createScene, stepScene } from "@/lib/game/fishing/step";
import type { SceneInput, SceneState } from "@/lib/game/fishing/types";
import type { GameContent } from "@/lib/game/content/types";
import { currentQuestion } from "@/lib/game/session/selectors";
import type { SessionAction, SessionState } from "@/lib/game/session/types";

type FishingSlotProps = {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  content: GameContent;
};

function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  width: number,
  height: number,
  hintedOptionId: string | null,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#7ec8e3";
  ctx.fillRect(0, 0, width, scene.waterY);
  ctx.fillStyle = "#0b3a4a";
  ctx.fillRect(0, scene.waterY, width, height - scene.waterY);
  ctx.strokeStyle = "#9ad7ea";
  ctx.beginPath();
  ctx.moveTo(0, scene.waterY);
  for (let x = 0; x <= width; x += 8) {
    const y = scene.waterY + Math.sin(x / 28 + scene.ripples.length) * 2.4;
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  for (const fish of scene.fish) {
    if (fish.state === "hooked") continue;
    ctx.save();
    ctx.translate(fish.x, fish.y);
    ctx.rotate(fish.heading);
    ctx.fillStyle = fish.state === "flee" ? "#5a7180" : fish.isCorrect ? "#f2c14e" : "#3aa6d8";
    ctx.globalAlpha =
      fish.state === "flee" || fish.optionId === hintedOptionId ? 0.35 : 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const { hook, rod } = scene;
  ctx.strokeStyle = "#e8e0c8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rod.tipX, rod.tipY);
  const midX = (rod.tipX + hook.x) / 2;
  const sag = hook.phase === "flying" ? 8 : 22;
  ctx.quadraticCurveTo(midX, Math.max(hook.y, rod.tipY) + sag, hook.x, hook.y);
  ctx.stroke();

  ctx.save();
  ctx.translate(rod.tipX, rod.tipY);
  ctx.rotate(rod.angle);
  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(18, -rod.bend * 16, 46, -4 - rod.bend * 10);
  ctx.stroke();
  ctx.restore();

  if (hook.phase === "in-water" || hook.phase === "reeling") {
    const shake = hook.bobberShake * Math.sin(performance.now() / 40) * 4;
    ctx.fillStyle = "#d94f4f";
    ctx.beginPath();
    ctx.arc(hook.x + shake, scene.waterY, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#d9d3c3";
  ctx.beginPath();
  ctx.arc(hook.x, hook.y, 4, 0, Math.PI * 2);
  ctx.fill();

  for (const ripple of scene.ripples) {
    ctx.strokeStyle = `rgba(255,255,255,${1 - ripple.age / 0.6})`;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, 8 + ripple.age * 40, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function FishingScene({ state, dispatch, content }: FishingSlotProps) {
  const question = currentQuestion(state, content);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const inputRef = useRef<SceneInput>({
    pointer: null,
    charging: false,
    chargeMs: 0,
    reel: false,
    drop: false,
    castNow: false,
    reelFull: false,
  });
  const chargeStartedAt = useRef<number | null>(null);
  const [lastCaughtText, setLastCaughtText] = useState<string | null>(null);

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
    setLastCaughtText(null);
  }, [question?.id]);

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
      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        inputRef.current.reel = event.type === "keydown";
      }
      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        inputRef.current.drop = event.type === "keydown";
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
        if (event.type === "fish-bite" && question) {
          const option = question.options.find((item) => item.id === event.optionId);
          setLastCaughtText(option?.text ?? event.optionId);
          if (!question.correctAnswerIds.includes(event.optionId)) {
            sceneRef.current.fish = fleeWrong(sceneRef.current.fish, event.optionId);
          }
          dispatch({ type: "SCORE_CATCH", optionId: event.optionId });
        }
      }
      drawScene(
        ctx,
        sceneRef.current,
        canvas.width,
        canvas.height,
        state.hintedOptionId,
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
  }, [dispatch, question, state.hintedOptionId]);

  if (!question) return null;

  return (
    <div className="relative min-h-screen bg-[#071c24] text-white">
      <FishingHud
        question={question}
        state={state}
        lastCaughtText={lastCaughtText}
        onAbility={() => dispatch({ type: "USE_ABILITY" })}
        onReelFull={() => {
          inputRef.current.reelFull = true;
        }}
      />
      <div role="region" aria-label="fishing-scene" className="h-screen w-full">
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
          onPointerDown={() => {
            if (sceneRef.current?.hook.phase !== "idle") return;
            inputRef.current.charging = true;
            chargeStartedAt.current = performance.now();
          }}
          onPointerUp={() => {
            if (inputRef.current.charging) {
              inputRef.current.castNow = true;
              inputRef.current.chargeMs = chargePower(
                chargeStartedAt.current
                  ? performance.now() - chargeStartedAt.current
                  : 0,
              ) * 900;
            }
            inputRef.current.charging = false;
            chargeStartedAt.current = null;
          }}
          onPointerLeave={() => {
            inputRef.current.charging = false;
            chargeStartedAt.current = null;
          }}
        />
      </div>
    </div>
  );
}
