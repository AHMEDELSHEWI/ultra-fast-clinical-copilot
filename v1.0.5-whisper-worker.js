import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

const VERSION = '1.0.5';
const SAMPLE_RATE = 16000;
const SEGMENT_SECONDS = 22;
const OVERLAP_SECONDS = 1;
const MAX_AUDIO_SECONDS = 600;

try {
  env.allowLocalModels = false;
  env.useBrowserCache = true;
} catch (_) {
  // Optional environment flags differ slightly between Transformers.js versions.
}

let transcriber = null;
let engine = null;
let loadingPromise = null;

function send(type, payload = {}) {
  self.postMessage({ type, version: VERSION, ...payload });
}

function cleanText(value) {
  return String(value || '')
    .replace(/<\|[^|]+\|>/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalisedWords(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'-]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function mergeWithOverlap(existing, incoming) {
  const left = cleanText(existing);
  const right = cleanText(incoming);
  if (!left) return right;
  if (!right) return left;

  const leftWords = normalisedWords(left);
  const rightWords = normalisedWords(right);
  const max = Math.min(18, leftWords.length, rightWords.length);
  let overlap = 0;

  for (let size = max; size >= 2; size -= 1) {
    const suffix = leftWords.slice(-size).join(' ');
    const prefix = rightWords.slice(0, size).join(' ');
    if (suffix === prefix) {
      overlap = size;
      break;
    }
  }

  if (!overlap) return `${left} ${right}`.replace(/\s+/g, ' ').trim();

  const rawRightWords = right.split(/\s+/);
  const remainder = rawRightWords.slice(overlap).join(' ').trim();
  return remainder ? `${left} ${remainder}`.replace(/\s+/g, ' ').trim() : left;
}

function audioStats(audio) {
  if (!(audio instanceof Float32Array) || !audio.length) {
    return { rms: 0, peak: 0, duration: 0 };
  }
  let sum = 0;
  let peak = 0;
  const stride = Math.max(1, Math.floor(audio.length / 240000));
  let count = 0;
  for (let index = 0; index < audio.length; index += stride) {
    const value = Number(audio[index]) || 0;
    sum += value * value;
    peak = Math.max(peak, Math.abs(value));
    count += 1;
  }
  return {
    rms: count ? Math.sqrt(sum / count) : 0,
    peak,
    duration: audio.length / SAMPLE_RATE
  };
}

function progressHandler(plan) {
  return info => {
    const raw = Number(info && (info.progress_total ?? info.progress));
    const percent = Number.isFinite(raw)
      ? Math.max(0, Math.min(100, raw <= 1 ? raw * 100 : raw))
      : null;
    send('model-progress', {
      engine: plan.label,
      model: plan.model,
      status: String((info && info.status) || 'loading'),
      file: String((info && (info.file || info.name)) || ''),
      percent
    });
  };
}

async function createPipeline(plan) {
  const options = {
    dtype: plan.dtype,
    progress_callback: progressHandler(plan)
  };
  if (plan.device) options.device = plan.device;
  return pipeline('automatic-speech-recognition', plan.model, options);
}

async function loadEngine(preferWebGpu = false) {
  if (transcriber) return { transcriber, engine };
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const plans = [];
    if (preferWebGpu) {
      plans.push({
        model: 'onnx-community/whisper-small',
        device: 'webgpu',
        dtype: 'q4',
        label: 'Whisper Small WebGPU'
      });
    }
    plans.push({
      model: 'onnx-community/whisper-base',
      device: null,
      dtype: 'q8',
      label: 'Whisper Base WASM'
    });
    plans.push({
      model: 'onnx-community/whisper-tiny',
      device: null,
      dtype: 'q8',
      label: 'Whisper Tiny WASM fallback'
    });

    let lastError = null;
    for (const plan of plans) {
      try {
        send('model-attempt', { engine: plan.label, model: plan.model });
        const pipe = await createPipeline(plan);
        transcriber = pipe;
        engine = plan;
        send('model-ready', { engine: plan.label, model: plan.model });
        return { transcriber, engine };
      } catch (error) {
        lastError = error;
        send('model-fallback', {
          engine: plan.label,
          model: plan.model,
          message: error && error.message ? String(error.message) : 'Model load failed.'
        });
      }
    }
    throw lastError || new Error('No compatible multilingual speech model could be loaded.');
  })();

  try {
    return await loadingPromise;
  } finally {
    if (!transcriber) loadingPromise = null;
  }
}

