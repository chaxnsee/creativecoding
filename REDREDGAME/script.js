const screens = {
    start: document.getElementById("start-screen"),
    result: document.getElementById("result-screen")
};
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output-canvas");
const canvasCtx = canvasElement.getContext("2d");

const recordBtn = document.getElementById("record-btn");
const gameUiOverlay = document.getElementById("game-ui-overlay");
const replayVideo = document.getElementById("replay-video");
const replayContainer = document.getElementById("recorded-video-container");

let poseLandmarker;
let handLandmarker;
let faceLandmarker;

let webcamRunning = false;
let lastVideoTime = -1;
let score = 0;
let combo = 0;
let maxCombo = 0;
let commandsLeft = 20;
let currentCommand = null;
let commandActive = false;
let timeRemainingForCommand = 0;
let commandStartTime = 0;
let commandDuration = 0;

let currentFeedback = "";
let feedbackColor = "";
let feedbackTimer = 0;
let globalFlashColor = "";
let globalFlashTimer = 0;

let mediaRecorder;
let recordedChunks = [];
let recordingStream = null;
let trackerReady = false;
let trackerLoading = false;
let trackerPromise = null;
let trackingLoopRunning = false;
let PoseLandmarker;
let HandLandmarker;
let FaceLandmarker;
let FilesetResolver;

const BODY_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,7],
    [0,4],[4,5],[5,6],[6,8],
    [9,10],
    [11,12],
    [11,13],[13,15],[15,17],[15,19],[15,21],[17,19],
    [12,14],[14,16],[16,18],[16,20],[16,22],[18,20],
    [11,23],[12,24],[23,24],
    [23,25],[25,27],[27,29],[29,31],[31,27],
    [24,26],[26,28],[28,30],[30,32],[32,28]
];

const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
];

const HAND_COLOR_GROUPS = [
    { color: "#ff2d55", connections: [[0,1],[1,2],[2,3],[3,4]] },
    { color: "#ffd60a", connections: [[0,5],[5,6],[6,7],[7,8]] },
    { color: "#0a84ff", connections: [[0,9],[9,10],[10,11],[11,12]] },
    { color: "#30d158", connections: [[0,13],[13,14],[14,15],[15,16]] },
    { color: "#bf5af2", connections: [[0,17],[17,18],[18,19],[19,20]] },
    { color: "#ff9f0a", connections: [[5,9],[9,13],[13,17],[17,0],[0,5]] }
];

const commands = [
    { id: "RED", text: "RED RED", color: "#ff3333", duration: 2500 },
    { id: "GREEN", text: "GREEN GREEN", color: "#33ff33", duration: 2500 }
];

async function initTracker() {
    if (trackerReady) return trackerPromise;
    if (trackerLoading) return trackerPromise;

    trackerLoading = true;
    trackerPromise = (async () => {
        const visionTasks = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm");
        PoseLandmarker = visionTasks.PoseLandmarker;
        HandLandmarker = visionTasks.HandLandmarker;
        FaceLandmarker = visionTasks.FaceLandmarker;
        FilesetResolver = visionTasks.FilesetResolver;

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        [poseLandmarker, handLandmarker, faceLandmarker] = await Promise.all([
            PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numPoses: 1
            }),
            HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 2
            }),
            FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numFaces: 1
            })
        ]);

        trackerReady = true;
        startBtn.innerText = "START CAMERA";
        startBtn.disabled = false;
    })();

    try {
        await trackerPromise;
    } catch(err) {
        console.error("Error loading MediaPipe", err);
        startBtn.innerText = "START CAMERA";
        trackerPromise = null;
    } finally {
        trackerLoading = false;
    }

    return trackerPromise;
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", () => {
    switchScreen("start");
    replayContainer.style.display = "none";
});

function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    if(screenName !== "game") {
        screens[screenName].classList.add("active");
        gameUiOverlay.style.display = "none";
    } else {
        gameUiOverlay.style.display = "block";
    }
}

async function startGame() {
    switchScreen("game");
    
    score = 0;
    combo = 0;
    maxCombo = 0;
    commandsLeft = 20;
    currentCommand = null;
    commandActive = false;
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    if (!webcamRunning) {
        try {
            const constraints = { video: { facingMode: "user" }, audio: false };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            webcamRunning = true;
            await video.play();
            recordingStream = canvasElement.captureStream(30);
        } catch(err) {
            console.error("Camera access denied", err);
            alert("Camera access is required for this game.");
            switchScreen("start");
            return;
        }
    }

    if (!trackerReady) {
        await initTracker();
    }

    if (!poseLandmarker || !handLandmarker || !faceLandmarker) {
        alert("Tracking could not load. Check internet connection for MediaPipe.");
        switchScreen("start");
        return;
    }

    if (!trackingLoopRunning) {
        predictWebcam();
    }
    
    setTimeout(nextCommand, 2000);
}

