const cache = new Map();

export function radialGradient(ctx, radius, colorInner, colorOuter) {
  const key = `${radius}|${colorInner}|${colorOuter}`;
  let grad = cache.get(key);
  if (!grad) {
    grad = ctx.createRadialGradient(0, 0, Math.min(2, radius * 0.08), 0, 0, radius);
    grad.addColorStop(0, colorInner);
    grad.addColorStop(1, colorOuter);
    cache.set(key, grad);
  }
  return grad;
}

export function clearGradientCache() {
  cache.clear();
}
