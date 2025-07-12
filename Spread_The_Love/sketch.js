/*
----- Sound Mini Series by Patt Vira ----- 
Name: EP3_p5.AudioIn
Video Tutorial: https://youtu.be/x_aGtSZMEUA

Connect with Patt: @pattvira
https://www.pattvira.com/
----------------------------------------
*/

let mic;

let cols; let rows; let size = 16;
let d = [];
let max;
let colors = ["#781A1A","#8d99ae","#2b2d42","#a4161a","#ba181b","#e5383b","#b1a7a6","#d3d3d3","#f5f3f4","#a31621"];
let rings = 2;
let heartPoints = [];


function setup() {
  createCanvas(windowWidth, windowHeight);
  mic = new p5.AudioIn();
  mic.start();
  
  cols = width/size;
  rows = height/size;
  
  max = sqrt(pow(width/2, 2) + pow(height/2, 2));
  
  function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
  for(let i=0; i<cols; i++) {
    d[i] = [];
    for (let j=0; j<rows; j++) {
      let x = i*size + size/2;
      let y = j*size + size/2;
      d[i][j] = dist(x, y, width/2, height/2);
    }
  }
  
  
}


function draw() {
  background(0);
  let amplitude = mic.getLevel() * 100;
  
  function drawHeart(x, y, s) {
  push();
  translate(x, y);
  scale(s / 20); // adjust 20 for scaling
  beginShape();
  for (let t = 0; t < TWO_PI; t += 0.1) { 
    let hx = 16 * pow(sin(t), 3);
    let hy = - (13 * cos(t) - 3 * cos(2 * t) - 4 * cos(3 * t) - cos(2 * t));
    vertex(hx, hy);
  }
  endShape(CLOSE);
  pop();
}
 // ✨ Rotate around center based on amplitude
  push();
  translate(width / 2, height / 2); // Move origin to center
  rotate(radians(amplitude * 0));   // Rotate everything by amplitude
  translate(-width / 2, -height / 2); // Move origin back
  
  for(let i=0; i<cols; i++) {
    for (let j=0; j<rows; j++) {
      let x = i*size + size/2;
      let y = j*size + size/2;
      let index = floor(map(abs(d[i][j]), 0, max, 8, colors.length * rings));
      
      let c = colors[index % colors.length];
      fill(c);
      strokeWeight(0.8);
      drawHeart(x, y, size);
      

      
      d[i][j] -= amplitude;
    }
  }
}