function resizeCanvas() {
    const app = document.getElementById("app");
    canvasElement.width = app.clientWidth;
    canvasElement.height = app.clientHeight;
}

function nextCommand() {
    if(!webcamRunning) return;
    
    if(commandsLeft <= 0) {
        endGame();
        return;
    }
    commandsLeft--;
    
    const difficultyMultiplier = Math.max(0.5, 1 - ((20 - commandsLeft) * 0.02));
    const cmd = commands[Math.floor(Math.random() * commands.length)];
    currentCommand = cmd;
    commandActive = true;
    
    commandDuration = cmd.duration * difficultyMultiplier;
    commandStartTime = performance.now();
}

function handleSuccess() {
    commandActive = false;
    score += 100 + (combo * 10);
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    showFeedback("PERFECT", currentCommand.color);
    triggerFlash(currentCommand.color);
    setTimeout(nextCommand, 800);
}

function handleMiss() {
    commandActive = false;
    combo = 0;
    showFeedback("MISS", "#888888");
    triggerFlash("rgba(136, 136, 136, 0.3)");
    setTimeout(nextCommand, 1000);
}

function showFeedback(text, color) {
    currentFeedback = text;
    feedbackColor = color;
    feedbackTimer = performance.now();
}

function triggerFlash(color) {
    globalFlashColor = color;
    globalFlashTimer = performance.now();
}

let currentLandmarks = null;
let currentHands = [];
let currentFace = null;

function predictWebcam() {
    trackingLoopRunning = true;
    const now = performance.now();
    
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Top Half Background
    canvasCtx.fillStyle = "#1a1a1a";
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height / 2);
    
    // Bottom Half Video
    if (video.readyState >= 2) {
        canvasCtx.save();
        canvasCtx.translate(0, canvasElement.height / 2);
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
        canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height / 2);
        canvasCtx.restore();
    }
    
    if (lastVideoTime !== video.currentTime && video.readyState >= 2) {
        lastVideoTime = video.currentTime;
        
        const poseResult = poseLandmarker.detectForVideo(video, now);
        const handResult = handLandmarker.detectForVideo(video, now);
        const faceResult = faceLandmarker.detectForVideo(video, now);
        
        currentLandmarks = (poseResult.landmarks && poseResult.landmarks.length > 0) ? poseResult.landmarks[0] : null;
        currentHands = handResult.landmarks || [];
        currentFace = (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) ? faceResult.faceLandmarks[0] : null;
    }

    drawTrackingOverlay(currentLandmarks, currentHands, currentFace);

    if (currentLandmarks) {
        if(commandActive && currentCommand) {
            checkGesture(currentLandmarks);
        }
    }
    
    if (commandActive && currentCommand) {
        let elapsed = now - commandStartTime;
        if (elapsed > commandDuration) {
            handleMiss();
        } else {
            timeRemainingForCommand = 1 - (elapsed / commandDuration);
        }
    }

    drawGameUI(now);
    
    if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
    } else {
        trackingLoopRunning = false;
    }
}

function drawGameUI(now) {
    canvasCtx.textAlign = "center";
    canvasCtx.textBaseline = "middle";

    canvasCtx.font = "bold 24px sans-serif";
    canvasCtx.fillStyle = "#ffffff";
    canvasCtx.fillText(`SCORE: ${score}`, canvasElement.width / 4, 40);
    canvasCtx.fillText(`COMBO: ${combo}x`, (canvasElement.width / 4) * 3, 40);

    if (commandActive && currentCommand) {
        canvasCtx.font = "bold 48px sans-serif";
        canvasCtx.fillStyle = currentCommand.color;
        
        canvasCtx.fillText(currentCommand.text, canvasElement.width / 2, canvasElement.height / 4);
        
        const barWidth = 200;
        const barHeight = 10;
        const barX = (canvasElement.width - barWidth) / 2;
        const barY = canvasElement.height / 4 + 40;
        
        canvasCtx.fillStyle = "rgba(255,255,255,0.2)";
        canvasCtx.fillRect(barX, barY, barWidth, barHeight);
        
        canvasCtx.fillStyle = currentCommand.color;
        canvasCtx.fillRect(barX, barY, barWidth * timeRemainingForCommand, barHeight);
    }

    if (now - feedbackTimer < 1000) {
        const progress = (now - feedbackTimer) / 1000;
        const alpha = 1 - progress;
        
        canvasCtx.save();
        canvasCtx.translate(canvasElement.width / 2, canvasElement.height / 4);
        
        canvasCtx.font = "bold 56px sans-serif";
        canvasCtx.globalAlpha = alpha;
        canvasCtx.fillStyle = feedbackColor;
        canvasCtx.fillText(currentFeedback, 0, 0);
        
        canvasCtx.restore();
    }

    if (now - globalFlashTimer < 300) {
        const alpha = 1 - ((now - globalFlashTimer) / 300);
        canvasCtx.globalAlpha = alpha * 0.3;
        canvasCtx.fillStyle = globalFlashColor;
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.globalAlpha = 1.0;
    }
}

