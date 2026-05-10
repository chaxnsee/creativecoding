const video = document.querySelector("#camera");
const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d", { alpha: false });

const startup = document.querySelector("#startup");
const startButton = document.querySelector("#startButton");
const statusText = document.querySelector("#statusText");
const promptLabel = document.querySelector("#promptLabel");
const timerLabel = document.querySelector("#timerLabel");
const redPanel = document.querySelector("#redPanel");
const greenPanel = document.querySelector("#greenPanel");
const redState = document.querySelector("#redState");
const greenState = document.querySelector("#greenState");
const redFlash = document.querySelector("#redFlash");
const greenFlash = document.querySelector("#greenFlash");
const mirrorButton = document.querySelector("#mirrorButton");
const recordButton = document.querySelector("#recordButton");
const recordLabel = document.querySelector("#recordLabel");

const POSE = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftWrist: 15,
  rightWrist: 16,
};

const FACE = {
  leftEar: 234,
  rightEar: 454,
};

const HAND = {
  wrist: 0,
  indexTip: 8,
  middleTip: 12,
};

const state = {
  mirror: true,
  prompt: "RED RED",
  promptEndsAt: 0,
  promptDuration: 3600,
  lastVideoTime: -1,
  redLatched: false,
  greenLatched: false,
  raf: 0,
  recording: false,
  recorder: null,
  chunks: [],
  stream: null,
  lastTrackingFrame: null,
};

let poseLandmarker;
let handLandmarker;
let faceLandmarker;
let visionTasks;
let renderBox = { x: 0, y: 0, width: 1, height: 1 };

startButton.addEventListener("click", start);
mirrorButton.addEventListener("click", () => {
  state.mirror = !state.mirror;
  mirrorButton.classList.toggle("active", state.mirror);
  mirrorButton.setAttribute("aria-pressed", String(state.mirror));
});
recordButton.addEventListener("click", toggleRecording);

async function start() {
  startButton.disabled = true;

  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Camera access needs a modern secure browser window.");
    startButton.disabled = false;
    return;
  }

  setStatus("Opening camera...");

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 720 },
        height: { ideal: 1280 },
      },
    });

    video.srcObject = state.stream;
    await video.play();
    setStatus("Camera on. Loading tracking...");
    await setupModels();
    scheduleNextPrompt(true);
    startup.classList.add("hidden");
    recordButton.disabled = false;
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "Camera or model loading failed.");
    startButton.disabled = false;
  }
}

async function setupModels() {
  if (poseLandmarker && handLandmarker && faceLandmarker) return;

  if (!visionTasks) {
    visionTasks = await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs"
    );
  }

  const { FaceLandmarker, FilesetResolver, HandLandmarker, PoseLandmarker } = visionTasks;
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm",
  );

  const common = {
    runningMode: "VIDEO",
  };

  [poseLandmarker, handLandmarker, faceLandmarker] = await Promise.all([
    PoseLandmarker.createFromOptions(vision, {
      ...common,
      baseOptions: {
        delegate: "GPU",
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
      },
      minPoseDetectionConfidence: 0.48,
      minPosePresenceConfidence: 0.48,
      minTrackingConfidence: 0.48,
      numPoses: 1,
    }),
    HandLandmarker.createFromOptions(vision, {
      ...common,
      baseOptions: {
        delegate: "GPU",
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
      },
      minHandDetectionConfidence: 0.45,
      minHandPresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
      numHands: 2,
    }),
    FaceLandmarker.createFromOptions(vision, {
      ...common,
      baseOptions: {
        delegate: "GPU",
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
      },
      minFaceDetectionConfidence: 0.45,
      minTrackingConfidence: 0.45,
      numFaces: 1,
    }),
  ]);
}

