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
//let num = 1600;
let d;
let countryMask;
let angleSlider, angleLabel;
let scaleFactor; // for consistent sizing

function preload() {
  countryMask = loadImage("myanmar-map-mask.png");  // Use exact file name
}
function setup() {
  createCanvas(500, 500);
  frameRate(30);
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
  const isSmallScreen = windowWidth <= 768;

  if (isMobile || isSmallScreen) {
    num = 3200;
    this.r = 0.6; // reduce for mobile

  } else {
    num = 1600;
    this.r = 0.8; // default for desktop

  }
  
  angleMode(DEGREES);
   // Global variable (put in `setup()`)
  d = pixelDensity();
  scaleFactor = 1 / d;
  
  // SENSOR ANGLE SLIDER
  angleSlider = createSlider(0, 180, 20, 1); // min, max, default, step
  angleSlider.position(250, 480);
  angleSlider.style('width', '100px');
  angleSlider.style('accent-color', '#9ADDFF');
  angleSlider.position((windowWidth + 195) / 2, (windowHeight + 480) / 2); // Responsive center
angleSlider.parent(document.querySelector(".canvas-wrapper")); // Attach under canvas


  angleLabel = createDiv('Sensor Angle: 20°');
  angleLabel.position(260, 500);
  angleLabel.style('color', '#FFFFFF');
  angleLabel.style('font-family', 'monospace');
  angleLabel.style('font-size', '12px');
angleLabel.position((windowWidth + 230) / 2, (windowHeight + 445) / 2);
  angleLabel.parent(document.querySelector(".canvas-wrapper"));

  for (let i = 0; i < num; i++) {
    molds[i] = new Mold();
  }
}

function windowResized() { 
  resizeCanvas(500, 500);
  angleSlider.position((windowWidth - 195) / 2, (windowHeight + 480) / 2);
  angleLabel.position((windowWidth - 230) / 2, (windowHeight + 445) / 2);
}

function draw() {
  background(0,25);
  
   let angleValue = angleSlider.value();
  angleLabel.html('X value: ' + angleValue + '°');

  // Apply new angle to all molds
  for (let i = 0; i < molds.length; i++) {
    molds[i].sensorAngle = angleValue;
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

