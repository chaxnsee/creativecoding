import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/+esm";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const statusText = document.getElementById("status-text");
const instructionOverlay = document.getElementById("instruction-overlay");
const countdownOverlay = document.getElementById("countdown-overlay");
const flashOverlay = document.getElementById("flash-overlay");
const filmStrip = document.getElementById("film-strip");
const downloadBtn = document.getElementById("download-btn");
const resetBtn = document.getElementById("reset-btn");
const dateText = document.getElementById("date-text");

let handLandmarker = undefined;
let webcamRunning = false;
let lastVideoTime = -1;
let results = undefined;
let isCapturing = false;
let heartHeldStartTime = 0;
const HEART_HOLD_DURATION = 1000; // 1 second hold to trigger
let capturedPhotos = [];

// Initialize MediaPipe
async function createHandLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
    });
    statusText.innerText = "Model Loaded. Starting Camera...";
    enableCam();
}

function enableCam() {
    if (!handLandmarker) {
        console.log("Wait! objectDetector not loaded yet.");
        return;
    }

    const constraints = {
        video: {
            width: 1280,
            height: 720,
            facingMode: "user"
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
            statusText.innerText = "Ready! Show a heart 🫶";
            statusText.style.background = "#d1f2eb"; // light green
            statusText.style.color = "#2d3436";

            // Set date
            const d = new Date();
            dateText.innerText = d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        })
        .catch(err => {
            console.error(err);
            statusText.innerText = "Camera Error: " + err.message;
        });
}

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function isHeartGesture(landmarks, handedness) {
    if (landmarks.length !== 2) return false;

    // We assume mirroring is ON for the display, but landmarks are relative to image.
    // If mirroring is ON via CSS transform, the left hand acts like a right hand visually? 
    // MediaPipe Hands outputs 'Left' and 'Right' based on the person's real hands.
    // If I show my left hand to the camera, it sees a left hand.

    // Let's identify hands by index 4 (Thumb) and 8 (Index).
    const hand1 = landmarks[0];
    const hand2 = landmarks[1];

    // Heuristic: Thumbs close, Index fingers close.
    // Tips are points 4 and 8.
    const thumb1 = hand1[4];
    const index1 = hand1[8];
    const thumb2 = hand2[4];
    const index2 = hand2[8];

    // Find closest pairs between hands
    // We want the tips of the two different hands to be touching
    const distThumbs = distance(thumb1, thumb2);
    const distIndices = distance(index1, index2);

    // Thresholds
    const TOUCH_THRESHOLD = 0.15;

    if (distThumbs < TOUCH_THRESHOLD && distIndices < TOUCH_THRESHOLD) {
        // Also check if index is above thumb (y coordinate is smaller for higher)
        if (index1.y < thumb1.y && index2.y < thumb2.y) {
            return true;
        }
    }

    return false;
}

async function predictWebcam() {
    canvasElement.style.width = video.videoWidth;
    canvasElement.style.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = handLandmarker.detectForVideo(video, performance.now());
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw landmarks if needed (optional, maybe just for debug or cool effect)
    // For now clean UI, so maybe no drawing unless debugging.

    if (results.landmarks && !isCapturing && capturedPhotos.length === 0) {
        if (isHeartGesture(results.landmarks, results.handednesses)) {
            instructionOverlay.classList.remove("hidden");
            instructionOverlay.innerHTML = `<span style="color: #ff6b6b; font-size: 1.5rem;">♥</span> Hold for Photo!`;

            if (heartHeldStartTime === 0) {
                heartHeldStartTime = Date.now();
            } else {
                const heldTime = Date.now() - heartHeldStartTime;
                if (heldTime > HEART_HOLD_DURATION) {
                    startPhotoboothSequence();
                }
            }
        } else {
            instructionOverlay.innerHTML = `<div class="icon-heart-hands">🫶</div> <p>Make a heart to start!</p>`;
            heartHeldStartTime = 0;
            // instructionOverlay.classList.remove("hidden");
        }
    } else if (isCapturing) {
        instructionOverlay.classList.add("hidden");
    }

    canvasCtx.restore();

    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}

async function startPhotoboothSequence() {
    if (isCapturing) return;
    isCapturing = true;
    heartHeldStartTime = 0;
    instructionOverlay.classList.add("hidden");

    // Capture 4 photos
    capturedPhotos = [];

    // Clear previous strip
    const placeholders = document.querySelectorAll(".photo-placeholder");
    placeholders.forEach(el => el.style.display = 'none');

    // Remove old photos if any
    const oldPhotos = document.querySelectorAll(".film-photo");
    oldPhotos.forEach(p => p.remove());

    for (let i = 0; i < 4; i++) {
        await runCountdown(3);
        flash();
        const photoData = capturePhoto();
        addPhotoToStrip(photoData);
        capturedPhotos.push(photoData);
        await new Promise(r => setTimeout(r, 1000)); // Pause between photos
    }

    finishSession();
}

function runCountdown(seconds) {
    return new Promise(resolve => {
        let count = seconds;
        countdownOverlay.innerText = count;
        countdownOverlay.classList.remove("hidden");

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownOverlay.innerText = count;
                // Re-trigger animation
                countdownOverlay.style.animation = 'none';
                countdownOverlay.offsetHeight; /* trigger reflow */
                countdownOverlay.style.animation = 'pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            } else {
                clearInterval(interval);
                countdownOverlay.classList.add("hidden");
                resolve();
            }
        }, 1000);
    });
}

