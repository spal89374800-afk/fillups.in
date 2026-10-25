/**
 * Eye-Blink Liveness (MediaPipe Face Landmarker)
 *
 * Ye service customer ke phone par camera chalte waqt Eye Aspect Ratio (EAR)
 * calculate karti hai. Jab customer ek baar palak jhapkata hai (aankh band
 * hokar khulti hai), liveness "verified" ho jaati hai.
 *
 * MediaPipe CDN se load hoti hai (browser me). Agar offline/network fail ho to
 * `onStatus('engine-unavailable')` call hota hai aur app chalta rehta hai.
 *
 * Note: `import(variable)` use kiya gaya hai taaki TypeScript CDN module ko
 * resolve na kare (runtime pe browser CDN se load karta hai).
 */

export type BlinkStatus = 'loading' | 'watching' | 'closed' | 'verified' | 'engine-unavailable';

export interface BlinkEngine {
  /** Camera stream chalu hone ke baad call karein. */
  start(video: HTMLVideoElement): Promise<void>;
  /** Camera band/retake par call karein. */
  stop(): void;
  /** Blink already verify ho chuka hai to true. */
  readonly verified: boolean;
}

const EAR_OPEN_MIN = 0.2;
const EAR_CLOSED_MAX = 0.15;
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const VISION_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

function dist(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

type Landmark = { x: number; y: number; z?: number };

function eyeAspectRatio(landmarks: Landmark[], indices: number[]): number {
  const [p1, p2, p3, p4, p5, p6] = indices.map((i) => landmarks[i]);
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;
  const num = dist(p2, p6) + dist(p3, p5);
  const den = 2 * dist(p1, p4);
  return den === 0 ? 0 : num / den;
}

export function createBlinkLivenessEngine(
  onStatus: (status: BlinkStatus, message: string) => void
): BlinkEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let faceLandmarker: any = null;
  let rafId: number | null = null;
  let eyeWasOpen = true;
  let lastEyeClosedAt = 0;
  let verified = false;

  async function init(): Promise<boolean> {
    try {
      const vision = await import(/* @vite-ignore */ (VISION_CDN as string));
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
      faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1
      });
      return true;
    } catch (error) {
      console.warn('[blinkLiveness] engine load failed:', error);
      onStatus('engine-unavailable', 'Blink detection could not load (offline).');
      return false;
    }
  }

  function tick(video: HTMLVideoElement) {
    rafId = requestAnimationFrame(() => tick(video));
    if (!faceLandmarker || verified) return;
    if (!video.videoWidth) return;

    let result: { faceLandmarks?: Landmark[][] };
    try {
      result = faceLandmarker.detectForVideo(video, performance.now());
    } catch {
      return;
    }
    const face = result?.faceLandmarks?.[0];
    if (!face) return;

    const ear = (eyeAspectRatio(face, LEFT_EYE) + eyeAspectRatio(face, RIGHT_EYE)) / 2;

    if (ear > EAR_OPEN_MIN) {
      if (!eyeWasOpen && performance.now() - lastEyeClosedAt < 1200) {
        verified = true;
        onStatus('verified', 'Blink verified');
        return; // loop band (verified)
      }
      eyeWasOpen = true;
      onStatus('watching', 'Blink your eyes');
    } else if (ear < EAR_CLOSED_MAX) {
      if (eyeWasOpen) lastEyeClosedAt = performance.now();
      eyeWasOpen = false;
      onStatus('closed', 'Eyes closed — open them');
    }
  }

  return {
    get verified() {
      return verified;
    },
    async start(video) {
      const ok = await init();
      if (!ok) return;
      if (rafId) cancelAnimationFrame(rafId);
      onStatus('loading', 'Starting blink check…');
      tick(video);
    },
    stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      faceLandmarker = null;
    }
  };
}
