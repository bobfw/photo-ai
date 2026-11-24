// 纯色背景上的影棚光影：主光 + 补光 + 地面衰减，只画背景，人物随后叠加。
export function paintStudioLight(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  intensity: number,
) {
  context.save();
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  if (intensity <= 0) {
    context.restore();
    return;
  }

  context.save();
  context.globalCompositeOperation = "screen";
  context.translate(width * 0.3, height * 0.26);
  context.scale(1.55, 1);
  const keyRadius = width * 0.66;
  const key = context.createRadialGradient(0, 0, 0, 0, 0, keyRadius);
  key.addColorStop(0, `rgba(255,255,255,${0.28 * intensity})`);
  key.addColorStop(0.42, `rgba(255,250,238,${0.13 * intensity})`);
  key.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = key;
  context.fillRect(-keyRadius * 2, -keyRadius * 2, keyRadius * 4, keyRadius * 4);
  context.restore();

  context.save();
  context.globalCompositeOperation = "screen";
  context.translate(width * 0.84, height * 0.16);
  context.scale(1.2, 1);
  const fillRadius = width * 0.52;
  const fill = context.createRadialGradient(0, 0, 0, 0, 0, fillRadius);
  fill.addColorStop(0, `rgba(255,248,240,${0.09 * intensity})`);
  fill.addColorStop(1, "rgba(255,248,240,0)");
  context.fillStyle = fill;
  context.fillRect(-fillRadius * 2, -fillRadius * 2, fillRadius * 4, fillRadius * 4);
  context.restore();

  const floor = context.createLinearGradient(0, height * 0.55, 0, height);
  floor.addColorStop(0, "rgba(0,0,0,0)");
  floor.addColorStop(1, `rgba(0,0,0,${0.22 * intensity})`);
  context.fillStyle = floor;
  context.fillRect(0, height * 0.55, width, height * 0.45);
  context.restore();
}
