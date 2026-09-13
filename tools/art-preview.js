import { artAssets, ASSET_LIMITS, DEFAULT_MANIFEST_URL, readBoundedResponse, validateAssetManifest } from '../src/assets/assetStore.js';
import { drawSprite } from '../src/render/sprites.js';

const byId = id => document.getElementById(id);
const catalogURL = new URL('../art/recipes/catalog.json', import.meta.url);
let manifest = null;
let catalog = {};
let previews = [];

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

async function readJSON(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  const bytes = await readBoundedResponse(response, ASSET_LIMITS.manifestBytes);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function metadata(list, label, value, url) {
  list.append(node('dt', '', label));
  const detail = node('dd');
  if (url) {
    const link = node('a', '', value);
    link.href = url;
    detail.append(link);
  } else detail.append(node('code', '', value));
  list.append(detail);
}

function makeCanvas(id, mode) {
  const canvas = node('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${id} · ${mode === 'actual' ? '실제 게임 크기' : mode === 'background' ? '배경' : '원본 확대'} 미리보기`);
  previews.push({ canvas, id, mode });
  return canvas;
}

function makeCard(id, descriptor, isBackground) {
  const asset = artAssets.get(id);
  const failure = artAssets.status.failed.find(item => item.id === id);
  const stale = Boolean(asset && (failure || artAssets.status.phase === 'error'));
  const state = !asset ? 'failed' : stale ? 'retained' : 'ready';
  const card = node('article', 'asset-card');
  card.dataset.asset = id;
  card.dataset.state = state;
  const preview = node('div', `preview ${isBackground ? 'background-preview' : 'sprite-preview'}`);
  if (isBackground) preview.append(makeCanvas(id, 'background'));
  else preview.append(makeCanvas(id, 'actual'), makeCanvas(id, 'enlarged'));
  card.append(preview);
  if (!isBackground) {
    const labels = node('div', 'comparison-labels');
    labels.append(node('span', 'actual-size', `${byId('cell-size').value} px cell`), node('span', '', '원본 확대 · 잘라내기 없음'));
    card.append(labels);
  }
  const body = node('div', 'card-body');
  const top = node('div', 'card-top');
  top.append(node('h3', '', id), node('span', 'card-state', state === 'ready' ? 'Loaded' : state === 'retained' ? 'Previous art' : 'Fallback'));
  body.append(top);
  const list = node('dl', 'asset-meta');
  metadata(list, '크기', `${descriptor.width} × ${descriptor.height} px`);
  metadata(list, '앵커 / 배율', `[${descriptor.anchor.join(', ')}] / ${descriptor.scale}`);
  metadata(list, '런타임', descriptor.src, descriptor.url);
  metadata(list, '원본 / 빌드', catalog[id]?.source || '카탈로그 항목 없음');
  body.append(list);
  if (state !== 'ready') body.append(node('p', 'asset-error', `${stale ? '교체 실패: 이전 정상 이미지를 유지합니다.' : '이미지가 없어 게임에서는 코드 기반 그래픽을 사용합니다.'}${failure ? ` ${failure.message}` : ''}`));
  card.append(body);
  return card;
}

function renderGallery() {
  previews = [];
  byId('backgrounds').replaceChildren();
  byId('sprites').replaceChildren();
  let backgrounds = 0;
  let sprites = 0;
  for (const [id, descriptor] of Object.entries(manifest?.assets || {})) {
    const isBackground = catalog[id]?.kind === 'background' || descriptor.src.startsWith('backgrounds/');
    byId(isBackground ? 'backgrounds' : 'sprites').append(makeCard(id, descriptor, isBackground));
    isBackground ? backgrounds++ : sprites++;
  }
  byId('background-count').textContent = `${backgrounds} assets`;
  byId('sprite-count').textContent = `${sprites} assets`;
  for (const id of ['backgrounds', 'sprites']) {
    if (!byId(id).children.length) byId(id).append(node('p', 'empty', '표시할 매니페스트 항목이 없습니다.'));
  }
  drawPreviews();
}

function surface(ctx, width, height, checker) {
  ctx.fillStyle = '#0a1d14';
  ctx.fillRect(0, 0, width, height);
  if (!checker) return;
  const step = 12;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      ctx.fillStyle = ((x / step + y / step) % 2) ? '#20382b' : '#14281e';
      ctx.fillRect(x, y, step, step);
    }
  }
}

