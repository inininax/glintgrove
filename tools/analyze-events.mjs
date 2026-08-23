import fs from 'node:fs';
import { LEVELS } from '../src/data/levels.js';

const file = process.argv[2];
if (!file) {
  console.error('usage: node tools/analyze-events.mjs <exported-data.json>');
  console.error('진단 내보내기 버튼(설정 → 플레이 데이터 내보내기)으로 받은 JSON을 넣어주세요.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const events = Array.isArray(data.events) ? data.events : [];

const byLevel = new Map();
for (const e of events) {
  if (!e.level_id) continue;
  const id = Number(e.level_id);
  if (!byLevel.has(id)) {
    byLevel.set(id, { starts: 0, wins: 0, moves: [], deltas: [], hints: 0, stars: [] });
  }
  const s = byLevel.get(id);
  if (e.name === 'level_start') s.starts++;
  else if (e.name === 'level_win') {
    s.wins++;
    if (Number.isFinite(e.par_delta)) s.deltas.push(e.par_delta);
    if (Number.isInteger(e.stars)) s.stars.push(e.stars);
    if (Number.isInteger(e.hints) && e.hints > 0) s.hints++;
    if (Number.isInteger(e.moves)) s.moves.push(e.moves);
  }
}

console.log(`export: ${data.exportedAt || '?'}  events: ${events.length}`);
console.log('');
console.log('level  starts  wins  win%   avgΔpar  hint%  stars');
let flags = [];
for (const [id, s] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
  const def = LEVELS.find(l => l.id === id);
  const name = def ? def.name : `L${id}`;
  const winRate = s.starts > 0 ? Math.round((s.wins / s.starts) * 100) : 0;
  const avgDelta = s.deltas.length
    ? (s.deltas.reduce((a, b) => a + b, 0) / s.deltas.length).toFixed(1)
    : '-';
  const hintPct = s.wins > 0 ? Math.round((s.hints / s.wins) * 100) : 0;
  const avgStars = s.stars.length
    ? (s.stars.reduce((a, b) => a + b, 0) / s.stars.length).toFixed(2)
    : '-';
  console.log(
    `L${String(id).padStart(2)} ${name.padEnd(10)} ${String(s.starts).padStart(5)} ${String(s.wins).padStart(5)} ${String(winRate).padStart(4)}% ${String(avgDelta).padStart(7)} ${String(hintPct).padStart(4)}% ${String(avgStars).padStart(5)}`
  );

  if (s.starts >= 3 && s.wins === 0) {
    flags.push(`L${id}(${name}): 시작 3회 이상, 클리어 0회 — par 완화(parOverrides) 또는 힌트 강화 권장`);
  } else if (s.wins >= 3 && hintPct >= 50 && avgDelta !== '-') {
    flags.push(`L${id}(${name}): 클리어의 ${hintPct}%가 힌트 사용, 평균 Δpar ${avgDelta} — 난이도 재검토 권장`);
  } else if (s.wins >= 3 && avgDelta !== '-' && Number(avgDelta) <= -2) {
    flags.push(`L${id}(${name}): 평균 Δpar ${avgDelta} — 최적해보다 훨씬 적게 써서 클리어 중, par 상향 여지`);
  }
}

console.log('');
if (flags.length === 0) {
  console.log('조언할 밸런스 이슈 없음 (데이터 부족 또는 균형 양호)');
} else {
  console.log('밸런스 제안:');
  for (const f of flags) console.log(' -', f);
  console.log('');
  console.log('적용 방법: config.json의 parOverrides에 { "레벨번호": 새par } 추가 후 push');
}
