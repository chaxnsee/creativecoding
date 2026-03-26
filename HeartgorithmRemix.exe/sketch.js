// Heartgorithm - sketch.js - Optimized version
let handPinchDistance = null;
let smoothedAngleVal = 90;
let handDetected = false;
let cameraReady = false;
let molds = [];
let num = 1800; // Reduced particle count
let outerMask = null;
let innerMask = null;
let angleSlider, angleLabel;
let glitchOffset = { x: 0, y: 0 };
let glitchIntensity = 0;
let currentHeartScale = 1;
let prevScale = 1;
let maskCache = {}; // Cache masks to avoid regeneration

function setup() {
  pixelDensity(1);
  const canvas = createCanvas(500, 500);
  canvas.parent(document.body); // Ensure canvas stays in place
  
  // Pre-generate some common mask sizes
  outerMask = createHeartMask(6.5);
  innerMask = createHeartMask(3.5);
  
  // Initialize molds
  for (let i = 0; i < num; i++) {
    molds.push(new Mold());
  }
  
  // Create container for controls
  let controlsDiv = createDiv('');
  controlsDiv.id('controls-container');
  controlsDiv.style('width', '100%');
  controlsDiv.style('max-width', '500px');
  controlsDiv.style('margin', '10px auto');
  controlsDiv.style('padding', '0 10px');
  controlsDiv.style('box-sizing', 'border-box');
  
  // UI: slider + label
  angleSlider = createSlider(0, 180, 90, 1);
  angleSlider.parent('controls-container');
  angleSlider.style('width', '100%');
  angleSlider.style('max-width', '100%');
  angleSlider.style('display', 'block');
  angleSlider.style('margin', '10px 0');
  
  angleLabel = createDiv('Heartgorithm - Sensor Angle: 90°');
  angleLabel.parent('controls-container');
  angleLabel.style('color', 'white');
  angleLabel.style('font-family', 'monospace');
  angleLabel.style('font-weight', 'bold');
  angleLabel.style('text-align', 'center');
  angleLabel.style('margin', '10px 0 5px 0');
  
  // Add instruction text below
  let instructionText = createDiv('Loading camera... please wait.');
  instructionText.id('instruction-text');
  instructionText.parent('controls-container');
  instructionText.style('color', '#888');
  instructionText.style('font-family', 'Share Tech Mono');
  instructionText.style('font-size', '12px');
  instructionText.style('font-style', 'italic');
  instructionText.style('text-align', 'center');
  instructionText.style('margin', '5px 0');
  instructionText.style('line-height', '1.4');
  instructionText.style('transition', 'color 0.3s, text-shadow 0.3s');
  
  let creditText = createDiv('made by enchax');
  creditText.parent('controls-container');
  creditText.style('color', '#EC1C1C');
  creditText.style('font-family', 'Share Tech Mono');
  creditText.style('font-size', '10px');
  creditText.style('font-style', 'italic');
  creditText.style('text-align', 'center');
  creditText.style('margin', '5px 0');
  creditText.style('line-height', '1.4');
  
  // Initialize MediaPipe Hands
  const videoElement = document.getElementById('videoElement');
  
  if (window.Hands && window.Camera) {
    const hands = new Hands({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});
    
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handDetected = true;
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        
        // Calculate 2D distance between index tip (8) and thumb tip (4)
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        handPinchDistance = Math.sqrt(dx * dx + dy * dy);
      } else {
        handDetected = false;
      }
    });
    
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await hands.send({image: videoElement});
      },
      width: 640,
      height: 480
    });
    
    camera.start().then(() => {
      cameraReady = true;
    }).catch((err) => {
      console.error("Camera error:", err);
    });
  } else {
    console.error("MediaPipe not loaded properly.");
  }

  // Restart on click
  canvas.mousePressed(restartSimulation);
}

