import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/+esm';

// Nintendo 3DS / Retro Aesthetic
const CELL_SIZE = 6;
// Warm, nostalgic, slightly washed out LCD colors
const SAND_COLORS = [
    [235, 190, 100], // Golden Sand
    [210, 160, 80],  // Darker Gold
    [245, 230, 200], // Pale Highlights
    [180, 130, 60]   // Shadows
];
const BG_COLOR = [20, 15, 10]; // Even darker for contrast

let handLandmarker = undefined;
let video = undefined;
let lastVideoTime = -1;
let isLoaded = false;
let grid = [];
let nextGrid = [];
let cols, rows;
let bgLayer; // Graphics buffer for background
// No robust handGrid needed as we process hands dynamically for force

// MediaPipe Setup
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
    console.log("MediaPipe Loaded");
    isLoaded = true;
    const loader = document.querySelector('.loader');
    if (loader) loader.textContent = "READY. REVEAL THE HERITAGE.";
    setTimeout(() => {
        const instr = document.getElementById('instructions');
        if (instr) instr.classList.add('hidden');
    }, 2000);
}

const s = (p) => {

    p.setup = async () => {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('sketch-container');
        p.noStroke();
        p.frameRate(60);

        // Background Generation
        bgLayer = p.createGraphics(p.width, p.height);
        drawBurmaBackground(bgLayer);

        // Initialize Grid
        initGrid();

        // Setup Video
        video = p.createCapture(p.VIDEO);
        video.size(640, 480);
        video.hide();

        await createHandLandmarker();
    };

    function drawBurmaBackground(g) {
        // Draw Sky (Dusk Gradient)
        g.noStroke();
        for (let y = 0; y < g.height; y++) {
            let inter = p.map(y, 0, g.height, 0, 1);
            let c = p.lerpColor(p.color(10, 5, 20), p.color(60, 40, 30), inter); // Deep blue to warm earth
            g.stroke(c);
            g.line(0, y, g.width, y);
        }

        // Draw Horizon / Ground
        g.noStroke();
        g.fill(15, 10, 5);
        g.rect(0, g.height * 0.75, g.width, g.height * 0.25);

        // Draw Pagodas (Silhouettes)
        // Function to draw simple stupa shape
        const drawPagoda = (x, y, s) => {
            g.fill(20, 15, 10, 200); // Very dark silhouette
            // Base
            g.rect(x - s * 0.4, y, s * 0.8, s * 0.3);
            g.rect(x - s * 0.3, y - s * 0.2, s * 0.6, s * 0.2);
            g.rect(x - s * 0.2, y - s * 0.4, s * 0.4, s * 0.2);
            // Spire (Bell shape approx)
            g.beginShape();
            g.vertex(x - s * 0.15, y - s * 0.4);
            g.vertex(x + s * 0.15, y - s * 0.4);
            g.vertex(x, y - s * 1.2); // Top tip
            g.endShape(p.CLOSE);
            // Hti (Umbrella)
            g.stroke(30, 25, 15);
            g.strokeWeight(2);
            g.line(x, y - s * 1.2, x, y - s * 1.4);
            g.noStroke();
        };

        // Distant ones
        for (let i = 0; i < 8; i++) {
            let x = p.random(g.width);
            let s = p.random(30, 80);
            drawPagoda(x, g.height * 0.75 - p.random(-20, 20), s);
        }

        // Close ones
        drawPagoda(g.width * 0.2, g.height * 0.8, 150);
        drawPagoda(g.width * 0.7, g.height * 0.85, 200);
        drawPagoda(g.width * 0.5, g.height * 0.78, 100);
    }


    function initGrid() {
        cols = Math.ceil(p.width / CELL_SIZE);
        rows = Math.ceil(p.height / CELL_SIZE);
        console.log(`Init Grid: ${cols}x${rows}, Total: ${cols * rows}`);

        grid = new Array(cols * rows).fill(0);
        nextGrid = new Array(cols * rows).fill(0);

        // FILL THE SCREEN (Revolution: The world is buried)
        let filledCount = 0;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Fill most of the screen, maybe leave very top empty
                // Fill 90% of screen from bottom
                if (y > rows * 0.1 && Math.random() > 0.1) {
                    let c = p.random(SAND_COLORS);
                    grid[x + y * cols] = p.color(c[0], c[1], c[2]);
                    filledCount++;
                }
            }
        }
        console.log(`Filled ${filledCount} particles`);
    }

    p.draw = () => {
        // Draw the procedural background (Pagodas)
        if (bgLayer) {
            p.image(bgLayer, 0, 0);
        } else {
            p.background(BG_COLOR);
        }

        // 1. Process Hand Input (Repulsion Field)
        let activeHands = false;

        if (video && handLandmarker && isLoaded) {
            if (video.elt.readyState >= 2) {
                let now = Date.now();
                if (now - lastVideoTime >= 0) {
                    lastVideoTime = now;
                    let detection = handLandmarker.detectForVideo(video.elt, now);
                    if (detection.landmarks && detection.landmarks.length > 0) {
                        activeHands = true;

                        // DISPLACE SAND
                        for (let hand of detection.landmarks) {
                            // Map hand points to grid
                            for (let pt of hand) {
                                let hx = Math.floor((1 - pt.x) * cols);
                                let hy = Math.floor(pt.y * rows);

                                // FORCE FIELD: Clear sand around hands
                                let radius = 3; // Brush size
                                for (let dy = -radius; dy <= radius; dy++) {
                                    for (let dx = -radius; dx <= radius; dx++) {
                                        let nx = hx + dx;
                                        let ny = hy + dy;

                                        // Check bounds
                                        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                                            let idx = nx + ny * cols;

                                            // Visualize Hand Influence (Subtle Glow)
                                            // Use a direct drawing here for effect on top of background but behind sand? 
                                            // No, draw sand first? No, draw hands on top.

                                            // PHYSICS: If there is sand here, push it!
                                            if (grid[idx] !== 0) {
                                                // 'Revolution' -> Throwing the sand upwards or sideways
                                                let throwX = nx + (dx > 0 ? 3 : -3);
                                                let throwY = ny - 3; // Upwards strongly

                                                if (throwX >= 0 && throwX < cols && throwY >= 0 && throwY < rows) {
                                                    let throwIdx = throwX + throwY * cols;
                                                    // Move pixel there if empty or overwrite?
                                                    // Overwriting simulates compaction/loss which works for 'digging'
                                                    grid[throwIdx] = grid[idx];
                                                    grid[idx] = 0; // Cleared
                                                } else {
                                                    grid[idx] = 0; // Fling off screen
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Physics (Falling Sand with piling)

        // Iterate Bottom -> Top, Left -> Right
        for (let y = rows - 1; y >= 0; y--) {
            for (let x = 0; x < cols; x++) {
                let idx = x + y * cols;
                let pixel = grid[idx];

                if (pixel !== 0) {
                    // It's a sand grain
                    let belowIdx = idx + cols;
                    let belowLeftIdx = idx + cols - 1;
                    let belowRightIdx = idx + cols + 1;

                    let canGoDown = (y < rows - 1) && (grid[belowIdx] === 0) && (nextGrid[belowIdx] === 0);
                    let canGoLeft = (y < rows - 1) && (x > 0) && (grid[belowLeftIdx] === 0) && (nextGrid[belowLeftIdx] === 0);
                    let canGoRight = (y < rows - 1) && (x < cols - 1) && (grid[belowRightIdx] === 0) && (nextGrid[belowRightIdx] === 0);

                    if (canGoDown) {
                        nextGrid[belowIdx] = pixel;
                    } else if (canGoLeft && canGoRight) {
                        if (Math.random() < 0.5) nextGrid[belowLeftIdx] = pixel;
                        else nextGrid[belowRightIdx] = pixel;
                    } else if (canGoLeft) {
                        nextGrid[belowLeftIdx] = pixel;
                    } else if (canGoRight) {
                        nextGrid[belowRightIdx] = pixel;
                    } else {
                        // Stay put
                        nextGrid[idx] = pixel;
                    }
                }
            }
        }

        // BUFFER SWAP
        let temp = grid;
        grid = nextGrid;
        nextGrid = temp;
        // Clear nextGrid for the next frame (it holds old data now)
        nextGrid.fill(0);

        // 3. Constant Refill (The struggle never ends)
        // Slowly drizzle new sand from top to fill holes
        for (let k = 0; k < 15; k++) {
            let x = Math.floor(Math.random() * cols);
            if (grid[x] === 0) {
                let c = SAND_COLORS[Math.floor(Math.random() * SAND_COLORS.length)];
                grid[x] = p.color(c[0], c[1], c[2]);
            }
        }

        // 4. Render
        // Draw all sand
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                let idx = x + y * cols;
                if (grid[idx] !== 0) {
                    p.fill(grid[idx]);
                    p.rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }

        // 5. Render Hands (Overlay) - Optional: Show where the hands actually are
        /* 
        if (activeHands && handLandmarker.result) {
            // Re-detect to get raw points for overlay? 
            // We already processed them. Maybe we should have stored them.
            // Implicit visualization via hole creation is cooler.
        }
        */
    };

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        initGrid();
    };
};

new p5(s);
