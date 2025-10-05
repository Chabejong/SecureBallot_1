interface FingerprintComponents {
  userAgent: string;
  language: string;
  languages: string[];
  screenResolution: string;
  availableScreenResolution: string;
  colorDepth: number;
  pixelRatio: number;
  timezone: number;
  timezoneString: string;
  sessionStorage: boolean;
  localStorage: boolean;
  indexedDB: boolean;
  cpuCores: number;
  platform: string;
  plugins: string[];
  canvas: string;
  webgl: string;
  audioContext: string;
  touchSupport: boolean;
  fonts: string[];
}

async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    canvas.width = 280;
    canvas.height = 60;

    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Canvas Fingerprint 🎨', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas Fingerprint 🎨', 4, 17);

    return canvas.toDataURL();
  } catch (e) {
    return 'canvas-error';
  }
}

async function getWebGLFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';

    const glContext = gl as WebGLRenderingContext;
    const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return `${vendor}~${renderer}`;
    }

    return glContext.getParameter(glContext.VERSION) || 'webgl-available';
  } catch (e) {
    return 'webgl-error';
  }
}

async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return 'no-audio';

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const analyser = context.createAnalyser();
    const gainNode = context.createGain();
    const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

    gainNode.gain.value = 0;
    oscillator.type = 'triangle';
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(0);
    
    return new Promise<string>((resolve) => {
      scriptProcessor.onaudioprocess = function(event: any) {
        const output: Float32Array = event.outputBuffer.getChannelData(0);
        const hash = Array.from(output.slice(0, 30) as Float32Array)
          .map((v: number) => Math.abs(v).toFixed(10))
          .join('');
        
        oscillator.stop();
        scriptProcessor.disconnect();
        gainNode.disconnect();
        analyser.disconnect();
        oscillator.disconnect();
        context.close();
        
        resolve(hash.substring(0, 50));
      };
    });
  } catch (e) {
    return 'audio-error';
  }
}

function getPlugins(): string[] {
  try {
    if (!navigator.plugins) return [];
    return Array.from(navigator.plugins).map(p => `${p.name}:${p.filename}`).slice(0, 10);
  } catch (e) {
    return [];
  }
}

function getFonts(): string[] {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana',
    'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Palatino', 'Garamond',
    'Bookman', 'Courier', 'Helvetica', 'Monaco', 'Tahoma'
  ];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const baseFontWidths: { [key: string]: number } = {};
  baseFonts.forEach(baseFont => {
    ctx.font = `72px ${baseFont}`;
    baseFontWidths[baseFont] = ctx.measureText('mmmmmmmmmmlli').width;
  });

  const detectedFonts: string[] = [];
  testFonts.forEach(testFont => {
    baseFonts.forEach(baseFont => {
      ctx.font = `72px "${testFont}", ${baseFont}`;
      const width = ctx.measureText('mmmmmmmmmmlli').width;
      if (width !== baseFontWidths[baseFont]) {
        if (!detectedFonts.includes(testFont)) {
          detectedFonts.push(testFont);
        }
      }
    });
  });

  return detectedFonts;
}

function getTouchSupport(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

async function collectFingerprintComponents(): Promise<FingerprintComponents> {
  const canvas = await getCanvasFingerprint();
  const webgl = await getWebGLFingerprint();
  const audio = await getAudioFingerprint();

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
    screenResolution: `${screen.width}x${screen.height}`,
    availableScreenResolution: `${screen.availWidth}x${screen.availHeight}`,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    timezone: new Date().getTimezoneOffset(),
    timezoneString: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sessionStorage: !!window.sessionStorage,
    localStorage: !!window.localStorage,
    indexedDB: !!window.indexedDB,
    cpuCores: navigator.hardwareConcurrency || 0,
    platform: navigator.platform,
    plugins: getPlugins(),
    canvas,
    webgl,
    audioContext: audio,
    touchSupport: getTouchSupport(),
    fonts: getFonts(),
  };
}

async function hashString(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback to simple hash
    }
  }

  // Fallback: Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function generateEnhancedFingerprint(): Promise<string> {
  const components = await collectFingerprintComponents();
  const fingerprintString = JSON.stringify(components);
  return await hashString(fingerprintString);
}

export async function getFingerprintComponents(): Promise<FingerprintComponents> {
  return await collectFingerprintComponents();
}

export function getSimpleFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 'unknown',
  ].join('|');
  
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
