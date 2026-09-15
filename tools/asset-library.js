const el = id => document.getElementById(id);
const root = new URL('../', import.meta.url);
const groups = { runtime: '게임용 파일', source: '제작 원본·렌더', review: '검토 이미지', history: '이전 작업 자료' };
const PAGE_SIZE = 36;
let entries = [], filtered = [], shown = 0, launcher = null;

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}
function fileURL(entry) {
  const path = entry.path;
  if (typeof path !== 'string' || !/^(assets|art)\//.test(path) || path.includes('\\')
      || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('잘못된 파일 경로입니다.');
  const url = new URL(path.split('/').map(encodeURIComponent).join('/'), root);
  url.searchParams.set('v', entry.modified);
  return url.href;
}
function bytesLabel(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}
function audio(entry) {
  const player = node('audio'); player.controls = true; player.preload = 'none'; player.src = fileURL(entry);
  player.setAttribute('aria-label', `${entry.path.split('/').at(-1)} 미리 듣기`);
  player.addEventListener('play', () => document.querySelectorAll('audio').forEach(other => { if (other !== player) other.pause(); }));
  return player;
}
function openDetail(entry, button) {
  launcher = button;
  const container = el('library-preview'); container.replaceChildren();
  container.dataset.surface = el('library-surface').value;
  el('library-detail-title').textContent = entry.path;
  const status = el('library-detail-status'); status.textContent = '불러오는 중…';
  const preview = entry.kind === 'image' ? node('img') : audio(entry);
  if (entry.kind === 'image') {
    preview.alt = entry.path;
    preview.onload = () => { status.textContent = `${preview.naturalWidth} × ${preview.naturalHeight} px · ${bytesLabel(entry.bytes)}`; };
    preview.onerror = () => { status.textContent = '파일을 읽지 못했습니다. 목록을 갱신하고 원본 경로를 확인하세요.'; };
    preview.src = fileURL(entry);
  } else {
    status.textContent = `${bytesLabel(entry.bytes)} · 재생 버튼을 누르면 음원을 불러옵니다.`;
    preview.addEventListener('error', () => { status.textContent = '음원을 읽지 못했습니다. 원본 파일을 확인하세요.'; });
  }
  container.append(preview);
  el('library-open').href = el('library-download').href = fileURL(entry);
  el('library-download').download = entry.path.split('/').at(-1);
  el('library-detail').showModal(); el('library-close').focus();
}
function card(entry) {
  const article = node('article', 'local-card'); article.dataset.path = entry.path;
  const name = entry.path.split('/').at(-1);
  const button = node('button', 'local-preview'); button.type = 'button'; button.setAttribute('aria-label', `${entry.path} 확대 보기`);
  if (entry.kind === 'image') {
    const image = node('img'); image.alt = name; image.loading = 'lazy'; image.decoding = 'async';
    image.addEventListener('error', () => { button.replaceChildren(node('span', 'image-error', '원본 파일 확인 필요')); article.dataset.failed = 'true'; });
    image.src = fileURL(entry); button.append(image);
  } else button.append(node('span', '', '♫ 음악 상세 보기'));
  button.addEventListener('click', () => openDetail(entry, button));
  const body = node('div', 'card-body');
  body.append(node('h2', '', name), node('p', 'file-details', `${groups[entry.group]} · ${bytesLabel(entry.bytes)}`), node('p', 'card-id', entry.path));
  if (entry.kind === 'audio') body.append(audio(entry));
  const link = node('a', '', '원본 파일 열기 ↗'); link.href = fileURL(entry); link.target = '_blank'; link.rel = 'noopener'; body.append(link);
  article.append(button, body); return article;
}
function showMore() {
  const next = filtered.slice(shown, shown + PAGE_SIZE);
  el('local-gallery').append(...next.map(card)); shown += next.length;
  el('library-count').textContent = `${filtered.length} / ${entries.length}개 · ${shown}개 표시`;
  el('library-more').hidden = shown >= filtered.length;
}
function filter() {
  document.querySelectorAll('audio').forEach(player => player.pause());
  const search = el('library-search').value.trim().toLowerCase();
  filtered = entries.filter(entry => entry.path.toLowerCase().includes(search)
    && (el('library-group').value === 'all' || entry.group === el('library-group').value)
    && (el('library-kind').value === 'all' || entry.kind === el('library-kind').value));
  shown = 0; el('local-gallery').replaceChildren();
  el('library-empty').hidden = filtered.length !== 0; showMore();
}
async function reload() {
  const button = el('library-reload'); if (button.disabled) return;
  button.disabled = true; el('library-error').hidden = true;
  try {
    const response = await fetch('local-assets.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('목록이 없습니다. 터미널에서 npm run assets:index를 실행하세요.');
    const data = await response.json();
    if (data.version !== 1 || !Array.isArray(data.entries)) throw new Error('목록을 다시 생성해 주세요: npm run assets:index');
    for (const entry of data.entries) {
      fileURL(entry);
      if (!['image', 'audio'].includes(entry.kind) || !groups[entry.group] || !Number.isFinite(entry.bytes) || !Number.isFinite(entry.modified)) throw new Error('잘못된 에셋 목록입니다.');
    }
    entries = data.entries; filter();
    el('library-status').textContent = `로컬 파일 ${entries.length}개 · 목록 준비 완료`;
  } catch (error) {
    el('library-error').textContent = error.message; el('library-error').hidden = false;
    el('library-status').textContent = entries.length ? '이전 목록을 표시합니다.' : '목록 생성이 필요합니다.';
  } finally { button.disabled = false; }
}
el('library-reload').addEventListener('click', reload);
el('library-search').addEventListener('input', filter);
for (const id of ['library-group', 'library-kind']) el(id).addEventListener('change', filter);
el('library-more').addEventListener('click', showMore);
el('library-surface').addEventListener('change', () => { el('local-gallery').dataset.surface = el('library-surface').value; });
el('library-close').addEventListener('click', () => el('library-detail').close());
el('library-detail').addEventListener('close', () => {
  el('library-preview').querySelectorAll('audio').forEach(player => player.pause());
  // Discard handlers so a late image load cannot update the next preview.
  const image = el('library-preview').querySelector('img'); if (image) image.onload = image.onerror = null;
  el('library-preview').replaceChildren();
  if (launcher?.isConnected) launcher.focus();
});
await reload();
