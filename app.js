// Control knobs

let cellSize = 8;
let coordToNoiseScale = 0.1;
let timeScale = 0.01;
let thresholdStart = 0;
let thresholdDelta = 15;
let gradientFillIterations = 1;
let showFps = true;
let contourColor = "black";
let fillColor = "orange";

// Global state

let cols, rows;
let vertices;

let fillColorR;
let fillColorG;
let fillColorB;

function setup() {
    let container = select('#canvas-container');
    let canvas = createCanvas(container.width, container.height);
    canvas.parent('canvas-container');
    pixelDensity(1);
    canvas.elt.getContext('2d', { willReadFrequently: true });

    fillColorR = red(fillColor);
    fillColorG = green(fillColor);
    fillColorB = blue(fillColor);

    createVertices();
}

function windowResized() {
    let container = select('#canvas-container');
    resizeCanvas(container.width, container.height);

    createVertices();
}

function createVertices() {
    cols = Math.ceil(width / cellSize) + 1;
    rows = Math.ceil(height / cellSize) + 1;

    vertices = Array.from({ length: rows }, () => Array(cols).fill(0));
}

function draw() {
    updateVertices();
    drawThresholds();

    if (showFps) {
        drawFps();
    }
}

function updateVertices() {
    let time = frameCount * timeScale;
    background("white");

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let noiseVal = noise(col * coordToNoiseScale, row * coordToNoiseScale, time);
            let alpha = noiseVal * 255;
            
            vertices[row][col] = alpha;

            // Fill cell if we're not in the first row or column
            if (row > 0 && col > 0) {
                let a = vertices[row - 1][col - 1];  // top-left
                let b = vertices[row - 1][col];      // top-right
                let c = vertices[row][col];          // bottom-right
                let d = vertices[row][col - 1];      // bottom-left
                
                let x = (col - 1) * cellSize;
                let y = (row - 1) * cellSize;

                // Draw as 4 smaller quads with interpolated colors
                noStroke();
                let steps = gradientFillIterations;  // Increase for smoother gradient
                for (let i = 0; i < steps; i++) {
                    for (let j = 0; j < steps; j++) {
                        let u = i / steps;
                        let v = j / steps;
                        let uNext = (i + 1) / steps;
                        let vNext = (j + 1) / steps;
                        
                        // Bilinear interpolation
                        let alpha = (1-u)*(1-v)*a + u*(1-v)*b + u*v*c + (1-u)*v*d;
                        
                        fill(fillColorR, fillColorG, fillColorB, alpha);
                        rect(
                            x + u * cellSize, 
                            y + v * cellSize, 
                            cellSize / steps, 
                            cellSize / steps
                        );
                    }
                }
            }
        }
    }
}

function drawThresholds() {
    noFill();
    stroke(contourColor);
    strokeWeight(1);
    strokeCap(ROUND);

    for (let threshold = thresholdStart; threshold <= 255; threshold += thresholdDelta) {
        drawThreshold(threshold);
    }
}

function drawThreshold(threshold) {
    for (let row = 0; row < rows - 1; row++) {
        for (let col = 0; col < cols - 1; col++) {
            
            // Get corner values
            let a = vertices[row][col];
            let b = vertices[row][col + 1];
            let c = vertices[row + 1][col + 1];
            let d = vertices[row + 1][col];
            
            // Calculate marching squares case (4-bit number)
            let caseValue = 0;
            if (a > threshold) caseValue |= 1;
            if (b > threshold) caseValue |= 2;
            if (c > threshold) caseValue |= 4;
            if (d > threshold) caseValue |= 8;
            
            // Linear interpolation for edge positions
            let topLerp = (threshold - a) / (b - a);
            let rightLerp = (threshold - b) / (c - b);
            let bottomLerp = (threshold - d) / (c - d);
            let leftLerp = (threshold - a) / (d - a);
            
            let x = col * cellSize;
            let y = row * cellSize;

            let top = {x: x + topLerp * cellSize, y: y};
            let right = {x: x + cellSize, y: y + rightLerp * cellSize};
            let bottom = {x: x + bottomLerp * cellSize, y: y + cellSize};
            let left = {x: x, y: y + leftLerp * cellSize};
            
            // Draw lines based on case
            switch(caseValue) {
                case 1: case 14:
                    line(left.x, left.y, top.x, top.y);
                    break;
                case 2: case 13:
                    line(top.x, top.y, right.x, right.y);
                    break;
                case 3: case 12:
                    line(left.x, left.y, right.x, right.y);
                    break;
                case 4: case 11:
                    line(right.x, right.y, bottom.x, bottom.y);
                    break;
                case 5:
                    line(left.x, left.y, top.x, top.y);
                    line(right.x, right.y, bottom.x, bottom.y);
                    break;
                case 6: case 9:
                    line(top.x, top.y, bottom.x, bottom.y);
                    break;
                case 7: case 8:
                    line(left.x, left.y, bottom.x, bottom.y);
                    break;
                case 10:
                    line(top.x, top.y, right.x, right.y);
                    line(left.x, left.y, bottom.x, bottom.y);
                    break;
            }
        }
    }
}

function drawFps() {
    fill(0);
    noStroke();
    textSize(16);
    text('FPS: ' + Math.round(frameRate()), 10, 20);
}

function togglePause() {
    if (isLooping()) {
        noLoop();
        document.getElementById('pauseButton').textContent = '▶';
    } else {
        loop();
        document.getElementById('pauseButton').textContent = '⏸';
    }
}