function draw() {
  // Calculate heartbeat pulse based on sensor angle
  let angleVal = angleSlider.value();
  
  if (handDetected && handPinchDistance !== null) {
      // Pinch distance typically ranges from ~0.04 (closed) to ~0.25 (open)
      let mappedPinch = map(handPinchDistance, 0.04, 0.25, 0, 180);
      mappedPinch = constrain(mappedPinch, 0, 180);
      
      // Smooth the value over time to prevent jitter
      smoothedAngleVal = lerp(smoothedAngleVal, mappedPinch, 0.2);
      angleVal = round(smoothedAngleVal);
      
      // Synchronize the physical UI slider to visually move with the hand data
      angleSlider.value(angleVal);
  } else {
      // Smooth back to slider value if hand is lost
      smoothedAngleVal = lerp(smoothedAngleVal, angleSlider.value(), 0.1);
      angleVal = round(smoothedAngleVal);
  }
  
  const normalizedAngle = angleVal / 180;
  const heartbeatPhase = sin(normalizedAngle * PI);
  
  // Add time-based pulse for realistic heartbeat
  const timePulse = sin(frameCount * 0.08) * 0.1 + 0.9;
  
  // Combine angle-based size with time-based pulse
  const baseScale = 0.5 + heartbeatPhase * 0.7;
  currentHeartScale = baseScale * timePulse;
  
  // Only regenerate masks if scale changed significantly (optimization)
  if (abs(currentHeartScale - prevScale) > 0.05) {
    const outerScale = 6.5 * currentHeartScale;
    const innerScale = 3.5 * currentHeartScale;
    outerMask = createHeartMask(outerScale);
    innerMask = createHeartMask(innerScale);
    prevScale = currentHeartScale;
  }
  
  // Glitch effect (less frequent)
  if (random(1) < 0.01) {
    glitchIntensity = random(10);
    glitchOffset.x = (random(1) - 0.5) * glitchIntensity;
    glitchOffset.y = (random(1) - 0.5) * glitchIntensity;
  } else {
    glitchIntensity *= 0.85;
    glitchOffset.x *= 0.85;
    glitchOffset.y *= 0.85;
  }
  
  // Soft fade - more opaque for better performance
  background(0, 40);
  
  // UI update
  let glowingHeart = '<span style="text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 30px #ff0000;">&lt;/3</span>';
  angleLabel.html('Heartgorithm - Sensor Complexity: ' + angleVal + '°' + (handDetected ? ' ' + glowingHeart : ''));
  
  // Dynamic Instructions
  let instText = select('#instruction-text');
  if (instText) {
    if (handDetected) {
      instText.html('&lt;/3 Hand tracked! Pinch your index and thumb to change the pattern &lt;/3');
      instText.style('color', '#ff8888');
      instText.style('text-shadow', '0 0 8px #ff0000');
    } else if (!cameraReady) {
      instText.html('Waiting for camera to load for hand tracking... please allow permissions.');
      instText.style('color', '#888');
      instText.style('text-shadow', 'none');
    } else {
      instText.html('Show your hand to the camera and pinch! Slider works as fallback.');
      instText.style('color', '#aaa');
      instText.style('text-shadow', 'none');
    }
  }
  
  // Update and display agents
  for (let i = 0; i < molds.length; i++) {
    molds[i].sensorAngle = angleVal;
    molds[i].update(outerMask, innerMask);
    
    // Simplified glitch effect
    if (molds[i].isInner && glitchIntensity > 2 && i % 3 === 0) {
      push();
      translate(glitchOffset.x, glitchOffset.y);
      molds[i].display();
      pop();
    } else {
      molds[i].display();
    }
  }
  
  // Scanline glitch effect (less frequent)
  if (glitchIntensity > 5 && frameCount % 3 === 0) {
    noStroke();
    fill(255, 0, 0, glitchIntensity * 3);
    const scanlineY = random(height);
    rect(0, scanlineY, width, 2);
  }
}

function createHeartMask(size) {
  // Round size to cache similar sizes
  const cacheKey = round(size * 10) / 10;
  
  if (maskCache[cacheKey]) {
    return maskCache[cacheKey];
  }
  
  let pg = createGraphics(width, height);
  pg.background(0);
  pg.fill(255);
  pg.push();
  pg.translate(width / 2, height / 2);
  pg.scale(size, size);
  
  // Draw heart shape with fewer vertices
  pg.beginShape();
  for (let t = 0; t <= TWO_PI; t += 0.05) { // Increased step for fewer points
    const x = 16 * pow(sin(t), 3);
    const y = -(13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t));
    pg.vertex(x, y);
  }
  pg.endShape(CLOSE);
  pg.pop();
  
  pg.loadPixels();
  
  // Keep cache small
  if (Object.keys(maskCache).length > 10) {
    maskCache = {};
  }
  
  maskCache[cacheKey] = pg;
  return pg;
}