function drawPreviews() {
  const cell = Number(byId('cell-size').value);
  const checker = byId('surface').value === 'checker';
  byId('cell-output').textContent = `${cell} px`;
  document.querySelectorAll('.actual-size').forEach(label => { label.textContent = `${cell} px cell`; });
  for (const { canvas, id, mode } of previews) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    surface(ctx, width, height, checker && mode !== 'background');
    const asset = artAssets.get(id);
    if (asset) {
      ctx.imageSmoothingEnabled = true;
      if (mode === 'actual') drawSprite(ctx, id, width / 2, height / 2, cell);
      else {
        const padding = mode === 'background' ? 0 : 8;
        const scale = Math.min((width - padding * 2) / asset.width, (height - padding * 2) / asset.height);
        const drawWidth = asset.width * scale;
        const drawHeight = asset.height * scale;
        ctx.drawImage(asset.image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      }
    } else {
      ctx.fillStyle = '#cbb999';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('코드 그래픽 대체', width / 2, height / 2);
    }
    if (mode === 'actual') {
      ctx.lineWidth = .75;
      ctx.strokeStyle = '#acc28970';
      ctx.strokeRect((width - cell) / 2, (height - cell) / 2, cell, cell);
      ctx.strokeStyle = '#d4c79770';
      ctx.beginPath();
      ctx.moveTo(width / 2 - 3, height / 2); ctx.lineTo(width / 2 + 3, height / 2);
      ctx.moveTo(width / 2, height / 2 - 3); ctx.lineTo(width / 2, height / 2 + 3);
      ctx.stroke();
    }
  }
}

async function reload() {
  const button = byId('reload');
  button.disabled = true;
  const state = byId('load-state');
  state.textContent = '불러오는 중';
  state.dataset.phase = 'loading';
  const results = await Promise.allSettled([
    artAssets.load(),
    readJSON(DEFAULT_MANIFEST_URL).then(raw => validateAssetManifest(raw)),
    readJSON(catalogURL)
  ]);
  const warnings = [];
  const status = artAssets.status;
  if (results[0].status === 'rejected') warnings.push(String(results[0].reason?.message || results[0].reason));
  if (results[1].status === 'fulfilled') {
    manifest = results[1].value;
    if (status.manifestRevision && manifest.revision !== status.manifestRevision) warnings.push('미리보기 도중 매니페스트가 변경되었습니다. 다시 불러오면 현재 리비전에 맞춰집니다.');
  } else warnings.push(`매니페스트를 읽지 못했습니다: ${results[1].reason?.message || results[1].reason}`);
  if (results[2].status === 'fulfilled') catalog = results[2].value?.assets || {};
  else warnings.push('원본 카탈로그를 읽지 못했습니다. 런타임 미리보기는 계속 사용할 수 있습니다.');
  if (status.message) warnings.push(status.message);
  for (const failure of status.failed) warnings.push(`${failure.id}: ${failure.message}`);
  state.dataset.phase = status.phase;
  state.textContent = ({ ready: '모든 이미지 정상', partial: '일부 이미지 대체 중', error: '매니페스트 로딩 실패' })[status.phase] || status.phase;
  byId('asset-count').textContent = `${status.loaded} / ${status.total} loaded`;
  byId('revision').textContent = status.manifestRevision || 'No valid revision';
  const errors = byId('errors');
  errors.replaceChildren();
  errors.hidden = !warnings.length;
  if (warnings.length) {
    errors.append(node('h2', '', '확인이 필요한 항목'));
    const list = node('ul');
    warnings.forEach(message => list.append(node('li', '', message)));
    errors.append(list);
  }
  renderGallery();
  button.disabled = false;
}

byId('reload').addEventListener('click', reload);
byId('cell-size').addEventListener('input', drawPreviews);
byId('surface').addEventListener('change', drawPreviews);
let frame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(drawPreviews);
});
await reload();
