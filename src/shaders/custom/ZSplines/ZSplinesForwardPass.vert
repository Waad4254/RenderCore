#version 300 es
precision mediump float;


//UIO
//**********************************************************************************************************************

uniform mat4 MVMat; 
uniform mat4 PMat;  // Projection Matrix
in mat4 MMat;
in vec3 VPos;       // Vertex position
in vec2 uv;


out vec4 fragVColor;
out vec3 fragVPos;
out vec3 vNormal;
out vec3 vBinormal;
out vec2 fragUV;

out vec3 vViewPosition;

struct Material {
    vec3 emissive;
    vec3 diffuse;

    sampler2D instanceData0;  // functionCoefficients_XYZ
    sampler2D instanceData1;  // Colors
    sampler2D instanceData2;  // Widths
    sampler2D instanceData3;  // Time
    sampler2D instanceData4;  // Radians


};
uniform Material material;

uniform int numSegments;
uniform float samples;
uniform float limitT;
uniform float width;



vec3 getPositionOnCurveT(float t, int iID)
{
    int currentSegment = iID;
    ivec2 tc  = ivec2(currentSegment, 0.0);

    float t2 = t*t, t3 = t2*t;

    vec4  coefficientsX = texelFetch(material.instanceData0, tc * ivec2(3), 0);
    vec4  coefficientsY = texelFetch(material.instanceData0, tc * ivec2(3) + ivec2(1.0, 0.0), 0);
    vec4  coefficientsZ = texelFetch(material.instanceData0, tc * ivec2(3) + ivec2(2.0, 0.0), 0);

    vec3 point = vec3(coefficientsX.x +   coefficientsX.y*t + coefficientsX.z*t2 + coefficientsX.w*t3,
               coefficientsY.x +   coefficientsY.y*t + coefficientsY.z*t2 + coefficientsY.w*t3,
               coefficientsZ.x +   coefficientsZ.y*t + coefficientsZ.z*t2 + coefficientsZ.w*t3);

    return point ;
}


//MAIN
//**********************************************************************************************************************
void main() {
    // Model view position
    #if (!OUTLINE)

        int iID = gl_InstanceID; // segment
        int vID = gl_VertexID;
        int currentSegment = iID;

        //Getting positions
        vec3 curr;
        float currentS = VPos.x;

        ivec2 tc  = ivec2(currentSegment, 0.0);
        vec2 time = texelFetch(material.instanceData3, tc, 0).rg;
        float begT = time.x;
        float endT = time.y;

        float T_per_S = (endT - begT)/samples;

        float currentT = begT + (currentS * samples* T_per_S);

        if(currentT < limitT)
            curr = getPositionOnCurveT(VPos.x, iID);

        vec3 pre; 
        vec3 next;

        if (VPos.x == 0.0)
            pre = curr;
        else 
            pre = getPositionOnCurveT(VPos.x - 0.1, iID);


        if (VPos.x == 1.0)
            next = curr;
        else 
            next = getPositionOnCurveT(VPos.x + 0.1, iID);

        if(currentT >= limitT)
        {
            curr = getPositionOnCurveT(0.0, iID); 
            pre = curr;
            next = curr;
        }

        //position
        vec4 curr_viewspace = MVMat * vec4(curr, 1.0);
        vec4 prev_viewspace = MVMat * vec4(pre, 1.0);
        vec4 next_viewspace = MVMat * vec4(next, 1.0);

        //tangent
        vec4 AB_tangent_viewspace = next_viewspace - prev_viewspace;

        //normal
        vec3 normal_viewspace = normalize(cross(AB_tangent_viewspace.xyz, curr_viewspace.xyz));

        vec3 binormal = normalize(cross(AB_tangent_viewspace.xyz, curr_viewspace.xyz));
        vec3 normal = cross(binormal, AB_tangent_viewspace.xyz);

        vNormal = normal;
        vBinormal = binormal;

        float deltaOffset = 1.0f;
        if (vID % 2 != 0)
           deltaOffset = -1.0f;

        //Width 
        float widthT = texelFetch(material.instanceData2, ivec2(currentSegment / ((numSegments+1)/4), 0.0), 0).r;

        //delta
        vec3 directionToMove_viewpsace = normal_viewspace * deltaOffset;
        float distanceToMove_viewspace = (widthT) /2.0;

        vec4 delta_viewspace = vec4(directionToMove_viewpsace * distanceToMove_viewspace, 0.0);
        vec4 deltaVPos_viewspace = curr_viewspace + delta_viewspace;

        vec4 VPos4 = deltaVPos_viewspace;  
    #fi

    fragVPos = vec3(VPos4)/ VPos4.w;
    fragUV = uv;


    // Projected position
    gl_Position = PMat * VPos4;


        // Pass vertex color to fragment shader
        vec4 colorT = texelFetch(material.instanceData1, ivec2(currentSegment / ((numSegments+1)/4), 0.0), 0);
        fragVColor = colorT;

 }