function sampleMaskAt(x, y, mask) {
  let ix = floor(constrain(x, 0, mask.width - 1));
  let iy = floor(constrain(y, 0, mask.height - 1));
  const i = 4 * (iy * mask.width + ix);
  return mask.pixels[i];
}

function restartSimulation() {
  background(0);
  molds = [];
  for (let i = 0; i < num; i++) molds.push(new Mold());
}

function keyTyped() {
  if (key === 's' || key === 'S') {
    noLoop();
  } else if (key === 'r' || key === 'R') {
    loop();
  }
}

// Mold class
class Mold {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.r = 0.4;
    this.heading = random(TWO_PI);
    this.vx = cos(this.heading);
    this.vy = sin(this.heading);
    this.rotAngle = radians(165);
    this.sensorDist = 50;
    this.sensorAngle = 90;
    this.twinkleSeed = randomGaussian(1800);
    this.isInner = false;
  }
  
  update(outerMask, innerMask) {
    const shouldBreak = this.sensorAngle <= 5 || this.sensorAngle >= 175;
    
    const speed = shouldBreak ? 12 : 8.7;
    this.vx = cos(this.heading) * speed;
    this.vy = sin(this.heading) * speed;
    
    this.x = (this.x + this.vx + width) % width;
    this.y = (this.y + this.vy + height) % height;
    
    const sensorAngleRad = radians(this.sensorAngle);
    
    const rSensorX = (this.x + this.sensorDist * cos(this.heading + sensorAngleRad) + width) % width;
    const rSensorY = (this.y + this.sensorDist * sin(this.heading + sensorAngleRad) + height) % height;
    
    const lSensorX = (this.x + this.sensorDist * cos(this.heading - sensorAngleRad) + width) % width;
    const lSensorY = (this.y + this.sensorDist * sin(this.heading - sensorAngleRad) + height) % height;
    
    const fSensorX = (this.x + this.sensorDist * cos(this.heading) + width) % width;
    const fSensorY = (this.y + this.sensorDist * sin(this.heading) + height) % height;
    
    // Check if in inner heart
    const innerBrightness = sampleMaskAt(this.x, this.y, innerMask);
    this.isInner = innerBrightness > 128;
    
    if (shouldBreak) {
      if (random(1) < 0.15) {
        this.heading += (random(1) - 0.5) * PI;
      }
    } else {
      const mask = this.isInner ? innerMask : outerMask;
      
      const rVal = sampleMaskAt(rSensorX, rSensorY, mask);
      const lVal = sampleMaskAt(lSensorX, lSensorY, mask);
      const fVal = sampleMaskAt(fSensorX, fSensorY, mask);
      
      if (fVal < lVal && fVal < rVal) {
        if (random(1) < 0.5) this.heading += this.rotAngle;
        else this.heading -= this.rotAngle;
      } else if (lVal > rVal) {
        this.heading -= this.rotAngle;
      } else if (rVal > lVal) {
        this.heading += this.rotAngle;
      }
    }
  }
  
  display() {
    noStroke();
    const distToCenter = dist(this.x, this.y, width / 2, height / 2);
    const maxDist = dist(0, 0, width / 2, height / 2);
    const t = constrain(map(distToCenter, 0, maxDist, 0, 1), 0, 1);
    
    let r, g, b;
    
    if (this.isInner) {
      const pulse = sin(frameCount * 0.05 + this.twinkleSeed) * 0.5 + 0.5;
      const glitch = random(1) < 0.03 ? random(0.3) : 0; // Less glitch
      
      r = 255 * (0.8 + pulse * 0.2 + glitch);
      g = 50 * pulse + glitch * 100;
      b = 50 * pulse + glitch * 100;
    } else {
      const noise = sin((this.twinkleSeed + frameCount * 0.008) * 10) * 0.5 + 0.5;
      const brightness = t * 0.95 + 0.05 * noise;
      r = g = b = brightness * 255;
    }
    
    const currentColor = color(r, g, b);
    
    // Reduced glow for performance
    drawingContext.shadowBlur = this.isInner ? 8 : 4;
    drawingContext.shadowColor = currentColor;
    fill(currentColor);
    ellipse(this.x, this.y, this.r * 4, this.r * 4);
    drawingContext.shadowBlur = 0;
  }
}
