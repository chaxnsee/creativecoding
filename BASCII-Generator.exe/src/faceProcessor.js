export class FaceProcessor {
  constructor({ status }) {
    this.status = status;
    this.mesh = null;
    this.hands = null;
    this.ready = false;
    this.facePending = false;
    this.handPending = false;
    this.lastResult = null;
    this.lastHandResults = [];
    this.smoothedLandmarks = null;
    this.smoothedHands = [];
    this.lastProcess = 0;
  }

  async init() {
    if (this.ready) return;
    if (window.FaceMesh) {
      this.mesh = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      this.mesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55
      });

      this.mesh.onResults((results) => {
        this.facePending = false;
        const landmarks = results.multiFaceLandmarks?.[0] || null;
        this.lastResult = landmarks ? this.analyze(landmarks) : null;
      });
    }

    if (window.Hands) {
      this.hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55
      });

      this.hands.onResults((results) => {
        this.handPending = false;
        const hands = results.multiHandLandmarks || [];
        this.lastHandResults = hands.map((landmarks) => this.analyzeHand(landmarks));
      });
    }

    if (!this.mesh && !this.hands) {
      this.status.textContent = "MediaPipe tracking could not load. Brightness rendering still works.";
    }

    this.ready = true;
  }

  async process(source, smoothing) {
    if ((!this.mesh && !this.hands) || !source) return this.lastResult;
    const now = performance.now();
    if (now - this.lastProcess < 48) return this.lastResult;
    this.lastProcess = now;
    const jobs = [];

    try {
      if (this.mesh && !this.facePending) {
        this.facePending = true;
        jobs.push(this.mesh.send({ image: source }).then(() => {
          if (this.lastResult && smoothing > 0) {
            this.lastResult.landmarks = this.smooth(this.lastResult.landmarks, smoothing);
          }
        }));
      }

      if (this.hands && !this.handPending) {
        this.handPending = true;
        jobs.push(this.hands.send({ image: source }).then(() => {
          if (this.lastHandResults.length && smoothing > 0) {
            this.lastHandResults = this.smoothHands(this.lastHandResults, smoothing);
          }
        }));
      }

      await Promise.all(jobs);
    } catch (error) {
      this.facePending = false;
      this.handPending = false;
      this.status.textContent = "Tracking paused; brightness rendering continues.";
    }
    return this.lastResult;
  }

  smooth(landmarks, smoothing) {
    if (!this.smoothedLandmarks || this.smoothedLandmarks.length !== landmarks.length) {
      this.smoothedLandmarks = landmarks.map((point) => ({ ...point }));
      return this.smoothedLandmarks;
    }

    const fresh = 1 - smoothing;
    for (let i = 0; i < landmarks.length; i += 1) {
      this.smoothedLandmarks[i].x = this.smoothedLandmarks[i].x * smoothing + landmarks[i].x * fresh;
      this.smoothedLandmarks[i].y = this.smoothedLandmarks[i].y * smoothing + landmarks[i].y * fresh;
      this.smoothedLandmarks[i].z = this.smoothedLandmarks[i].z * smoothing + landmarks[i].z * fresh;
    }
    return this.smoothedLandmarks;
  }

  smoothHands(hands, smoothing) {
    if (!this.smoothedHands.length || this.smoothedHands.length !== hands.length) {
      this.smoothedHands = hands.map((hand) => ({
        ...hand,
        landmarks: hand.landmarks.map((point) => ({ ...point }))
      }));
      return this.smoothedHands;
    }

    const fresh = 1 - smoothing;
    for (let h = 0; h < hands.length; h += 1) {
      const hand = hands[h];
      const smoothHand = this.smoothedHands[h];
      smoothHand.bounds = hand.bounds;
      for (let i = 0; i < hand.landmarks.length; i += 1) {
        smoothHand.landmarks[i].x = smoothHand.landmarks[i].x * smoothing + hand.landmarks[i].x * fresh;
        smoothHand.landmarks[i].y = smoothHand.landmarks[i].y * smoothing + hand.landmarks[i].y * fresh;
        smoothHand.landmarks[i].z = smoothHand.landmarks[i].z * smoothing + hand.landmarks[i].z * fresh;
      }
    }
    return this.smoothedHands;
  }

  analyze(landmarks) {
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const point of landmarks) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }

    const eyeLeft = Math.abs(landmarks[159]?.y - landmarks[145]?.y) || 0;
    const eyeRight = Math.abs(landmarks[386]?.y - landmarks[374]?.y) || 0;
    const mouth = Math.abs(landmarks[13]?.y - landmarks[14]?.y) || 0;
    const blink = clamp(1 - (eyeLeft + eyeRight) * 42, 0, 1);
    const mouthOpen = clamp(mouth * 28, 0, 1);

    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5;

    return {
      landmarks,
      bounds: { minX, minY, maxX, maxY, minZ, maxZ, centerX, centerY },
      expression: clamp(blink * 0.6 + mouthOpen * 0.5, 0, 1)
    };
  }

  analyzeHand(landmarks) {
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const point of landmarks) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }

    return {
      landmarks,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
        minZ,
        maxZ,
        centerX: (minX + maxX) * 0.5,
        centerY: (minY + maxY) * 0.5
      }
    };
  }

  depthAt(nx, ny, mirrored = false) {
    const result = this.lastResult;
    if (!result?.landmarks) return 0;
    const x = mirrored ? 1 - nx : nx;
    const y = ny;

    let depth = depthFromField(result.landmarks, x, y, result.bounds, {
      falloff: 4.15,
      boost: 1.48,
      stride: 3,
      indices: FACE_PRIORITY_DEPTH_INDICES
    });

    for (const hand of this.lastHandResults) {
      const handDepth = this.handDepthAt(x, y, hand);
      depth = Math.max(depth, handDepth);
    }

    return clamp(depth, 0, 1);
  }

  handDepthAt(x, y, hand) {
    if (!hand?.landmarks) return 0;

    return depthFromField(hand.landmarks, x, y, hand.bounds, {
      falloff: 5.4,
      boost: 1.28,
      stride: 1,
      indices: HAND_PRIORITY_DEPTH_INDICES
    });
  }
}

