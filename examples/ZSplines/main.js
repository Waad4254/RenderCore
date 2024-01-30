import * as RC from "../../src/RenderCore.js";

const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.addShaderLoaderUrls("../../src/shaders"); //change shaders 

// Timestamp calculation
let prevTime = -1; 
let currTime; 
let dt;

// FPS calculation
let timeNow = 0; 
let timeLast = 0; 
let fps = 0;

const scene = new RC.Scene();
const camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, 0.125, 200);

camera.position.set(0, 2, 50);
camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));
camera.aspect = canvas.width/canvas.height;


const dLight = new RC.DirectionalLight(
    new RC.Color("#FFFFFF"), 
    0.94, 
    {
        castShadows: false
    }
);
dLight.rotateX(0.1);
scene.add(dLight);

let dataHelix = [];

let r = 2; 
const w = 1;
const k = 1;
let num = 0;
while(num < 100)
{
    for(let t = 0; t<= 2*Math.PI; t = t + (Math.PI/4))
    {
        dataHelix.push(r*Math.cos(w*t));
        dataHelix.push(r*Math.sin(w*t));
        dataHelix.push(k*t);

        dataHelix.push(-r*Math.sin(w*t)*w);
        dataHelix.push(r*Math.cos(w*t)*w);
        dataHelix.push(k);
    }

    r= r + 1;
    num++;
}
const lineStrip = new RC.ZSplines(dataHelix, 150, 0.1);
lineStrip.position.set(0,0,0);
lineStrip.scale.set(1, 1, 1);
scene.add(lineStrip);


 // region Setup keyboard
 let keyboardRotation, keyboardTranslation, keyboardInput;

 keyboardRotation = {x: 0, y: 0, z: 0, reset: function() { this.x = 0; this.y = 0; this.z = 0; }};
 keyboardTranslation = {x: 0, y: 0, z: 0, reset: function() { this.x = 0; this.y = 0; this.z = 0; }};

 keyboardInput = RC.KeyboardInput.instance;
 initInputControls();


function initInputControls() {
    keyboardInput.addListener(function (pressedKeys) {
        // ROTATIONS
        if (pressedKeys.has(65)) {  // A
            keyboardRotation.y = 1;
        }
  
        if (pressedKeys.has(68)) {  // D
            keyboardRotation.y = -1;
        }
  
        if (pressedKeys.has(87)) {  // W
            keyboardRotation.x = 1;
        }
  
        if (pressedKeys.has(83)) {  // S
            keyboardRotation.x = -1;
        }
  
        if (pressedKeys.has(81)) {  // Q
            keyboardRotation.z = 1;
        }
  
        if (pressedKeys.has(82)) {  // R
            keyboardRotation.z = -1;
        }
  
  
        // TRANSLATIONS
        if (pressedKeys.has(39)) {  // RIGHT - Right
            keyboardTranslation.x = 1;
        }
  
        if (pressedKeys.has(37)) {  // LEFT - Left
            keyboardTranslation.x = -1;
        }
  
        if (pressedKeys.has(40)) {  // DOWN - Backward
            keyboardTranslation.z = 1;
        }
  
        if (pressedKeys.has(38)) {  // UP - Forward
            keyboardTranslation.z = -1;
        }
  
        if (pressedKeys.has(85)) {  // U - Upward
            keyboardTranslation.y = 1;
        }
  
        if (pressedKeys.has(70)) {  // F - Downward
            keyboardTranslation.y = -1;
        }
    });
    // endregion
  }
                               
function resizeFunction() {
    canvas.updateSize();
    renderer.updateViewport(canvas.width, canvas.height);
}
function renderFunction() {

    calculateFps();

    // Calculate delta time and update timestamps
    currTime = new Date();
    dt = (prevTime !== -1) ? currTime - prevTime : 0;
    prevTime = currTime;

    keyboardTranslation.reset();
    keyboardRotation.reset();
    keyboardInput.update();

    camera.translateX(keyboardTranslation.x * dt * 0.001);
    camera.translateY(keyboardTranslation.y * dt * 0.001);
    camera.translateZ(keyboardTranslation.z * dt * 0.001);

    // camera.rotationX += keyboardRotation.x * dt * 0.0001;
    // camera.rotationY += keyboardRotation.y  * dt * 0.0001;
    // camera.rotationZ += keyboardRotation.z * dt * 0.0001;

    lineStrip.rotationX += keyboardRotation.x * dt * 0.001;
    lineStrip.rotationY += keyboardRotation.y  * dt * 0.0001;
    lineStrip.rotationZ += keyboardRotation.z * dt * 0.001;

    renderer.render(scene, camera);
    window.requestAnimationFrame(renderFunction);
}

function calculateFps() {

    timeNow = new Date();
    fps++;

    if (timeNow - timeLast >= 1000) {
        //Write value in HTML
        //multiply with 1000.0 / (timeNow - timeLast) for accuracy
        document.getElementById("fps").innerHTML = Number(fps * 1000.0 / (timeNow - timeLast)).toPrecision( 5 );

        //reset
        timeLast = timeNow;
        fps = 0;
    }
}


window.onload = function() {
    window.addEventListener("resize", resizeFunction, false);
    resizeFunction();
    window.requestAnimationFrame(renderFunction);
};
