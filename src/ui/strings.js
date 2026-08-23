export const STRINGS = {
  ko: {
    'tagline': '빛을 잃은 숲을 깨워주세요',
    'play': '시작하기',
    'continue': '이어하기',
    'daily': '일일 챌린지',
    'settings': '설정',
    'creditsHint': '거울을 클릭해 빛의 길을 만드세요',
    'map': '숲의 지도',
    'backToTitle': '← 타이틀로',
    'achievements': '업적',
    'moves': '이동',
    'goal': '목표',
    'hintLabel': 'H 키: 도움말',
    'winTitle': '숲이 깨어났습니다',
    'dailyWinTitle': '오늘의 숲이 깨어났습니다',
    'nextLevel': '다음 레벨 →',
    'replay': '다시 하기',
    'list': '목록',
    'share': '공유',
    'shareText': 'Glintgrove에서 {name}을(를) 풀었습니다! ★{stars}',
    'copied': '링크가 복사되었습니다',
    'soundDesc': '효과음과 숲의 소리',
    'motionDesc': '반짝임과 파티클 애니메이션',
    'colorblindDesc': '빛 색상에 무늬와 문자를 추가',
    'langLabel': '언어',
    'langAuto': '자동',
    'wipe': '진행 데이터 초기화',
    'wipeDone': '데이터가 초기화되었습니다',
    'close': '닫기',
    'introTitle': '어두운 숲에 오신 것을 환영합니다',
    'introBody1': '고대 빛 발산원이 다시 깨어났지만, 빛은 숲 깊은 곳까지 닿지 않습니다.',
    'introBody2': '거울과 분할기를 클릭해 회전시켜 빛의 길을 만들고, 나무·꽃·버섯·올빼미를 깨워주세요.',
    'introBody3': '일부 생명은 특정 색의 빛을 필요로 합니다. 크리스털(r/g/b)은 빛을 물들이고, 문(A/B/C)은 같은 색만 통과시킵니다.',
    'enterForest': '숲으로 들어가기',
    'achTitle': '업적',
    'tip6': '분할기(◇)는 빛을 통과시키면서 동시에 반사합니다.',
    'tip17': '크리스털(r)은 지나가는 빛을 붉게 물들이고, 붉은 문(A)은 붉은 빛만 통과시킵니다.',
    'tip23': '문(Portal)에 들어간 빛은 짝 문에서 같은 방향으로 나옵니다.'
  },
  en: {
    'tagline': 'Wake the forest that lost its light',
    'play': 'Play',
    'continue': 'Continue',
    'daily': 'Daily Puzzle',
    'settings': 'Settings',
    'creditsHint': 'Click mirrors to guide the light',
    'map': 'Forest Map',
    'backToTitle': '← Title',
    'achievements': 'Achievements',
    'moves': 'Moves',
    'goal': 'Par',
    'hintLabel': 'H: Hint',
    'winTitle': 'The forest has awakened',
    'dailyWinTitle': "Today's forest has awakened",
    'nextLevel': 'Next Level →',
    'replay': 'Replay',
    'list': 'List',
    'share': 'Share',
    'shareText': 'I solved {name} in Glintgrove! ★{stars}',
    'copied': 'Link copied',
    'soundDesc': 'Sound effects and forest ambience',
    'motionDesc': 'Sparkles and particle animations',
    'colorblindDesc': 'Patterns and letters for beam colors',
    'langLabel': 'Language',
    'langAuto': 'Auto',
    'wipe': 'Reset progress data',
    'wipeDone': 'Progress data has been reset',
    'close': 'Close',
    'introTitle': 'Welcome to the dark forest',
    'introBody1': 'The ancient beacons have reawakened, but their light no longer reaches deep into the woods.',
    'introBody2': 'Rotate mirrors and splitters to build a path of light, and wake the trees, flowers, mushrooms and owls.',
    'introBody3': 'Some creatures need light of a specific color. Crystals (r/g/b) tint beams; gates (A/B/C) pass only matching colors.',
    'enterForest': 'Enter the Forest',
    'achTitle': 'Achievements',
    'tip6': 'Splitters pass light through while reflecting it at the same time.',
    'tip17': 'Red crystals tint passing beams red; red gates only let red light through.',
    'tip23': 'Light that enters a portal exits from its twin portal, moving the same way.'
  }
};

let current = 'ko';

export function setLanguage(lang, savedLang = 'auto') {
  if (lang === 'ko' || lang === 'en') current = lang;
  else current = detect() === 'en' ? 'en' : 'ko';
  void savedLang;
}

function detect() {
  try {
    const langs = navigator.languages || [navigator.language || 'ko'];
    return langs.some(l => l.toLowerCase().startsWith('ko')) ? 'ko' : 'en';
  } catch {
    return 'ko';
  }
}

export function t(key, params) {
  let text = STRINGS[current][key] ?? STRINGS.ko[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function applyDomStrings(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

export const LEVEL_NAMES_EN = {
  1: 'First Light', 2: 'Zigzag', 3: 'Stairway', 4: 'Detour', 5: "Owl's Perch",
  6: 'Split Light', 7: 'Branching Beams', 8: 'Dawn Chorus', 9: 'Foggy Branches',
  10: 'Deep Woods', 11: 'Spiral Heart', 12: 'Fourfold Light', 13: 'Mossy Maze',
  14: 'Eyes of the Abyss', 15: 'Moonlit Stairs', 16: 'Beyond the Veil', 17: 'Tinted Light',
  18: 'Whispering Colors', 19: 'Fluorescent Night', 20: 'Prism Secret', 21: 'Five Colors',
  22: 'Starlight Duet', 23: 'Dimensional Door', 24: 'Dark Shortcut', 25: 'Chamber of Hearts',
  26: 'Dawn Complete'
};
