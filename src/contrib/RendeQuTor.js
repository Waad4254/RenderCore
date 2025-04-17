import {RenderQueue} from '../renderers/RenderQueue.js';
import {RenderPass}  from '../renderers/RenderPass.js';
import {CustomShaderMaterial} from '../materials/CustomShaderMaterial.js';
import * as RC from "../RenderCore.js";
import {FRONT_AND_BACK_SIDE, HIGHPASS_MODE_BRIGHTNESS, HIGHPASS_MODE_DIFFERENCE}
    from '../constants.js';
import { Vector3 } from "../math/Vector3.js";
import { _Math } from "../math/Math.js";

function iterateSceneR(object, callback) {
    if (object === null || object === undefined) {
        return;
    }

    if (object.children.length > 0) {
        for (let i = 0; i < object.children.length; i++) {
            iterateSceneR(object.children[i], callback);
        }
    }

    callback(object);
}

export class RendeQuTor {
    constructor(renderer, scene, camera, overlay_scene)
    {
        this.renderer = renderer;
        this.scene    = scene;
        this.camera   = camera;
        this.ovlscene = overlay_scene;
        this.queue    = new RenderQueue(renderer);
        this.pqueue   = new RenderQueue(renderer);
        this.overlaypqueue   = new RenderQueue(renderer);
        this.vp_w = 0;
        this.vp_h = 0;
        this.pick_radius = 32;
        this.pick_center = 16;

        this.make_PRP_plain();
        this.make_PRP_depth2r();

        this.make_PRP_overlay();
        this.make_PRP_depth2r_overlay();

        this.renderer.preDownloadPrograms(
          [ this.PRP_depth2r_mat.requiredProgram(this.renderer),
            this.PRP_depth2r_overlay_mat.requiredProgram(this.renderer)
          ]);

        this.SSAA_value = 1;

        this.clear_zero_f32arr = new Float32Array([0,0,0,0]);

        this.std_textures = [];
        this.std_tex_cnt  = 0;
        this.std_tex_used = new Set();
    }

    initDirectToScreen()
    {
        this.make_RP_DirectToScreen();
    }

    initSimple(ssaa_val)
    {
        this.SSAA_value = ssaa_val;

        this.make_RP_SSAA_Super();

        this.make_RP_Splines();
        this.make_RP_Splines_IOR();
        this.make_RP_GaussHV();

        this.make_RP_SSAO();

        this.make_RP_blur();

        this.make_RP_GBuffer();
        this.make_RP_Outline();

        this.make_RP_GaussHVandBlend();

        this.make_RP_Overlay();

        // Only one of the next two gets called from the driver.
        this.make_RP_ToScreen();
        this.make_RP_ToneMapToScreen();

        this.RP_GBuffer.obj_list = [];

        this.renderer.preDownloadPrograms(
          [ this.RP_GBuffer_mat.requiredProgram(this.renderer),
            this.RP_Outline_mat.requiredProgram(this.renderer),
            this.RP_GaussH_mat.requiredProgram(this.renderer),
            this.RP_Blend_mat.requiredProgram(this.renderer),
            this.RP_ToScreen_mat.requiredProgram(this.renderer),
            this.RP_ToneMapToScreen_mat.requiredProgram(this.renderer),
            this.RP_SSAO_mat.requiredProgram(this.renderer),
            this.RP_SimpleBlur_mat.requiredProgram(this.renderer),
            this.RP_Splines_Lighting_mat.requiredProgram(this.renderer),
            this.RP_Splines_Color_Mask_mat.requiredProgram(this.renderer),
            this.RP_Splines_Normal_Mask_mat.requiredProgram(this.renderer),
            this.RP_GaussV_Splines_mat.requiredProgram(this.renderer),
            this.RP_GaussH_Splines_mat.requiredProgram(this.renderer),

          ]);
    }

    initFull(ssaa_val)
    {
        this.SSAA_value = ssaa_val;

        this.make_RP_SSAA_Super();
        this.make_RP_HighPassGaussBloom();
        // this.make_RP_SSAA_Down(); this.RP_SSAA_Down.input_texture = "color_bloom";
        this.make_RP_ToScreen();
        this.RP_ToScreen.input_texture = "color_bloom";
    }

    updateViewport(w, h)
    {
        this.vp_w = w;
        this.vp_h = h;
        let vp = { width: w, height: h };
        let rq = this.queue._renderQueue;
        for (let i = 0; i < rq.length; i++)
        {
            rq[i].view_setup(vp);
        }
        // Picking render-passes stay constant.
    }

    //=============================================================================

    pop_std_texture() {
        let tex;
        if (this.std_textures.length == 0) {
            tex = "std_tex_" + this.std_tex_cnt++;
        } else {
            tex = this.std_textures.pop();
        }
        this.std_tex_used.add(tex);
        return tex;
    }

    push_std_texture(tex) {
        this.std_tex_used.delete(tex);
        this.std_textures.push(tex);
    }

    release_std_textures() {
        if (this.std_tex_used.size > 0) {
            // console.log("RendeQuTor releasing std textures", this.std_tex_used.size);
            for (const tex of this.std_tex_used)
                this.std_textures.push(tex);
            this.std_tex_used.clear();
        }
    }

    // ----------

    render_outline()
    {
        let tex_normal = this.pop_std_texture();
        let tex_view_dir = this.pop_std_texture();
        this.RP_GBuffer.outTextures[0].id = tex_normal;
        this.RP_GBuffer.outTextures[1].id = tex_view_dir;

        this.queue.render_pass(this.RP_GBuffer, "GBuffer");

        this.RP_Outline.intex_normal = tex_normal;
        this.RP_Outline.intex_view_dir = tex_view_dir;
        if ( ! this.tex_outline) {
            // First outline, get the texture to accumulate all outlines
            this.tex_outline = this.pop_std_texture();
        } else {
            // Additional outlines, do not clear the accumulatortexture.
            this.RP_Outline.outTextures[0].clearColorArray = null;
        }
        this.RP_Outline.outTextures[0].id = this.tex_outline;

        this.queue.render_pass(this.RP_Outline, "Outline");

        this.push_std_texture(tex_normal);
        this.push_std_texture(tex_view_dir);
    }

