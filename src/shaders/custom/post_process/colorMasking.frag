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
		vec4 mask_h = clamp(texture(material.texture0, fragUV).rgba, 0.0, 1.0);
        vec4 mask_m = clamp(texture(material.texture1, fragUV).rgba, 0.0, 1.0);
        vec4 mask_l = clamp(texture(material.texture2, fragUV).rgba, 0.0, 1.0);

        vec4 color_h = texture(material.texture3, fragUV).rgba;
        vec4 color_m = texture(material.texture4, fragUV).rgba;
        vec4 color_l = texture(material.texture5, fragUV).rgba;

        vec4 position_h = texture(material.texture6, fragUV).rgba;
        vec4 position_m = texture(material.texture7, fragUV).rgba;
        vec4 position_l = texture(material.texture8, fragUV).rgba;

        vec4 depth_h = texture(material.texture9, fragUV).rgba;
        vec4 depth_m = texture(material.texture10, fragUV).rgba;
        vec4 depth_l = texture(material.texture11, fragUV).rgba;

        float mask_h_alpha = mask_h.a;
        float mask_m_alpha = (1.0 - mask_h.a);
        float mask_l_alpha = (1.0 - mask_m.a) * (1.0 - mask_h.a);

        float total = mask_h_alpha + mask_m_alpha + mask_l_alpha + 0.001;

        mask_h_alpha /= total;
        mask_m_alpha /= total;
        mask_l_alpha /= total;

        vec3 color_h_filtered = color_h.rgb;
        vec3 color_m_filtered = color_m.rgb * mask_m_alpha;
        vec3 color_l_filtered = color_l.rgb * mask_l_alpha;

        float maskH = step(0.5, color_h.a);
        float maskM = step(0.5, color_m.a);
        float maskL = step(0.5, color_l.a);

        vec3 position_h_filtered = position_h.rgb * maskH;
        vec3 position_m_filtered = position_m.rgb * position_m.a * (1.0 - maskH);
        vec3 position_l_filtered = position_l.rgb * position_l.a * (1.0 - maskM) * (1.0 - maskH);

        vec3 depth_h_filtered = depth_h.rgb * maskH;
        vec3 depth_m_filtered = depth_m.rgb * depth_m.a * (1.0 - maskH);
        vec3 depth_l_filtered = depth_l.rgb * depth_l.a * (1.0 - maskM) * (1.0 - maskH);

        color_blended = vec4(color_h_filtered + color_m_filtered + color_l_filtered, color_h.a + color_m.a + color_l.a);

        position_blended = vec4(position_h_filtered + position_m_filtered + position_l_filtered, 1.0);

        depth_blended = vec4(depth_h_filtered + depth_m_filtered + depth_l_filtered, 1.0);

	#fi
}