function drawTrackingOverlay(pose, hands, face) {
    canvasCtx.save();
    canvasCtx.translate(0, canvasElement.height / 2);
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    
    const w = canvasElement.width;
    const h = canvasElement.height / 2;

    // Face tracking is invisible; it only anchors the GREEN behind-ear guide lines.
    const lWrist = pose && pose[15];
    const rWrist = pose && pose[16];
    const greenActive = currentCommand && currentCommand.id === "GREEN";
    const earAlpha = greenActive ? 1 : 0.88;
    const guides = getEarGuides(pose, face, w, h);
    const greenHits = getGreenLineHits(guides, pose, hands, w, h);
    const leftHandHit = greenActive && greenHits.left;
    const rightHandHit = greenActive && greenHits.right;

    drawEarLine(guides.left.x, guides.left.y, "#33ff33", earAlpha, leftHandHit);
    drawEarLine(guides.right.x, guides.right.y, "#33ff33", earAlpha, rightHandHit);

    if (pose && pose.length > 0) {
        const lShoulder = pose[11];
        const rShoulder = pose[12];

        if (commandActive && currentCommand) {
            if (currentCommand.id === "RED") {
                if(lShoulder.visibility > 0.5 && rShoulder.visibility > 0.5) {
                    drawRedXGuide(lShoulder, rShoulder, lWrist, rWrist, w, h);
                }
                if(lWrist.visibility > 0.5 && rWrist.visibility > 0.5) {
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(lWrist.x * w, lWrist.y * h);
                    canvasCtx.lineTo(rWrist.x * w, rWrist.y * h);
                    canvasCtx.lineWidth = 4;
                    canvasCtx.strokeStyle = "#ff3333";
                    canvasCtx.stroke();
                    
                    drawPoint(lWrist.x * w, lWrist.y * h, "#ff3333", 8);
                    drawPoint(rWrist.x * w, rWrist.y * h, "#ff3333", 8);
                }
            } else if (currentCommand.id === "GREEN") {
                const leftPoint = greenHits.leftPoint || (lWrist && lWrist.visibility > 0.5 ? { x: lWrist.x * w, y: lWrist.y * h } : null);
                const rightPoint = greenHits.rightPoint || (rWrist && rWrist.visibility > 0.5 ? { x: rWrist.x * w, y: rWrist.y * h } : null);

                if(guides.left && leftPoint) {
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(leftPoint.x, leftPoint.y);
                    canvasCtx.lineTo(guides.left.x, guides.left.y);
                    canvasCtx.setLineDash(leftHandHit ? [] : [5, 5]);
                    canvasCtx.lineWidth = leftHandHit ? 5 : 3;
                    canvasCtx.strokeStyle = leftHandHit ? "#b6ff00" : "#33ff33";
                    canvasCtx.stroke();
                    canvasCtx.setLineDash([]);
                    
                    drawPoint(leftPoint.x, leftPoint.y, leftHandHit ? "#b6ff00" : "#33ff33", 10);
                }
                if(guides.right && rightPoint) {
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(rightPoint.x, rightPoint.y);
                    canvasCtx.lineTo(guides.right.x, guides.right.y);
                    canvasCtx.setLineDash(rightHandHit ? [] : [5, 5]);
                    canvasCtx.lineWidth = rightHandHit ? 5 : 3;
                    canvasCtx.strokeStyle = rightHandHit ? "#b6ff00" : "#33ff33";
                    canvasCtx.stroke();
                    canvasCtx.setLineDash([]);
                    
                    drawPoint(rightPoint.x, rightPoint.y, rightHandHit ? "#b6ff00" : "#33ff33", 10);
                }
            }
        }
    }

    if (hands && hands.length > 0) {
        hands.forEach(hand => {
            HAND_COLOR_GROUPS.forEach(group => {
                canvasCtx.beginPath();
                group.connections.forEach(([i, j]) => {
                    const p1 = hand[i];
                    const p2 = hand[j];
                    if (p1 && p2) {
                        canvasCtx.moveTo(p1.x * w, p1.y * h);
                        canvasCtx.lineTo(p2.x * w, p2.y * h);
                    }
                });
                canvasCtx.lineWidth = 7;
                canvasCtx.lineCap = "round";
                canvasCtx.lineJoin = "round";
                canvasCtx.strokeStyle = group.color;
                canvasCtx.globalAlpha = 0.86;
                canvasCtx.stroke();
            });
            
            hand.forEach(p => {
                canvasCtx.beginPath();
                canvasCtx.arc(p.x * w, p.y * h, 4.6, 0, 2 * Math.PI);
                canvasCtx.globalAlpha = 0.7;
                canvasCtx.fillStyle = "#202020";
                canvasCtx.fill();
                canvasCtx.beginPath();
                canvasCtx.arc(p.x * w, p.y * h, 2.2, 0, 2 * Math.PI);
                canvasCtx.globalAlpha = 0.95;
                canvasCtx.fillStyle = "#ffffff";
                canvasCtx.fill();
            });
        });
        canvasCtx.globalAlpha = 1;
    }

    canvasCtx.restore();
}