    render_main_and_blend_outline()
    {

        let main_is_std = (this.SSAA_value == 1);
        let tex_main = main_is_std ? this.pop_std_texture() : "color_main";

        this.RP_SSAA_Super.outTextures[0].id = tex_main;
        this.queue.render_pass(this.RP_SSAA_Super, "SSAA Super");

        if (this.tex_outline) {
            let tA = this.tex_outline;
            let tB = this.pop_std_texture();

            this.RP_GaussH.intex = tA;
            this.RP_GaussH.outTextures[0].id = tB;
            this.queue.render_pass(this.RP_GaussH, "GaussH");

            this.RP_GaussV.intex = tB;
            this.RP_GaussV.outTextures[0].id = tA;
            this.queue.render_pass(this.RP_GaussV, "GaussV");

            this.RP_Blend.intex_outline_blurred = tA;
            this.RP_Blend.intex_main = tex_main;
            this.RP_Blend.outTextures[0].id = tB;
            this.queue.render_pass(this.RP_Blend, "Blend");

            if (main_is_std) this.push_std_texture(tex_main);

            this.push_std_texture(this.tex_outline);
            this.RP_Outline.outTextures[0].clearColorArray = this.clear_zero_f32arr;
            this.tex_outline = null;

            this.tex_final = tB;
            this.tex_final_push = true;
        } else {
            this.tex_final = tex_main;
            this.tex_final_push = main_is_std;
        }
    }

    render_Splines_IOR_and_blend_it(clusters)
    {
        let tex_position_Splines = [];
        let tex_normal_Splines = [];
        let tex_normalTheta_Splines = [];
        let tex_binormal_Splines = [];
        let tex_color_Splines = [];
        let tex_depth_Splines = [];
        let tex_mask_Splines = [];
        let tex_mask_Splines_final = [];

        let tex_depth_Splines_final = this.pop_std_texture();
        let tex_position_Splines_final = this.pop_std_texture();
        let tex_normalTheta_Splines_final = this.pop_std_texture();
        let tex_normal_Splines_final = this.pop_std_texture();
        let tex_binormal_Splines_final = this.pop_std_texture();
        let tex_color_Splines_final = this.pop_std_texture();
        let tex_gaussian = this.pop_std_texture();




        for (let i = 0; i< clusters; i++)
        {
            this.cluster = i;

            tex_position_Splines[i] = this.pop_std_texture();
            tex_normal_Splines[i] = this.pop_std_texture();
            tex_normalTheta_Splines[i] = this.pop_std_texture();
            tex_binormal_Splines[i] = this.pop_std_texture();
            tex_color_Splines[i] = this.pop_std_texture();
            tex_mask_Splines[i] = this.pop_std_texture();
            tex_mask_Splines_final[i] = this.pop_std_texture();
            tex_depth_Splines[i] = this.RP_Splines.outDepthID;

            this.RP_Splines.outTextures[0].id = tex_position_Splines[i];
            this.RP_Splines.outTextures[1].id = tex_normal_Splines[i];
            this.RP_Splines.outTextures[2].id = tex_normalTheta_Splines[i];
            this.RP_Splines.outTextures[3].id = tex_binormal_Splines[i];
            this.RP_Splines.outTextures[4].id = tex_color_Splines[i];
            this.RP_Splines.outTextures[6].id = tex_mask_Splines[i];

            this.queue.render_pass(this.RP_Splines, "Splines");

            this.RP_GaussH_Splines.intex = tex_mask_Splines[i];
            this.RP_GaussH_Splines.outTextures[0].id = tex_gaussian;
            this.queue.render_pass(this.RP_GaussH_Splines, "GaussianH");

            this.RP_GaussV_Splines.intex = tex_gaussian;
            this.RP_GaussV_Splines.outTextures[0].id = tex_mask_Splines_final[i];
            this.queue.render_pass(this.RP_GaussV_Splines, "GaussianV");  
            
        }
        
        this.RP_Splines_Color_Mask.mask0 = tex_mask_Splines_final[0];
        this.RP_Splines_Color_Mask.mask1 = tex_mask_Splines_final[1];
        this.RP_Splines_Color_Mask.mask2 = tex_mask_Splines_final[2];

        this.RP_Splines_Color_Mask.color_cluster0 = tex_color_Splines[0];
        this.RP_Splines_Color_Mask.color_cluster1 = tex_color_Splines[1];
        this.RP_Splines_Color_Mask.color_cluster2 = tex_color_Splines[2];

        this.RP_Splines_Color_Mask.position_cluster0 = tex_position_Splines[0];
        this.RP_Splines_Color_Mask.position_cluster1 = tex_position_Splines[1];
        this.RP_Splines_Color_Mask.position_cluster2 = tex_position_Splines[2];

        this.RP_Splines_Color_Mask.depth_cluster0 = tex_depth_Splines[0];
        this.RP_Splines_Color_Mask.depth_cluster1 = tex_depth_Splines[1];
        this.RP_Splines_Color_Mask.depth_cluster2 = tex_depth_Splines[2];

        this.RP_Splines_Color_Mask.outTextures[0].id = tex_color_Splines_final;
        this.RP_Splines_Color_Mask.outTextures[1].id = tex_position_Splines_final;
        this.RP_Splines_Color_Mask.outTextures[2].id = tex_depth_Splines_final;

        this.queue.render_pass(this.RP_Splines_Color_Mask, "Splines Masking 1");


        this.RP_Splines_Normal_Mask.mask0 = tex_mask_Splines[0];
        this.RP_Splines_Normal_Mask.mask1 = tex_mask_Splines[1];
        this.RP_Splines_Normal_Mask.mask2 = tex_mask_Splines[2];

        this.RP_Splines_Normal_Mask.normal_cluster0 = tex_normal_Splines[0];
        this.RP_Splines_Normal_Mask.normal_cluster1 = tex_normal_Splines[1];
        this.RP_Splines_Normal_Mask.normal_cluster2 = tex_normal_Splines[2];

        this.RP_Splines_Normal_Mask.normalTheta_cluster0 = tex_normalTheta_Splines[0];
        this.RP_Splines_Normal_Mask.normalTheta_cluster1 = tex_normalTheta_Splines[1];
        this.RP_Splines_Normal_Mask.normalTheta_cluster2 = tex_normalTheta_Splines[2];

        this.RP_Splines_Normal_Mask.binormal_cluster0 = tex_binormal_Splines[0];
        this.RP_Splines_Normal_Mask.binormal_cluster1 = tex_binormal_Splines[1];
        this.RP_Splines_Normal_Mask.binormal_cluster2 = tex_binormal_Splines[2];

        this.RP_Splines_Normal_Mask.outTextures[0].id = tex_normal_Splines_final;
        this.RP_Splines_Normal_Mask.outTextures[1].id = tex_normalTheta_Splines_final;
        this.RP_Splines_Normal_Mask.outTextures[2].id = tex_binormal_Splines_final;

        this.queue.render_pass(this.RP_Splines_Normal_Mask, "Splines Masking 2");


        this.RP_SSAO.position_SSAO = tex_position_Splines_final;
        this.RP_SSAO.normal_SSAO = tex_normal_Splines_final;

        let tex_ssao = this.pop_std_texture();
        this.RP_SSAO.outTextures[0].id = tex_ssao;
        this.queue.render_pass(this.RP_SSAO, "SSAO");

        this.RP_SimpleBlur.in_tex_blur = tex_ssao;

        let tex_ssao_blur = this.pop_std_texture();
        this.RP_SimpleBlur.outTextures[0].id = tex_ssao_blur;
        this.queue.render_pass(this.RP_SimpleBlur, "SSAO_sb");

      
        let tex_splines_light = this.pop_std_texture();
        this.RP_Splines_Lighting.position_splines_lighting = tex_position_Splines_final;
        this.RP_Splines_Lighting.normalTheta_splines_lighting = tex_normalTheta_Splines_final;
        this.RP_Splines_Lighting.binormal_splines_lighting = tex_binormal_Splines_final;
        this.RP_Splines_Lighting.color_splines_lighting = tex_color_Splines_final;
        this.RP_Splines_Lighting.SSAO_splines_lighting = tex_ssao_blur;
        
        this.RP_Splines_Lighting.outTextures[0].id = tex_splines_light;
        this.queue.render_pass(this.RP_Splines_Lighting, "Splines Lighting");


        let splines_final = this.pop_std_texture();
        // Reuse blending pass from outline merging.
        this.RP_Blend.intex_outline_blurred = tex_splines_light;
        this.RP_Blend.intex_main = this.tex_final;
        this.RP_Blend.outTextures[0].id = splines_final;
        this.queue.render_pass(this.RP_Blend, "Blend Splines");

        if (this.tex_final_push) {
            this.push_std_texture(this.tex_final);
        }
        this.tex_final = splines_final;
        this.tex_final_push = true;
    }

