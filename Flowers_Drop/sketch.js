let flowers = [];
let colors = ["#309898", "#CB0404", "#c6b6d5", "#FF9F00", "#a4cd98", "#F4631E"];
let falling = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  stroke(0);              // Black outline
strokeWeight(0.2);        // Thin outline
  // 🌸 No flowers here — start empty
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background("#e5e1dc");
   
    textAlign(CENTER, CENTER);
  textSize(min(width, height) / 80); // Responsive size based on screen
  fill("#5F5F5F");
  textFont('Press Start 2P'); // Text color
  text("Flowers Drop - made by enchax", width / 2, height / 1.05);
  
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
