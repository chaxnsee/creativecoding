class Flower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = random(1);         // scale factor (not too small!)
    this.dy = random(1, 2);           // falling speed
    this.c = colors[floor(random(colors.length))]; // random color
    this.k = floor(random(2, 5));     // number of petals (k = 4 to 7)
  }

  display() {
    push();
    translate(this.x, this.y);
    fill(this.c);
    beginShape();
    for (let angle = 0; angle < TWO_PI; angle += 0.1) {
      let a = 40 * this.r;                     // flower size
      let r = a * sin(this.k * angle);         // petal equation
      let x = r * cos(angle);
      let y = r * sin(angle);
      vertex(x, y);
    }
    endShape(CLOSE);
    
    stroke(0.4);              // Black outline
strokeWeight(0.3);        // Thin outline
  fill(255);               // white circle (change color if you want)
  let circleSize = (30 * this.r) / 3;   // circle size relative to flower size
  ellipse(0, 0, circleSize, circleSize);
    
    pop();
  }

   fall () {
    this.y += this.dy;
  }
}