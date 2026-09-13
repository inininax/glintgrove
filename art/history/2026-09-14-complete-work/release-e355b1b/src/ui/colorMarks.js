// Shared original geometry: each color has the same mark on the board and guide.
const MARKS = Object.freeze({
  r: [['M', 0, -.8], ['L', .58, 0], ['L', 0, .8], ['L', -.58, 0], ['Z']],
  g: [['M', -.58, .6], ['C', -.82, -.25, -.1, -.83, .64, -.66], ['C', .84, .17, .1, .83, -.58, .6], ['Z'], ['M', -.48, .5], ['L', .38, -.4]],
  b: [['M', 0, -.83], ['C', -.22, -.43, -.66, .03, -.57, .39], ['C', -.44, .92, .44, .92, .57, .39], ['C', .66, .03, .22, -.43, 0, -.83], ['Z']]
});

export function colorMarkPath(color) {
  return (MARKS[color] || []).map(([command, ...values]) => command + values.join(' ')).join(' ');
}

export function traceColorMark(ctx, color) {
  const methods = { M: 'moveTo', L: 'lineTo', C: 'bezierCurveTo', Z: 'closePath' };
  ctx.beginPath();
  for (const [command, ...values] of MARKS[color] || []) ctx[methods[command]](...values);
}
