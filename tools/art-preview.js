import { artAssets, ASSET_LIMITS, DEFAULT_MANIFEST_URL, readBoundedResponse, validateAssetManifest } from '../src/assets/assetStore.js';
import { drawSprite } from '../src/render/sprites.js';
import { MUSIC_PATH, MUSIC_DURATION } from '../src/fx/music.js';

const byId = id => document.getElementById(id);
const rootURL = new URL('../', import.meta.url);
const kindNames = { background: '배경', sprite: '소품과 장치', site: '사이트 이미지', audio: '음악' };
const sections = { background: 'backgrounds', sprite: 'sprites', site: 'site-assets', audio: 'audio-assets' };
const titles = {
  forest: '고대 숲', depths: '안개 심연', garden: '빛의 정원', heart: '숲의 심장',
  emitter: '빛의 샘', mirror: '거울', splitter: '갈림 거울', rock: '이끼 낀 바위', 'rock.alt': '작은 바위',
  'crystal.r': '붉은 수정', 'crystal.g': '초록 수정', 'crystal.b': '푸른 수정',
  'gate.r': '붉은 색의 문', 'gate.g': '초록 색의 문', 'gate.b': '푸른 색의 문',
  'portal.gold': '금빛 연결문', 'portal.violet': '보랏빛 연결문',
  'flower.awake': '꽃 · 깨어난 모습', 'flower.dormant': '꽃 · 잠든 모습',
  'mushroom.awake': '버섯 · 깨어난 모습', 'mushroom.dormant': '버섯 · 잠든 모습',
  'owl.awake': '부엉이 · 깨어난 모습', 'owl.dormant': '부엉이 · 잠든 모습',
  'tree.awake': '나무 · 깨어난 모습', 'tree.dormant': '나무 · 잠든 모습'
};
// Site images live outside the game manifest. Their explicit entries mirror the
// title and runtime release; update these paths when publishing a new brand edition.
const siteDefinitions = [
  { id: 'site.wordmark', title: '보석 게임명', runtime: 'assets/site/ilyndrel-wordmark-v2.webp', source: 'art/source/gpt/ilyndrel-wordmark-v2.png', recipe: 'art/recipes/ilyndrel-wordmark-v2.json', width: 2172, height: 724, blend: true, note: '타이틀의 금빛 글자와 녹색 보석. RGB 검정 바탕을 screen으로 합성합니다.' },
  { id: 'site.icon', title: '사이트 아이콘', runtime: 'assets/site/icon.svg', source: 'assets/site/icon.svg', recipe: 'art/README.md', width: 192, height: 192, vector: true, note: '브라우저 탭과 설치 아이콘에 사용하는 SVG입니다.' },
  { id: 'site.share', title: '링크 공유 이미지', runtime: 'assets/site/share.png', source: 'art/source/procedural/share-v2.png', master: 'art/source/procedural/nocturne-environments-v2.blend', recipe: 'art/recipes/procedural-environments-v2.json', width: 1200, height: 630, note: '게임 링크를 공유할 때 사용하는 미리보기입니다.' }
];
let manifest = null, catalog = {}, entries = [], previews = [], musicRecord = null;
const siteImages = new Map();
let detail = null, detailRequest = 0, lastLauncher = null;

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

// Catalog metadata is display data, never HTML or an arbitrary navigation URL.
function localURL(path) {
  if (typeof path !== 'string' || !/^(?:assets|art|src|tools|docs)\/[A-Za-z0-9_./-]+$/.test(path)
      || path.split('/').some(part => part === '..' || part === '.')) return null;
  const url = new URL(path, rootURL);
  return url.origin === rootURL.origin && url.pathname.startsWith(rootURL.pathname) ? url.href : null;
}

async function readJSON(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(path, { cache: 'no-cache', signal: controller.signal });
    const bytes = await readBoundedResponse(response, ASSET_LIMITS.manifestBytes, controller.signal);
    return JSON.parse(new TextDecoder().decode(bytes));
  } finally { clearTimeout(timer); }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => finish(new Error('이미지 응답 시간이 초과되었습니다.')), 10000);
    function finish(error) {
      clearTimeout(timer); image.onload = image.onerror = null;
      if (error) reject(error); else resolve(image);
    }
    image.onload = () => finish();
    image.onerror = () => finish(new Error('이미지를 불러오지 못했습니다.'));
    image.src = url;
  });
}