function getEarGuides(pose, face, w, h) {
    if (face && face.length > 0) {
        const xs = face.map(p => p.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const faceWidth = Math.max(0.08, maxX - minX);
        const offset = Math.min(0.105, Math.max(0.055, faceWidth * 0.28));
        const y = (face[234] && face[454])
            ? (face[234].y + face[454].y) / 2
            : face.reduce((sum, p) => sum + p.y, 0) / face.length;
        return {
            left: { x: (minX - offset) * w, y: y * h },
            right: { x: (maxX + offset) * w, y: y * h }
        };
    }

    if (pose && pose[7] && pose[8] && pose[7].visibility > 0.35 && pose[8].visibility > 0.35) {
        const minEarX = Math.min(pose[7].x, pose[8].x);
        const maxEarX = Math.max(pose[7].x, pose[8].x);
        const earY = ((pose[7].y + pose[8].y) / 2) * h;
        return {
            left: { x: (minEarX - 0.12) * w, y: earY },
            right: { x: (maxEarX + 0.12) * w, y: earY }
        };
    }

    return {
        left: { x: w * 0.32, y: h * 0.26 },
        right: { x: w * 0.68, y: h * 0.26 }
    };
}

function drawEarLine(x, y, color, alpha, active = false) {
    canvasCtx.save();
    canvasCtx.globalAlpha = alpha;
    canvasCtx.strokeStyle = color;
    canvasCtx.fillStyle = color;
    canvasCtx.lineWidth = active ? 3 : 2;
    canvasCtx.shadowColor = color;
    canvasCtx.shadowBlur = active ? 14 : 5;
    canvasCtx.fillStyle = active ? "rgba(51,255,51,0.10)" : "rgba(51,255,51,0.028)";
    canvasCtx.fillRect(x - 4, y - 95, 8, 230);
    canvasCtx.strokeStyle = active ? "#b6ff00" : color;
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, y - 95);
    canvasCtx.lineTo(x, y + 135);
    canvasCtx.stroke();
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, active ? 14 : 10, 0, 2 * Math.PI);
    canvasCtx.stroke();
    canvasCtx.restore();
}

function isInsideEarGuide(px, py, targetX, targetY) {
    return Math.abs(px - targetX) < 36 && py > targetY - 95 && py < targetY + 135;
}

