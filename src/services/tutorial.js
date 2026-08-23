export function getTutorial(def, saveData) {
  if (!def) return null;
  const seen = key => !!saveData.tipsSeen[key];

  if (def.id === 1 && !seen('tut-1')) {
    const mirror = def.grid.reduce((found, row, y) => {
      const x = row.indexOf('\\');
      return found || (x >= 0 ? { x, y } : null);
    }, null) || { x: 4, y: 2 };
    return { type: 'pointer', levelId: 1, ...mirror };
  }
  if (def.id === 6 && !seen('tut-6')) {
    return { type: 'card', levelId: 6, art: '◇', titleKey: 'tutCardSplitterTitle', bodyKey: 'tutCardSplitterBody' };
  }
  if (def.id === 17 && !seen('tut-17')) {
    return { type: 'card', levelId: 17, art: '◈Ⓐ', titleKey: 'tutCardColorTitle', bodyKey: 'tutCardColorBody' };
  }
  if (def.id === 23 && !seen('tut-23')) {
    return { type: 'card', levelId: 23, art: '◎', titleKey: 'tutCardPortalTitle', bodyKey: 'tutCardPortalBody' };
  }
  return null;
}

export function markTutorialDone(saveData, levelId) {
  saveData.tipsSeen[`tut-${levelId}`] = true;
}
