class Mold {
  constructor(r) {
    
    // Mold variables
    this.x = cos(width);
    this.y = sin(height); 
    // this.x = random(width/2 - 20, width/2 + 20);
    // this.y = random(height/2 - 20, height/2 + 20); 
    this.r = r;
    this.r = 0.8;

    this.heading = random(360);
    this.vx = cos(this.heading);
    this.vy = sin(this.heading);
    this.rotAngle = 45
    this.stop = false // Boolean variable to stop molds from moving 
    
    // Sensor variables
    this.rSensorPos = createVector(0, 0);
    this.lSensorPos = createVector(0, 0);
    this.fSensorPos = createVector(0, 0);
    this.sensorAngle = 20;
    this.sensorDist = 50; 
    
    
  }
  
  update() {   
    // Using this.stop to control when molds stop moving
    if (this.stop) { 
      this.vx = 0; 
      this.vy = 0;
    } else {
      this.vx = cos(this.heading);
      this.vy = sin(this.heading);
    }
    
    // Using % Modulo expression to wrap around the canvas
    this.x = (this.x + this.vx + countryMask.width) % width;
    this.y = (this.y + this.vy + countryMask.height) % height;
    
    // Get 3 sensor positions based on current position and heading
    this.getSensorPos(this.rSensorPos, this.heading + this.sensorAngle);
    this.getSensorPos(this.lSensorPos, this.heading - this.sensorAngle);
    this.getSensorPos(this.fSensorPos, this.heading);
  
    // Get indices of the 3 sensor positions and get the color values from those indices
    let index, l, r, f;
    index = 4*(d * floor(this.rSensorPos.y)) * (d * width) + 4*(d * floor(this.rSensorPos.x));
    r = pixels[index];
    
    index = 4*(d * floor(this.lSensorPos.y)) * (d * width) + 4*(d * floor(this.lSensorPos.x));
    l = pixels[index];
    
    index = 4*(d * floor(this.fSensorPos.y)) * (d * width) + 4*(d * floor(this.fSensorPos.x));
    f = pixels[index];
    
    // Compare values of f, l, and r to determine movement 
    if (f > l && f > r) {
      this.heading += 0;
    } else if (f < l && f < r) {
      if  ( randomGaussian (1) < 0.5) {
        this.heading += this.rotAngle;
      } else {
        this.heading -= this.rotAngle;
      }
    } else if (l > r) {
      this.heading += -this.rotAngle;
    } else if (r > l) {
      this.heading += this.rotAngle;
    }
    
    
  }
  
  
display() {
  noStroke();
  
 // Get brightness from the country mask at the current mold position
  //let imgX = floor(map(this.x, 0, width, 0, countryMask.width));
  //let imgY = floor(map(this.y, 0, height, 0, countryMask.height));
  //let maskColor = countryMask.get(imgX, imgY);
  //let brightnessLevel = brightness(maskColor) / 100.0;  // Scale to 0–1

  // Use brightness as 't' for gradient influence
  //let b = constrain(brightnessLevel, 0, 1);
  
 let distToCenter = dist(this.x, this.y, width / 2, height / 2);
  let maxDist = dist(0, 4, width / 2, height / 2);
  let t = map(distToCenter, 0, maxDist, 0, 1); // 0 = center, 1 = 

  // Galaxy gradient colors (purples, blues, pinks, yellows)
  let galaxyColors = [
    color(255, 0, 0),  // Light pink
    color(0, 180, 216),  // Blue
    color(2, 62, 138),    // Purple
    color(144, 224, 239),  // Cyan
    color(202, 240, 248)      // Deep space gray
  ];
  
    

  // Pick two colors based on t and t offset
  let index = floor(t * (galaxyColors.length - 1));
  let c1 = galaxyColors[index];
  let c2 = galaxyColors[min(index + 1, galaxyColors.length - 4)];
  let blendAmt = (t * (galaxyColors.length - 1)) % 1;

  // Add twinkle effect
  let twinkle = map(noise(this.x * 0.01, this.y * 0.01, frameCount * 0.01), 0, 1, 0.8, 1.2);
  let currentColor = lerpColor(c1, c2, blendAmt);
  currentColor.setRed(red(currentColor) * twinkle);
  currentColor.setGreen(green(currentColor) * twinkle);
  currentColor.setBlue(blue(currentColor) * twinkle)
    
   
    // Apply shadow (glow)
  drawingContext.shadowBlur = 6.5;                      // Glow size
  drawingContext.shadowColor = currentColor;           // Glow color
ellipse(this.x, this.y, this.r * 4, this.r * 4);
  // Reset shadow for next drawing calls (important!)
  drawingContext.shadowBlur = 0;

  fill(currentColor);
  	ellipse(this.x, this.y, this.r * 4, this.r * 4);
    // line(this.x, this.y, this.x + this.r*3*this.vx, this.y + this.r*3*this.vy);
    // fill(255, 0, 0);
    // ellipse(this.rSensorPos.x, this.rSensorPos.y, this.r*2, this.r*2);
    // ellipse(this.lSensorPos.x, this.lSensorPos.y, this.r*2, this.r*2); l
    // ellipse(this.fSensorPos.x, this.fSensorPos.y, this.r*2, this.r*2);
    
  }
  
  getSensorPos(sensor, angle) {
    sensor.x = (this.x + this.sensorDist*cos(angle) + width) % width;
    sensor.y = (this.y + this.sensorDist*sin(angle) + height) % height;
  }

}
