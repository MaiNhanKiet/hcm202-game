import {
  previewCastPath,
  POWER_WEDGE_HALF,
  POWER_WEDGE_MAX,
  POWER_WEDGE_MIN,
} from "@/lib/game/fishing/cast";
import { fishFill, optionTag } from "@/lib/game/fishing/appearance";
import { rodSwingAngle, rodTipLocal, visualRodTip } from "@/lib/game/fishing/rod";
import type { CharacterId } from "@/lib/game/session/types";
import type { SceneState } from "@/lib/game/fishing/types";

const OUTFIT: Record<CharacterId, { shirt: string; hair: string }> = {
  observer: { shirt: "#2f7d8a", hair: "#2a1c12" },
  persistent: { shirt: "#c9893b", hair: "#3d2314" },
  careful: { shirt: "#4f7d4a", hair: "#1d1a16" },
};

function paint(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: [number, string][],
): CanvasGradient | string {
  const gradient = ctx.createLinearGradient?.(x0, y0, x1, y1);
  if (!gradient || typeof gradient.addColorStop !== "function") {
    return stops[stops.length - 1]?.[1] ?? "#0a3a48";
  }
  for (const [stop, color] of stops) {
    gradient.addColorStop(stop, color);
  }
  return gradient;
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
) {
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(x, y, 38 * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 28 * scale, y + 4 * scale, 26 * scale, 13 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 24 * scale, y + 6 * scale, 22 * scale, 11 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  fill: string,
  tag: string,
  faded: boolean,
) {
  ctx.save();
  ctx.translate(x, y);
  // Face left/right with scale — never rotate 180° (that flips the fish belly-up).
  const facingLeft = Math.cos(heading) < 0;
  const pitch = Math.max(-0.45, Math.min(0.45, Math.sin(heading) * 0.55));
  if (facingLeft) ctx.scale(-1, 1);
  ctx.rotate(pitch);
  ctx.globalAlpha = faded ? 0.28 : 1;

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.lineTo(-38, -11);
  ctx.lineTo(-34, 0);
  ctx.lineTo(-38, 11);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(4, -11);
  ctx.quadraticCurveTo(10, -20, 16, -10);
  ctx.lineTo(6, -6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.ellipse(6, -3, 10, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#12202a";
  ctx.beginPath();
  ctx.arc(14, -2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(14.7, -2.6, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(-pitch);
  if (facingLeft) ctx.scale(-1, 1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(16, 28, 36, 0.78)";
  ctx.beginPath();
  ctx.arc(0, -20, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff6d8";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#fff6d8";
  ctx.font = "700 12px 'Be Vietnam Pro', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(tag, 0, -19);
  ctx.restore();
}

function rodSwing(rod: SceneState["rod"]): number {
  return rodSwingAngle(rod);
}

function drawPowerPreview(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  angle: number,
  power: number,
  waterY: number,
) {
  const powerRadius =
    POWER_WEDGE_MIN + power * (POWER_WEDGE_MAX - POWER_WEDGE_MIN);

  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(angle);
  // Full white triangle = drag zone (fixed max reach).
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, POWER_WEDGE_MAX, -POWER_WEDGE_HALF, POWER_WEDGE_HALF);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(150, 235, 140, 0.55)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, POWER_WEDGE_MAX, -POWER_WEDGE_HALF, POWER_WEDGE_HALF);
  ctx.stroke();
  // Filled slice shows current force inside the triangle.
  ctx.fillStyle = `rgba(210, 255, 180, ${0.12 + power * 0.28})`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, powerRadius, -POWER_WEDGE_HALF, POWER_WEDGE_HALF);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(120, 220, 130, ${0.4 + power * 0.5})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, powerRadius, -POWER_WEDGE_HALF, POWER_WEDGE_HALF);
  ctx.stroke();
  ctx.restore();

  const path = previewCastPath(angle, power, { x: tipX, y: tipY });
  if (path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = `rgba(210, 255, 180, ${0.4 + power * 0.5})`;
  ctx.lineWidth = 2.2;
  ctx.setLineDash?.([8, 7]);
  ctx.beginPath();
  let landX = path[0].x;
  let landY = path[0].y;
  path.forEach((point, index) => {
    const x = point.x;
    const y = Math.min(point.y, waterY);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    landX = x;
    landY = y;
    if (point.y >= waterY) return;
  });
  ctx.stroke();
  ctx.setLineDash?.([]);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(landX, landY, 5 + power * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLure(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  now: number,
  active: boolean,
) {
  const pulse = 1 + Math.sin(now / 140) * 0.12;
  ctx.save();
  ctx.fillStyle = active ? "rgba(120, 230, 140, 0.22)" : "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(x, y, 16 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = active ? "rgba(170, 255, 160, 0.45)" : "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.arc(x, y, 9 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4fff0";
  ctx.beginPath();
  ctx.arc(x, y, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = active ? "#7dff8a" : "#d9d3c3";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, 7.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawAngler(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  characterId: CharacterId | null,
) {
  const outfit = OUTFIT[characterId ?? "observer"];
  const feetY = scene.waterY - 10;
  const hipX = 58;
  const hipY = feetY - 28;
  const shoulderY = hipY - 34;
  const headY = shoulderY - 18;
  const { rod } = scene;
  const gripX = hipX + 18;
  const gripY = shoulderY + 6;
  const swingAngle = rodSwing(rod);

  ctx.fillStyle = "#3a2414";
  ctx.fillRect(hipX - 10, feetY - 6, 14, 8);
  ctx.fillRect(hipX + 2, feetY - 6, 14, 8);

  ctx.strokeStyle = "#2c1a10";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hipX - 3, hipY);
  ctx.lineTo(hipX - 4, feetY - 4);
  ctx.moveTo(hipX + 5, hipY);
  ctx.lineTo(hipX + 10, feetY - 4);
  ctx.stroke();

  ctx.fillStyle = "#d9c4a0";
  ctx.beginPath();
  ctx.ellipse(hipX + 2, hipY - 4, 13, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = outfit.shirt;
  ctx.beginPath();
  ctx.ellipse(hipX + 2, hipY - 10, 15, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = outfit.shirt;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(hipX + 8, shoulderY + 4);
  ctx.quadraticCurveTo(hipX + 20, shoulderY + 10, gripX, gripY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hipX - 6, shoulderY + 6);
  ctx.lineTo(hipX - 16, hipY + 4);
  ctx.stroke();

  ctx.fillStyle = "#f0d2b0";
  ctx.beginPath();
  ctx.arc(gripX + 2, gripY + 2, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0d2b0";
  ctx.beginPath();
  ctx.arc(hipX + 2, headY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = outfit.hair;
  ctx.beginPath();
  ctx.arc(hipX + 2, headY - 4, 12, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1c140e";
  ctx.beginPath();
  ctx.arc(hipX + 6, headY - 1, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(gripX, gripY);
  ctx.rotate(swingAngle);
  ctx.strokeStyle = "#3a2412";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-14, 5);
  ctx.lineTo(10, 0);
  ctx.stroke();
  const tipLocal = rodTipLocal(rod.bend);
  ctx.strokeStyle = "#6b3d18";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  // Arch upward under load — tip stays above the water like a real cast.
  ctx.quadraticCurveTo(54, -14 - rod.bend * 22, tipLocal.x - 4, tipLocal.y + 2);
  ctx.stroke();
  ctx.strokeStyle = "#cfc6b4";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(tipLocal.x - 10, tipLocal.y + 1);
  ctx.lineTo(tipLocal.x, tipLocal.y);
  ctx.stroke();
  // Tip eyelet — line attaches here (matches visualRodTip).
  ctx.fillStyle = "#2a1c10";
  ctx.beginPath();
  ctx.arc(tipLocal.x, tipLocal.y, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d7d0c0";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(tipLocal.x, tipLocal.y, 2.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawFishingScene(
  ctx: CanvasRenderingContext2D,
  scene: SceneState,
  width: number,
  height: number,
  hintedOptionId: string | null,
  characterId: CharacterId | null,
  now: number,
) {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = paint(ctx, 0, 0, 0, scene.waterY, [
    [0, "#f3c48a"],
    [0.42, "#c9e7f6"],
    [1, "#8fd0e8"],
  ]);
  ctx.fillRect(0, 0, width, scene.waterY);

  drawCloud(ctx, 220, 58, 1);
  drawCloud(ctx, 620, 42, 0.75);
  drawCloud(ctx, 860, 70, 0.9);

  ctx.fillStyle = "#7aa36a";
  ctx.beginPath();
  ctx.moveTo(0, scene.waterY);
  ctx.quadraticCurveTo(180, scene.waterY - 38, 360, scene.waterY - 8);
  ctx.quadraticCurveTo(520, scene.waterY - 42, 780, scene.waterY - 6);
  ctx.lineTo(width, scene.waterY);
  ctx.lineTo(0, scene.waterY);
  ctx.fill();

  ctx.fillStyle = paint(ctx, 0, scene.waterY, 0, height, [
    [0, "#1b8a96"],
    [0.22, "#0e5363"],
    [1, "#061820"],
  ]);
  ctx.fillRect(0, scene.waterY, width, height - scene.waterY);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#b8f0ff";
  ctx.lineWidth = 18;
  for (let i = 0; i < 6; i += 1) {
    const x = 120 + i * 150;
    ctx.beginPath();
    ctx.moveTo(x, scene.waterY);
    ctx.lineTo(x - 70, height);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(230,248,255,0.65)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, scene.waterY);
  for (let x = 0; x <= width; x += 6) {
    const y =
      scene.waterY +
      Math.sin(x / 26 + now / 420) * 3.2 +
      Math.sin(x / 11 + now / 260) * 1.4;
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = "#6b3f22";
  ctx.fillRect(0, scene.waterY - 18, 118, 22);
  ctx.fillStyle = "#8a542c";
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(10 + i * 26, scene.waterY - 28, 10, 28);
  }
  ctx.fillStyle = "#4d2b16";
  ctx.fillRect(0, scene.waterY - 4, 128, 10);

  scene.fish.forEach((fish) => {
    drawFish(
      ctx,
      fish.x,
      fish.y,
      fish.heading,
      fishFill(fish.labelIndex),
      optionTag(fish.labelIndex),
      fish.optionId === hintedOptionId,
    );
  });

  const { hook, rod } = scene;
  drawAngler(ctx, scene, characterId);

  const tip = visualRodTip(rod, scene.waterY);
  const tipX = tip.x;
  const tipY = tip.y;
  // Line always starts at the drawn tip eyelet.
  let hookX = tipX;
  let hookY = tipY;
  if (hook.phase === "idle" && !rod.swinging) {
    // Short dangling line while waiting to cast (no bobber).
    hookX = tipX + 1;
    hookY = tipY + 16;
  } else if (hook.phase !== "idle" && !rod.swinging) {
    hookX = hook.x;
    hookY = hook.y;
  }

  if (hook.phase === "idle" && rod.power > 0.02 && !rod.swinging) {
    drawPowerPreview(ctx, tipX, tipY, rod.angle, rod.power, scene.waterY);
  }

  ctx.strokeStyle = "rgba(248, 250, 245, 0.95)";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  if (hook.phase === "in-water" || hook.phase === "reeling") {
    const midX = tipX + (hookX - tipX) * 0.45;
    const midY = tipY + (hookY - tipY) * 0.55 + 10;
    ctx.quadraticCurveTo(midX, midY, hookX, hookY);
  } else if (hook.phase === "idle" && !rod.swinging) {
    const midX = tipX + 4;
    const midY = tipY + 8;
    ctx.quadraticCurveTo(midX, midY, hookX, hookY);
  } else {
    ctx.lineTo(hookX, hookY);
  }
  ctx.stroke();

  if (hook.phase === "flying") {
    // Cast line sparkle trail
    for (const spark of scene.castTrail) {
      const life = 1 - spark.age / 0.55;
      const size = 2 + life * 4;
      ctx.fillStyle = `rgba(255, 245, 200, ${0.25 + life * 0.65})`;
      ctx.fillRect(spark.x - size / 2, spark.y - size / 2, size, size);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + life * 0.45})`;
      ctx.fillRect(spark.x - size / 4, spark.y - size / 4, size / 2, size / 2);
    }
    ctx.strokeStyle = "rgba(190, 240, 150, 0.45)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(hookX - hook.vx * 0.04, hookY - hook.vy * 0.04);
    ctx.quadraticCurveTo(
      hookX - hook.vx * 0.02,
      hookY - hook.vy * 0.02 + 12,
      hookX,
      hookY,
    );
    ctx.stroke();
  }

  // Glowing lure only while cast / in water / reeling — no red bobber.
  if (hook.phase === "flying" || hook.phase === "in-water" || hook.phase === "reeling") {
    drawLure(ctx, hookX, hookY, now, true);
  }

  for (const ripple of scene.ripples) {
    ctx.strokeStyle = `rgba(255,255,255,${1 - ripple.age / 0.6})`;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, 8 + ripple.age * 40, 0, Math.PI * 2);
    ctx.stroke();
  }
}