function metadata(list, label, value, path) {
  list.append(node('dt', '', label));
  const cell = node('dd');
  const url = localURL(path);
  if (url) { const link = node('a', '', value); link.href = url; link.target = '_blank'; link.rel = 'noopener'; cell.append(link); }
  else cell.textContent = value;
  list.append(cell);
}

function sizeLabel(entry) {
  if (entry.kind === 'audio') return `${entry.duration}초 · 스테레오`;
  return `${entry.width} × ${entry.height}${entry.vector ? ' · SVG 좌표' : ' px'}`;
}

function gameEntry(id, descriptor) {
  const asset = artAssets.get(id);
  const failure = artAssets.status.failed.find(item => item.id === id);
  const retained = Boolean(asset && (failure || artAssets.status.phase === 'error'));
  const source = typeof catalog[id]?.source === 'string' ? catalog[id].source : '';
  const kind = catalog[id]?.kind === 'background' || descriptor.src.startsWith('backgrounds/') ? 'background' : 'sprite';
  let recipe = 'art/recipes/nocturne-v1.json', master = 'art/source/blender/grove-library-v1.blend';
  if (kind === 'background') {
    recipe = source.startsWith('art/source/gpt/') ? `art/recipes/gpt-${source.split('/').pop().replace(/\.png$/, '')}.json` : 'art/recipes/procedural-environments-v3.json';
    master = source.startsWith('art/source/gpt/') ? '' : 'art/source/procedural/nocturne-environments-v3.blend';
  } else if (id.startsWith('gate.') && source.endsWith('-v2.png')) {
    recipe = 'art/recipes/ancient-gates-v2.json'; master = 'art/source/blender/ancient-gates-v2.blend';
  }
  return { id, title: titles[id] || id, kind, ...descriptor, width: asset?.width || descriptor.width, height: asset?.height || descriptor.height,
    runtime: `assets/game/${descriptor.src}`, displayed: asset ? `assets/game/${asset.src}` : '', source, recipe, master, image: asset?.image,
    state: !asset ? 'failed' : retained ? 'retained' : 'ready', failure: failure?.message,
    note: kind === 'background' ? id === 'forest' ? '현재 타이틀과 모든 장의 조각 아트 배경입니다.' : '호환용으로 보존된 배경입니다. 현재 기본 화면에는 선택되지 않습니다.' : '원본 전체와 게임 셀 안의 실제 표시 크기를 비교할 수 있습니다.' };
}

function audioControl(entry) {
  const wrap = node('div', 'audio-control');
  const audio = node('audio'); audio.controls = true; audio.preload = 'none'; audio.loop = true;
  audio.src = localURL(entry.runtime); audio.setAttribute('aria-label', `${entry.title} 미리 듣기`);
  const label = node('label', 'loop-control'); const checkbox = node('input'); checkbox.type = 'checkbox'; checkbox.checked = true;
  checkbox.addEventListener('change', () => { audio.loop = checkbox.checked; });
  label.append(checkbox, node('span', '', '끝나면 이어서 반복 재생'));
  const message = node('span', 'preview-caption', '재생 버튼을 누르면 음악을 불러옵니다.');
  let started = false, failed = false;
  audio.addEventListener('play', () => {
    started = true;
    document.querySelectorAll('audio').forEach(other => { if (other !== audio) other.pause(); });
    if (!failed) message.textContent = '감상 중 · 게임용 음원 원본 음량';
  });
  audio.addEventListener('pause', () => {
    if (!failed && started) message.textContent = audio.ended ? '재생이 끝났습니다. 다시 감상할 수 있습니다.' : '일시정지됨 · 재생 버튼을 누르면 이어집니다.';
  });
  audio.addEventListener('ended', () => {
    if (!failed) message.textContent = '재생이 끝났습니다. 다시 감상할 수 있습니다.';
  });
  audio.addEventListener('error', () => { failed = true; message.textContent = '음원을 불러오지 못했습니다. 파일 경로나 로컬 서버를 확인하세요.'; });
  wrap.append(audio, label, message);
  return wrap;
}