    render_Splines_and_blend_it()
    {
        this.cluster = -1;
        let tex_position_Splines = this.pop_std_texture();
        let tex_normal_Splines = this.pop_std_texture();
        let tex_normalTheta_Splines = this.pop_std_texture();
        let tex_binormal_Splines = this.pop_std_texture();
        let tex_color_Splines = this.pop_std_texture();
        let tex_mask_Splines = this.pop_std_texture();

        this.RP_Splines.outTextures[0].id = tex_position_Splines; 
        this.RP_Splines.outTextures[1].id = tex_normal_Splines;
        this.RP_Splines.outTextures[2].id = tex_normalTheta_Splines;
        this.RP_Splines.outTextures[3].id = tex_binormal_Splines;
        this.RP_Splines.outTextures[4].id = tex_color_Splines;
        this.RP_Splines.outTextures[6].id = tex_mask_Splines;


        //console.log("Test ids", this.RP_Splines.outTextures[6].id, tex_depth_Splines);
        this.queue.render_pass(this.RP_Splines, "Splines");

        this.RP_SSAO.position_SSAO = tex_position_Splines;
        this.RP_SSAO.normal_SSAO = tex_normal_Splines;

        let tex_ssao = this.pop_std_texture();
        this.RP_SSAO.outTextures[0].id = tex_ssao;
        this.queue.render_pass(this.RP_SSAO, "SSAO");

        this.RP_SimpleBlur.in_tex_blur = tex_ssao;

        let tex_ssao_blur = this.pop_std_texture();
        this.RP_SimpleBlur.outTextures[0].id = tex_ssao_blur;
        this.queue.render_pass(this.RP_SimpleBlur, "SSAO_sb");

      
        let tex_splines_light = this.pop_std_texture();
        this.RP_Splines_Lighting.position_splines_lighting = tex_position_Splines;
        this.RP_Splines_Lighting.normalTheta_splines_lighting = tex_normalTheta_Splines;
        this.RP_Splines_Lighting.binormal_splines_lighting = tex_binormal_Splines;
        this.RP_Splines_Lighting.color_splines_lighting = tex_color_Splines;
        this.RP_Splines_Lighting.SSAO_splines_lighting = tex_ssao_blur;
        
        this.RP_Splines_Lighting.outTextures[0].id = tex_splines_light;
        this.queue.render_pass(this.RP_Splines_Lighting, "Splines Lighting");


        let splines_final = this.pop_std_texture();
        // Reuse blending pass from outline merging.
        this.RP_Blend.intex_outline_blurred = tex_splines_light;
        this.RP_Blend.intex_main = this.tex_final;
        this.RP_Blend.outTextures[0].id = splines_final;
        this.queue.render_pass(this.RP_Blend, "Blend Splines");

        if (this.tex_final_push) {
            this.push_std_texture(this.tex_final);
        }
        this.tex_final = splines_final;
        this.tex_final_push = true;
    }

    render_overlay_and_blend_it()
    {
        let tex_ovl = this.pop_std_texture();
        this.RP_Overlay.outTextures[0].id = tex_ovl;
        this.queue.render_pass(this.RP_Overlay, "Overlay");

        let ovl_final = this.pop_std_texture();
        // Reuse blending pass from outline merging.
        this.RP_Blend.intex_outline_blurred = tex_ovl;
        this.RP_Blend.intex_main = this.tex_final;
        this.RP_Blend.outTextures[0].id = ovl_final;
        this.queue.render_pass(this.RP_Blend, "Blend Overlay");

        if (this.tex_final_push) {
            this.push_std_texture(this.tex_final);
        }
        this.tex_final = ovl_final;
        this.tex_final_push = true;
    }

    render_tone_map_to_screen()
    {
        this.RP_ToneMapToScreen.input_texture = this.tex_final;

        this.queue.render_pass(this.RP_ToneMapToScreen, "Tone Map To Screen");

        if (this.tex_final_push) {
            this.push_std_texture(this.tex_final);
            this.tex_final = null;
            this.tex_final_push = null;
        }
    }

    render_final_to_screen()
    {
        this.RP_ToScreen.input_texture = this.tex_final;

        this.queue.render_pass(this.RP_ToScreen, "Copy Final To Screen");

        if (this.tex_final_push) {
            this.push_std_texture(this.tex_final);
            this.tex_final = null;
            this.tex_final_push = null;
        }
    }

    render_begin(used_check)
    {
        this.tex_outline = null;

        this.queue.render_begin(used_check);
    }

    render_end()
    {
        this.queue.render_end();
        this.release_std_textures();
    }

    // ----------

    render()
    {
        // This can work for setups without outline passes -- once they are
        // brought back to life.

        this.queue.render();
    }

    //=============================================================================

