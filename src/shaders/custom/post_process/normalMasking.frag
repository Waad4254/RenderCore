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

layout (location = 0) out vec4 normal_blended;
layout (location = 1) out vec4 normalTheta_blended;
layout (location = 2) out vec4 binormal_blended;


//MAIN
//**********************************************************************************************************************//
void main() {
	#if (TEXTURE)

        //on medium => I apply high filter , and on low => I apply medium and high filter
		vec2 tex_offset = 1.0 / vec2(textureSize(material.texture0, 0)); // gets size of single texel
		vec4 mask_h = texture(material.texture0, fragUV).rgba;
        vec4 mask_m = texture(material.texture1, fragUV).rgba;
        vec4 mask_l = texture(material.texture2, fragUV).rgba;

        vec4 normal_h = texture(material.texture3, fragUV).rgba;
        vec4 normal_m = texture(material.texture4, fragUV).rgba;
        vec4 normal_l = texture(material.texture5, fragUV).rgba;
        
        vec4 normalTheta_h = texture(material.texture6, fragUV).rgba;
        vec4 normalTheta_m = texture(material.texture7, fragUV).rgba;
        vec4 normalTheta_l = texture(material.texture8, fragUV).rgba;

        vec4 binormal_h = texture(material.texture9, fragUV).rgba;
        vec4 binormal_m = texture(material.texture10, fragUV).rgba;
        vec4 binormal_l = texture(material.texture11, fragUV).rgba;

        vec4 normal_h_filtered = vec4(normal_h.rgb, mask_h.a);
        vec4 normal_m_filtered = vec4(normal_m.rgb, normal_m.a * (1.0 - mask_h.a));
        vec4 normal_l_filtered = vec4(normal_l.rgb, normal_l.a * (1.0 - mask_m.a) * (1.0 - mask_h.a));

        vec4 normalTheta_h_filtered = vec4(normalTheta_h.rgb, mask_h.a);
        vec4 normalTheta_m_filtered = vec4(normalTheta_m.rgb, normalTheta_m.a * (1.0 - mask_h.a));
        vec4 normalTheta_l_filtered = vec4(normalTheta_l.rgb, normalTheta_l.a * (1.0 - mask_m.a) * (1.0 - mask_h.a));

        vec4 binormal_h_filtered = vec4(binormal_h.rgb, mask_h.a);
        vec4 binormal_m_filtered = vec4(binormal_m.rgb, binormal_m.a * (1.0 - mask_h.a));
        vec4 binormal_l_filtered = vec4(binormal_l.rgb, binormal_l.a * (1.0 - mask_m.a) * (1.0 - mask_h.a));

        normal_blended = normal_h_filtered + (normal_m_filtered * normal_m_filtered.a) + (normal_l_filtered* normal_l_filtered.a);

        normalTheta_blended = normalTheta_h_filtered + (normalTheta_m_filtered * normalTheta_m_filtered.a) + (normalTheta_l_filtered* normalTheta_l_filtered.a);

        binormal_blended = binormal_h_filtered + (binormal_m_filtered * binormal_m_filtered.a) + (binormal_l_filtered* binormal_l_filtered.a);

	#fi
}
