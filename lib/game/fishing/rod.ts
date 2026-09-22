const TIP_CLEARANCE = 14;

export function rodSwingAngle(rod: {
  swing: number;
  bend: number;
}): number {
  // Milder forward angle so the tip never dunks under the waterline.
  return -0.55 + rod.swing * 0.72 + rod.bend * 0.08;
}

/** Local tip eyelet in rod draw space — bend arches the tip up, not down. */
export function rodTipLocal(bend: number): { x: number; y: number } {
  return { x: 132, y: -8 - bend * 14 };
}

/**
 * Visual tip of the drawn rod — must match drawAngler tip wire end.
 * Always stays above the water surface.
 */
export function visualRodTip(
  rod: { swing: number; bend: number },
  waterY: number,
): { x: number; y: number } {
  const gripX = 76;
  const gripY = waterY - 66;
  const swing = rodSwingAngle(rod);
  const { x: localX, y: localY } = rodTipLocal(rod.bend);
  const cos = Math.cos(swing);
  const sin = Math.sin(swing);
  const x = gripX + localX * cos - localY * sin;
  const y = gripY + localX * sin + localY * cos;
  return {
    x,
    y: Math.min(y, waterY - TIP_CLEARANCE),
  };
}
