import { totalStars } from '../state/saveStore.js';
import { LEVELS } from '../data/levels.js';

export const ACHIEVEMENTS = [
  {
    id: 'first-light', icon: '🌱',
    name: '첫 번째 빛', nameEn: 'First Light',
    desc: '첫 레벨을 클리어', descEn: 'Clear the first level',
    check: s => (s.stars[1] || 0) > 0
  },
  {
    id: 'dawn-woods', icon: '🌄',
    name: '새벽숲의 아침', nameEn: 'Dawn of the Woods',
    desc: '1챕터 완주', descEn: 'Complete Chapter 1',
    check: (s, c) => c.chapterCleared(1)
  },
  {
    id: 'misty-deeps', icon: '🌫️',
    name: '안개를 가른 빛', nameEn: 'Through the Mist',
    desc: '2챕터 완주', descEn: 'Complete Chapter 2',
    check: (s, c) => c.chapterCleared(2)
  },
  {
    id: 'starlit-garden', icon: '✨',
    name: '별빛 정원사', nameEn: 'Starlight Gardener',
    desc: '3챕터 완주', descEn: 'Complete Chapter 3',
    check: (s, c) => c.chapterCleared(3)
  },
  {
    id: 'ancient-heart', icon: '💎',
    name: '심장의 목격자', nameEn: 'Heart Witness',
    desc: '4챕터 완주', descEn: 'Complete Chapter 4',
    check: (s, c) => c.chapterCleared(4)
  },
  {
    id: 'no-hint-ten', icon: '🧠',
    name: '숲의 현자', nameEn: 'Forest Sage',
    desc: '힌트 없이 10레벨 클리어', descEn: 'Clear 10 levels without hints',
    check: (s, c) => c.noHintClears >= 10
  },
  {
    id: 'daily-first', icon: '📅',
    name: '오늘의 숲', nameEn: "Today's Forest",
    desc: '일일 챌린지 첫 클리어', descEn: 'First daily puzzle cleared',
    check: s => Object.keys(s.daily).length >= 1
  },
  {
    id: 'daily-streak-3', icon: '🔥',
    name: '3일 연속 새벽', nameEn: 'Three Dawns',
    desc: '일일 챌린지 3일 연속 클리어', descEn: 'Daily streak of 3 days',
    check: (s, c) => c.streak >= 3
  },
  {
    id: 'perfectionist', icon: '🌟',
    name: '완벽한 새벽', nameEn: 'Perfect Dawn',
    desc: `모든 레벨에서 ★3 달성 (${LEVELS.length * 3}별)`, descEn: `Earn all ${LEVELS.length * 3} stars`,
    check: s => totalStars(s) >= LEVELS.length * 3
  }
];

export function evaluateAchievements(save, ctx) {
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (save.ach[a.id]) continue;
    let ok = false;
    try {
      ok = !!a.check(save, ctx);
    } catch {
      ok = false;
    }
    if (ok) {
      save.ach[a.id] = new Date().toISOString().slice(0, 10);
      newly.push(a);
    }
  }
  return newly;
}
