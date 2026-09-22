export type RoundDifficulty = {
  roundIndex: number;
  speedMult: number;
  /** Correct fish are harder to notice on higher rounds. */
  correctDetectMult: number;
  hazardCount: number;
  bombCount: number;
  trashCount: number;
  /** Floating weeds that snag the lure. */
  weedCount: number;
  /** Drift nets that block casting lanes. */
  netCount: number;
  turnRate: number;
  jumpChance: number;
  wobble: number;
  /** Extra lure-snag radius for blockers. */
  blockerBiteMult: number;
};

export function roundDifficulty(roundIndex: number): RoundDifficulty {
  const level = Math.max(0, roundIndex);
  const bombCount = Math.min(1 + Math.floor(level / 2), 3);
  const trashCount = Math.min(2 + level * 2, 10);
  const weedCount = Math.min(level + Math.floor(level / 2), 5);
  const netCount = Math.min(Math.floor((level + 1) / 2), 4);
  const hazardCount = bombCount + trashCount + weedCount + netCount;
  return {
    roundIndex: level,
    speedMult: 1 + level * 0.22,
    correctDetectMult: Math.max(0.5, 1 - level * 0.12),
    hazardCount,
    bombCount,
    trashCount,
    weedCount,
    netCount,
    turnRate: 0.7 + level * 0.35,
    jumpChance: 0.0035 + level * 0.0012,
    wobble: 18 + level * 8,
    blockerBiteMult: 1.1 + level * 0.08,
  };
}