    pick_begin(x, y)
    {
        this.camera.prePickStoreTBLR();
        this.camera.narrowProjectionForPicking(this.vp_w, this.vp_h,
                                               this.pick_radius, this.pick_radius,
                                               x, this.vp_h - 1 - y);
    }

    pick_end()
    {
        this.camera.postPickRestoreTBLR();
    }

    pick(x, y, detect_depth = false)
    {
        this.renderer.pick_setup(this.pick_center, this.pick_center);

        let state = this.pqueue.render();
        state.x = x;
        state.y = y;
        state.depth = -1.0;
        state.object = this.renderer.pickedObject3D;
        // console.log("RenderQuTor::pick", state);

        if (detect_depth && this.renderer.pickedObject3D !== null)
        {
            let rdr = this.renderer;
            let gl  = rdr.gl;
            let fbm = rdr.glManager._fboManager;

            fbm.bindFramebuffer(this.pqueue._renderTarget);

            // Type RED is not supported on Firefox, specs require RGBA so we
            // read that, 3 x 3 pixels x 4 channels.
            let d = new Float32Array(9*4);
            gl.readBuffer(gl.COLOR_ATTACHMENT0);
            gl.readPixels(this.pick_center - 1, this.pick_center - 1, 3, 3, gl.RGBA, gl.FLOAT, d);

            fbm.unbindFramebuffer();

            let near = this.camera.near;
            let far  = this.camera.far;
            for (let i = 0; i < 9; ++i) {
                // NOTE: we are reducing into first 3 x 3 elements, dropping GBA channels.
                d[i] = (near * far) / ((near - far) * d[4*i] + far);
            }
            state.depth = d[4];
            // console.log("    pick depth at", x, ",", y, ":", d);
        }

        return state;
    }

    pick_overlay(x, y, detect_depth = false)
    {
        this.renderer.pick_setup(this.pick_center, this.pick_center);

        let state = this.overlaypqueue.render();
        state.x = x;
        state.y = y;
        state.depth = -1.0;
        state.object = this.renderer.pickedObject3D;
        console.log("RenderQuTor::pick_overlay", state);

        if (detect_depth && this.renderer.pickedObject3D !== null)
        {
            let rdr = this.renderer;
            let gl  = rdr.gl;
            let fbm = rdr.glManager._fboManager;

            fbm.bindFramebuffer(this.overlaypqueue._renderTarget);

            // Type RED is not supported on Firefox, specs require RGBA so we
            // read that, 3 x 3 pixels x 4 channels.
            let d = new Float32Array(9*4);
            gl.readBuffer(gl.COLOR_ATTACHMENT0);
            gl.readPixels(this.pick_center - 1, this.pick_center - 1, 3, 3, gl.RGBA, gl.FLOAT, d);

            fbm.unbindFramebuffer();

            let near = this.camera.near;
            let far  = this.camera.far;
            for (let i = 0; i < 9; ++i) {
                // NOTE: we are reducing into first 3 x 3 elements, dropping GBA channels.
                d[i] = (near * far) / ((near - far) * d[4*i] + far);
            }
            state.depth = d[4];
            // console.log("    pick depth at", x, ",", y, ":", d);
        }

        return state;
    }

    pick_instance(state)
    {
        if (state.object !== this.renderer.pickedObject3D) {
            console.error("RendeQuTor::pick_instance state mismatch", state, this.renderer.pickedObject3D);
        } else {
            // console.log("RenderQuTor::pick_instance going for secondary select");

            this.renderer._pickSecondaryEnabled = true;
            this.pqueue.render();

            state.instance = this.renderer._pickedID;
        }
        return state;
    }

    pick_instance_overlay(state) // Do I need this ??? @Waad
    {
        if (state.object !== this.renderer.pickedObject3D) {
            console.error("RendeQuTor::pick_instance state mismatch", state, this.renderer.pickedObject3D);
        } else {
            // console.log("RenderQuTor::pick_instance going for secondary select");

            this.renderer._pickSecondaryEnabled = true;
            this.overlaypqueue.render();

            state.instance = this.renderer._pickedID;
        }
        return state;
    }



    //=============================================================================
    // Picking RenderPasses
    //=============================================================================

    make_PRP_plain()
    {
        let pthis = this;

        this.PRP_plain = new RenderPass(
            RenderPass.BASIC,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { scene: pthis.scene, camera: pthis.camera };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            { width: this.pick_radius, height: this.pick_radius },
            "depth_picking",
            [ { id: "color_picking", textureConfig: RenderPass.DEFAULT_R32UI_TEXTURE_CONFIG,
                clearColorArray: new Uint32Array([0xffffffff, 0, 0, 0]) } ]
        );

        this.pqueue.pushRenderPass(this.PRP_plain);
    }

    make_PRP_depth2r()
    {
        this.PRP_depth2r_mat = new CustomShaderMaterial("copyDepthToRed");
        this.PRP_depth2r_mat.lights = false;
        let pthis = this;

        this.PRP_depth2r = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.PRP_depth2r_mat, textures: [ textureMap["depth_picking"] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            { width: this.pick_radius, height: this.pick_radius },
            null,
            [ { id: "depthr32f_picking", textureConfig: RenderPass.FULL_FLOAT_R32F_TEXTURE_CONFIG,
                clearColorArray: new Float32Array([1, 0, 0, 0]) } ]
        );

        this.pqueue.pushRenderPass(this.PRP_depth2r);
    }

    make_PRP_overlay()
    {
        let pthis = this;

        this.PRP_overlay = new RenderPass(
            RenderPass.BASIC,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { scene: pthis.ovlscene, camera: pthis.camera };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            { width: this.pick_radius, height: this.pick_radius },
            "depth_picking_overlay",
            [ { id: "color_picking_overlay", textureConfig: RenderPass.DEFAULT_R32UI_TEXTURE_CONFIG,
                clearColorArray:  new Uint32Array([0xffffffff, 0, 0, 0])} ]
        );

        this.overlaypqueue.pushRenderPass(this.PRP_overlay);
    }

    make_PRP_depth2r_overlay()
    {
        this.PRP_depth2r_overlay_mat = new CustomShaderMaterial("copyDepthToRed");
        this.PRP_depth2r_overlay_mat.lights = false;
        let pthis = this;

        this.PRP_depth2r_overlay = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.PRP_depth2r_overlay_mat, textures: [ textureMap["depth_picking_overlay"] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            { width: this.pick_radius, height: this.pick_radius },
            null,
            [ { id: "depthr32f_picking_overlay", textureConfig: RenderPass.FULL_FLOAT_R32F_TEXTURE_CONFIG,
                clearColorArray: new Float32Array([1, 0, 0, 0]) } ]
        );

        this.overlaypqueue.pushRenderPass(this.PRP_depth2r_overlay);
    }