function loop(now) {
  resizeCanvas();
  drawCamera();

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== state.lastVideoTime) {
    state.lastVideoTime = video.currentTime;
    const pose = poseLandmarker.detectForVideo(video, now);
    const hands = handLandmarker.detectForVideo(video, now);
    const face = faceLandmarker.detectForVideo(video, now);
    state.lastTrackingFrame = buildTrackingFrame(pose, hands, face);
    updateGestureState(state.lastTrackingFrame.red, state.lastTrackingFrame.green, now);
  }

  drawTrackingFrame(state.lastTrackingFrame);
  updatePrompt(now);
  drawCanvasHud(state.lastTrackingFrame);
  state.raf = requestAnimationFrame(loop);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawCamera() {
  ctx.fillStyle = "#111318";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!video.videoWidth || !video.videoHeight) return;

  const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;
  renderBox = { x, y, width, height };

  ctx.save();
  if (state.mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, x, y, width, height);
  ctx.restore();

  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function buildTrackingFrame(pose, hands, face) {
  const poseMarks = pose.landmarks?.[0] || [];
  const faceMarks = face.faceLandmarks?.[0] || [];
  const handMarks = hands.landmarks || [];

  const tracked = getTrackedPoints(poseMarks, faceMarks, handMarks);
  const red = evaluateRedRed(tracked);
  const green = evaluateGreenGreen(tracked);

  return { tracked, red, green, handMarks };
}

function drawTrackingFrame(frame) {
  if (!frame) return;
  drawEarZones(frame.tracked, frame.green);
  drawChestCrossGuide(frame.tracked, frame.red);
  drawSkeleton(frame.tracked);
  drawHands(frame.handMarks);
  drawLabels(frame.tracked);
}

function getTrackedPoints(poseMarks, faceMarks, handMarks) {
  const leftHand = bestHandPoint("Left", handMarks);
  const rightHand = bestHandPoint("Right", handMarks);

  const leftWrist = pointFromLandmark(poseMarks[POSE.leftWrist]);
  const rightWrist = pointFromLandmark(poseMarks[POSE.rightWrist]);
  const leftShoulder = pointFromLandmark(poseMarks[POSE.leftShoulder]);
  const rightShoulder = pointFromLandmark(poseMarks[POSE.rightShoulder]);
  const leftEar = pointFromLandmark(faceMarks[FACE.leftEar]);
  const rightEar = pointFromLandmark(faceMarks[FACE.rightEar]);

  return {
    head: midpoint(leftEar, rightEar),
    leftEar,
    rightEar,
    leftEarZone: makeEarZone(leftEar, leftShoulder, state.mirror ? -1 : 1),
    rightEarZone: makeEarZone(rightEar, rightShoulder, state.mirror ? 1 : -1),
    leftShoulder,
    rightShoulder,
    leftWrist,
    rightWrist,
    leftHand: leftHand || leftWrist,
    rightHand: rightHand || rightWrist,
  };
}

function pointFromLandmark(landmark) {
  if (!landmark) return null;
  const x = renderBox.x + landmark.x * renderBox.width;
  const y = renderBox.y + landmark.y * renderBox.height;

  return {
    x: state.mirror ? canvas.width - x : x,
    y,
    z: landmark.z || 0,
    visibility: landmark.visibility ?? landmark.presence ?? 1,
  };
}

function bestHandPoint(handednessLabel, handMarks) {
  for (const marks of handMarks) {
    const wrist = marks[HAND.wrist];
    const indexTip = marks[HAND.indexTip];
    const middleTip = marks[HAND.middleTip];
    if (!wrist || !indexTip || !middleTip) continue;

    const pWrist = pointFromLandmark(wrist);
    const pIndex = pointFromLandmark(indexTip);
    const pMiddle = pointFromLandmark(middleTip);
    const handPoint = midpoint(pIndex, pMiddle) || pWrist;

    if (handednessLabel === "Left" && pWrist && pWrist.x < canvas.width / 2) {
      return handPoint;
    }
    if (handednessLabel === "Right" && pWrist && pWrist.x >= canvas.width / 2) {
      return handPoint;
    }
  }

  return null;
}

