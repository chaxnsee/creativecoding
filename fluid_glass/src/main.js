import * as THREE from 'three';
import { Vision } from './vision.js';
import { FluidSim } from './sim.js';
import { renderVertex, renderFragment } from './shaders.js';

async function main() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const loader = document.getElementById('loader');
    const errorLog = document.getElementById('error-log');

    function logError(msg) {
        console.error(msg);
        errorLog.style.display = 'block';
        errorLog.innerText += msg + '\n';
    }

    window.onerror = function (message, source, lineno, colno, error) {
        logError(`Error: ${message} at ${lineno}:${colno}`);
    };

    // 1. Setup Webcam
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        });
        video.srcObject = stream;
        await video.play();
    } catch (e) {
        logError("Camera access denied or missing: " + e.message);
        // loader.innerText = "Camera Failed"; 
        return;
    }

    // 2. Setup Three.js
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 3. Setup Video Texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    // 4. Setup Fluid Simulation
    const sim = new FluidSim(renderer, window.innerWidth, window.innerHeight);

    // 5. Setup Main Render Quad (The "Glass")
    const material = new THREE.ShaderMaterial({
        vertexShader: renderVertex,
        fragmentShader: renderFragment,
        uniforms: {
            uTexture: { value: videoTexture },
            uFlow: { value: sim.output },
            uTime: { value: 0.0 }
        }
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // 6. Setup Vision
    const vision = new Vision(video);
    // loader.innerText = "Initializing AI..."; // Removed text update
    try {
        await vision.initialize();
        loader.style.opacity = 0;
    } catch (e) {
        console.error("Vision init failed", e);
        // loader.innerText = "AI Init Failed"; // Keep error log only
        logError("AI Init Failed: " + e.message);
    }

    // 7. Loop
    const clock = new THREE.Clock();
    let smoothedActive = 0.0;

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const time = clock.elapsedTime; // Use internal tracker or accumulate delta if needed, but getElapsedTime is fine if getDelta is called once per frame

        vision.update();

        const handPos = new THREE.Vector2(vision.position.x, vision.position.y);

        // "Make the circle slowly form... smoothly appear not so fast"
        const targetActive = vision.active ? 1.0 : 0.0;

        // Slower grow speed (0.8), faster shrink speed (3.0)
        const growSpeed = 0.8;
        const fadeSpeed = 3.0;
        const speed = targetActive > smoothedActive ? growSpeed : fadeSpeed;

        smoothedActive += (targetActive - smoothedActive) * speed * delta;

        sim.update(handPos, smoothedActive, time);

        material.uniforms.uFlow.value = sim.output;
        material.uniforms.uTime.value = time;

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        sim.setSize(w, h);
    });
}

main();
