import { artAssets } from '../assets/assetStore.js';

// Image bounds are visual only; layout and hit testing stay in grid units. A
// replaced image may change size/pivot without changing puzzle coordinates.
export function drawSprite(ctx, id, cx, cy, cell, { rotation = 0, scale = 1, alpha = 1, offsetY = 0, displayMode = 'sculpted' } = {}) {
  if (displayMode === 'simple') return false;
  const asset = artAssets.get(id);
  if (!asset?.image) return false;
  const width = cell * asset.scale * scale;
  const height = width * asset.height / asset.width;
  ctx.save();
  try {
    ctx.beginPath();
    ctx.rect(cx - cell * 0.49, cy - cell * 0.49, cell * 0.98, cell * 0.98);
    ctx.clip();
    ctx.translate(cx, cy + offsetY);
    if (rotation) ctx.rotate(rotation);
    ctx.globalAlpha = (Number.isFinite(ctx.globalAlpha) ? ctx.globalAlpha : 1) * alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(asset.image, -width * asset.anchor[0], -height * asset.anchor[1], width, height);
    return true;
  } catch {
    // Retain the procedural renderer even if a browser discards decoded pixels.
    return false;
  } finally {
    ctx.restore();
  }
}
