/*
----- Coding Tutorial by Patt Vira ----- 
Name: Slime Molds (Physarum)
Video Tutorial: https://youtu.be/VyXxSNcgDtg
References: 
1. Algorithm by Jeff Jones: https://uwe-repository.worktribe.com/output/980579/characteristics-of-pattern-formation-and-evolution-in-approximations-of-physarum-transport-networks
Connect with Patt: @pattvira
https://www.pattvira.com/
----------------------------------------
*/
let molds = [];
let num; // Declare num properly
let d;
let countryMask;
let angleSlider, angleLabel;
let scaleFactor; // for consistent sizing
let moldRadius;


function preload() {
  countryMask = loadImage("myanmar-map-mask.png");  // Use exact file name
}

function setup() {
  createCanvas(500, 500);
  frameRate(30);
  
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
  const isSmallScreen = windowWidth <= 768;
  if (isMobile || isSmallScreen) {
    num = 4200;
      moldRadius = 0.15;
 // reduce for mobile
  } else {
    num = 1600;
    moldRadius = 0.8; // default for desktop
  }
  
  for (let i = 0; i < num; i++) {
  molds[i] = new Mold(moldRadius);
}
  
  angleMode(DEGREES);
  // Global variable
  d = pixelDensity();
  scaleFactor = 1 / d;
  
  // STABLE SLIDER CREATION
  createSliderControls();
  
  // Initialize molds array
  for (let i = 0; i < num; i++) {
    molds[i] = new Mold();
  }
}

// CREATE SLIDER CONTROLS FUNCTION
function createSliderControls() {
  // Create container first
  let canvasWrapper = select('.canvas-wrapper');
  if (!canvasWrapper) {
    console.error('Canvas wrapper not found');
    return;
  }
  
  // Remove existing slider if it exists
  let existingSlider = select('.slider-controls');
  if (existingSlider) {
    existingSlider.remove();
  }
  
  // Create slider container
  let sliderContainer = createDiv('');
  sliderContainer.class('slider-controls');
  sliderContainer.parent(canvasWrapper);
  
  // Create slider
  angleSlider = createSlider(0, 180, 20, 1);
  angleSlider.class('angle-slider');
  angleSlider.parent(sliderContainer);
  
  // Create label
  angleLabel = createDiv('X value: 20°');
  angleLabel.class('angle-label');
  angleLabel.parent(sliderContainer);
  
  
  
  // Prevent slider from disappearing on touch/scroll
  angleSlider.elt.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  
  
 angleSlider.elt.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
}

// PREVENT SLIDER DISAPPEARING ON RESIZE
function windowResized() {
  // Don't resize canvas, keep it at 500x500
  // Just recreate slider to ensure it stays attached
  setTimeout(() => {
    createSliderControls();
  }, 100);
}

// MAIN DRAW FUNCTION
function draw() {
  background(0, 25);
  
  // Check if slider exists before using it
  if (angleSlider && angleLabel) {
    let angleValue = angleSlider.value();
    angleLabel.html('X value: ' + angleValue + '°');
    
    // Apply new angle to all molds
    for (let i = 0; i < molds.length; i++) {
      molds[i].sensorAngle = angleValue;
    }
  }
  
  loadPixels(); // Call ONCE before update loop
  molds.forEach((m) => m.update());
  
  textAlign(CENTER, CENTER);
  textSize(min(width, height) / 45); // Responsive size based on screen
  fill("#BEBEBE");
  textFont("Press Start 2P"); // Text color
  text("  ", width / 2, height / 1.05);
  
  for (let i = 0; i < num; i++) {
    if (key == "s") {
      // If "s" key is pressed, molds stop moving
      molds[i].stop = true;
      updatePixels();
      noLoop();
    } else {
      molds[i].stop = false;
    }
    molds[i].update();
    molds[i].display();
  }
}
