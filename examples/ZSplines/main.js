import * as RC from "../../src/RenderCore.js";

import { _Math } from "../..//src/math/Math.js";
import { Vector3 } from "../../src/math/Vector3.js";

const canvas = new RC.Canvas(document.body);

const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2);
renderer.clearColor = "#ffffff";
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
const camera = new RC.PerspectiveCamera(75, canvas.width / canvas.height, 0.125, 200);

camera.position.set(0, 0, 2);
camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));
camera.aspect = canvas.width / canvas.height;


const dLight = new RC.DirectionalLight(
    new RC.Color("#FFFFFF"),
    0.94,
    {
        castShadows: false
    }
);
dLight.rotateX(0.1);
scene.add(dLight);

const pLight1 = new RC.PointLight(new RC.Color("#FFFFFF"), 0.2);
pLight1.position.set(0, 0, 0);
scene.add(pLight1);



const RenderPass_Geometry = new RC.RenderPass(
    RC.RenderPass.BASIC,
    (textureMap, additionalData) => {},
    (textureMap, additionalData) => {
        return {scene: scene, camera: camera};
    },
    (textureMap, additionalData) => {},
    RC.RenderPass.TEXTURE,
    {width: canvas.width, height: canvas.height},
    // Bind depth texture to this ID
    "depthDefaultDefaultMaterials",

    [
        {id: "position", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
        {id: "normal", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
        {id: "normalTheta", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
        {id: "binormal", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
        {id: "color", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
    ]
);
console.log("canvas.", canvas.width, canvas.height)
canvas.width
const ssaoMaterial = new RC.CustomShaderMaterial("SSAO",
{
    radius: 15.0,
    bias: 0.01,
    magnitude: 0.5,
    contrast: 2.5,
    "samples[0]": generateSamples(32),
    "noise[0]": generateNoise(16),
    PMat_o: [1.7886792452830194, 0, 0, 0, 0, 1.0000000000000002, 0, 0, 0, 0, -1.0000152589054787, -1, 0, 0, -0.12500095368159242, 0]
});

ssaoMaterial.addSBValue("NUM_SAMPLES", 32);
ssaoMaterial.addSBValue("NUM_NOISE", 16);

ssaoMaterial.lights = false; 
ssaoMaterial.depthTest = true;
const RenderPass_SSAO = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.POSTPROCESS,

    // Initialize function
    (textureMap, additionalData) => {},

    // Preprocess function
    (textureMap, additionalData) => {
        return {
            material: ssaoMaterial, 
            textures: [
                textureMap["position"],
                textureMap["normal"]
            ]
        };
    },

    (textureMap, additionalData) => {},

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    {width: canvas.width, height: canvas.height},

    // Bind depth texture to this ID
    null,

    [ // clearColorArray: this.clear_zero_f32arr 
        {id: "SSAO_out", textureConfig: RC.RenderPass.DEFAULT_R8_TEXTURE_CONFIG}
    ]
);

const sb = new RC.CustomShaderMaterial("simpleBlur");

const RenderPass_SimpleBlur = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.POSTPROCESS,

    // Initialize function
    function (textureMap, additionalData) {
    },

    // Preprocess function
    function (textureMap, additionalData) {
        return {
            material: sb, 
            textures: [
                textureMap["SSAO_out"]
            ]
        };
    },

    function (textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    {width: canvas.width, height: canvas.height},

    // Bind depth texture to this ID
    null,

    [
        {id: "SSAO_blur", textureConfig: RC.RenderPass.DEFAULT_R8_TEXTURE_CONFIG}
    ]
);

const lightingMaterial = new RC.CustomShaderMaterial("ZSplinesLighting");
lightingMaterial.lights = false; 
const RenderPass_Lighting = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.POSTPROCESS,

    // Initialize function
    (textureMap, additionalData) => {},

    // Preprocess function
    (textureMap, additionalData) => {
        return {
            material: lightingMaterial, 
            textures: [
                textureMap["position"],
                textureMap["normalTheta"],
                textureMap["binormal"],
                textureMap["color"],
                textureMap["SSAO_out"],
            ]
        };
    },

    (textureMap, additionalData) => {},

    // Target
    RC.RenderPass.SCREEN,

    // Viewport
    {width: canvas.width, height: canvas.height},

    // Bind depth texture to this ID
    null,

    [ // clearColorArray: this.clear_zero_f32arr 
        {id: "null", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
    ]
);


let renderQueue = new RC.RenderQueue(renderer);
renderQueue.pushRenderPass(RenderPass_Geometry);
renderQueue.pushRenderPass(RenderPass_SSAO);
renderQueue.pushRenderPass(RenderPass_SimpleBlur);
renderQueue.pushRenderPass(RenderPass_Lighting);




let lineStrip;
let limitT = 0.0;
let limitT_Max = 0.0;
let limitT_Min = 0.0;
let max_T = 0;
let min_T = 100000;
let animate = false;
// C:\CMS-git\RenderCore\examples\ZSplines\all-particles-Mix50.json
fetch('./primaries-Mix500-origin.json')
    .then((response) => response.json())
    .then(data => {
        let tracksData = [];
        let tracksTime = [];
        let trackEnergy = [];
        let trackEnergyFiltered = [];

        let min_X = 100000, min_Y = 100000, min_Z = 100000;
        let max_X = -100000, max_Y = -100000, max_Z = -100000;

        let minp_X = 100000, minp_Y = 100000, minp_Z = 100000;
        let maxp_X = -100000, maxp_Y = -100000, maxp_Z = -100000;

        let max_E = -100000;

        data.forEach(track => {
            if (track.m_pdg != 0
                && Math.sqrt(Math.pow(track.m_x_beg.fX - track.m_x_end.fX, 2) + Math.pow(track.m_x_beg.fY - track.m_x_end.fY, 2) + Math.pow(track.m_x_beg.fZ - track.m_x_end.fZ, 2)) > 0.5) {

                if (track.m_x_beg.fX < min_X)
                    min_X = track.m_x_beg.fX;
                if (track.m_x_end.fX < min_X)
                    min_X = track.m_x_end.fX;

                if (track.m_x_beg.fY < min_Y)
                    min_Y = track.m_x_beg.fY;
                if (track.m_x_end.fY < min_Y)
                    min_Y = track.m_x_end.fY;

                if (track.m_x_beg.fZ < min_Z)
                    min_Z = track.m_x_beg.fZ;
                if (track.m_x_end.fZ < min_Z)
                    min_Z = track.m_x_end.fZ;

                if (track.m_p_beg.fX < minp_X)
                    minp_X = track.m_p_beg.fX;
                if (track.m_p_end.fX < minp_X)
                    minp_X = track.m_p_end.fX;

                if (track.m_p_beg.fY < minp_Y)
                    minp_Y = track.m_p_beg.fY;
                if (track.m_p_end.fY < minp_Y)
                    minp_Y = track.m_p_end.fY;

                if (track.m_p_beg.fZ < minp_Z)
                    minp_Z = track.m_p_beg.fZ;
                if (track.m_p_end.fZ < minp_Z)
                    minp_Z = track.m_p_end.fZ;

                if (track.m_x_beg.fT < min_T)
                    min_T = track.m_x_beg.fT;
                if (track.m_x_end.fT < min_T)
                    min_T = track.m_x_end.fT;

                // finding max
                if (track.m_x_beg.fX > max_X)
                    max_X = track.m_x_beg.fX;
                if (track.m_x_end.fX > max_X)
                    max_X = track.m_x_end.fX;

                if (track.m_x_beg.fY > max_Y)
                    max_Y = track.m_x_beg.fY;
                if (track.m_x_end.fY > max_Y)
                    max_Y = track.m_x_end.fY;

                if (track.m_x_beg.fZ > max_Z)
                    max_Z = track.m_x_beg.fZ;
                if (track.m_x_end.fZ > max_Z)
                    max_Z = track.m_x_end.fZ;

                if (track.m_p_beg.fX > maxp_X)
                    maxp_X = track.m_p_beg.fX;
                if (track.m_p_end.fX > maxp_X)
                    maxp_X = track.m_p_end.fX;

                if (track.m_p_beg.fY > maxp_Y)
                    maxp_Y = track.m_p_beg.fY;
                if (track.m_p_end.fY > maxp_Y)
                    maxp_Y = track.m_p_end.fY;

                if (track.m_p_beg.fZ > maxp_Z)
                    maxp_Z = track.m_p_beg.fZ;
                if (track.m_p_end.fZ > maxp_Z)
                    maxp_Z = track.m_p_end.fZ;

                if (track.m_x_beg.fT > max_T)
                    max_T = track.m_x_beg.fT;
                if (track.m_x_end.fT > max_T)
                    max_T = track.m_x_end.fT;

                if (track.m_p_beg.fT > max_E)
                    max_E = track.m_p_beg.fT;
                if (track.m_p_end.fT > max_E)
                    max_E = track.m_p_end.fT;
            }

        });

        data.forEach(track => {
            if (track.m_pdg != 0 
                && Math.sqrt(Math.pow(track.m_x_beg.fX - track.m_x_end.fX, 2) + Math.pow(track.m_x_beg.fY - track.m_x_end.fY, 2)+ Math.pow(track.m_x_beg.fZ - track.m_x_end.fZ, 2))> 0.5
                && (track.m_g4_level == 1  || track.m_g4_level == 2 || track.m_g4_level == 3 || track.m_g4_level == 4 || track.m_g4_level == 5 )) {

                // saving data

                tracksData.push((track.m_x_beg.fX - min_X) / (max_X - min_X));
                tracksData.push((track.m_x_beg.fY - min_Y) / (max_Y - min_Y));
                tracksData.push((track.m_x_beg.fZ - min_Z) / (max_Z - min_Z));

                tracksData.push((track.m_p_beg.fX - minp_X) / (maxp_X - minp_X));
                tracksData.push((track.m_p_beg.fY - minp_Y) / (maxp_Y - minp_Y));
                tracksData.push((track.m_p_beg.fZ - minp_Z) / (maxp_Z - minp_Z));

                tracksData.push((track.m_x_end.fX - min_X) / (max_X - min_X));
                tracksData.push((track.m_x_end.fY - min_Y) / (max_Y - min_Y));
                tracksData.push((track.m_x_end.fZ - min_Z) / (max_Z - min_Z));

                tracksData.push((track.m_p_end.fX - minp_X) / (maxp_X - minp_X));
                tracksData.push((track.m_p_end.fY - minp_Y) / (maxp_Y - minp_Y));
                tracksData.push((track.m_p_end.fZ - minp_Z) / (maxp_Z - minp_Z));

                tracksTime.push(track.m_x_beg.fT);
                tracksTime.push(track.m_x_end.fT);
                tracksTime.push(0.0);

                trackEnergy.push(track.m_p_beg.fT/max_E);
                trackEnergy.push(track.m_p_end.fT/max_E);
                trackEnergy.push(0.0);

                trackEnergyFiltered.push(track.m_p_beg.fT);
                trackEnergyFiltered.push(track.m_p_end.fT);

                

            }

        });

        trackEnergyFiltered = filterOutliers(trackEnergy);
        console.log("trackEnergyFiltered", trackEnergyFiltered.pop());

        let max_ER = trackEnergyFiltered.pop();
        let trackEnergyNormalized = [];
        trackEnergy.forEach(E => {
            trackEnergyNormalized.push(E / 20.0); 
        })

        console.log("tracksTime", tracksTime);

        let guiController = {
            min_time : min_T,
            max_time : max_T,
            animation : false,
            gap: 1,
            fill: 2
          };
        
        let AnimationFolder;
        limitT_Max = max_T;
        limitT_Min = min_T;
        let gui = new dat.GUI();
        gui.add(guiController, "min_time", guiController.min_time, guiController.max_time, 0.01).name("Starting Time")
        .onChange((value) => {
            gui.__controllers[1].min(value);
            if(guiController.max_time < value)
                {guiController.max_time = value;
                 limitT_Max = value;}
            console.log("ON change",gui.__controllers[1]);

            limitT_Min = value;
          });
        gui.add(guiController, "max_time", guiController.min_time, guiController.max_time, 0.01).name("Ending Time").listen()
        .onChange((value) => {
            gui.__controllers[0].max(value);

            limitT_Max = value;
          });
        gui.add(guiController, "animation").name("Animate")
        .onChange((value) => {
            animate = value;

            if(value == false)
            {
                lineStrip.setAnimationPattern(0.0);
                gui.removeFolder(AnimationFolder);

            }
            else
            {
                AnimationFolder = gui.addFolder('Animation');
                AnimationFolder.add(guiController, "gap", 1, 5, 1).name("Gap")
                .onChange((value) => {
                    lineStrip.setGapSize(value);
                  });
                AnimationFolder.add(guiController, "fill", 1, 5, 1).name("Fill")
                .onChange((value) => {
                    lineStrip.setFillSize(value);
                    });
            }
          });

        lineStrip = new RC.ZSplines(tracksData, tracksTime, trackEnergy, 100, 0.01, limitT_Min, limitT_Max)
        lineStrip.position.set(-6.4, -6.1, 1);
        lineStrip.scale.set(12, 12, 12);
        lineStrip.setAnimationPattern(0.0);
        scene.add(lineStrip);

        
    
    });




    


// region Setup keyboard
let keyboardRotation, keyboardTranslation, keyboardInput;
let patternCount = 0;

keyboardRotation = { x: 0, y: 0, z: 0, reset: function () { this.x = 0; this.y = 0; this.z = 0; } };
keyboardTranslation = { x: 0, y: 0, z: 0, reset: function () { this.x = 0; this.y = 0; this.z = 0; } };

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

        if (pressedKeys.has(107)) {  // +
            limitT += 0.01;
            if (limitT > max_T)
                limitT = max_T;
            document.getElementById("limitT").innerHTML = Number(limitT).toPrecision(5);

        }

        if (pressedKeys.has(109)) {  // -
            limitT -= 0.01;
            if (limitT < 0.0)
                limitT = 0.0;

            document.getElementById("limitT").innerHTML = Number(limitT).toPrecision(5);

        }


    });
    // endregion
    
}

function resizeFunction() {
    canvas.updateSize();
    renderer.updateViewport(canvas.width, canvas.height);
}

let count = 0;
function renderFunction() {

    renderer.clearColor = "#ffffff"; 

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

    //camera.rotationX += keyboardRotation.x * dt * 0.0001;
    //camera.rotationY += keyboardRotation.y  * dt * 0.0001;
    //camera.rotationZ += keyboardRotation.z * dt * 0.0001;

    if (lineStrip != null) {
        lineStrip.rotationX += keyboardRotation.x * dt * 0.001;
        lineStrip.rotationY += keyboardRotation.y * dt * 0.0001;
        lineStrip.rotationZ += keyboardRotation.z * dt * 0.001;

        lineStrip.setTimeLimitMin(limitT_Min);
        lineStrip.setTimeLimitMax(limitT_Max);
        
        if(count % 100 == 0 && animate)
        {
            patternCount = patternCount + 0.001;
            lineStrip.setAnimationPattern(patternCount);
        }
        count++
    }

    //console.log("camera.view", camera.modelViewMatrix);



    //renderer.render(scene, camera);
    renderQueue.render();

    window.requestAnimationFrame(renderFunction);
}

function calculateFps() {

    timeNow = new Date();
    fps++;

    if (timeNow - timeLast >= 1000) {
        //Write value in HTML
        //multiply with 1000.0 / (timeNow - timeLast) for accuracy
        document.getElementById("fps").innerHTML = Number(fps * 1000.0 / (timeNow - timeLast)).toPrecision(5);

        //reset
        timeLast = timeNow;
        fps = 0;
    }
}



function generateSamples(numberOfSamples){
    const ssaoSamples = [];

    for (let i = 0; i < numberOfSamples; ++i) {
        const sample = new Vector3(
            Math.random() * 2.0 - 1.0,
            Math.random() * 2.0 - 1.0,
            Math.random()
            ).normalize();

        const rand = Math.random();
        sample.multiplyScalar(rand);


        let scale = i / numberOfSamples;
        scale = _Math.lerp(0.1, 1.0, scale * scale);
        sample.multiplyScalar(scale);

        ssaoSamples.push(sample.x, sample.y, sample.z);
    }

    return ssaoSamples;
}
function generateNoise(numberOfNoise){
    const ssaoNoise = [];

    for (let i = 0; i < numberOfNoise; ++i) {
        const noise = new Vector3(
            Math.random() * 2.0 - 1.0,
            Math.random() * 2.0 - 1.0,
            0.0
            ).normalize();

        ssaoNoise.push(noise.x, noise.y, noise.z);
    }

    return ssaoNoise;
}

function filterOutliers(someArray) {

    if(someArray.length < 4)
      return someArray;
  
    let values, q1, q3, iqr, maxValue, minValue;
  
    values = someArray.slice().sort( (a, b) => a - b);//copy array fast and sort

    console.log("Sorted", values);
  
    if((values.length / 4) % 1 === 0){//find quartiles
      q1 = 1/2 * (values[(values.length / 4)] + values[(values.length / 4) + 1]);
      q3 = 1/2 * (values[(values.length * (3 / 4))] + values[(values.length * (3 / 4)) + 1]);
    } else {
      q1 = values[Math.floor(values.length / 4 + 1)];
      q3 = values[Math.ceil(values.length * (3 / 4) + 1)];
    }
  
    iqr = q3 - q1;
    maxValue = q3 + iqr * 1.5;
    minValue = q1 - iqr * 1.5;
  
    return values.filter((x) => (x >= minValue) && (x <= maxValue));
  }

window.onload = function () {
    window.addEventListener("resize", resizeFunction, false);
    resizeFunction();
    window.requestAnimationFrame(renderFunction);
};