function makeEarZone(ear, shoulder, side) {
  if (!ear) return null;
  const shoulderGap = shoulder ? Math.abs(ear.x - shoulder.x) : canvas.width * 0.12;
  const offset = clamp(shoulderGap * 0.38, canvas.width * 0.04, canvas.width * 0.09);
  const x = ear.x + side * offset;
  const halfWidth = clamp(canvas.width * 0.045, 22, 42);
  const top = ear.y - canvas.height * 0.18;
  const bottom = ear.y + canvas.height * 0.25;

  return { x, top, bottom, halfWidth };
}

function evaluateRedRed(tracked) {
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = tracked;
  if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return false;

  const shoulderCenter = midpoint(leftShoulder, rightShoulder);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  const chestTop = shoulderCenter.y - canvas.height * 0.02;
  const chestBottom = shoulderCenter.y + shoulderWidth * 0.9;
  const wristsNearChest =
    inRange(leftWrist.y, chestTop, chestBottom) && inRange(rightWrist.y, chestTop, chestBottom);
  const crossed = state.mirror
    ? leftWrist.x > shoulderCenter.x + shoulderWidth * 0.08 &&
      rightWrist.x < shoulderCenter.x - shoulderWidth * 0.08
    : leftWrist.x < shoulderCenter.x - shoulderWidth * 0.08 &&
      rightWrist.x > shoulderCenter.x + shoulderWidth * 0.08;

  return wristsNearChest && crossed && Math.abs(leftWrist.y - rightWrist.y) < shoulderWidth * 0.8;
}

function evaluateGreenGreen(tracked) {
  const { leftHand, rightHand, leftEarZone, rightEarZone } = tracked;
  if (!leftHand || !rightHand || !leftEarZone || !rightEarZone) return false;
  return pointInZone(leftHand, leftEarZone) && pointInZone(rightHand, rightEarZone);
}

function pointInZone(point, zone) {
  return (
    Math.abs(point.x - zone.x) <= zone.halfWidth &&
    point.y >= zone.top &&
    point.y <= zone.bottom
  );
}

function updateGestureState(red, green, now) {
  redState.textContent = red ? "match" : "waiting";
  redState.classList.toggle("ready", red);
  greenState.textContent = green ? "match" : "waiting";
  greenState.classList.toggle("ready", green);

  if (state.prompt === "RED RED" && red && !state.redLatched) {
    state.redLatched = true;
    triggerFlash(redFlash);
    scheduleNextPrompt();
  }
  if (state.prompt === "GREEN GREEN" && green && !state.greenLatched) {
    state.greenLatched = true;
    triggerFlash(greenFlash);
    scheduleNextPrompt();
  }

  if (!red) state.redLatched = false;
  if (!green) state.greenLatched = false;

  const idleReset = now > state.promptEndsAt;
  if (idleReset) scheduleNextPrompt();
}

function updatePrompt(now) {
  const remaining = Math.max(0, state.promptEndsAt - now) / 1000;
  timerLabel.textContent = remaining.toFixed(1);
  promptLabel.textContent = state.prompt;
  redPanel.classList.toggle("active", state.prompt === "RED RED");
  greenPanel.classList.toggle("active", state.prompt === "GREEN GREEN");
}

function scheduleNextPrompt(first = false) {
  const nextPrompt = Math.random() > 0.5 ? "RED RED" : "GREEN GREEN";
  state.prompt = first || nextPrompt !== state.prompt
    ? nextPrompt
    : state.prompt === "RED RED"
      ? "GREEN GREEN"
      : "RED RED";
  state.promptDuration = 2800 + Math.random() * 2600;
  state.promptEndsAt = performance.now() + state.promptDuration;
}

