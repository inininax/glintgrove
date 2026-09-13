// Context-local memoization for callers that construct radial illumination.
// This utility stores no image pixels and imports no asset source.
let gradientsByContext = new WeakMap();
export function radialGradient(ctx, radius, colorInner, colorOuter) {
  let entries = gradientsByContext.get(ctx);
  if (!entries) { entries = new Map(); gradientsByContext.set(ctx, entries); }
  const key = JSON.stringify([radius, colorInner, colorOuter]);
  if (!entries.has(key)) {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, colorInner);
    gradient.addColorStop(1, colorOuter);
    entries.set(key, gradient);
  }
  return entries.get(key);
}
export function clearGradientCache() { gradientsByContext = new WeakMap(); }
