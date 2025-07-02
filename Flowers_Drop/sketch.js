let flowers = [];
let colors = ["#309898", "#CB0404", "#c6b6d5", "#FF9F00", "#a4cd98", "#F4631E"];
let falling = false;

function setup() {
  createCanvas(500, 500);
  frameRate(60);
  stroke(0);              // Black outline
strokeWeight(0.2);        // Thin outline
  // 🌸 No flowers here — start empty
}

function draw() {
  background("#e5e1dc");

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

function mouseDragged() {
  flowers.push(new Flower(mouseX, mouseY));
}
