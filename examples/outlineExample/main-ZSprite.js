/** IMPORTS */
import * as RC from "../../src/RenderCore.js";


const nearPlane = 0.1;
const farPlane = 1000000;


/** CONTROL PARAMETERS */
const CoreControl = {
    //plain
    canvas: undefined,
    scene: undefined,
    camera: undefined,
    renderer: undefined,
    renderQueue: undefined,

    //util
    stopwatch: {currTime: 0, prevTime: 0, deltaTime: 0},
    keyboard: {keyboardInput: undefined, keyboardTranslation: {x: 0, y: 0, z: 0}, keyboardRotation: {x: 0, y: 0, z: 0}},
    mouse: {mouseInput: undefined},
    cameraControl: {regularCameraControl: undefined, orbitalCameraControl: undefined, activeCameraControl: true},
    keyMap: {
        ROT_X_NEG: 40,
        ROT_X_POS: 38,
        ROT_Y_NEG: 39,
        ROT_Y_POS: 37,
        //ROT_Z_NEG: 69,
        ROT_Z_NEG: undefined,
        //ROT_Z_POS: 81,
        ROT_Z_POS: undefined,

        MV_X_NEG: 65,
        MV_X_POS: 68,
        //MV_Y_NEG: 17,
        MV_Y_NEG: 81,
        //MV_Y_POS: 32,
        MV_Y_POS: 69,
        MV_Z_NEG: 87,
        MV_Z_POS: 83,
    },

    //managers
    canvasManager: undefined,
    sceneManager: undefined,
    cameraManager: undefined,
    rendererManager: undefined,
    renderQueueManager: undefined,

    //cores
    meshCore: undefined,

    //input object
    input: {
        keyboard: undefined,
        navigators: {
            rotation: undefined,
            translation: undefined
        },
        mouse: undefined,
        gamepads: undefined,
        multiplier: 1
    },

    loadTexturesAndInit: function(){
        let pthis = this;

        this.mgrLoader = new RC.LoadingManager(function() {
            console.log("LOADER MGR DONE");
            pthis.initializeCore();
            resizeFunction();
            window.requestAnimationFrame(function() { CoreControl.render() });
        });

        let new_la_tex_foo = function(img) {
            return new RC.Texture(
                img, 
                RC.Texture.WRAPPING.ClampToEdgeWrapping,
                RC.Texture.WRAPPING.ClampToEdgeWrapping,
                RC.Texture.FILTER.LinearFilter,
                RC.Texture.FILTER.LinearFilter,
                RC.Texture.FORMAT.LUMINANCE_ALPHA,
                RC.Texture.FORMAT.LUMINANCE_ALPHA,
                RC.Texture.TYPE.UNSIGNED_BYTE,
                img.width,
                img.height
            );
        };
        let load_tex_foo = function(fname, mname) {
            new RC.ImageLoader(pthis.mgrLoader).load("../common/textures/" + fname, function(img) {
                pthis[mname] = new_la_tex_foo(img);
            });
        };
        load_tex_foo("dot-32a.png", "texDot");
        load_tex_foo("brush-32a.png", "texBrush");
        load_tex_foo("star5-32a.png", "texStar");

        // Instancing, passing position for each instance in RGBA32F texture, A not used.
        let Nx = 32;
        let Ny = 4;
        let N = Nx * Ny;
        let arr = new Float32Array(N * 4);
        for (let i = 0; i < N; ++i) {
            arr[4*i]     = 3 * Math.cos(0.2 * i);
            arr[4*i + 1] = 3 * Math.sin(0.2 * i);
            arr[4*i + 2] = 0.2 * i;
            // fourth / A value left for unsigned-char encoded RGBA color.
            // Or this could be extended for spriteSize as well.
            arr[4*i + 3] = 0;
        }
        this.tex_insta_num = N;
        this.tex_insta_pos = new RC.Texture(
            arr, 
            RC.Texture.WRAPPING.ClampToEdgeWrapping,
            RC.Texture.WRAPPING.ClampToEdgeWrapping,
            RC.Texture.FILTER.NearestFilter,
            RC.Texture.FILTER.NearestFilter,
            // RC.Texture.FORMAT.R32F,
            // RC.Texture.FORMAT.R32F,
            // RC.Texture:TYPE.FLOAT,
            RC.Texture.FORMAT.RGBA32F,
            RC.Texture.FORMAT.RGBA,
            RC.Texture.TYPE.FLOAT,
            Nx,
            Ny
        );
        this.tex_insta_pos.flipy = false;

        // Testing creation of texture from JS array, simple checker pattern.
        let at = new Uint8Array(2 * 2 * 2);
        at[0] = at[6] = 255; // luminance
        at[1] = at[7] = 255; // alpha
        this.tex_checker_2x2 = new RC.Texture(
            at, 
            RC.Texture.WRAPPING.ClampToEdgeWrapping,
            RC.Texture.WRAPPING.ClampToEdgeWrapping,
            RC.Texture.FILTER.NearestFilter,
            RC.Texture.FILTER.NearestFilter,
            // RC.Texture.FILTER.LinearFilter,
            // RC.Texture.FILTER.LinearFilter,
            RC.Texture.FORMAT.LUMINANCE_ALPHA,
            RC.Texture.FORMAT.LUMINANCE_ALPHA,
            RC.Texture.TYPE.UNSIGNED_BYTE,
            2,
            2
        );

        // Testing index array for ZLine prototype (using points from insta points)
        let la = new Int32Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
        this.tex_line_test = new RC.Texture(
            la, 
            RC.Texture.WRAPPING.ClampToEdgeWrapping,
            RC.Texture.WRAPPING.ClampToEdgeWrapping,
            RC.Texture.FILTER.NearestFilter,
            RC.Texture.FILTER.NearestFilter,
            RC.Texture.FORMAT.R32I,
            RC.Texture.FORMAT.RED_INTEGER,
            RC.Texture.TYPE.INT,
            8,
            2
        );
        this.tex_line_test.flipy = false;
        this.tex_line_num = 16;
    },

    /** INIT CORE */
    initializeCore: function(){
        this.canvas = this.initializeCanvas();
        this.canvasManager = this.initializeCanvasManager(this.canvas);

        this.renderer = this.initializeRenderer(this.canvas);
        this.renderQueue = this.initializeRenderQueue(this.renderer);
        this.rendererManager = this.initializeRendererManager(this.renderer);
        this.renderQueueManager = this.initializeRenderQueueManager(this.renderQueue);

        this.scene = this.createDefaultScene();
        this.sceneManager = this.createSceneManager(this.scene);

        this.camera = this.createDefaultCamera(this.canvas);
        this.cameraManager = this.createCameraManager(this.camera, this.keyMap);
    },

    initializeCanvas: function(){
        return new RC.Canvas(document.body);
    },
    initializeCanvasManager(canvas){
        const canvasManager = new RC.CanvasManager(document.body);
        canvasManager.addCanvas(canvas);
        canvasManager.activeCanvas = canvas;

        return canvasManager;
    },

    initializeRenderer: function(canvas){
        const renderer = new RC.MeshRenderer(canvas, RC.WEBGL2, {antialias: false, stencil: false});
        renderer.clearColor = "#ffffff00";
        renderer.addShaderLoaderUrls("../../src/shaders");

        RC.GLManager.sCheckFrameBuffer = false;
        // Would require an additional render-queue and pass to render into Uin32 buffer.
        // RC.PickingShaderMaterial.DEFAULT_PICK_MODE = RC.PickingShaderMaterial.PICK_MODE.UINT;
        // renderer.pickObject3D = true;

        return renderer;
    },
    initializeRenderQueue: function(renderer){
        const renderQueue = new RC.RenderQueue(renderer);

        renderQueue.pushRenderPass(RenderPass_MainShader); //normal scene render
        renderQueue.pushRenderPass(RenderPass_MainMulti); //render normals, view direction, depth, ... of outlined objects
        renderQueue.pushRenderPass(RenderPass_Outline); //computes outline based on multi render pass
        renderQueue.pushRenderPass(RP_GaussH);
        renderQueue.pushRenderPass(RP_GaussV);
        renderQueue.pushRenderPass(RP_Blend);
        // renderQueue.pushRenderPass(RP_ToneMapToScreen);
        return renderQueue;
    },
    initializeRendererManager: function(renderer){
        const rendererManager = new RC.RendererManager();
        rendererManager.addRenderer(renderer);
        rendererManager.activeRenderer = renderer;

        return rendererManager;
    },
    initializeRenderQueueManager: function(renderQueue){
        const renderQueueManager = new RC.RenderQueueManager();
        renderQueueManager.addRenderQueue(renderQueue);
        renderQueueManager.activeRenderQueue = renderQueue;

        return renderQueueManager;
    },

    createDefaultScene: function(){
        const scene = this.createEmptyScene();

        const aLight = new RC.AmbientLight(new RC.Color("#FFFFFF"), 0.2);
        scene.add(aLight);

        const pLight1 = new RC.PointLight(new RC.Color("#FFFFFF"), 0.5);
        pLight1.position.set(0, 0, 4);
        scene.add(pLight1);

        const pLight2 = new RC.PointLight(new RC.Color("#FFFFFF"), 0.5);
        pLight2.position.set(0, 0, -4);
        scene.add(pLight2);

        const grid1 = new RC.Grid(undefined, undefined, 1.0, 10.0);
        grid1.geometry.computeVertexNormals();
        scene.add(grid1);


        //normal objects
        const cube1 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube1.position.set(-4, 4, 0);
        cube1.material = new RC.MeshPhongMaterial();
        cube1.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube1);
        const cube2 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube2.position.set(0, 4, 0);
        cube2.material = new RC.MeshPhongMaterial();
        cube2.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube2);
        const cube3 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube3.position.set(4, 4, 0);
        cube3.material = new RC.MeshPhongMaterial();
        cube3.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube3);
        const cube4 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube4.position.set(-4, 0, 0);
        cube4.material = new RC.MeshPhongMaterial();
        cube4.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube4);
        const cube5 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube5.position.set(0, 0, 0);
        cube5.material = new RC.MeshPhongMaterial();
        cube5.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube5);
        const cube6 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube6.position.set(4, 0, 0);
        cube6.material = new RC.MeshPhongMaterial();
        cube6.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube6);
        const cube7 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube7.position.set(-4, -4, 0);
        cube7.material = new RC.MeshPhongMaterial();
        cube7.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube7);
        const cube8 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube8.position.set(0, -4, 0);
        cube8.material = new RC.MeshPhongMaterial();
        cube8.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube8);
        const cube9 = new RC.Cube(1.9, new RC.Color().setColorName("purple"));
        cube9.position.set(4, -4, 0);
        cube9.material = new RC.MeshPhongMaterial();
        cube9.material.emissive = new RC.Color(0, 0, 0);
        scene.add(cube9);


        let sm = new RC.ZSpriteBasicMaterial( { SpriteMode: RC.SPRITE_SPACE_WORLD, SpriteSize: [.5, .5],
                                                color: new RC.Color(0, 1, 0),
                                                emissive: new RC.Color(0, 1, 0),
                                                diffuse: new RC.Color(0, 0, 0) } );
        sm.transparent = true;
        // sm.opacity = 0.5;
        // sm.depthWrite = false;
        sm.addMap(this.texDot);
        sm.addInstanceData(this.tex_insta_pos);

        let sprite = new RC.ZSprite(null, sm);
        sprite.position.set(0, 0, -12.8);
        sprite.frustumCulled = false; // need a way to speciy bounding box/sphere !!!
        sprite.instanced = true;
        sprite.instanceCount = this.tex_insta_num;
        sprite.drawOutline = true;
        // outline only 100-th and first 10 odd ones, skipping instance 0.
        sprite.outlineMaterial.outline_instances_setup([100, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
        scene.add(sprite);

        let sm2 = new RC.ZSpriteBasicMaterial( { SpriteMode: RC.SPRITE_SPACE_WORLD, SpriteSize: [8, 8],
                                                 color: new RC.Color(0, 0, 1),
                                                 emissive: new RC.Color(0, 0, 1),
                                                 diffuse: new RC.Color(0, 0, 0) } );
        sm2.transparent = true;
        // sm2.depthWrite = false;
        sm2.addMap(this.texStar);
        let sprite2 = new RC.ZSprite(null, sm2);
        sprite2.position.set(5, -5, 5);
        sprite2.drawOutline = true;
        scene.add(sprite2);

        let sm3 = new RC.ZSpriteBasicMaterial( { SpriteMode: RC.SPRITE_SPACE_SCREEN, SpriteSize: [128, 128],
                                                 color: new RC.Color(1, 0, 0.25),
                                                 emissive: new RC.Color(1, 0, 0),
                                                 diffuse: new RC.Color(0, 0, 0) } );
        sm3.transparent = true;
        // sm3.depthWrite = false;
        sm3.addMap(this.tex_checker_2x2);
        let sprite3 = new RC.ZSprite(null, sm3);
        sprite3.position.set(5, 5, 5);
        sprite3.drawOutline = true;
        scene.add(sprite3);

        let sm4 = new RC.ZSpriteBasicMaterial( { SpriteMode: RC.SPRITE_SPACE_SCREEN, SpriteSize: [256, 256],
                                                 color: new RC.Color(1, 0, 0),
                                                 emissive: new RC.Color(0, 1, 0),
                                                 diffuse: new RC.Color(0, 0, 0) } );
        sm4.transparent = true;
        // sm4.depthWrite = false;
        sm4.addMap(this.texBrush);
        let sprite4 = new RC.ZSprite(null, sm4);
        sprite4.position.set(-5, 5, 5);
        sprite4.drawOutline = true;
        scene.add(sprite4);

        let lm1 = new RC.ZSpriteBasicMaterial( { SpriteMode: RC.SPRITE_SPACE_WORLD,
                                                 SpriteSize: [8, 8],
                                                 color: new RC.Color(1, 0, 0),
                                                 emissive: new RC.Color(0.2, 0, 0.2),
                                                 diffuse: new RC.Color(0, 0, 1) } );
        lm1.addInstanceData(this.tex_insta_pos);
        lm1.addInstanceData(this.tex_line_test);
        lm1.programName = "basic_zline";
        // lm1.side: RC.FRONT_AND_BACK_SIDE;
        // lm1.transparent = true;
        lm1.setUniform("u_OffsetSegs", 3);
        // lm1.setUniform("u_OffsetLineInfo", 999); // not used
        let xy0 = new RC.Vector2(0,  0.5);
        let xy1 = new RC.Vector2(1, -0.5);
        let line1 = new RC.ZSprite(RC.Quad.makeGeometry(xy0, xy1, false, false, false), lm1);
        line1.frustumCulled = false; // need a way to speciy bounding box/sphere !!!
        line1.instanced = true;
        line1.instanceCount = this.tex_line_num;
        line1.position.set(0, 0, -12.8);
        scene.add(line1);

        //outlined objects
        const cube_outlined = new RC.Cube(2, new RC.Color().setColorName("purple"));
        cube_outlined.drawOutline = true;
        cube_outlined.position.set(1, 1, 1);
        cube_outlined.material = new RC.MeshPhongMaterial();
        scene.add(cube_outlined);

        const cube_outlined2 = new RC.Cube(2, new RC.Color().setColorName("purple"));
        cube_outlined2.drawOutline = true;
        cube_outlined2.position.set(-1, -1, -1);
        cube_outlined2.material = new RC.MeshPhongMaterial();
        scene.add(cube_outlined2);

        return scene;
    },

    createEmptyScene: function(){
        return new RC.Scene();
    },

    createSceneManager: function(scene){
        const sceneManager = new RC.SceneManager();
        sceneManager.addScene(scene);
        sceneManager.activeScene = scene;

        return sceneManager;
    },

    createDefaultCamera: function(canvas){
        const camera = new RC.PerspectiveCamera(75, canvas.width/canvas.height, nearPlane, farPlane);
        camera.position = new RC.Vector3(0, 0, 8);
        camera.position = new RC.Vector3(-10, 10, 10);
        camera.lookAt(new RC.Vector3(0, 0, 0), new RC.Vector3(0, 1, 0));

        return camera;
    },

    createCameraManager: function(camera, keyMap){
        const cameraManager = new RC.CameraManager();
        cameraManager.addFullOrbitCamera(camera, new RC.Vector3(0, 0, 0));
        cameraManager.camerasControls[camera._uuid].keyMap = keyMap;
        cameraManager.activeCamera = camera;

        return cameraManager;
    },


    /** RENDER LOOP */
    render: function () {
        window.requestAnimationFrame(function(){CoreControl.render()});

        this.stopwatch.currTime = performance.now();
        this.stopwatch.deltaTime = (this.stopwatch.currTime - this.stopwatch.prevTime);
        this.stopwatch.prevTime = this.stopwatch.currTime;


        //CAMERA TRANSFORM ANIMATION
        const input = {
            keyboard: this.keyboard.keyboardInput.update(),
            navigators: {
                rotation: this.keyboard.keyboardRotation,
                translation: this.keyboard.keyboardTranslation
            },
            mouse: this.mouse.mouseInput.update(),
            gamepads: undefined,
            multiplier: 1
        };

        //camera manager
        this.cameraManager.update(input, this.stopwatch.deltaTime);


        //RENDER PIPE
        //use render queue (multiple composite render passes)
        this.renderQueueManager.activeRenderQueue.render();
    }

};


