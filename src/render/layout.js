export function computeLayout(level, W, H) {
  const padX = Math.max(16, W * 0.06);
  const padTop = 84;
  const padBot = 40;
  const cw = (W - padX * 2) / level.w;
  const chh = (H - padTop - padBot) / level.h;
  let cell = Math.floor(Math.min(cw, chh, 96));
  cell = Math.max(14, cell);
  const ox = Math.floor((W - cell * level.w) / 2);
  const oy = Math.floor(padTop + (H - padTop - padBot - cell * level.h) / 2);
  return { cell, ox, oy };
}

export function centerOf(layout, x, y) {
  return {
    cx: layout.ox + x * layout.cell + layout.cell / 2,
    cy: layout.oy + y * layout.cell + layout.cell / 2
  };
}
