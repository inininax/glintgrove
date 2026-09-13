// Grid fitting is mathematical layout, with space reserved for the actual HUD.
export function computeLayout(level, width, height) {
  const horizontalMargin = Math.max(16, width * .06);
  const top = width <= 480 ? 138 : width >= 700 ? 118 : 100;
  const bottom = width >= 700 ? 72 : 64;
  const availableWidth = width - horizontalMargin * 2;
  const availableHeight = height - top - bottom;
  const cell = Math.max(14, Math.floor(Math.min(96, availableWidth / level.w, availableHeight / level.h)));
  return {
    cell,
    ox: Math.floor((width - level.w * cell) / 2),
    oy: Math.floor(top + (availableHeight - level.h * cell) / 2)
  };
}

export function centerOf({ ox, oy, cell }, x, y) {
  return { cx: ox + (x + .5) * cell, cy: oy + (y + .5) * cell };
}