/** INIT MAIN */
window.onload = function(){
    window.addEventListener("resize", resizeFunction, false);
    // MT: Picking through MeshRenderer only works for Uint32 picking, requires a different render pass
    //     with appropriate output format. It can be fixed back. But this demo does not assign pick IDs.
    /*

    window.addEventListener("mouseup", function(event){
        //CoreControl.rendererManager.activeRenderer.pick(RC.MouseInput.instance.cursor.position.x, RC.MouseInput.instance.cursor.position.y);
        CoreControl.rendererManager.activeRenderer.pick(event.clientX, event.clientY, function(pickedColor){
            console.log(pickedColor);
        });
    }, false);
    */

    //INPUT
    CoreControl.keyboard.keyboardInput = RC.KeyboardInput.instance;
    CoreControl.mouse.mouseInput = RC.MouseInput.instance;
    CoreControl.mouse.mouseInput.setSourceObject(window);


    //INIT
    // CoreControl.initializeCore();
    CoreControl.loadTexturesAndInit();

    //RENDER
    // window.requestAnimationFrame(function(){CoreControl.render()});
};


const resizeFunction = function () {
    const activeCanvas = CoreControl.canvasManager.activeCanvas;

    // Update canvas size
    activeCanvas.updateSize();

    // Update camera aspect ratio and renderer viewport
    CoreControl.cameraManager.activeCamera.aspect = activeCanvas.width / activeCanvas.height;
    CoreControl.rendererManager.activeRenderer.updateViewport(activeCanvas.width, activeCanvas.height);

    const RQs = CoreControl.renderQueueManager.activeRenderQueue._renderQueue;
    for(let RQ = 0; RQ < RQs.length; RQ++){
        RQs[RQ].viewport = { width: activeCanvas.width, height: activeCanvas.height };
    }
};



