#version 300 es
precision mediump float;


//UIO
//**********************************************************************************************************************//
struct Material {
    #if (TEXTURE)
        sampler2D texture0;
    #fi
};


uniform Material material;
uniform bool horizontal;
uniform float power;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


//MAIN
//**********************************************************************************************************************//
void main() {
	#if (TEXTURE)
		//bool horizontal = true;

		//float weight[5] = float[] (0.2270270270, 0.1945945946, 0.1216216216, 0.0540540541, 0.0162162162);
		//float[19] weight = float[] (0.0426,	0.0424,	0.0418,	0.0407,	0.0393,	0.0376,	0.0356,	0.0334,	0.0310,	0.0284,	0.0259,	0.0233,	0.0208,	0.0183,	0.0160,	0.0138,	0.0119,	0.0101,	0.0084);
		//float[8] weight = float[] (0.3, 0.2, 0.1, 0.200, 0.150, 0.100, 0.006, 0.001); //custom "gauss"
		//float[8] weight = float[] (0.19950135, 0.17605932, 0.12100368, 0.0647686, 0.02699957, 0.00876548, 0.00221626, 0.00043641);

		vec2 tex_size = vec2(textureSize(material.texture0, 0));
		float offset[3] = float[](0.0, 1.3846153846, 3.2307692308);
		float weight[3] = float[](0.2270270270, 0.3162162162, 0.0702702703);

		vec2 tex_offset = (1.0 / vec2(textureSize(material.texture0, 0)))*2.0; // gets size of single texel
		vec4 color_tex = texture(material.texture0, fragUV).rgba;
		vec4 result = color_tex * weight[0]*power; // current fragment's contribution


		if(horizontal) {
			for(int i = 1; i < weight.length(); i++) {
			    result += texture(material.texture0, fragUV + vec2(offset[i]/tex_size.x * float(i), 0.0)).rgba * weight[i]*power;
			    result += texture(material.texture0, fragUV - vec2(offset[i]/tex_size.x * float(i), 0.0)).rgba * weight[i]*power;
			}
		}else {
			for(int i = 1; i < weight.length(); i++) {
			    result += texture(material.texture0, fragUV + vec2(0.0, offset[i]/tex_size.y * float(i))).rgba * weight[i]*power;
			    result += texture(material.texture0, fragUV - vec2(0.0, offset[i]/tex_size.y * float(i))).rgba * weight[i]*power;
			}
		}


		//color = vec4((result.rgb), 1.0);
		color = result;
		//color = vec4(result.rgb, min(result.a, 1.0)); //separability issues
	#fi
}
