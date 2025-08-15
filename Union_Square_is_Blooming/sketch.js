let flowers = [];
let colors = ["#309898", "#CB0404", "#c6b6d5", "#FF9F00", "#a4cd98", "#F4631E"];
let falling = false;

function setup() {
  createCanvas(500, 500);
  frameRate(60);
   //createFPS({position:[100,10], dark:true});
  stroke(0);              // Black outline
strokeWeight(0.2);        // Thin outline
  // 🌸 No flowers here — start empty
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background("#DB9DBDCB");
   //updateFPS();
    textAlign(CENTER, CENTER);
  textSize(min(width, height) / 40); // Responsive size based on screen
  fill("#FFFFFF");
  textFont('Press Start 2P'); // Text color
  text("°❀⋆ UNION SQUARE IS BLOOMING .ೃ࿔*:･", width / 2, height / 2.0);
  
  for (let f of flowers) {
    if (falling) {
      f.fall();
    }
    f.display();
  }
}

function mousePressed() {
  falling = true;
}
function touchStarted() {
  falling = true;
}

function mouseDragged() {
  flowers.push(new Flower(mouseX, mouseY));
}
function touchMoved() {
  flowers.push(new Flower(mouseX, mouseY));
}