let lastReport = null;

export function installErrorHandler(target = globalThis) {
  target.addEventListener('error', ev => {
    report(ev.message || 'unknown', ev.error && ev.error.stack);
  });
  target.addEventListener('unhandledrejection', ev => {
    report('unhandledrejection', String(ev.reason));
  });
}

export function report(message, stack) {
  lastReport = { t: new Date().toISOString(), message: String(message).slice(0, 300), stack: String(stack || '').slice(0, 800) };
  if (typeof console !== 'undefined' && console.error) {
    console.error('[glintgrove]', message, stack || '');
  }
}

export function lastError() {
  return lastReport;
}
