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

uniform float[##RADIUS] offset;
uniform float[##RADIUS] weight;


#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


//MAIN
//**********************************************************************************************************************//
void main() {
	#if (TEXTURE)

		vec2 tex_size = vec2(textureSize(material.texture0, 0));
		// Blur radius = 10, Blur sigma = 2
		//float offset[11] = float[](0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0);
		//float weight[11] = float[](0.13242929584580776, 0.12533695271938072, 0.1062586549760548, 0.08069331538128802, 0.054890876729450484, 0.03344634551433034, 0.018254858014285263, 0.008924559339265243, 0.003908169554935672, 0.0015329920806177449, 0.0005386277674878371);


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
		color = result * result.a;
		//color = vec4(result.rgb, min(result.a, 1.0)); //separability issues
	#fi
}