function getGreenLineHits(guides, pose, hands, w, h) {
    const handPoints = [];

    if (hands && hands.length > 0) {
        hands.forEach((hand, handIndex) => {
            hand.forEach(p => {
                handPoints.push({ x: p.x * w, y: p.y * h, handIndex });
            });
        });
    }

    if (handPoints.length === 0 && pose) {
        if (pose[15] && pose[15].visibility > 0.5) {
            handPoints.push({ x: pose[15].x * w, y: pose[15].y * h, handIndex: 0 });
        }
        if (pose[16] && pose[16].visibility > 0.5) {
            handPoints.push({ x: pose[16].x * w, y: pose[16].y * h, handIndex: 1 });
        }
    }

    const leftMatch = findPointOnGuide(handPoints, guides.left);
    const rightMatch = findPointOnGuide(handPoints, guides.right, leftMatch?.handIndex);

    if (leftMatch && rightMatch) {
        return {
            left: true,
            right: true,
            leftPoint: leftMatch,
            rightPoint: rightMatch
        };
    }

    return {
        left: Boolean(leftMatch),
        right: Boolean(rightMatch),
        leftPoint: leftMatch,
        rightPoint: rightMatch
    };
}

function findPointOnGuide(points, guide, excludedHandIndex = null) {
    if (!guide) return null;

    let best = null;
    points.forEach(point => {
        if (excludedHandIndex !== null && point.handIndex === excludedHandIndex) return;
        if (!isInsideEarGuide(point.x, point.y, guide.x, guide.y)) return;

        const distance = Math.abs(point.x - guide.x);
        if (!best || distance < best.distance) {
            best = { ...point, distance };
        }
    });

    return best;
}

function drawRedXGuide(lShoulder, rShoulder, lWrist, rWrist, w, h) {
    const centerX = ((lShoulder.x + rShoulder.x) / 2) * w;
    const shoulderY = ((lShoulder.y + rShoulder.y) / 2) * h;
    const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x) * w;
    const xSize = Math.max(96, shoulderWidth * 0.82);
    const ySize = xSize * 0.72;
    const topY = shoulderY + shoulderWidth * 0.22;
    const bottomY = topY + ySize;
    const redReady = lWrist && rWrist &&
        lWrist.visibility > 0.5 &&
        rWrist.visibility > 0.5 &&
        lWrist.x * w > centerX &&
        rWrist.x * w < centerX;

    canvasCtx.save();
    canvasCtx.lineCap = "round";
    canvasCtx.lineWidth = redReady ? 9 : 5;
    canvasCtx.strokeStyle = redReady ? "#ff1f3d" : "rgba(255,51,51,0.62)";
    canvasCtx.shadowColor = "#ff3333";
    canvasCtx.shadowBlur = redReady ? 18 : 8;
    canvasCtx.beginPath();
    canvasCtx.moveTo(centerX - xSize / 2, topY);
    canvasCtx.lineTo(centerX + xSize / 2, bottomY);
    canvasCtx.moveTo(centerX + xSize / 2, topY);
    canvasCtx.lineTo(centerX - xSize / 2, bottomY);
    canvasCtx.stroke();
    canvasCtx.restore();
}

function drawPoint(x, y, color, size=6) {
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, size, 0, 2 * Math.PI);
    canvasCtx.fillStyle = color;
    canvasCtx.fill();
}

function drawTarget(x, y, color) {
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 15, 0, 2 * Math.PI);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = color;
    canvasCtx.stroke();
}

function checkGesture(landmarks) {
    const lWrist = landmarks[15];
    const rWrist = landmarks[16];

    if(lWrist.visibility < 0.5 || rWrist.visibility < 0.5) return;

    if(currentCommand.id === "RED") {
        if(lWrist.x < rWrist.x && Math.abs(lWrist.y - rWrist.y) < 0.2) {
            handleSuccess();
        }
    } else if(currentCommand.id === "GREEN") {
        const w = canvasElement.width;
        const h = canvasElement.height / 2;
        const guides = getEarGuides(landmarks, currentFace, w, h);
        const greenHits = getGreenLineHits(guides, landmarks, currentHands, w, h);

        if(greenHits.left && greenHits.right) {
            handleSuccess();
        }
    }
}

recordBtn.addEventListener("click", () => {
    if(mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recordBtn.innerText = "RECORD";
        recordBtn.classList.remove("recording");
    } else {
        if(!recordingStream) return;
        recordedChunks = [];
        try {
            mediaRecorder = new MediaRecorder(recordingStream, { mimeType: 'video/webm' });
        } catch (e) {
            mediaRecorder = new MediaRecorder(recordingStream);
        }
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            replayVideo.src = url;
            replayContainer.style.display = "block";
        };
        
        mediaRecorder.start();
        recordBtn.innerText = "STOP REC";
        recordBtn.classList.add("recording");
    }
});

function endGame() {
    commandActive = false;
    document.getElementById("final-score").innerText = score;
    document.getElementById("max-combo").innerText = maxCombo;
    switchScreen("result");
}

initTracker();