async function translateSegment(segment, segmentIndex, segmentCount) {
  const stats = audioStats(segment);
  if (stats.duration < 0.35 || stats.peak < 0.004 || stats.rms < 0.0009) {
    send('segment-skipped', { segmentIndex, segmentCount, reason: 'silence' });
    return '';
  }

  send('segment-start', {
    segmentIndex,
    segmentCount,
    duration: stats.duration
  });

  const output = await transcriber(segment, {
    task: 'translate',
    return_timestamps: false,
    condition_on_prev_tokens: false,
    temperature: 0
  });

  let text = '';
  if (typeof output === 'string') text = output;
  else if (output && typeof output.text === 'string') text = output.text;
  else if (Array.isArray(output)) text = output.map(item => item && item.text ? item.text : '').join(' ');

  text = cleanText(text);
  send('segment-result', { segmentIndex, segmentCount, text });
  return text;
}

async function transcribeToEnglish(audio, preferWebGpu, requestId) {
  if (!(audio instanceof Float32Array)) throw new TypeError('Audio must be a Float32Array.');
  const maxSamples = MAX_AUDIO_SECONDS * SAMPLE_RATE;
  const clipped = audio.length > maxSamples ? audio.slice(0, maxSamples) : audio;
  const stats = audioStats(clipped);
  if (stats.duration < 0.6) throw new Error('Recording is too short.');
  if (stats.peak < 0.004 || stats.rms < 0.0009) throw new Error('No clear speech was detected in the recording.');

  await loadEngine(Boolean(preferWebGpu));

  const segmentSamples = SEGMENT_SECONDS * SAMPLE_RATE;
  const overlapSamples = OVERLAP_SECONDS * SAMPLE_RATE;
  const step = segmentSamples - overlapSamples;
  const segmentCount = Math.max(1, Math.ceil(Math.max(1, clipped.length - overlapSamples) / step));
  let english = '';
  let processed = 0;

  for (let start = 0, index = 0; start < clipped.length; start += step, index += 1) {
    const end = Math.min(clipped.length, start + segmentSamples);
    const segment = clipped.slice(start, end);
    const segmentText = await translateSegment(segment, index + 1, segmentCount);
    english = mergeWithOverlap(english, segmentText);
    processed += 1;
    send('transcription-progress', {
      requestId,
      completed: processed,
      total: segmentCount,
      percent: Math.round((processed / segmentCount) * 100),
      partialText: english
    });
    if (end >= clipped.length) break;
  }

  english = cleanText(english);
  if (!english) throw new Error('The automatic multilingual engine did not produce an English transcript.');

  send('transcription-complete', {
    requestId,
    text: english,
    engine: engine && engine.label ? engine.label : 'Whisper',
    model: engine && engine.model ? engine.model : '',
    duration: stats.duration,
    clipped: audio.length > maxSamples
  });
}

self.addEventListener('message', async event => {
  const message = event && event.data ? event.data : {};
  try {
    if (message.type === 'load-model') {
      await loadEngine(Boolean(message.preferWebGpu));
      return;
    }
    if (message.type === 'transcribe') {
      const audio = message.audio instanceof Float32Array
        ? message.audio
        : new Float32Array(message.audio || []);
      await transcribeToEnglish(audio, Boolean(message.preferWebGpu), String(message.requestId || 'voice'));
      return;
    }
    if (message.type === 'ping') {
      send('pong', { loaded: Boolean(transcriber), engine: engine && engine.label ? engine.label : '' });
    }
  } catch (error) {
    send('worker-error', {
      requestId: String(message.requestId || ''),
      message: error && error.message ? String(error.message) : 'Automatic multilingual transcription failed.'
    });
  }
});