function drawEarZones(tracked, green) {
  const zones = [
    [tracked.leftEarZone, "#23d67d", tracked.leftHand],
    [tracked.rightEarZone, "#23d67d", tracked.rightHand],
  ];

  for (const [zone, color, hand] of zones) {
    if (!zone) continue;
    const hit = hand && pointInZone(hand, zone);
    ctx.save();
    ctx.strokeStyle = hit ? color : "rgba(246, 247, 244, 0.48)";
    ctx.lineWidth = hit ? 5 : 2;
    ctx.setLineDash(hit ? [] : [12, 13]);
    ctx.beginPath();
    ctx.moveTo(zone.x, zone.top);
    ctx.lineTo(zone.x, zone.bottom);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = hit ? "rgba(35, 214, 125, 0.24)" : "rgba(246, 247, 244, 0.09)";
    roundedRect(zone.x - zone.halfWidth, zone.top, zone.halfWidth * 2, zone.bottom - zone.top, 10);
    ctx.fill();
  }

  if (green) {
    ctx.strokeStyle = "rgba(35, 214, 125, 0.8)";
    ctx.lineWidth = 3;
    ctx.strokeRect(canvas.width * 0.1, canvas.height * 0.52, canvas.width * 0.8, canvas.height * 0.34);
  }
}

function drawChestCrossGuide(tracked, red) {
  const { leftShoulder, rightShoulder } = tracked;
  if (!leftShoulder || !rightShoulder) return;

  const center = midpoint(leftShoulder, rightShoulder);
  const width = Math.abs(leftShoulder.x - rightShoulder.x) * 0.72;
  const top = center.y + width * 0.18;
  const bottom = top + width * 0.68;

  ctx.save();
  ctx.strokeStyle = red ? "rgba(255, 44, 67, 0.94)" : "rgba(255, 255, 255, 0.24)";
  ctx.lineWidth = red ? 7 : 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(center.x - width / 2, top);
  ctx.lineTo(center.x + width / 2, bottom);
  ctx.moveTo(center.x + width / 2, top);
  ctx.lineTo(center.x - width / 2, bottom);
  ctx.stroke();
  ctx.restore();
}

function drawSkeleton(tracked) {
  drawLine(tracked.leftShoulder, tracked.rightShoulder, "rgba(255,255,255,0.56)", 3);
  drawLine(tracked.leftShoulder, tracked.leftWrist, "rgba(255,255,255,0.36)", 3);
  drawLine(tracked.rightShoulder, tracked.rightWrist, "rgba(255,255,255,0.36)", 3);
  drawLine(tracked.leftWrist, tracked.rightWrist, "rgba(255,255,255,0.2)", 2);

  dot(tracked.head, 9, "#ffffff", "HEAD");
  dot(tracked.leftEar, 7, "#23d67d", "EAR");
  dot(tracked.rightEar, 7, "#23d67d", "EAR");
  dot(tracked.leftShoulder, 8, "#ffce5a", "SHOULDER");
  dot(tracked.rightShoulder, 8, "#ffce5a", "SHOULDER");
  dot(tracked.leftWrist, 10, "#ff2c43", "L WRIST");
  dot(tracked.rightWrist, 10, "#ff2c43", "R WRIST");
  dot(tracked.leftHand, 8, "#23d67d", "L HAND");
  dot(tracked.rightHand, 8, "#23d67d", "R HAND");
}

function drawHands(handMarks) {
  for (const marks of handMarks) {
    const points = marks.map(pointFromLandmark);
    for (const i of [HAND.wrist, HAND.indexTip, HAND.middleTip]) {
      dot(points[i], 5, "#23d67d");
    }
  }
}