function flash() {
    flashOverlay.classList.add("flash-active");
    setTimeout(() => {
        flashOverlay.classList.remove("flash-active");
    }, 150);
}

function capturePhoto() {
    const processingCanvas = document.getElementById("processing_canvas");
    processingCanvas.width = video.videoWidth;
    processingCanvas.height = video.videoHeight;
    const ctx = processingCanvas.getContext("2d");

    // Horizontal flip to match mirror view
    ctx.translate(video.videoWidth, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Return data URL
    return processingCanvas.toDataURL("image/jpeg", 0.9);
}

function addPhotoToStrip(dataUrl) {
    const img = document.createElement("img");
    img.src = dataUrl;
    img.className = "film-photo";

    // Insert before footer
    const stripFooter = document.querySelector(".strip-footer");
    filmStrip.insertBefore(img, stripFooter);
}

function finishSession() {
    isCapturing = false;
    statusText.innerText = "Session Complete! Save your strip.";
    downloadBtn.classList.remove("hidden");
    downloadBtn.disabled = false;
    resetBtn.classList.remove("hidden");
    document.querySelector(".filters").classList.remove("hidden");
}

// Event Listeners
resetBtn.addEventListener("click", () => {
    capturedPhotos = [];
    const photos = document.querySelectorAll(".film-photo");
    photos.forEach(p => p.remove());
    const placeholders = document.querySelectorAll(".photo-placeholder");
    placeholders.forEach(el => el.style.display = 'flex');

    downloadBtn.classList.add("hidden");
    resetBtn.classList.add("hidden");
    document.querySelector(".filters").classList.add("hidden");
    statusText.innerText = "Ready! Show a heart 🫶";
    instructionOverlay.classList.remove("hidden");
    isCapturing = false; // Reset state
});

downloadBtn.addEventListener("click", async () => {
    // Use html2canvas or just draw to a new canvas to save the DOM element
    // Since we don't have html2canvas in vanilla without CDN, let's construct it manually on a canvas.
    // It's cleaner.

    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    const strip = document.getElementById("film-strip");

    // Layout roughly: 300px wide, padding 20px, header, 4 photos, footer
    // Photos are usually 4:3. Let's say 400x300 for high quality.
    const photoWidth = 400;
    const photoHeight = 300;
    const padding = 30;
    const gap = 20;
    const headerHeight = 60;
    const footerHeight = 80; // Increased for handle

    const totalWidth = photoWidth + (padding * 2);
    const totalHeight = padding + headerHeight + (4 * photoHeight) + (3 * gap) + footerHeight + padding;

    exportCanvas.width = totalWidth;
    exportCanvas.height = totalHeight;

    // Fill Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw Header
    ctx.fillStyle = "#333";
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("HEART BOOTH", totalWidth / 2, padding + 30);

    // Draw Header Heart decoration
    ctx.fillStyle = "#FF6B6B";
    ctx.font = "30px sans-serif";
    ctx.fillText("♥", (totalWidth / 2) + 120, padding + 30);

    // Draw Photos
    let y = padding + headerHeight;

    // Get filter
    const activeFilter = document.querySelector(".filter-btn.active").dataset.filter;
    let filterString = "none";
    if (activeFilter === 'vintage') filterString = "sepia(0.4) contrast(1.2) brightness(1.05) hue-rotate(-10deg)";
    else if (activeFilter === 'cute') filterString = "saturate(1.3) brightness(1.1) contrast(1.05)";
    else if (activeFilter === 'bw') filterString = "grayscale(1) contrast(1.2)";

    ctx.filter = filterString;

    for (let src of capturedPhotos) {
        const img = new Image();
        img.src = src;
        await new Promise(r => img.onload = r);
        ctx.drawImage(img, padding, y, photoWidth, photoHeight);
        y += photoHeight + gap;
    }

    ctx.filter = "none"; // reset for text

    // Draw Footer Date
    ctx.fillStyle = "#ccc";
    ctx.font = "18px monospace";
    ctx.fillText(dateText.innerText, totalWidth / 2, totalHeight - padding - 45);

    // Draw Instagram Handle
    ctx.fillStyle = "#2D3436";
    ctx.font = "bold 24px sans-serif"; // Using sans-serif to match UI look
    ctx.fillText("@chaxnsee", totalWidth / 2 - 15, totalHeight - padding - 15);

    // Draw little heart doodle next to handle
    const heartX = totalWidth / 2 + 65;
    const heartY = totalHeight - padding - 22;

    ctx.fillStyle = "#FF6B6B";
    ctx.beginPath();
    // Simple heart shape
    const s = 15; // size
    ctx.moveTo(heartX, heartY);
    ctx.bezierCurveTo(heartX, heartY - s / 2, heartX - s, heartY - s / 2, heartX - s, heartY);
    ctx.bezierCurveTo(heartX - s, heartY + s / 2, heartX, heartY + s, heartX, heartY + s * 1.5);
    ctx.bezierCurveTo(heartX, heartY + s, heartX + s, heartY + s / 2, heartX + s, heartY);
    ctx.bezierCurveTo(heartX + s, heartY - s / 2, heartX, heartY - s / 2, heartX, heartY);
    ctx.fill();

    // Save
    const link = document.createElement("a");
    link.download = `heart_booth_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL();
    link.click();
});

// Filter Switching
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");

        // Update visual preview
        const styleClass = `filter-${e.target.dataset.filter}`;
        filmStrip.className = `film-strip ${styleClass}`;
    });
});

createHandLandmarker();
webcamRunning = true;
