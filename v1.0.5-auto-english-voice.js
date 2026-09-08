(() => {
  'use strict';

  const VERSION = '1.0.5';
  const TARGET_SAMPLE_RATE = 16000;
  const MAX_RECORDING_MS = 10 * 60 * 1000;
  const WORKER_FILE = './v1.0.5-whisper-worker.js?v=1.0.5';

  const state = {
    recorder: null,
    stream: null,
    chunks: [],
    startedAt: 0,
    recording: false,
    processing: false,
    worker: null,
    workerReady: false,
    requestId: '',
    stopTimer: null,
    clockTimer: null,
    modelStarted: false,
    lastEngine: '',
    lastEnglishText: '',
    lastError: ''
  };

  function isArabicUi() {
    return document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
  }

  function t(en, ar) {
    return isArabicUi() ? ar : en;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function notify(type, message, timeout = 6500) {
    const region = document.getElementById('toastRegion');
    if (!region) {
      const method = type === 'error' ? 'error' : 'log';
      console[method](message);
      return;
    }
    const item = document.createElement('div');
    item.className = `toast ${type || 'info'}`;
    item.innerHTML = `<div><strong>${escapeHtml(t(
      type === 'error' ? 'Error' : type === 'success' ? 'Completed' : 'Information',
      type === 'error' ? 'خطأ' : type === 'success' ? 'اكتمل' : 'معلومة'
    ))}</strong><span>${escapeHtml(message)}</span></div>`;
    region.appendChild(item);
    window.setTimeout(() => item.remove(), timeout);
  }

  function installStyles() {
    if (document.getElementById('v105AutoVoiceStyles')) return;
    const style = document.createElement('style');
    style.id = 'v105AutoVoiceStyles';
    style.textContent = `
      .voice-language-panel{display:none!important}
      #v105AutoVoicePanel{display:grid;gap:11px;margin:0 0 14px;padding:14px;border:1px solid var(--line,#dce6f1);border-radius:14px;background:var(--surface-soft,#f8fbff)}
      #v105AutoVoicePanel .v105-head{display:flex;align-items:flex-start;gap:10px}
      #v105AutoVoicePanel .v105-mark{width:38px;height:38px;display:grid;place-items:center;flex:0 0 auto;border-radius:12px;background:var(--brand-soft,#eaf1ff);color:var(--brand,#0b5fff);font-weight:900}
      #v105AutoVoicePanel .v105-copy{display:grid;gap:3px;min-width:0}
      #v105AutoVoicePanel strong{font-size:.82rem}
      #v105AutoVoicePanel span{font-size:.68rem;color:var(--ink-soft,#51677f);line-height:1.5}
      #v105AutoVoicePanel .v105-status{display:grid;gap:7px;padding:10px 11px;border:1px solid var(--line,#dce6f1);border-radius:11px;background:var(--surface,#fff)}
      #v105AutoVoicePanel .v105-status-line{display:flex;align-items:center;gap:8px;font-size:.72rem;font-weight:800}
      #v105AutoVoicePanel .v105-dot{width:9px;height:9px;border-radius:50%;background:var(--success,#078a55);box-shadow:0 0 0 4px var(--success-soft,#e7f8f0)}
      #v105AutoVoicePanel[data-mode="recording"] .v105-dot{background:var(--danger,#bd1732);box-shadow:0 0 0 4px var(--danger-soft,#ffe9ed);animation:v105Pulse 1.25s infinite}
      #v105AutoVoicePanel[data-mode="processing"] .v105-dot{background:var(--warning,#a15c00);box-shadow:0 0 0 4px var(--warning-soft,#fff3d6);animation:v105Pulse 1.25s infinite}
      #v105AutoVoicePanel .v105-progress{height:7px;border-radius:999px;overflow:hidden;background:var(--line,#dce6f1)}
      #v105AutoVoicePanel .v105-progress>i{display:block;width:0;height:100%;background:var(--brand,#0b5fff);transition:width .25s ease}
      #v105AutoVoicePanel .v105-meta{display:flex;flex-wrap:wrap;gap:8px;font-size:.64rem;color:var(--ink-soft,#51677f)}
      [data-action="voice-input"].v105-recording{border-color:var(--danger,#bd1732)!important;color:var(--danger,#bd1732)!important;box-shadow:0 0 0 4px var(--danger-soft,#ffe9ed)!important}
      [data-action="voice-input"].v105-processing{opacity:.72;cursor:progress}
      #presentationText[data-v105-english="true"]{direction:ltr!important;text-align:left!important}
      @keyframes v105Pulse{0%,100%{opacity:1}50%{opacity:.45}}
      @media(max-width:700px){#v105AutoVoicePanel{padding:12px}.form-actions [data-action="voice-input"]{min-width:150px}}
    `;
    document.head.appendChild(style);
  }

  function panel() {
    return document.getElementById('v105AutoVoicePanel');
  }

  function setStatus(message, mode = 'ready', percent = null, meta = '') {
    const root = panel();
    if (!root) return;
    root.dataset.mode = mode;
    const text = root.querySelector('[data-v105-status]');
    const bar = root.querySelector('[data-v105-progress]');
    const metaNode = root.querySelector('[data-v105-meta]');
    if (text) text.textContent = message;
    if (bar) {
      const value = Number(percent);
      bar.style.width = Number.isFinite(value) ? `${Math.max(0, Math.min(100, value))}%` : '0%';
      bar.parentElement.hidden = !Number.isFinite(value);
    }
    if (metaNode) {
      metaNode.textContent = meta || '';
      metaNode.hidden = !meta;
    }
  }

  function renderPanel() {
    installStyles();
    document.querySelectorAll('.voice-language-panel').forEach(node => node.remove());

    const textarea = document.getElementById('presentationText');
    const form = textarea && textarea.closest('form[data-form="presentation"]');
    if (!form) return;

    textarea.setAttribute('lang', 'en');
    textarea.setAttribute('dir', 'ltr');
    textarea.dataset.v105English = 'true';

    let root = panel();
    if (!root) {
      root = document.createElement('section');
      root.id = 'v105AutoVoicePanel';
      root.dataset.mode = 'ready';
      root.setAttribute('aria-label', t('Automatic multilingual dictation', 'الإملاء التلقائي متعدد اللغات'));
      root.innerHTML = `
        <div class="v105-head">
          <div class="v105-mark" aria-hidden="true">AI</div>
          <div class="v105-copy">
            <strong>${escapeHtml(t('Automatic multilingual dictation — English output', 'إملاء تلقائي متعدد اللغات — الناتج باللغة الإنجليزية'))}</strong>
            <span>${escapeHtml(t(
              'Start speaking without choosing a language. Arabic dialects, English and other supported languages may be mixed. The captured speech is automatically converted into an English clinical transcript for clinician review.',
              'ابدأ الكلام دون اختيار لغة. يمكن المزج بين اللهجات العربية والإنجليزية واللغات الأخرى المدعومة، ثم يتحول الكلام تلقائيًا إلى سجل سريري باللغة الإنجليزية لمراجعة الطبيب.'
            ))}</span>
          </div>
        </div>
        <div class="v105-status" aria-live="polite">
          <div class="v105-status-line"><i class="v105-dot" aria-hidden="true"></i><span data-v105-status>${escapeHtml(t('Ready — no language selection required', 'جاهز — لا يلزم اختيار اللغة'))}</span></div>
          <div class="v105-progress" hidden><i data-v105-progress></i></div>
          <div class="v105-meta" data-v105-meta hidden></div>
        </div>`;
      form.parentNode.insertBefore(root, form);
    }

    updateButtons();
  }

  function originalButtonIcon(button) {
    const svg = button && button.querySelector('svg');
    return svg ? svg.outerHTML : '';
  }

  function updateButtons() {
    document.querySelectorAll('[data-action="voice-input"]').forEach(button => {
      const icon = originalButtonIcon(button);
      button.classList.toggle('v105-recording', state.recording);
      button.classList.toggle('v105-processing', state.processing);
      button.setAttribute('aria-pressed', String(state.recording));
      button.disabled = Boolean(state.processing);
      let label = t('Dictate', 'إملاء');
      if (state.recording) label = t('Stop and convert to English', 'إيقاف والتحويل إلى الإنجليزية');
      else if (state.processing) label = t('Converting to English…', 'جارٍ التحويل إلى الإنجليزية…');
      const visualState = state.recording ? 'recording' : state.processing ? 'processing' : 'ready';
      if (button.dataset.v105VisualState !== visualState || button.dataset.v105Label !== label) {
        button.innerHTML = `${icon}${escapeHtml(label)}`;
        button.dataset.v105VisualState = visualState;
        button.dataset.v105Label = label;
      }
      button.title = label;
    });
  }

  function formatDuration(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function startClock() {
    window.clearInterval(state.clockTimer);
    state.clockTimer = window.setInterval(() => {
      if (!state.recording) return;
      const elapsed = Date.now() - state.startedAt;
      setStatus(
        t('Recording — press Dictate again when the conversation is complete', 'جارٍ التسجيل — اضغط «إملاء» مرة أخرى عند انتهاء المحادثة'),
        'recording',
        null,
        `${t('Elapsed', 'المدة')}: ${formatDuration(elapsed)} • ${t('Automatic language detection', 'تحديد اللغة تلقائيًا')} • ${t('English output', 'الناتج إنجليزي')}`
      );
    }, 500);
  }

  function stopClock() {
    window.clearInterval(state.clockTimer);
    state.clockTimer = null;
  }

  function chooseMimeType() {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];
    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
  }

  function createWorker() {
    if (state.worker) return state.worker;
    if (!window.Worker) throw new Error(t('This browser does not support background speech processing.', 'هذا المتصفح لا يدعم معالجة الصوت في الخلفية.'));

    const url = new URL(WORKER_FILE, document.baseURI);
    const worker = new Worker(url, { type: 'module', name: 'clinical-auto-english-v105' });
    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', event => {
      const message = event && event.message ? event.message : t('The multilingual speech engine failed to start.', 'تعذر تشغيل محرك التعرف متعدد اللغات.');
      failProcessing(message);
    });
    state.worker = worker;
    return worker;
  }

  function warmModel() {
    if (state.modelStarted) return;
    state.modelStarted = true;
    try {
      createWorker().postMessage({
        type: 'load-model',
        preferWebGpu: Boolean(navigator.gpu)
      });
    } catch (error) {
      state.modelStarted = false;
      state.lastError = error && error.message ? error.message : String(error);
    }
  }

  async function startRecording() {
    if (state.processing) return;
    if (state.recording) {
      stopRecording();
      return;
    }

    const protocol = window.location && window.location.protocol ? window.location.protocol : '';
    if (!window.isSecureContext || protocol === 'file:' || protocol === 'content:') {
      notify('error', t(
        'Open the published HTTPS version in Chrome to use automatic multilingual dictation.',
        'افتح النسخة المنشورة عبر HTTPS في Chrome لاستخدام الإملاء التلقائي متعدد اللغات.'
      ));
      return;
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function' || !window.MediaRecorder) {
      notify('error', t(
        'Microphone recording is not supported in this browser. Use the current Chrome version on Android or desktop.',
        'تسجيل الميكروفون غير مدعوم في هذا المتصفح. استخدم إصدار Chrome الحالي على Android أو الكمبيوتر.'
      ));
      return;
    }

    if (window.__UFCopilotApp && typeof window.__UFCopilotApp.navigate === 'function') {
      try { window.__UFCopilotApp.navigate('patient'); } catch (_) { /* remain on current route */ }
    }

    try {
      setStatus(t('Requesting microphone permission…', 'جارٍ طلب إذن الميكروفون…'), 'processing');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      const mimeType = chooseMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      state.stream = stream;
      state.recorder = recorder;
      state.chunks = [];
      state.startedAt = Date.now();
      state.recording = true;
      state.processing = false;
      state.lastError = '';

      recorder.addEventListener('dataavailable', event => {
        if (event.data && event.data.size > 0) state.chunks.push(event.data);
      });
      recorder.addEventListener('error', event => {
        const message = event && event.error && event.error.message
          ? event.error.message
          : t('Microphone recording failed.', 'تعذر تسجيل الصوت من الميكروفون.');
        failRecording(message);
      });
      recorder.addEventListener('stop', processRecordedAudio, { once: true });
      recorder.start();

      warmModel();
      updateButtons();
      startClock();
      setStatus(
        t('Recording — speak naturally in any supported language', 'جارٍ التسجيل — تحدث بصورة طبيعية بأي لغة مدعومة'),
        'recording',
        null,
        `${t('Automatic detection', 'تحديد تلقائي')} • ${t('Mixed languages accepted', 'يمكن مزج اللغات')} • ${t('Final output: English', 'الناتج النهائي: الإنجليزية')}`
      );
      notify('info', t(
        'Recording started. Speak naturally, then press Dictate again to stop and convert everything to English.',
        'بدأ التسجيل. تحدث بصورة طبيعية، ثم اضغط «إملاء» مرة أخرى للإيقاف وتحويل المحتوى إلى الإنجليزية.'
      ));

      window.clearTimeout(state.stopTimer);
      state.stopTimer = window.setTimeout(() => {
        if (state.recording) {
          notify('info', t('Maximum recording duration reached. Processing now.', 'تم الوصول إلى الحد الأقصى لمدة التسجيل. جارٍ المعالجة الآن.'));
          stopRecording();
        }
      }, MAX_RECORDING_MS);
    } catch (error) {
      const name = error && error.name ? String(error.name) : '';
      let message = error && error.message ? String(error.message) : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        message = t(
          'Microphone permission was denied. In Chrome, open Site settings for this page and set Microphone to Allow.',
          'تم رفض إذن الميكروفون. افتح «إعدادات الموقع» لهذه الصفحة في Chrome واضبط «الميكروفون» على «سماح».'
        );
      } else if (name === 'NotFoundError') {
        message = t('No microphone was found on this device.', 'لم يتم العثور على ميكروفون في هذا الجهاز.');
      } else if (name === 'NotReadableError') {
        message = t('The microphone is unavailable or being used by another application.', 'الميكروفون غير متاح أو يستخدمه تطبيق آخر.');
      }
      state.recording = false;
      state.processing = false;
      updateButtons();
      setStatus(t('Ready — no language selection required', 'جاهز — لا يلزم اختيار اللغة'), 'ready');
      notify('error', message || t('Unable to start microphone recording.', 'تعذر بدء تسجيل الميكروفون.'));
    }
  }

  function stopRecording() {
    if (!state.recording || !state.recorder) return;
    state.recording = false;
    state.processing = true;
    window.clearTimeout(state.stopTimer);
    state.stopTimer = null;
    stopClock();
    updateButtons();
    setStatus(t('Finalising the recording…', 'جارٍ إنهاء التسجيل…'), 'processing', 2);
    try {
      if (state.recorder.state !== 'inactive') {
        try { state.recorder.requestData(); } catch (_) { /* optional */ }
        state.recorder.stop();
      }
    } catch (error) {
      failRecording(error && error.message ? error.message : t('Unable to stop the recording.', 'تعذر إيقاف التسجيل.'));
    }
  }

  function closeStream() {
    if (state.stream) {
      state.stream.getTracks().forEach(track => {
        try { track.stop(); } catch (_) { /* already stopped */ }
      });
    }
    state.stream = null;
    state.recorder = null;
  }

  function failRecording(message) {
    window.clearTimeout(state.stopTimer);
    state.stopTimer = null;
    stopClock();
    closeStream();
    state.recording = false;
    state.processing = false;
    state.chunks = [];
    state.lastError = String(message || 'Recording failed.');
    updateButtons();
    setStatus(t('Ready — recording failed', 'جاهز — تعذر التسجيل'), 'ready');
    notify('error', state.lastError);
  }

  function failProcessing(message) {
    closeStream();
    state.recording = false;
    state.processing = false;
    state.lastError = String(message || 'Processing failed.');
    updateButtons();
    setStatus(t('Ready — try again', 'جاهز — أعد المحاولة'), 'ready');
    notify('error', state.lastError, 9000);
  }

  function mixToMono(audioBuffer) {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const mono = new Float32Array(length);
    if (!channels) return mono;
    for (let channel = 0; channel < channels; channel += 1) {
      const source = audioBuffer.getChannelData(channel);
      for (let index = 0; index < length; index += 1) mono[index] += source[index] / channels;
    }
    return mono;
  }

  function resampleLinear(input, inputRate, outputRate) {
    if (!(input instanceof Float32Array)) input = new Float32Array(input || []);
    if (!input.length || inputRate === outputRate) return input.slice();
    const ratio = inputRate / outputRate;
    const outputLength = Math.max(1, Math.round(input.length / ratio));
    const output = new Float32Array(outputLength);
    for (let index = 0; index < outputLength; index += 1) {
      const position = index * ratio;
      const lower = Math.floor(position);
      const upper = Math.min(input.length - 1, lower + 1);
      const fraction = position - lower;
      output[index] = input[lower] + ((input[upper] - input[lower]) * fraction);
    }
    return output;
  }

  function trimSilence(input, sampleRate) {
    if (!(input instanceof Float32Array) || input.length < sampleRate) return input;
    const windowSize = Math.max(1, Math.floor(sampleRate * 0.02));
    const threshold = 0.0035;
    let start = 0;
    let end = input.length;

    outerStart:
    for (let offset = 0; offset < input.length; offset += windowSize) {
      const limit = Math.min(input.length, offset + windowSize);
      for (let index = offset; index < limit; index += 1) {
        if (Math.abs(input[index]) >= threshold) {
          start = Math.max(0, offset - Math.floor(sampleRate * 0.25));
          break outerStart;
        }
      }
    }

    outerEnd:
    for (let offset = input.length; offset > 0; offset -= windowSize) {
      const begin = Math.max(0, offset - windowSize);
      for (let index = offset - 1; index >= begin; index -= 1) {
        if (Math.abs(input[index]) >= threshold) {
          end = Math.min(input.length, offset + Math.floor(sampleRate * 0.25));
          break outerEnd;
        }
      }
    }

    return end > start ? input.slice(start, end) : input;
  }

  async function decodeAudio(blob) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error(t('Audio decoding is not supported in this browser.', 'فك ترميز الصوت غير مدعوم في هذا المتصفح.'));
    const context = new AudioContextClass();
    try {
      const bytes = await blob.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(bytes.slice(0));
      const mono = mixToMono(audioBuffer);
      const resampled = resampleLinear(mono, audioBuffer.sampleRate, TARGET_SAMPLE_RATE);
      return trimSilence(resampled, TARGET_SAMPLE_RATE);
    } finally {
      try { await context.close(); } catch (_) { /* optional */ }
    }
  }

  async function processRecordedAudio() {
    closeStream();
    const chunks = state.chunks.slice();
    state.chunks = [];
    if (!chunks.length) {
      failProcessing(t('No audio data was recorded.', 'لم يتم تسجيل أي بيانات صوتية.'));
      return;
    }

    try {
      const type = chunks[0] && chunks[0].type ? chunks[0].type : 'audio/webm';
      const blob = new Blob(chunks, { type });
      setStatus(t('Preparing the audio securely on this device…', 'جارٍ تجهيز الصوت بأمان على هذا الجهاز…'), 'processing', 5);
      const audio = await decodeAudio(blob);
      if (audio.length < TARGET_SAMPLE_RATE * 0.6) throw new Error(t('Recording is too short. Speak for at least one second.', 'التسجيل قصير جدًا. تحدث لمدة ثانية واحدة على الأقل.'));

      const worker = createWorker();
      state.requestId = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      state.processing = true;
      updateButtons();
      setStatus(
        t('Detecting the spoken language and converting the conversation to English…', 'جارٍ تحديد اللغة المنطوقة وتحويل المحادثة إلى الإنجليزية…'),
        'processing',
        8,
        `${Math.round(audio.length / TARGET_SAMPLE_RATE)} ${t('seconds of audio', 'ثانية صوت')}`
      );
      worker.postMessage({
        type: 'transcribe',
        requestId: state.requestId,
        audio,
        sampleRate: TARGET_SAMPLE_RATE,
        preferWebGpu: Boolean(navigator.gpu)
      }, [audio.buffer]);
    } catch (error) {
      failProcessing(error && error.message ? error.message : t('Unable to process the recording.', 'تعذر معالجة التسجيل.'));
    }
  }

  function handleWorkerMessage(event) {
    const message = event && event.data ? event.data : {};
    if (message.version && message.version !== VERSION) return;

    switch (message.type) {
      case 'model-attempt':
        setStatus(
          t('Loading the automatic multilingual speech engine…', 'جارٍ تحميل محرك الكلام التلقائي متعدد اللغات…'),
          state.recording ? 'recording' : 'processing',
          state.recording ? null : 10,
          message.engine || message.model || ''
        );
        break;
      case 'model-progress': {
        const percent = Number(message.percent);
        const shown = Number.isFinite(percent) ? Math.max(8, Math.min(70, Math.round(percent * 0.62) + 8)) : null;
        setStatus(
          t('Loading the multilingual model — first use may take longer', 'جارٍ تحميل النموذج متعدد اللغات — قد تستغرق المرة الأولى وقتًا أطول'),
          state.recording ? 'recording' : 'processing',
          state.recording ? null : shown,
          [message.engine, Number.isFinite(percent) ? `${Math.round(percent)}%` : '', message.file].filter(Boolean).join(' • ')
        );
        break;
      }
      case 'model-ready':
        state.workerReady = true;
        state.lastEngine = message.engine || message.model || 'Whisper';
        if (state.recording) {
          setStatus(
            t('Recording — multilingual engine is ready', 'جارٍ التسجيل — المحرك متعدد اللغات جاهز'),
            'recording',
            null,
            `${state.lastEngine} • ${t('Automatic language detection', 'تحديد اللغة تلقائيًا')} • ${t('English output', 'الناتج إنجليزي')}`
          );
        }
        break;
      case 'model-fallback':
        state.lastEngine = '';
        break;
      case 'segment-start': {
        const completed = Math.max(0, Number(message.segmentIndex || 1) - 1);
        const total = Math.max(1, Number(message.segmentCount || 1));
        const percent = 72 + Math.round((completed / total) * 24);
        setStatus(
          t('Translating the clinical conversation into English…', 'جارٍ ترجمة المحادثة السريرية إلى الإنجليزية…'),
          'processing',
          percent,
          `${t('Audio section', 'مقطع صوتي')} ${message.segmentIndex || 1}/${total}${state.lastEngine ? ` • ${state.lastEngine}` : ''}`
        );
        break;
      }
      case 'transcription-progress': {
        const percent = 72 + Math.round((Number(message.percent || 0) / 100) * 24);
        setStatus(
          t('Building the English clinical transcript…', 'جارٍ إنشاء السجل السريري باللغة الإنجليزية…'),
          'processing',
          percent,
          `${message.completed || 0}/${message.total || 1} ${t('audio sections', 'مقاطع صوتية')}`
        );
        break;
      }
      case 'transcription-complete':
        if (state.requestId && message.requestId && state.requestId !== message.requestId) return;
        state.lastEngine = message.engine || state.lastEngine;
        state.lastEnglishText = String(message.text || '').trim();
        completeEnglishCapture(state.lastEnglishText, message);
        break;
      case 'worker-error':
        if (message.requestId && state.requestId && message.requestId !== state.requestId) return;
        failProcessing(message.message || t('Automatic multilingual transcription failed.', 'تعذر النسخ التلقائي متعدد اللغات.'));
        break;
      default:
        break;
    }
  }

  function splitSentences(text) {
    const normal = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normal) return [];
    const matches = normal.match(/[^.!?]+(?:[.!?]+|$)/g);
    return (matches || [normal]).map(sentence => sentence.trim()).filter(Boolean);
  }

  function uniqueSentences(sentences) {
    const seen = new Set();
    return sentences.filter(sentence => {
      const key = sentence.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function classifyEnglishTranscript(englishText) {
    const sentences = splitSentences(englishText);
    const groups = {
      allergies: [],
      medications: [],
      surgical: [],
      family: [],
      social: [],
      past: [],
      hpi: []
    };

    const patterns = {
      allergies: /\b(allerg(?:y|ies|ic)|anaphyla|nkda|no known drug allergies?|drug reaction)\b/i,
      medications: /\b(medication|medicine|tablet|capsule|inhaler|insulin|anticoagulant|takes?|taking|currently on|regularly uses?|dose|mg\b|microgram|milligram)\b/i,
      surgical: /\b(surgical history|surgery|operation|procedure|appendectom|cholecystectom|caesarean|cesarean|bypass|stent|amputation)\b/i,
      family: /\b(family history|runs in the family|mother|father|sister|brother|parent|sibling).{0,80}\b(history|disease|cancer|diabetes|hypertension|stroke|heart)\b/i,
      social: /\b(smok(?:e|es|ed|ing)|cigarette|vape|alcohol|illicit drug|recreational drug|occupation|works as|lives with|independent at baseline)\b/i,
      past: /\b(past medical history|medical history|history of|known case of|diagnosed with|diabetes|hypertension|asthma|copd|ischemic heart|heart failure|kidney disease|renal disease|liver disease|stroke|epilepsy|cancer|malignancy|thyroid disease)\b/i
    };

    sentences.forEach(sentence => {
      if (patterns.allergies.test(sentence)) groups.allergies.push(sentence);
      else if (patterns.medications.test(sentence)) groups.medications.push(sentence);
      else if (patterns.surgical.test(sentence)) groups.surgical.push(sentence);
      else if (patterns.family.test(sentence)) groups.family.push(sentence);
      else if (patterns.social.test(sentence)) groups.social.push(sentence);
      else if (patterns.past.test(sentence)) groups.past.push(sentence);
      else groups.hpi.push(sentence);
    });

    Object.keys(groups).forEach(key => { groups[key] = uniqueSentences(groups[key]); });

    const symptomPattern = /\b(pain|shortness of breath|breathless|dyspn|cough|fever|vomit|nausea|diarrh|dizziness|vertigo|weakness|numbness|headache|injur|trauma|bleeding|rash|swelling|palpitation|syncope|seizure|confusion|dysuria|urinary|abdominal|chest|back pain|sore throat|collapse)\b/i;
    const chiefComplaint = groups.hpi.find(sentence => symptomPattern.test(sentence))
      || sentences.find(sentence => symptomPattern.test(sentence))
      || groups.hpi[0]
      || sentences[0]
      || '';

    return { sentences, groups, chiefComplaint };
  }

  function sectionText(sentences) {
    return sentences && sentences.length
      ? sentences.join(' ')
      : 'Not explicitly stated in the captured speech.';
  }

  function buildEnglishClinicalRecord(englishText) {
    const cleaned = String(englishText || '').replace(/\s+/g, ' ').trim();
    const { groups, chiefComplaint } = classifyEnglishTranscript(cleaned);
    const hpi = groups.hpi.length ? groups.hpi.join(' ') : cleaned;

    return [
      'AUTOMATIC MULTILINGUAL ENGLISH CLINICAL CAPTURE',
      'Clinician review is required before this information is used for clinical decisions or documentation.',
      '',
      'CHIEF COMPLAINT',
      chiefComplaint || 'Not explicitly identified in the captured speech.',
      '',
      'HISTORY OF PRESENTING ILLNESS',
      hpi || 'Not explicitly stated in the captured speech.',
      '',
      'PAST MEDICAL HISTORY',
      sectionText(groups.past),
      '',
      'PAST SURGICAL HISTORY',
      sectionText(groups.surgical),
      '',
      'CURRENT MEDICATIONS',
      sectionText(groups.medications),
      '',
      'ALLERGIES',
      sectionText(groups.allergies),
      '',
      'FAMILY HISTORY',
      sectionText(groups.family),
      '',
      'SOCIAL HISTORY',
      sectionText(groups.social),
      '',
      'FULL ENGLISH TRANSLATION TRANSCRIPT',
      cleaned
    ].join('\n');
  }

  function waitForPresentationField(timeout = 5000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const check = () => {
        const textarea = document.getElementById('presentationText');
        if (textarea) { resolve(textarea); return; }
        if (Date.now() - start >= timeout) {
          reject(new Error(t('The clinical presentation field could not be opened.', 'تعذر فتح خانة العرض السريري.')));
          return;
        }
        window.setTimeout(check, 60);
      };
      check();
    });
  }

  async function completeEnglishCapture(englishText, details) {
    try {
      if (!englishText) throw new Error(t('No English transcript was produced.', 'لم يتم إنشاء نص باللغة الإنجليزية.'));
      setStatus(t('Organising the English clinical record…', 'جارٍ تنظيم السجل السريري باللغة الإنجليزية…'), 'processing', 98);

      if (window.__UFCopilotApp && typeof window.__UFCopilotApp.navigate === 'function') {
        try { window.__UFCopilotApp.navigate('patient'); } catch (_) { /* continue */ }
      }
      const textarea = await waitForPresentationField();
      const clinicalRecord = buildEnglishClinicalRecord(englishText);
      const existing = String(textarea.value || '').trim();
      textarea.value = existing ? `${existing}\n\n---\n\n${clinicalRecord}` : clinicalRecord;
      textarea.setAttribute('lang', 'en');
      textarea.setAttribute('dir', 'ltr');
      textarea.dataset.v105English = 'true';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));

      state.processing = false;
      state.recording = false;
      state.requestId = '';
      updateButtons();
      setStatus(
        t('English clinical transcript ready for clinician review', 'السجل السريري باللغة الإنجليزية جاهز لمراجعة الطبيب'),
        'ready',
        100,
        [details && details.engine, details && details.duration ? `${Math.round(details.duration)} ${t('seconds', 'ثانية')}` : ''].filter(Boolean).join(' • ')
      );
      notify('success', t(
        'The spoken conversation was automatically converted into English and added for clinical review.',
        'تم تحويل المحادثة المنطوقة تلقائيًا إلى الإنجليزية وإضافتها للمراجعة السريرية.'
      ), 8500);

      const form = textarea.closest('form[data-form="presentation"]');
      if (form && typeof form.requestSubmit === 'function') {
        window.setTimeout(() => {
          try { form.requestSubmit(); } catch (_) { /* clinician can press review manually */ }
        }, 120);
      }
    } catch (error) {
      failProcessing(error && error.message ? error.message : t('Unable to insert the English clinical record.', 'تعذر إدراج السجل السريري باللغة الإنجليزية.'));
    }
  }

  function interceptVoiceButton(event) {
    const target = event.target && event.target.closest ? event.target.closest('[data-action="voice-input"]') : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startRecording();
  }

  function exposeDiagnostics() {
    window.__UFCopilotAutoVoiceV105 = Object.freeze({
      version: VERSION,
      status() {
        return {
          recording: state.recording,
          processing: state.processing,
          workerReady: state.workerReady,
          engine: state.lastEngine,
          lastError: state.lastError,
          outputLanguage: 'en',
          languageSelectionVisible: false
        };
      },
      buildEnglishClinicalRecord,
      classifyEnglishTranscript,
      resampleLinear,
      start: startRecording,
      stop: stopRecording
    });
  }

  document.addEventListener('click', interceptVoiceButton, true);
  const observer = new MutationObserver(renderPanel);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderPanel, { once: true });
  else renderPanel();
  exposeDiagnostics();
})();