function depthFromField(landmarks, x, y, bounds, options) {
  const { falloff, boost, stride, indices } = options;
  let weightedDepth = 0;
  let totalWeight = 0;
  let nearest = Infinity;
  let nearestDepth = 0;

  for (let i = 0; i < landmarks.length; i += stride) {
    const point = landmarks[i];
    if (!point) continue;
    const dx = point.x - x;
    const dy = point.y - y;
    const distance = dx * dx + dy * dy;
    const influence = Math.max(0, 1 - Math.sqrt(distance) * falloff);
    if (influence <= 0) continue;
    const depth = normalizedDepth(point.z, bounds);
    const weight = influence * influence * (1 + depth * 0.5);
    weightedDepth += depth * weight;
    totalWeight += weight;
    if (distance < nearest) {
      nearest = distance;
      nearestDepth = depth;
    }
  }

  for (const index of indices) {
    const point = landmarks[index];
    if (!point) continue;
    const dx = point.x - x;
    const dy = point.y - y;
    const distance = dx * dx + dy * dy;
    const influence = Math.max(0, 1 - Math.sqrt(distance) * falloff * 0.72);
    if (influence <= 0) continue;
    const depth = normalizedDepth(point.z, bounds);
    const weight = influence * influence * 1.85;
    weightedDepth += depth * weight;
    totalWeight += weight;
    if (distance < nearest) {
      nearest = distance;
      nearestDepth = depth;
    }
  }

  if (totalWeight <= 0) return 0;
  const smoothDepth = weightedDepth / totalWeight;
  const localInfluence = Math.max(0, 1 - Math.sqrt(nearest) * falloff * 0.58);
  return clamp((smoothDepth * 0.76 + nearestDepth * 0.24) * localInfluence * boost, 0, 1);
}

function normalizedDepth(z, bounds) {
  const range = Math.max(0.0001, bounds.maxZ - bounds.minZ);
  return Math.pow(1 - (z - bounds.minZ) / range, 0.64);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const FACE_PRIORITY_DEPTH_INDICES = [
  1, 4, 5, 6, 10, 13, 14, 33, 61, 78, 93, 133, 145, 152, 159, 199, 234, 263, 291, 308, 323, 362, 374, 386, 454
];

const HAND_PRIORITY_DEPTH_INDICES = [
  0, 1, 2, 4, 5, 8, 9, 12, 13, 16, 17, 20
];
