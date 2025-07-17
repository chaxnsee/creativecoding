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

let molds = []; let num = 1600;
let d; 

function setup() {
  createCanvas(400, 400);
  angleMode(DEGREES);
  d = 4; // Global variable (put in `setup()`)
  d = pixelDensity();
  
  
  for (let i=0; i<num; i++) {
    molds[i] = new Mold();
  } 
  
  
}

function draw() {
  background(0,0.5);
 loadPixels(); // Call ONCE before update loop
molds.forEach(m => m.update());
  textAlign(CENTER, CENTER);
  textSize(min(width, height) / 45); // Responsive size based on screen
  fill("#BEBEBE");
  textFont('Press Start 2P'); // Text color
  text(" Paraverse - made by enchax ", width / 2, height / 1.05);
  for (let i=0; i<num; i++) {
    if (key == "s") { // If "s" key is pressed, molds stop moving 
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

