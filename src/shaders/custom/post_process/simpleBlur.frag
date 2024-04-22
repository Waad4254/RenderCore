#version 300 es
precision mediump float;


//STRUCT
//**********************************************************************************************************************
struct Material {
    #if (TEXTURE)
        sampler2D texture0; //SSAO BUFFER
    #fi
};
struct TextureData {
    ivec2 textureSize;
    vec2 texelSize;
};


//UIO
//**********************************************************************************************************************
uniform Material material;
uniform bool horizontal;
uniform float power;

#if (TEXTURE)
    in vec2 fragUV;
#fi

out float FragColor;


TextureData texture0Data;


//MAIN
//**********************************************************************************************************************//
void main() {
	#if (TEXTURE)
		texture0Data.textureSize = textureSize(material.texture0, 0);
        texture0Data.texelSize = 1.0 / vec2(texture0Data.textureSize.x, texture0Data.textureSize.y);
		

		float result = 0.0;
		for(int y = -2; y < 2; y++){
			for(int x = -2; x < 2; x++){
				vec2 offset = vec2(float(x), float(y)) * texture0Data.texelSize;
				
				result = result + texture(material.texture0, fragUV + offset).r;
			}
		}

		FragColor = result/16.0;
 
	#fi
}
