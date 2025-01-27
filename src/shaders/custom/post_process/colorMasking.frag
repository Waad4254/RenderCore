#version 300 es
precision mediump float;


//UIO
//**********************************************************************************************************************//
struct Material {
    #if (TEXTURE)
        sampler2D texture0;
        sampler2D texture1;
        sampler2D texture2;

        sampler2D texture3;
        sampler2D texture4;
        sampler2D texture5;

        sampler2D texture6;
        sampler2D texture7;
        sampler2D texture8;

        sampler2D texture9;
        sampler2D texture10;
        sampler2D texture11;

    #fi
};


uniform Material material;

#if (TEXTURE)
    in vec2 fragUV;
#fi

layout (location = 0) out vec4 color_blended;
layout (location = 1) out vec4 position_blended;
layout (location = 2) out vec4 depth_blended;


//MAIN
//**********************************************************************************************************************//
void main() {
	#if (TEXTURE)

        //on medium => I apply high filter , and on low => I apply medium and high filter
		vec2 tex_offset = 1.0 / vec2(textureSize(material.texture0, 0)); // gets size of single texel
		vec4 mask_h = texture(material.texture0, fragUV).rgba;
        vec4 mask_m = texture(material.texture1, fragUV).rgba;
        vec4 mask_l = texture(material.texture2, fragUV).rgba;

        vec4 color_h = texture(material.texture3, fragUV).rgba;
        vec4 color_m = texture(material.texture4, fragUV).rgba;
        vec4 color_l = texture(material.texture5, fragUV).rgba;

        vec4 position_h = texture(material.texture6, fragUV).rgba;
        vec4 position_m = texture(material.texture7, fragUV).rgba;
        vec4 position_l = texture(material.texture8, fragUV).rgba;

        vec4 depth_h = texture(material.texture9, fragUV).rgba;
        vec4 depth_m = texture(material.texture10, fragUV).rgba;
        vec4 depth_l = texture(material.texture11, fragUV).rgba;

        
        float mask_h_alpha = (mask_h.a * 2.0) + color_h.a;
        float mask_m_alpha = (mask_m.a * 2.0) + color_m.a;
        float mask_l_alpha = (mask_l.a * 2.0) + color_l.a;

        if(mask_h_alpha > 1.0) mask_h_alpha = 1.0;
        if(mask_m_alpha > 1.0) mask_m_alpha = 1.0;
        if(mask_l_alpha > 1.0) mask_l_alpha = 1.0;

        vec4 color_h_filtered = vec4(color_h.rgb, mask_h_alpha);
        vec4 color_m_filtered = vec4(color_m.rgb, mask_m_alpha * (1.0 - mask_h_alpha));
        vec4 color_l_filtered = vec4(color_l.rgb, mask_l_alpha * (1.0 - mask_m_alpha) * (1.0 - mask_h_alpha));

        vec4 position_h_filtered = vec4(position_h.rgb, mask_h_alpha);
        vec4 position_m_filtered = vec4(position_m.rgb, position_m.a * (1.0 - mask_h_alpha));
        vec4 position_l_filtered = vec4(position_l.rgb, position_l.a * (1.0 - mask_m_alpha) * (1.0 - mask_h_alpha));

        vec4 depth_h_filtered = vec4(depth_h.rgb, mask_h_alpha);
        vec4 depth_m_filtered = vec4(depth_m.rgb, depth_m.a * (1.0 - mask_h_alpha));
        vec4 depth_l_filtered = vec4(depth_l.rgb, depth_l.a * (1.0 - mask_m_alpha) * (1.0 - mask_h_alpha));

        color_blended = (color_h_filtered * color_h_filtered.a) + (color_m_filtered * color_m_filtered.a) + (color_l_filtered* color_l_filtered.a);

        position_blended = position_h_filtered + (position_m_filtered * position_m_filtered.a) + (position_l_filtered* position_l_filtered.a);

        depth_blended = depth_h_filtered + (depth_m_filtered * depth_m_filtered.a) + (depth_l_filtered* depth_l_filtered.a);

	#fi
}