    //=============================================================================
    // Regular RenderPasses
    //=============================================================================

    make_RP_DirectToScreen()
    {
        let pthis = this;

        this.RP_DirectToScreen = new RenderPass(
            RenderPass.BASIC,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) { return { scene: pthis.scene, camera: pthis.camera }; },
            function (textureMap, additionalData) {},
            RenderPass.SCREEN,
            null
        );
        this.RP_DirectToScreen.view_setup = function (vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_DirectToScreen);
    }

    //=============================================================================

    make_RP_SSAA_Super()
    {
        let pthis = this;

        this.RP_SSAA_Super = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,
            // Initialize function
            function (textureMap, additionalData) {},
            // Preprocess function
            function (textureMap, additionalData) { 

                iterateSceneR(pthis.scene, function (object) {
                    if (object instanceof RC.ZSplines) {
                        object.visible = false;
                    }
                });

                return { scene: pthis.scene, camera: pthis.camera }; },
            // Postprocess
            function (textureMap, additionalData) {

                iterateSceneR(pthis.scene, function (object) {
                    if (object instanceof RC.ZSplines) {
                        object.visible = true;
                    }
                });

            },
            // Target
            RenderPass.TEXTURE,
            // Viewport
            null,
            // Bind depth texture to this ID
            "depth_main",
            // Outputs
            [ { id: "color_main", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG } ]
        );
        this.RP_SSAA_Super.view_setup = function (vport) {
             this.viewport = { width: vport.width*pthis.SSAA_value, height: vport.height*pthis.SSAA_value };
            };

        this.queue.pushRenderPass(this.RP_SSAA_Super);
    }

    make_RP_Splines_IOR()
    {
        this.RP_Splines_Color_Mask_mat = new RC.CustomShaderMaterial("colorMasking"); 

        this.RP_Splines_Normal_Mask_mat = new RC.CustomShaderMaterial("normalMasking"); 

        let pthis = this;

        this.RP_Splines_Color_Mask = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {
                    material: pthis.RP_Splines_Color_Mask_mat,
                    textures: [
                        textureMap[this.mask0],
                        textureMap[this.mask1],
                        textureMap[this.mask2],

                        textureMap[this.color_cluster0],
                        textureMap[this.color_cluster1],
                        textureMap[this.color_cluster2],

                        textureMap[this.position_cluster0],
                        textureMap[this.position_cluster1],
                        textureMap[this.position_cluster2],

                        textureMap[this.depth_cluster0],
                        textureMap[this.depth_cluster1],
                        textureMap[this.depth_cluster2],


                    ]
                };
            },

            function (textureMap, additionalData) {
            },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            null,

            // Bind depth texture to this ID
            null,

            [
                { id: "color_masked", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG },
                { id: "position_masked", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG },
                { id: "depth_masked", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG },

            ]
        );
        this.RP_Splines_Color_Mask.view_setup = function (vport) {
            this.viewport = { width: vport.width, height: vport.height };
           };
        this.queue.pushRenderPass(this.RP_Splines_Color_Mask);

        
        this.RP_Splines_Normal_Mask = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {
                    material: pthis.RP_Splines_Normal_Mask_mat,
                    textures: [
                        textureMap[this.mask0],
                        textureMap[this.mask1],
                        textureMap[this.mask2],

                        textureMap[this.normal_cluster0],
                        textureMap[this.normal_cluster1],
                        textureMap[this.normal_cluster2],

                        textureMap[this.normalTheta_cluster0],
                        textureMap[this.normalTheta_cluster1],
                        textureMap[this.normalTheta_cluster2],

                        textureMap[this.binormal_cluster0],
                        textureMap[this.binormal_cluster1],
                        textureMap[this.binormal_cluster2],

                    ]
                };
            },

            function (textureMap, additionalData) {
            },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            null,

            // Bind depth texture to this ID
            null,

            [
                { id: "normal_masked", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG },
                { id: "normalTheta_masked", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG },
                { id: "binormal_masked", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG }

            ]
        );
        this.RP_Splines_Normal_Mask.view_setup = function (vport) {
            this.viewport = { width: vport.width, height: vport.height };
           };
        this.queue.pushRenderPass(this.RP_Splines_Normal_Mask);
    }


    make_RP_Splines() {

        this.RP_Splines_Lighting_mat = new RC.CustomShaderMaterial("ZSplinesLighting");
        this.RP_Splines_Lighting_mat.lights = false;
        this.RP_Splines_Lighting_mat.setUniform("light_ambient", true);
        this.RP_Splines_Lighting_mat.setUniform("light_diffuse", true);
        this.RP_Splines_Lighting_mat.setUniform("light_specular", true);
        this.RP_Splines_Lighting_mat.setUniform("ambientOcc", true);

        let pthis = this;

        this.RP_Splines = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,
            // Initialize function
            function (textureMap, additionalData) { },
            // Preprocess function
            function (textureMap, additionalData) {

                iterateSceneR(pthis.scene, function(object){
                    if (object instanceof RC.ZSplines ){
                        if (object.masked && object.importance == pthis.cluster)
                        {
                            object.visible = true;
                            object.material.setUniform("imp_check", true);
                            object.material.setUniform("imp_id", object.importance);   
                        }
                        else if(pthis.cluster == -1){
                            object.visible = true;
                            object.material.setUniform("imp_check", false);
                            object.material.setUniform("imp_id", 2.0);
                        }
                        else{
                            object.visible = false;
                        }
                        
                    }         
                });

                return { scene: pthis.scene, camera: pthis.camera };
            },

            // Postprocess
            function (textureMap, additionalData) { 

                iterateSceneR(pthis.scene, function(object){
                    if (! object instanceof RC.ZSplines ){
                        object.visible = true;
                    }
                });
            },
            // Target
            RenderPass.TEXTURE,
            // Viewport
            null,
            // Bind depth texture to this ID
            "depth_Splines",
            [
                { id: "position_Splines", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
                { id: "normal_Splines", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG },
                { id: "normalTheta_Splines", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
                { id: "binormal_Splines", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
                { id: "color_Splines", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
                { id: "viewDir_Splines", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
                { id: "imp_tex_Splines", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},

            ]
        );
        this.RP_Splines.view_setup = function (vport) {
            this.viewport = { width: vport.width, height: vport.height };
           };
        this.queue.pushRenderPass(this.RP_Splines);



        this.RP_Splines_Lighting = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) { },

            // Preprocess function
            function (textureMap, additionalData) {
                return {
                    material: pthis.RP_Splines_Lighting_mat,
                    textures: [
                        textureMap[this.position_splines_lighting],
                        textureMap[this.normalTheta_splines_lighting],
                        textureMap[this.binormal_splines_lighting],
                        textureMap[this.color_splines_lighting],
                        textureMap[this.SSAO_splines_lighting],
                    ]
                };
            },

            function (textureMap, additionalData) { },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            null,

            // Bind depth texture to this ID
            'depthDefaultMaterials',

            [ // clearColorArray: this.clear_zero_f32arr 
                { id: "showerColor", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG},
            ]
        );
        this.RP_Splines_Lighting.view_setup = function (vport) {
            this.viewport = { width: vport.width, height: vport.height };
           };
        this.queue.pushRenderPass(this.RP_Splines_Lighting);
    }


    generateSamples(numberOfSamples) {
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

    generateNoise(numberOfNoise) {
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

    make_RP_SSAO()
    {   
         
        this.RP_SSAO_mat = new CustomShaderMaterial("SSAO",
        {
            radius: 0.6,
            bias: 0.005,
            magnitude: 1.0,
            contrast: 1.2,
            "samples[0]": this.generateSamples(8),
            "noise[0]": this.generateNoise(4),
            PMat_o: this.camera.projectionMatrix.elements
        });

        this.RP_SSAO_mat.addSBValue("NUM_SAMPLES", 8);
        this.RP_SSAO_mat.addSBValue("NUM_NOISE", 4);

        this.RP_SSAO_mat.lights = false;
        this.RP_SSAO_mat.depthTest = true;

        let pthis = this;

        this.RP_SSAO = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,
            // Initialize function
            function (textureMap, additionalData) { },
            // Preprocess function
            function (textureMap, additionalData) {
                //console.log("Projection Matrix:", pthis.camera.projectionMatrix.elements);
                return {
                    material: pthis.RP_SSAO_mat,
                    textures: [
                        textureMap[this.position_SSAO],
                        textureMap[this.normal_SSAO]
                    ]
                };
            },

            // Postprocess
            function (textureMap, additionalData) { },
            // Target
            RenderPass.TEXTURE,
            // Viewport
            null,
            // Bind depth texture to this ID
            null,
            [
                { id: "SSAO_out", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );

        this.RP_SSAO.view_setup = function (vport) {
            this.viewport = { width: vport.width, height: vport.height };
           };
        this.queue.pushRenderPass(this.RP_SSAO);

    }

    make_RP_blur()
    {
        this.RP_SimpleBlur_mat = new CustomShaderMaterial("simpleBlur");

        let pthis = this;

        this.RP_SimpleBlur = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {
            },

            // Preprocess function
            function (textureMap, additionalData) {
                return {
                    material: pthis.RP_SimpleBlur_mat,
                    textures: [
                        textureMap[this.in_tex_blur]
                    ]
                };
            },

            function (textureMap, additionalData) {
            },

            // Target
            RenderPass.TEXTURE,

            // Viewport
            null,

            // Bind depth texture to this ID
            null,

            [
                { id: "SSAO_blur", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG }
            ]
        );

        this.RP_SimpleBlur.view_setup = function (vport) {
            this.viewport = { width: vport.width, height: vport.height };
           };
        this.queue.pushRenderPass(this.RP_SimpleBlur);
    }

    make_RP_SSAA_Down()
    {
        this.RP_SSAA_Down_mat = new CustomShaderMaterial("copyTexture");
        this.RP_SSAA_Down_mat.lights = false;
        let pthis = this;

        this.RP_SSAA_Down = new RenderPass(
            // Rendering pass type
            RenderPass.POSTPROCESS,

            // Initialize function
            function (textureMap, additionalData) {},
            // Preprocess function
            function (textureMap, additionalData) {
                return { material: pthis.RP_SSAA_Down_mat, textures: [textureMap[this.input_texture]] };
            },
            // Postprocess function
            function (textureMap, additionalData) {},

            // Target
            RenderPass.TEXTURE,

            // Viewport
            null,

            // Bind depth texture to this ID
            null,

            [ { id: "color_main", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG } ]
        );
        this.RP_SSAA_Down.input_texture = "color_super";
        this.RP_SSAA_Down.view_setup = function(vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_SSAA_Down);
    }

    make_RP_Overlay()
    {
        let pthis = this;

        this.RP_Overlay = new RenderPass(
            // Rendering pass type
            RenderPass.BASIC,
            // Initialize function
            function (textureMap, additionalData) {},
            // Preprocess function
            function (textureMap, additionalData) { return { scene: pthis.ovlscene, camera: pthis.camera }; },
            // Postprocess
            function (textureMap, additionalData) {},
            // Target
            RenderPass.TEXTURE,
            // Viewport
            null,
            // Bind depth texture to this ID
            "depth_main",
            // Outputs
            [ { id: "color_overlay", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG,
                clearColorArray: this.clear_zero_f32arr } ]
        );
        this.RP_Overlay.view_setup = function (vport) {
             this.viewport = { width: vport.width, height: vport.height };
            };

        this.queue.pushRenderPass(this.RP_Overlay);
    }

    //=============================================================================

    make_RP_ToScreen()
    {
        this.RP_ToScreen_mat = new CustomShaderMaterial("copyTexture");
        this.RP_ToScreen_mat.lights = false;
        let pthis = this;

        this.RP_ToScreen = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_ToScreen_mat, textures: [ textureMap[this.input_texture] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.SCREEN,
            null
        );
        this.RP_ToScreen.input_texture = "color_main";
        this.RP_ToScreen.view_setup = function(vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_ToScreen);
    }

    make_RP_ToneMapToScreen()
    {
        this.RP_ToneMapToScreen_mat = new CustomShaderMaterial("ToneMapping",
            { MODE: 1.0, gamma: 1.0, exposure: 2.0 });
            // u_clearColor set from MeshRenderer
        this.RP_ToneMapToScreen_mat.lights = false;

        let pthis = this;

        this.RP_ToneMapToScreen = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_ToneMapToScreen_mat,
                         textures: [ textureMap[this.input_texture] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.SCREEN,
            null
        );
        this.RP_ToneMapToScreen.input_texture = "color_main";
        this.RP_ToneMapToScreen.view_setup = function(vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_ToneMapToScreen);
    }

    //=============================================================================

    make_RP_GBuffer()
    {
        this.RP_GBuffer_mat = new CustomShaderMaterial("GBufferMini");
        this.RP_GBuffer_mat.lights = false;
        this.RP_GBuffer_mat.side = FRONT_AND_BACK_SIDE;

        this.RP_GBuffer_mat_flat = new CustomShaderMaterial("GBufferMini");
        this.RP_GBuffer_mat_flat.lights = false;
        this.RP_GBuffer_mat_flat.side = FRONT_AND_BACK_SIDE;
        this.RP_GBuffer_mat_flat.normalFlat = true;

        let pthis = this;

        this.RP_GBuffer = new RenderPass(
            RenderPass.BASIC,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                pthis.renderer._outlineEnabled = true;
                pthis.renderer._outlineArray = this.obj_list;
                pthis.renderer._defaultOutlineMat = pthis.RP_GBuffer_mat;
                pthis.renderer._defaultOutlineMatFlat = pthis.RP_GBuffer_mat_flat;
                pthis.renderer._fillRequiredPrograms(pthis.RP_GBuffer_mat.requiredProgram(pthis.renderer));
                pthis.renderer._fillRequiredPrograms(pthis.RP_GBuffer_mat_flat.requiredProgram(pthis.renderer));
                for (const o3d of this.obj_list) {
                    if (o3d.outlineMaterial)
                        pthis.renderer._fillRequiredPrograms(o3d.outlineMaterial.requiredProgram(pthis.renderer));
                }
                return { scene: pthis.scene, camera: pthis.camera };
            },
            function (textureMap, additionalData) {
                pthis.renderer._outlineEnabled = false; // can remain true if not all progs are loaded
                pthis.renderer._outlineArray = null;
            },
            RenderPass.TEXTURE,
            null,
            "depth_gbuff",
            [
                {id: "normal",  textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG,
                 clearColorArray: this.clear_zero_f32arr},
                {id: "view_dir", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG,
                 clearColorArray: this.clear_zero_f32arr}
            ]
        );
        this.RP_GBuffer.view_setup = function (vport) { this.viewport = vport; };

        // TODO: No push, GBuffer/Outline passes should be handled separately as there can be more of them.
        this.queue.pushRenderPass(this.RP_GBuffer);
    }

    make_RP_Outline()
    {
        this.RP_Outline_mat = new CustomShaderMaterial("outline",
          { scale: 1.0,
            edgeColor: [ 1.4, 0.0, 0.8, 1.0 ],
            _DepthThreshold: 6.0,
            _NormalThreshold: 0.6, // 0.4,
            _DepthNormalThreshold: 0.5,
            _DepthNormalThresholdScale: 7.0 });
        this.RP_Outline_mat.addSBFlag("DISCARD_NON_EDGE");
        this.RP_Outline_mat.lights = false;

        let pthis = this;

        this.RP_Outline = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_Outline_mat,
                         textures: [ textureMap["depth_gbuff"],
                                     textureMap[this.intex_normal],
                                     textureMap[this.intex_view_dir] ] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [
                {id: "color_outline", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG,
                 clearColorArray: this.clear_zero_f32arr}
            ]
        );
        this.RP_Outline.intex_normal = "normal";
        this.RP_Outline.intex_view_dir = "view_dir";
        this.RP_Outline.view_setup = function (vport) { this.viewport = vport; };

        // TODO: No push, GBuffer/Outline passes should be handled separately as there can be more of them.
        this.queue.pushRenderPass(this.RP_Outline);
    }
    
    gaussianKernel(radius, sigma) {
        //const radius = parseInt(radiusInput.value);
        //const sigma = parseFloat(sigmaInput.value);

        function erf(x) {
            // constants
            var a1 =  0.254829592;
            var a2 = -0.284496736;
            var a3 =  1.421413741;
            var a4 = -1.453152027;
            var a5 =  1.061405429;
            var p  =  0.3275911;
        
            // Save the sign of x
            var sign = 1;
            if (x < 0) {
                sign = -1;
            }
            x = Math.abs(x);
        
            // A&S formula 7.1.26
            var t = 1.0/(1.0 + p*x);
            var y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);
        
            return sign*y;
        }

        const linear = false;
        const correction = true;

        if (sigma == 0.0) return;

        var weights = [];
        let sumWeights = 0.0;
        for (let i = -radius; i <= radius; i++) {
            let w = 0;
            if (correction) {
                w = (erf((i + 0.5) / sigma / Math.sqrt(2)) - erf((i - 0.5) / sigma / Math.sqrt(2))) / 2;
            }
            else {
                w = Math.exp(- i * i / sigma / sigma);
            }
            sumWeights += w;
            weights.push(w);
        }

        for (let i in weights)
            weights[i] /= sumWeights;

        var offsets = [];
        var newWeights = [];

        let hasZeros = false;

        if (linear) {
            for (let i = -radius; i <= radius; i += 2) {
                if (i == radius) {
                    offsets.push(i);
                    newWeights.push(weights[i + radius]);
                }
                else {
                    const w0 = weights[i + radius + 0];
                    const w1 = weights[i + radius + 1];

                    const w = w0 + w1;
                    if (w > 0) {
                        offsets.push(i + w1 / w);
                    }
                    else {
                        hasZeros = true;
                        offsets.push(i);
                    }
                    newWeights.push(w);
                }
            }
        }
        else {
            for (let i = -radius; i <= radius; i++) {
                offsets.push(i);
            }

            for (let w of weights)
                if (w == 0.0)
                    hasZeros = true;

            newWeights = weights;
        }

        return [offsets.slice(radius, offsets.length), newWeights.slice(radius, offsets.length)];
        /*
            if (hasZeros)
                warningDiv.innerHTML = "Some weights are equal to zero; try using a smaller radius or a bigger sigma";
            else
                warningDiv.innerHTML = "<br>";
        */

    }

    make_RP_GaussHV()
    {
        let pthis = this;

        this.RP_GaussH_Splines_mat = new CustomShaderMaterial("gaussBlur", {horizontal: true, power: 1.5});

        const [offset_gaussian, weight_gaussian] = this.gaussianKernel(3, 1);

        this.RP_GaussH_Splines_mat.addSBValue("RADIUS", 4);
        this.RP_GaussH_Splines_mat.setUniform("offset[0]", offset_gaussian);
        this.RP_GaussH_Splines_mat.setUniform("weight[0]", weight_gaussian);


        this.RP_GaussH_Splines = new RenderPass(
            RenderPass.POSTPROCESS,
            function(textureMap, additionalData) {},
            function(textureMap, additionalData) {
                return {material: pthis.RP_GaussH_Splines_mat, textures: [textureMap[this.intex]]};
            },
            function(textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [
                {id: "gauss_h", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );
        this.RP_GaussH_Splines.view_setup = function (vport) { this.viewport = vport; };

        this.RP_GaussV_Splines_mat = new CustomShaderMaterial("gaussBlur", {horizontal: false, power: 1.5});

        this.RP_GaussV_Splines_mat.addSBValue("RADIUS", 4);
        this.RP_GaussV_Splines_mat.setUniform("offset[0]", offset_gaussian);
        this.RP_GaussV_Splines_mat.setUniform("weight[0]", weight_gaussian);


        this.RP_GaussV_Splines = new RenderPass(
            RenderPass.POSTPROCESS,
            function(textureMap, additionalData) {},
            function(textureMap, additionalData) {
                return {material: pthis.RP_GaussV_Splines_mat, textures: [textureMap[this.intex]]};
            },
            function(textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [
                {id: "gauss_hv", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );
        this.RP_GaussV_Splines.view_setup = function (vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_GaussH_Splines);
        this.queue.pushRenderPass(this.RP_GaussV_Splines);

    }

    make_RP_GaussHVandBlend()
    {
        let pthis = this;

        this.RP_GaussH_mat = new CustomShaderMaterial("gaussBlur", {horizontal: true, power: 4.0});
        this.RP_GaussH_mat.lights = false;

        this.RP_GaussH = new RenderPass(
            RenderPass.POSTPROCESS,
            function(textureMap, additionalData) {},
            function(textureMap, additionalData) {
                return {material: pthis.RP_GaussH_mat, textures: [textureMap[this.intex]]};
            },
            function(textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [
                {id: "gauss_h", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );
        this.RP_GaussH.intex = "color_outline";
        this.RP_GaussH.view_setup = function (vport) { this.viewport = vport; };

        this.RP_GaussV_mat = new CustomShaderMaterial("gaussBlur", {horizontal: false, power: 4.0});
        this.RP_GaussV_mat.lights = false;

        this.RP_GaussV = new RenderPass(
            RenderPass.POSTPROCESS,
            function(textureMap, additionalData) {},
            function(textureMap, additionalData) {
                return {material: pthis.RP_GaussV_mat, textures: [textureMap[this.intex]]};
            },
            function(textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [
                {id: "gauss_hv", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );
        this.RP_GaussV.intex = "gauss_h";
        this.RP_GaussV.view_setup = function (vport) { this.viewport = vport; };

        this.RP_Blend_mat = new CustomShaderMaterial("blendingAdditive");
        this.RP_Blend_mat.lights = false;

        this.RP_Blend = new RenderPass(
            RenderPass.POSTPROCESS,
            function(textureMap, additionalData) {},
            function(textureMap, additionalData) {
                return {material: pthis.RP_Blend_mat,
                        textures: [textureMap[this.intex_outline_blurred],
                                   textureMap[this.intex_main]]};
            },
            function(textureMap, additionalData) {},
            // Target
            RenderPass.TEXTURE,
            null,
            null,
            [
                {id: "color_final", textureConfig: RenderPass.DEFAULT_RGBA16F_TEXTURE_CONFIG}
            ]
        );
        this.RP_Blend.intex_outline_blurred = "gauss_hv"; // or overlay
        this.RP_Blend.intex_main = "color_main";
        this.RP_Blend.view_setup = function (vport) { this.viewport = vport; };

        this.queue.pushRenderPass(this.RP_GaussH);
        this.queue.pushRenderPass(this.RP_GaussV);
        this.queue.pushRenderPass(this.RP_Blend);
    }

    //=============================================================================
    // HighPass and Bloom
    //=============================================================================

    make_RP_HighPassGaussBloom()
    {
        let pthis = this;
        // let hp = new CustomShaderMaterial("highPass", {MODE: HIGHPASS_MODE_BRIGHTNESS, targetColor: [0.2126, 0.7152, 0.0722], threshold: 0.75});
        let hp = new CustomShaderMaterial("highPass", { MODE: HIGHPASS_MODE_DIFFERENCE,
                                             targetColor: [0x0/255, 0x0/255, 0xff/255], threshold: 0.1});
        console.log("XXXXXXXX", hp);
        // let hp = new CustomShaderMaterial("highPassReve");
        this.RP_HighPass_mat = hp;
        this.RP_HighPass_mat.lights = false;

        this.RP_HighPass = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_HighPass_mat, textures: [textureMap["color_ssaa_super"]] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            // XXXXXX MT: this was "dt", why not null ????
            null, // "dt",
            [ {id: "color_high_pass", textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG} ]
        );
        this.RP_HighPass.view_setup = function (vport) { this.viewport = { width: vport.width*pthis.SSAA_value, height: vport.height*pthis.SSAA_value }; };
        this.queue.pushRenderPass(this.RP_HighPass);

        this.RP_Gauss1_mat = new CustomShaderMaterial("gaussBlur", {horizontal: true, power: 1.0});
        this.RP_Gauss1_mat.lights = false;

        this.RP_Gauss1 = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_Gauss1_mat, textures: [textureMap["color_high_pass"]] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [ {id: "color_gauss_half", textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG} ]
        );
        this.RP_Gauss1.view_setup = function (vport) { this.viewport = { width: vport.width*pthis.SSAA_value, height: vport.height*pthis.SSAA_value }; };
        this.queue.pushRenderPass(this.RP_Gauss1);

        this.RP_Gauss2_mat = new CustomShaderMaterial("gaussBlur", {horizontal: false, power: 1.0});
        this.RP_Gauss2_mat.lights = false;

        this.RP_Gauss2 = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_Gauss2_mat, textures: [textureMap["color_gauss_half"]] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [ {id: "color_gauss_full", textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG} ]
        );
        this.RP_Gauss2.view_setup = function (vport) { this.viewport = { width: vport.width*pthis.SSAA_value, height: vport.height*pthis.SSAA_value }; };
        this.queue.pushRenderPass(this.RP_Gauss2);

        this.RP_Bloom_mat = new CustomShaderMaterial("bloom");
        this.RP_Bloom_mat.lights = false;

        this.RP_Bloom = new RenderPass(
            RenderPass.POSTPROCESS,
            function (textureMap, additionalData) {},
            function (textureMap, additionalData) {
                return { material: pthis.RP_Bloom_mat, textures: [textureMap["color_gauss_full"], textureMap["color_ssaa_super"]] };
            },
            function (textureMap, additionalData) {},
            RenderPass.TEXTURE,
            null,
            null,
            [ {id: "color_bloom", textureConfig: RenderPass.DEFAULT_RGBA_TEXTURE_CONFIG} ]
        );
        this.RP_Bloom.view_setup = function (vport) { this.viewport = { width: vport.width*pthis.SSAA_value, height: vport.height*pthis.SSAA_value }; };
        this.queue.pushRenderPass(this.RP_Bloom);
    }
}
