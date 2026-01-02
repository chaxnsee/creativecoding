import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class Vision {
    constructor(videoElement) {
        this.video = videoElement;
        this.landmarker = null;
        this.lastVideoTime = -1;
        this.handPos = { x: 0.5, y: 0.5 };
        this.targetPos = { x: 0.5, y: 0.5 }; // Raw detection
        this.isHandDetected = false;
    }

    async initialize() {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );

        this.landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
    }

    update() {
        if (!this.landmarker || !this.video) return;

        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;

            const results = this.landmarker.detectForVideo(this.video, performance.now());

            if (results.landmarks && results.landmarks.length > 0) {
                // Calculate Centroid of the hand for a "whole hand" feel
                let x = 0, y = 0;
                const lm = results.landmarks[0];
                lm.forEach(p => {
                    x += p.x;
                    y += p.y;
                });
                const count = lm.length;

                // Flip X for mirroring effect (1.0 - x)
                // Y is also flipped for WebGL (1.0 - y)
                this.targetPos = {
                    x: 1.0 - (x / count),
                    y: 1.0 - (y / count)
                };
                this.isHandDetected = true;
            } else {
                this.isHandDetected = false;
            }
        }

        // Apply Inertia / Smoothing (Lerp)
        const lerpSpeed = 0.08; // Very smooth follow
        this.handPos.x += (this.targetPos.x - this.handPos.x) * lerpSpeed;
        this.handPos.y += (this.targetPos.y - this.handPos.y) * lerpSpeed;
    }

    get position() {
        return this.handPos;
    }

    get active() {
        return this.isHandDetected;
    }
}