function iterateSceneR(object, callback) {
    if (object === null || object === undefined) {
        return;
    }

    if(object.children.length > 0){
        for (let i = 0; i < object.children.length; i++) {
            iterateSceneR(object.children[i], callback);
        }
    }

    callback(object);
}



const OriginalMats = [];
const MultiMats = [];
const InstaCountMap = new Map();
const RenderPass_MainShader = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.BASIC,

    // Initialize function
    function (textureMap, additionalData) {
        iterateSceneR(CoreControl.scene, function(object){
            if(object.drawOutline) {
                OriginalMats.push(object.material);
            }
        });
    },

    // Preprocess function
    function (textureMap, additionalData) {
        let m_index = 0;

        iterateSceneR(CoreControl.scene, function(object){
            if(object.drawOutline) {
                object.material = OriginalMats[m_index];
                m_index++;

                object.visible = true;
            }else{
                object.visible = true;
            }
        });

        return { scene: CoreControl.scene, camera: CoreControl.camera };
    },

    function(textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    { width: undefined, height: undefined },

    // Bind depth texture to this ID
    "depthDefaultDefaultMaterials",

    [
        {id: "color_main", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
    ]
);

const multi = new RC.CustomShaderMaterial("GBufferMini");
multi.lights = false;
multi.side = RC.FRONT_AND_BACK_SIDE;
const RenderPass_MainMulti = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.BASIC,

    // Initialize function
    function (textureMap, additionalData) {
        iterateSceneR(CoreControl.scene, function(object){
            if(object.drawOutline) {
                if (object._outlineMaterial)
                    MultiMats.push(object._outlineMaterial);
                else
                    MultiMats.push(multi);
                if (object._instanced && object._outlineMaterial.getUniform("u_OutlineGivenInstances"))
                    InstaCountMap.set(object, object._instanceCount);
            }
        });
    },

    // Preprocess function
    function (textureMap, additionalData) {
        let m_index = 0;

        iterateSceneR(CoreControl.scene, function(object){
            if(object.drawOutline) {
                object.material = MultiMats[m_index];
                m_index++;
                if (object._instanced && object._outlineMaterial.getUniform("u_OutlineGivenInstances"))
                    object._instanceCount = object._outlineMaterial.getAttribute("a_OutlineInstances").count();
                object.visible = true;
            }else if (object instanceof RC.Scene || object instanceof RC.Group){
                object.visible = true;
            }else{
                object.visible = false;
            }
        });

        return { scene: CoreControl.scene, camera: CoreControl.camera };
    },

    function(textureMap, additionalData) {
        for (const [key, value] of InstaCountMap) {
            key._instanceCount = value;
        }
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    { width: undefined, height: undefined },

    // Bind depth texture to this ID
    "depthDefaultMultiMaterials",

    [
        {id: "normal", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
        {id: "viewDir", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
    ]
);

const outlineMaterial = new RC.CustomShaderMaterial("outline",
  { scale: 1,
    edgeColor: [0.5, 0.01, 0.25, 1.0],
    _DepthThreshold: 6.0, _NormalThreshold: 0.4,
    _DepthNormalThreshold: 0.5, _DepthNormalThresholdScale: 7.0 }
);
outlineMaterial.lights = false;
const RenderPass_Outline = new RC.RenderPass(
    // Rendering pass type
    RC.RenderPass.POSTPROCESS,

    // Initialize function
    function (textureMap, additionalData) {
    },

    // Preprocess function
    function (textureMap, additionalData) {
        return {material: outlineMaterial,
                textures: [textureMap["depthDefaultMultiMaterials"],
                           textureMap["normal"],
                           textureMap["viewDir"]]};
    },

    function(textureMap, additionalData) {
    },

    // Target
    RC.RenderPass.TEXTURE,

    // Viewport
    { width: undefined, height: undefined },

    // Bind depth texture to this ID
    null,

    [
        {id: "color_outline", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
    ]
);

const RP_GaussH_mat = new RC.CustomShaderMaterial("gaussBlur", {horizontal: true, power: 4.0});
RP_GaussH_mat.lights = false;

const RP_GaussH = new RC.RenderPass(
    RC.RenderPass.POSTPROCESS,
    (textureMap, additionalData) => {},
    (textureMap, additionalData) => {
        return {material: RP_GaussH_mat, textures: [textureMap["color_outline"]]};
    },
    (textureMap, additionalData) => {},
    RC.RenderPass.TEXTURE,
    { width: undefined, height: undefined },
    null,
    [
        {id: "gauss_h", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
    ]
);

const RP_GaussV_mat = new RC.CustomShaderMaterial("gaussBlur", {horizontal: false, power: 4.0});
RP_GaussV_mat.lights = false;

const RP_GaussV = new RC.RenderPass(
    RC.RenderPass.POSTPROCESS,
    (textureMap, additionalData) => {},
    (textureMap, additionalData) => {
        return {material: RP_GaussV_mat, textures: [textureMap["gauss_h"]]};
    },
    (textureMap, additionalData) => {},
    RC.RenderPass.TEXTURE,
    { width: undefined, height: undefined },
    null,
    [
        {id: "gauss_hv", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
    ]
);

const RP_Blend_mat = new RC.CustomShaderMaterial("blendingAdditive");
RP_Blend_mat.lights = false;

const RP_Blend = new RC.RenderPass(
    RC.RenderPass.POSTPROCESS,
    (textureMap, additionalData) => {},
    (textureMap, additionalData) => {
        return {material: RP_Blend_mat,
                textures: [textureMap["gauss_hv"],
                           textureMap["color_main"]]};
    },
    (textureMap, additionalData) => {},
    // Target
    RC.RenderPass.SCREEN,
    { width: undefined, height: undefined },
    null,
    [
        {id: "color_final", textureConfig: RC.RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
    ]
);

const RP_ToneMapToScreen_mat = new RC.CustomShaderMaterial("ToneMapping",
    { MODE: 1.0, gamma: 1.0, exposure: 2.0 });
    // u_clearColor set from MeshRenderer
RP_ToneMapToScreen_mat.lights = false;

const RP_ToneMapToScreen = new RC.RenderPass(
    RC.RenderPass.POSTPROCESS,
    function (textureMap, additionalData) {},
    function (textureMap, additionalData) {
        return { material: RP_ToneMapToScreen_mat,
                 textures: [ textureMap["color_final"] ] };
    },
    function (textureMap, additionalData) {},
    RC.RenderPass.SCREEN,
    { width: undefined, height: undefined }
);
