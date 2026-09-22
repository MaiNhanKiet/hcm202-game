"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GameQuestion } from "@/lib/game/content/types";
import { optionTag } from "@/lib/game/fishing/appearance";
import type { PrepPhase } from "@/lib/game/fishing/countdown";
import { formatPlayTime } from "@/lib/game/fishing/playTime";
import type { HookPhase } from "@/lib/game/fishing/types";
import type { SessionState } from "@/lib/game/session/types";
import { STARTING_LIVES } from "@/lib/game/session/types";

const PHASE_HINT: Record<HookPhase, string> = {
  idle: "Giữ trái · Kéo quạt chỉnh lực · Tránh bom, rác, rong, lưới · Thả để quăng",
  flying: "Móc đang bay — chờ chạm nước",
  "in-water": "Giữ chuột trái để kéo · Đừng câu vật cản",
  reeling: "Đang kéo cá lên…",
};

function Hearts({ lives, max = STARTING_LIVES }: { lives: number; max?: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[1.65rem] leading-none sm:text-[1.85rem]"
      aria-label={`Mạng: ${lives}`}
    >
      {Array.from({ length: max }, (_, index) => (
        <span
          key={index}
          className={index < lives ? "text-red-500" : "text-muted-foreground/35"}
          aria-hidden
        >
          ♥
        </span>
      ))}
    </span>
  );
}

function QuestionBody({
  question,
  state,
  lastCaughtText,
  large,
}: {
  question: GameQuestion;
  state: SessionState;
  lastCaughtText: string | null;
  large?: boolean;
}) {
  return (
    <>
      <CardHeader className={large ? "pb-2" : "gap-1.5 px-4 pb-0 pt-1"}>
        <CardTitle
          className={
            large
              ? "text-3xl leading-snug sm:text-4xl"
              : "text-base leading-snug font-semibold sm:text-lg"
          }
        >
          {question.question}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={
          large
            ? "space-y-3.5 text-lg sm:text-xl"
            : "space-y-2 px-4 pt-2 text-sm leading-snug sm:text-base"
        }
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
          <span>{question.instruction}</span>
          {question.type === "multiple" ? (
            <span className="font-semibold text-foreground">
              {state.caughtCorrectIds.length}/{question.correctAnswerIds.length}
            </span>
          ) : null}
        </div>
        {lastCaughtText ? (
          <p className="rounded-md bg-secondary/80 px-2 py-1 text-sm">
            Vừa bắt: {lastCaughtText}
          </p>
        ) : null}
        <ol className={large ? "grid gap-2.5" : "grid gap-1.5"}>
          {question.options.map((option, index) => (
            <li key={option.id} className="leading-snug">
              <span className="font-semibold text-primary">{optionTag(index)}.</span>{" "}
              {option.text}
            </li>
          ))}
        </ol>
      </CardContent>
    </>
  );
}

export function FishingHud({
  question,
  state,
  lastCaughtText,
  hookPhase,
  prep,
  countdown,
  playElapsedMs,
  charging,
  charge,
  roundNumber,
  totalRounds,
  questionNumber,
  totalQuestions,
}: {
  question: GameQuestion;
  state: SessionState;
  lastCaughtText: string | null;
  hookPhase: HookPhase;
  prep: PrepPhase;
  countdown: number;
  playElapsedMs: number;
  charging: boolean;
  charge: number;
  roundNumber: number;
  totalRounds: number;
  questionNumber: number;
  totalQuestions: number;
}) {
  const briefing = prep !== "ready";
  const power = Math.max(0, Math.min(1, charge));

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute top-2 left-2 flex flex-col gap-2 sm:top-3 sm:left-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 border-[#1d4e63]/80 bg-card/92 px-3.5 py-2.5 shadow-[4px_4px_0_#123846]">
          <Hearts lives={state.lives} />
          <span
            className="min-w-[3.25rem] text-base font-bold tabular-nums text-foreground sm:text-lg"
            aria-label={`Thời gian: ${formatPlayTime(playElapsedMs)}`}
          >
            {formatPlayTime(playElapsedMs)}
          </span>
          <span
            className="rounded-lg bg-[#123846]/15 px-2 py-0.5 text-sm font-semibold tabular-nums text-foreground sm:text-base"
            aria-label={`Vòng ${roundNumber} trên ${totalRounds}, câu ${questionNumber} trên ${totalQuestions}`}
          >
            Vòng {roundNumber}/{totalRounds}
            <span className="mx-1.5 text-muted-foreground" aria-hidden>
              ·
            </span>
            Câu {questionNumber}/{totalQuestions}
          </span>
        </div>
        {charging || (hookPhase === "idle" && power > 0.02) ? (
          <div
            className="w-[11rem] rounded-2xl border-2 border-[#1d4e63]/80 bg-card/92 px-3 py-2 shadow-[4px_4px_0_#123846] sm:w-[13rem]"
            aria-label={`Lực: ${Math.round(power * 100)}%`}
          >
            <div className="mb-1 flex items-center justify-between text-xs font-semibold tracking-wide text-foreground sm:text-sm">
              <span>Lực</span>
              <span className="tabular-nums">{Math.round(power * 100)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#123846]/25">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#7bc67e] via-[#d4a017] to-[#e07a5f]"
                initial={false}
                animate={{ width: `${power * 100}%` }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {prep === "ready" ? (
        <motion.div
          layoutId="question-card"
          className="pointer-events-auto absolute top-2 right-2 w-[min(26rem,52vw)] max-h-[44vh] overflow-y-auto sm:top-3 sm:right-3 sm:w-[min(28rem,44vw)]"
        >
          <Card
            size="sm"
            className="border-2 border-[#1d4e63]/80 bg-card/92 py-3 shadow-[4px_4px_0_#123846] ring-0"
          >
            <QuestionBody
              question={question}
              state={state}
              lastCaughtText={lastCaughtText}
            />
          </Card>
        </motion.div>
      ) : null}

      {prep === "ready" ? (
        <div className="absolute inset-x-0 bottom-2 flex justify-center px-3 sm:bottom-3">
          <p className="rounded-full border border-[#1d4e63]/50 bg-card/88 px-4 py-1.5 text-center text-xs text-muted-foreground shadow-sm sm:text-sm">
            {PHASE_HINT[hookPhase]}
          </p>
        </div>
      ) : null}

      {briefing ? (
        <div
          aria-label={prep === "question" ? "question-brief" : "cast-countdown"}
          role="status"
          className="pointer-events-none absolute inset-0 grid place-items-center bg-[#061820]/35 p-3 sm:p-6"
        >
          <motion.div
            layoutId="question-card"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl"
          >
            <Card className="border-4 border-[#1d4e63] bg-card/97 py-6 shadow-[10px_12px_0_#123846]">
              <p className="px-6 pb-1 text-center text-sm font-semibold tabular-nums text-muted-foreground sm:text-base">
                Vòng {roundNumber}/{totalRounds} · Câu {questionNumber}/
                {totalQuestions}
              </p>
              <QuestionBody
                question={question}
                state={state}
                lastCaughtText={lastCaughtText}
                large
              />
              {prep === "countdown" ? (
                <p className="px-6 pb-2 text-center text-7xl font-bold tabular-nums text-primary">
                  {countdown}
                </p>
              ) : (
                <p className="px-6 pb-3 text-center text-base text-muted-foreground">
                  Đọc câu hỏi và đáp án
                </p>
              )}
            </Card>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