function drawLabels(tracked) {
  const items = [
    [tracked.leftEarZone, "ear line"],
    [tracked.rightEarZone, "ear line"],
  ];

  ctx.save();
  ctx.font = `${Math.max(22, canvas.width * 0.026)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(246, 247, 244, 0.72)";
  for (const [zone, label] of items) {
    if (zone) ctx.fillText(label, zone.x, zone.top - 10);
  }
  ctx.restore();
}

function drawCanvasHud(frame) {
  const w = canvas.width;
  const h = canvas.height;
  const isRed = state.prompt === "RED RED";
  const red = frame?.red || false;
  const green = frame?.green || false;
  const tracked = frame?.tracked || null;
  const topBar = h * 0.1;
  const bottomBar = h * 0.1;
  const splitTop = topBar;
  const splitHeight = (h - topBar - bottomBar) / 2;

  ctx.save();
  ctx.fillStyle = "rgba(5, 5, 7, 0.38)";
  ctx.fillRect(0, 0, w, topBar);
  ctx.fillStyle = isRed ? "rgba(229, 21, 46, 0.22)" : "rgba(229, 21, 46, 0.1)";
  ctx.fillRect(0, splitTop, w, splitHeight);
  ctx.fillStyle = !isRed ? "rgba(22, 205, 116, 0.2)" : "rgba(22, 205, 116, 0.09)";
  ctx.fillRect(0, splitTop + splitHeight, w, splitHeight);

  if (red || green) {
    ctx.fillStyle = red ? "rgba(229, 21, 46, 0.18)" : "rgba(22, 205, 116, 0.16)";
    ctx.fillRect(0, 0, w, h);
  }

  const fontBase = Math.max(24, w * 0.038);
  ctx.fillStyle = "rgba(246, 247, 244, 0.94)";
  ctx.font = `900 ${fontBase * 1.6}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(state.prompt, w * 0.04, h * 0.025);

  ctx.font = `800 ${fontBase}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(timerLabel.textContent, w * 0.96, h * 0.038);

  ctx.textAlign = "left";
  ctx.font = `900 ${fontBase}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(246, 247, 244, 0.82)";
  ctx.fillText("RED RED", w * 0.04, splitTop + splitHeight - fontBase * 2.2);
  ctx.fillText("GREEN GREEN", w * 0.04, splitTop + splitHeight * 2 - fontBase * 2.2);

  ctx.font = `700 ${fontBase * 0.56}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(246, 247, 244, 0.62)";
  ctx.fillText("X wrists at chest", w * 0.04, splitTop + splitHeight - fontBase * 1.08);
  ctx.fillText("hands on ear lines", w * 0.04, splitTop + splitHeight * 2 - fontBase * 1.08);

  if (tracked?.head) {
    ctx.textAlign = "center";
    ctx.font = `800 ${fontBase * 0.52}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(246, 247, 244, 0.7)";
    ctx.fillText("head tracking", tracked.head.x, tracked.head.y - fontBase * 1.2);
  }
  ctx.restore();
}

function dot(point, radius, color, label = "") {
  if (!point) return;
  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (label) {
    ctx.font = `${Math.max(18, canvas.width * 0.022)}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(246, 247, 244, 0.88)";
    ctx.fillText(label, point.x + radius + 6, point.y);
  }
  ctx.restore();
}

function drawLine(a, b, color, width) {
  if (!a || !b) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function midpoint(a, b) {
  if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function inRange(value, min, max) {
  return value >= min && value <= max;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function triggerFlash(element) {
  element.classList.remove("on");
  void element.offsetWidth;
  element.classList.add("on");
}

async function toggleRecording() {
  if (!video.srcObject || !canvas.captureStream || typeof MediaRecorder === "undefined") return;

  if (state.recording) {
    state.recorder?.stop();
    return;
  }

  const captureStream = canvas.captureStream(60);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  state.chunks = [];
  state.recorder = new MediaRecorder(captureStream, { mimeType });
  state.recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size) state.chunks.push(event.data);
  });
  state.recorder.addEventListener("stop", saveRecording);
  state.recorder.start();
  state.recording = true;
  recordButton.classList.add("recording");
  recordLabel.textContent = "Stop";
}

function saveRecording() {
  const blob = new Blob(state.chunks, { type: state.recorder.mimeType || "video/webm" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `red-green-tracking-${Date.now()}.webm`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  state.recording = false;
  state.recorder = null;
  recordButton.classList.remove("recording");
  recordLabel.textContent = "Record";
}

function setStatus(message) {
  statusText.textContent = message;
}
