#version 300 es
precision mediump float;


//STRUCT
//**********************************************************************************************************************

struct Material {
    vec3 emissive;
    vec3 diffuse;
    
    sampler2D instanceData0;  // functionCoefficients_XYZ
    sampler2D instanceData1;  // Colors
    sampler2D instanceData2;  // Widths
    sampler2D instanceData3;  // Time
    sampler2D instanceData4;  // Radians
    sampler2D instanceData5;  // Energy
    sampler2D instanceData6;  // Pattern
    sampler2D instanceData7;  // Scene colors
    sampler2D instanceData8;  // importance

};

uniform Material material;
uniform float pattern;

in vec4 fragVColor;
in vec3 fragVPos;
in vec3 vNormal;
in vec3 vBinormal;
in vec2 fragUV;
in float qLength;
in float importance;


layout (location = 0) out vec4 gPosition;
layout (location = 1) out vec4 gNormal;
layout (location = 2) out vec4 gNormalTheta;
layout (location = 3) out vec4 gBinormal;
layout (location = 4) out vec4 gColor;
layout (location = 5) out vec4 gViewDirection;
layout (location = 6) out vec4 gImportance;




//MAIN
//**********************************************************************************************************************
void main() {

    float R = texture(material.instanceData4, vec2(fragUV.y, 0.0)).r;
    vec3 normalTheta = vNormal * cos(R) + vBinormal * sin(R);
    vec3 norm = normalize(normalTheta);
    

    float pLength = mod(qLength + pattern, 1.0);
    float p = 1.0;

    if(pLength >= 1.0) discard;

    if(pattern != 0.0)
        p = texture(material.instanceData6, vec2(pLength, 0.0)).r;

    if(p == 0.0) discard;


    gPosition = vec4(fragVPos, 1.0);
    gNormal = vec4(normalize(vNormal), 0.0);
    gNormalTheta = vec4(normalize(normalTheta), 0.0);
    gBinormal = vec4(normalize(vBinormal), 0.0);
    gColor = fragVColor;
    gViewDirection = vec4(0.0);
    gImportance = vec4(fragVColor.rgb, 1.0);
    
    

}
