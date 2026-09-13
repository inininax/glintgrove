// The original, editable score lives in art/source/audio/. This PCM render has
// no encoder padding: AudioBufferSourceNode can loop the exact 96-second span.
import { readBoundedResponse } from '../assets/assetStore.js';

export const MUSIC_PATH = 'assets/audio/ancient-forest-v2.wav';
export const MUSIC_DURATION = 96;
const MUSIC_BYTES = 9216044;
const MUSIC_URL = new URL('../../' + MUSIC_PATH, import.meta.url);

export async function loadForestMusic(context) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(MUSIC_URL, { signal: controller.signal, credentials: 'same-origin' });
    if (!response.ok || (response.url && new URL(response.url).origin !== MUSIC_URL.origin)) throw new Error('Music unavailable');
    const bytes = await readBoundedResponse(response, MUSIC_BYTES, controller.signal);
    if (bytes.byteLength !== MUSIC_BYTES) throw new Error('Incomplete music file');
    const buffer = await context.decodeAudioData(bytes.buffer);
    if (buffer.numberOfChannels !== 2 || Math.abs(buffer.duration - MUSIC_DURATION) > 1 / buffer.sampleRate) {
      throw new Error('Invalid music loop');
    }
    return buffer;
  } finally {
    clearTimeout(timer);
  }
}