function makeCanvas(entry, mode) {
  const canvas = node('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${entry.title} · ${mode === 'actual' ? '실제 게임 크기' : '전체 이미지'} 미리보기`);
  previews.push({ canvas, entry, mode });
  return canvas;
}

function makeCard(entry) {
  const card = node('article', `asset-card ${entry.kind === 'audio' ? 'audio-card' : ''}`);
  card.dataset.asset = entry.id; card.dataset.state = entry.state;
  if (entry.kind !== 'audio') {
    const button = node('button', 'preview-button'); button.type = 'button'; button.setAttribute('aria-label', `${entry.title} 확대 및 상세 보기`);
    button.addEventListener('click', () => openDetail(entry, button));
    const preview = node('div', `preview ${entry.kind}-preview`);
    if (entry.kind === 'sprite') preview.append(makeCanvas(entry, 'actual'), makeCanvas(entry, 'enlarged'));
    else preview.append(makeCanvas(entry, entry.kind));
    button.append(preview); card.append(button);
    if (entry.kind === 'sprite') { const labels = node('div', 'comparison-labels'); labels.append(node('span', 'actual-size'), node('span', '', '원본 전체')); card.append(labels); }
  }
  const body = node('div', 'card-body'), copy = node('div');
  const top = node('div', 'card-top');
  top.append(node('h3', '', entry.title), node('span', 'card-state', { ready: '정상', retained: '이전 이미지', failed: '확인 필요', audio: '연주곡' }[entry.state]));
  copy.append(top, node('p', 'card-id', entry.id), node('p', 'card-note', entry.note));
  if (['retained', 'failed'].includes(entry.state)) copy.append(node('p', 'asset-error', entry.state === 'retained' ? '교체 실패: 이전 정상 이미지를 표시하고 있습니다.' : entry.kind === 'site' ? '사이트 이미지 경로와 로컬 서버를 확인하세요.' : '이미지를 불러오지 못했습니다. 게임에서는 코드 그래픽을 사용합니다.'));
  const footer = node('div', 'card-footer'), button = node('button', 'detail-button', '상세 보기 ↗'); button.type = 'button';
  button.setAttribute('aria-label', `${entry.title} 상세 보기`); button.addEventListener('click', () => openDetail(entry, button));
  footer.append(node('span', 'card-size', sizeLabel(entry)), button); copy.append(footer); body.append(copy);
  if (entry.kind === 'audio') body.append(audioControl(entry));
  card.append(body); return card;
}

function renderGallery() {
  document.querySelectorAll('audio').forEach(audio => audio.pause());
  previews = [];
  const query = byId('asset-search').value.trim().toLocaleLowerCase('ko');
  const kind = byId('asset-kind').value;
  const filtered = entries.filter(entry => (kind === 'all' || entry.kind === kind)
    && [entry.title, entry.id, entry.source, entry.runtime, entry.note].join(' ').toLocaleLowerCase('ko').includes(query));
  for (const [type, container] of Object.entries(sections)) {
    const subset = filtered.filter(entry => entry.kind === type);
    byId(container).replaceChildren(...subset.map(makeCard));
    byId(`${type}-count`).textContent = `${subset.length}개`;
    byId(`${type}-section`).hidden = subset.length === 0;
  }
  byId('result-count').textContent = `${filtered.length} / ${entries.length}개`;
  byId('no-results').hidden = filtered.length > 0;
  drawPreviews();
}

function surface(ctx, width, height, checker) {
  ctx.fillStyle = '#0a2022'; ctx.fillRect(0, 0, width, height);
  if (!checker) return;
  for (let y = 0; y < height; y += 12) for (let x = 0; x < width; x += 12) {
    ctx.fillStyle = ((x / 12 + y / 12) % 2) ? '#294441' : '#1b3432'; ctx.fillRect(x, y, 12, 12);
  }
}

function prepareCanvas(canvas, checker) {
  const rect = canvas.getBoundingClientRect(), width = Math.max(1, rect.width), height = Math.max(1, rect.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); surface(ctx, width, height, checker);
  return { ctx, width, height };
}

function drawImageFit(ctx, image, width, height, padding = 8, blend = false) {
  const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
  const scale = Math.max(0, Math.min((width - padding * 2) / iw, (height - padding * 2) / ih));
  ctx.save();
  if (blend) ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(image, (width - iw * scale) / 2, (height - ih * scale) / 2, iw * scale, ih * scale);
  ctx.restore();
}

function drawPreviews() {
  const cell = Number(byId('cell-size').value), checker = byId('surface').value === 'checker';
  byId('cell-output').textContent = `${cell} px`;
  document.querySelectorAll('.actual-size').forEach(label => { label.textContent = `${cell} px 셀`; });
  for (const { canvas, entry, mode } of previews) {
    const { ctx, width, height } = prepareCanvas(canvas, checker && entry.kind !== 'background');
    if (entry.image) {
      if (mode === 'actual') drawSprite(ctx, entry.id, width / 2, height / 2, cell);
      else drawImageFit(ctx, entry.image, width, height, entry.kind === 'background' ? 0 : 12, entry.blend);
    } else { ctx.fillStyle = '#cbb999'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('미리보기 없음', width / 2, height / 2); }
    if (mode === 'actual') {
      ctx.lineWidth = .75; ctx.strokeStyle = '#acc28970'; ctx.strokeRect((width - cell) / 2, (height - cell) / 2, cell, cell);
      ctx.beginPath(); ctx.moveTo(width / 2 - 3, height / 2); ctx.lineTo(width / 2 + 3, height / 2); ctx.moveTo(width / 2, height / 2 - 3); ctx.lineTo(width / 2, height / 2 + 3); ctx.stroke();
    }
  }
  drawDetail();
}

function drawDetail() {
  if (!detail?.canvas || !byId('asset-detail').open) return;
  const { ctx, width, height } = prepareCanvas(detail.canvas, byId('surface').value === 'checker' && detail.entry.kind !== 'background');
  if (detail.image) drawImageFit(ctx, detail.image, width, height, 14, detail.entry.blend);
}

function setDetailShape(width, height) {
  const ratio = width / height;
  byId('detail-preview').dataset.shape = ratio >= 2.5 ? 'panoramic' : ratio >= 1.7 ? 'wide' : 'standard';
}

function detailLinks(entry, selectedPath) {
  const links = byId('detail-links'); links.replaceChildren();
  for (const [label, path, download] of [['파일 바로 보기 ↗', selectedPath, false], ['이 파일 다운로드', selectedPath, true], ['제작 기록 ↗', entry.recipe, false]]) {
    const url = localURL(path); if (!url) continue;
    const link = node('a', '', label); link.href = url;
    if (download) link.download = path.split('/').pop(); else { link.target = '_blank'; link.rel = 'noopener'; }
    links.append(link);
  }
}

async function showDetailMode(mode) {
  if (!detail || detail.entry.kind === 'audio') return;
  const current = detail, entry = current.entry, request = ++detailRequest;
  byId('show-runtime').setAttribute('aria-pressed', String(mode === 'runtime'));
  byId('show-source').setAttribute('aria-pressed', String(mode === 'source'));
  const path = mode === 'source' ? entry.source : (entry.displayed || entry.runtime);
  detailLinks(entry, path);
  current.image = null; drawDetail();
  byId('detail-preview-status').textContent = '이미지를 불러오는 중…';
  try {
    const url = localURL(path); if (!url) throw new Error('표시할 이미지 경로가 없습니다.');
    const image = mode === 'runtime' && entry.image ? entry.image : await loadImage(url);
    if (request !== detailRequest || detail !== current) return;
    current.image = image;
    setDetailShape(image.naturalWidth || image.width, image.naturalHeight || image.height);
    drawDetail();
    byId('detail-preview-status').textContent = `${mode === 'source' ? '제작 원본' : entry.state === 'retained' ? '이전 정상 게임 이미지' : '게임용 이미지'} · ${image.naturalWidth || image.width} × ${image.naturalHeight || image.height} px${entry.blend ? ' · 검정 바탕 screen 합성' : ''}`;
  } catch (error) {
    if (request !== detailRequest || detail !== current) return;
    byId('detail-preview-status').textContent = error.message;
  }
}

function openDetail(entry, launcher) {
  const dialog = byId('asset-detail'); if (dialog.open) return;
  lastLauncher = launcher;
  byId('detail-title').textContent = entry.title;
  byId('detail-kind').textContent = kindNames[entry.kind];
  byId('detail-description').textContent = entry.note + (entry.state === 'retained' ? ' 현재 미리보기는 이전 정상 이미지이며 아래 배포·원본 경로는 현재 목록 기준입니다.' : '');
  const metadataList = byId('detail-meta'); metadataList.replaceChildren();
  metadata(metadataList, '식별 이름', entry.id);
  metadata(metadataList, entry.kind === 'audio' ? '재생 길이' : '표시 파일 크기', sizeLabel(entry));
  metadata(metadataList, '현재 배포 파일', entry.runtime, entry.runtime);
  if (entry.displayed && entry.displayed !== entry.runtime) metadata(metadataList, '표시 중인 파일', entry.displayed, entry.displayed);
  metadata(metadataList, entry.kind === 'audio' ? '악보 원본' : '제작 원본', entry.source || '카탈로그 항목 없음', entry.source);
  if (entry.master) metadata(metadataList, 'Blender 원본', entry.master, entry.master);
  metadata(metadataList, '제작 기록', entry.recipe, entry.recipe);
  if (entry.anchor) metadata(metadataList, '앵커 / 배율', `[${entry.anchor.join(', ')}] / ${entry.scale}`);
  if (entry.kind === 'audio') metadata(metadataList, '음원 형식', 'WAV · 24,000 Hz · 16-bit PCM · 가사·보컬 없음');
  const preview = byId('detail-preview'); preview.replaceChildren();
  setDetailShape(entry.width, entry.height);
  byId('detail-tabs').hidden = entry.kind === 'audio';
  byId('show-source').hidden = !localURL(entry.source) || !/\.(png|webp|svg)$/i.test(entry.source);
  if (entry.kind === 'audio') {
    preview.append(audioControl(entry)); detail = { entry };
    byId('detail-preview-status').textContent = '음악은 재생 버튼을 눌러 감상하세요. 다른 미리 듣기는 자동으로 멈춥니다.';
    detailLinks(entry, entry.runtime);
  } else {
    const canvas = node('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${entry.title} 확대 미리보기`);
    preview.append(canvas); detail = { entry, canvas, image: null };
  }
  dialog.showModal(); byId('detail-title').focus({ preventScroll: true }); dialog.scrollTop = 0;
  if (entry.kind !== 'audio') void showDetailMode('runtime');
}

async function reload() {
  const button = byId('reload'); if (button.disabled) return;
  button.disabled = true;
  const state = byId('load-state'); state.textContent = '불러오는 중'; state.dataset.phase = 'loading';
  const results = await Promise.allSettled([
    artAssets.load(), readJSON(DEFAULT_MANIFEST_URL).then(raw => validateAssetManifest(raw)), readJSON(new URL('art/recipes/catalog.json', rootURL)),
    readJSON(new URL('art/recipes/ancient-forest-v2-music.json', rootURL)),
    ...siteDefinitions.map(async entry => {
      try {
        const image = await loadImage(`${localURL(entry.runtime)}?studio=${Date.now()}`); siteImages.set(entry.id, image);
        return { ...entry, kind: 'site', image, state: 'ready', width: entry.vector ? entry.width : image.naturalWidth, height: entry.vector ? entry.height : image.naturalHeight };
      } catch (error) { return { ...entry, kind: 'site', image: siteImages.get(entry.id), state: siteImages.has(entry.id) ? 'retained' : 'failed', failure: error.message }; }
    })
  ]);
  const warnings = [], status = artAssets.status;
  if (results[0].status === 'rejected') warnings.push(String(results[0].reason?.message || results[0].reason));
  if (results[1].status === 'fulfilled') {
    manifest = results[1].value;
    if (status.manifestRevision && manifest.revision !== status.manifestRevision) warnings.push('미리보기 도중 이미지 목록이 변경되었습니다. 새로고침하면 현재 버전에 맞춰집니다.');
  } else warnings.push('현재 이미지 목록을 읽지 못했습니다. 이전 정상 목록을 유지합니다.');
  if (results[2].status === 'fulfilled' && results[2].value?.assets && typeof results[2].value.assets === 'object') catalog = results[2].value.assets;
  else warnings.push('원본 카탈로그를 읽지 못했습니다. 이전 정상 카탈로그를 유지합니다.');
  if (results[3].status === 'fulfilled') musicRecord = results[3].value;
  else warnings.push('음악 제작 기록을 읽지 못했습니다. 미리 듣기는 계속 사용할 수 있습니다.');
  if (status.message) warnings.push(status.message);
  for (const failure of status.failed) warnings.push(`${failure.id}: ${failure.message}`);
  const site = results.slice(4).map((result, index) => result.status === 'fulfilled' ? result.value : { ...siteDefinitions[index], kind: 'site', state: 'failed' });
  for (const entry of site) if (entry.state !== 'ready') warnings.push(`${entry.title}: ${entry.failure || '이미지 로딩 실패'}`);
  entries = [...Object.entries(manifest?.assets || {}).map(([id, descriptor]) => gameEntry(id, descriptor)), ...site,
    { id: 'audio.ancient-forest-v2', title: '뿌리 사이의 빛', kind: 'audio', state: 'audio', runtime: MUSIC_PATH,
      source: localURL(musicRecord?.score) ? musicRecord.score : 'art/source/audio/ancient-forest-v2.score.json', recipe: 'art/recipes/ancient-forest-v2-music.json', duration: MUSIC_DURATION,
      note: '고대 숲을 위한 잔잔한 96초 연주곡. 외부 녹음이나 샘플 없이 악보와 수학적 음원 합성으로 만들었습니다.' }];
  state.dataset.phase = warnings.length ? 'partial' : 'ready';
  state.textContent = warnings.length ? '일부 항목 확인 필요' : '에셋 목록 준비 완료';
  byId('asset-count').textContent = `게임 이미지 ${status.loaded} / ${status.total}개 · 사이트 이미지 ${site.filter(entry => entry.image).length} / 3개 · 음악 1개`;
  byId('revision').textContent = status.manifestRevision || '유효한 이미지 버전 없음';
  const errors = byId('errors'); errors.replaceChildren(); errors.hidden = !warnings.length;
  if (warnings.length) { errors.append(node('h2', '', '확인이 필요한 항목')); const list = node('ul'); warnings.forEach(message => list.append(node('li', '', message))); errors.append(list); }
  if (byId('asset-detail').open) byId('asset-detail').close();
  renderGallery(); button.disabled = false;
}

byId('reload').addEventListener('click', reload);
byId('asset-search').addEventListener('input', renderGallery);
byId('asset-kind').addEventListener('change', renderGallery);
byId('cell-size').addEventListener('input', drawPreviews);
byId('surface').addEventListener('change', drawPreviews);
byId('show-runtime').addEventListener('click', () => { void showDetailMode('runtime'); });
byId('show-source').addEventListener('click', () => { void showDetailMode('source'); });
byId('close-detail').addEventListener('click', () => byId('asset-detail').close());
byId('asset-detail').addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const dialog = byId('asset-detail'), active = document.activeElement;
  // Native audio controls have their own internal tab sequence. Leave it alone.
  if (active?.tagName === 'AUDIO') return;
  const focusable = [...dialog.querySelectorAll('button, a[href], input, select, textarea, audio[controls], [tabindex]')]
    .filter(item => !item.matches(':disabled') && item.tabIndex >= 0 && item.getClientRects().length);
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (!first) return;
  if (event.shiftKey && (active === first || active === byId('detail-title') || active === dialog)) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault(); first.focus();
  }
});
byId('asset-detail').addEventListener('close', () => {
  byId('detail-preview').querySelectorAll('audio').forEach(audio => audio.pause());
  detailRequest++; detail = null;
  (lastLauncher?.isConnected ? lastLauncher : byId('reload')).focus({ preventScroll: true });
});
byId('asset-detail').addEventListener('click', event => {
  const dialog = byId('asset-detail'), rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
let frame;
window.addEventListener('resize', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(drawPreviews); });
await reload();
