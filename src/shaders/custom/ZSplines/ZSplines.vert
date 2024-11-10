#version 300 es
precision mediump float;


//UIO
//**********************************************************************************************************************

uniform mat4 MVMat; 
uniform mat4 VMat; 
uniform mat4 PMat;  // Projection Matrix
uniform mat3 NMat;  // Normal Matrix
in mat4 MMat;
in vec3 VPos;       // Vertex position
in vec2 uv;


out vec4 fragVColor;
out vec3 fragVPos;
out vec3 vNormal;
out vec3 vBinormal;
out vec2 fragUV;
out float qLength;
out float importance;

struct Material {
    vec3 emissive;
    vec3 diffuse;

    sampler2D instanceData0;  // functionCoefficients_XYZ
    sampler2D instanceData1;  // Testing Colors
    sampler2D instanceData2;  // Widths
    sampler2D instanceData3;  // Time
    sampler2D instanceData4;  // Radians
    sampler2D instanceData5;  // Energy
    sampler2D instanceData6;  // Pattern
    sampler2D instanceData7;  // Scene colors
    sampler2D instanceData8;  // importance

};
uniform Material material;
uniform bool manualOpacity;

#if (TRANSPARENT)
    uniform float alpha;
#else
    float alpha = 1.0;
#fi

uniform int numSegments;
uniform float samples;
uniform float limitT_min;
uniform float limitT_max;
uniform float limitE_min;
uniform float limitE_max;
uniform float width;
uniform bool colors;
uniform bool imp_check;
uniform float imp_id;



vec3 getPositionOnCurveT(float t, int iID)
{
    int currentSegment = iID;
    ivec2 tc  = ivec2(currentSegment%1350, currentSegment/1350);

    float t2 = t*t, t3 = t2*t;

    vec4  coefficientsX = texelFetch(material.instanceData0, tc * ivec2(3.0, 1.0), 0);
    vec4  coefficientsY = texelFetch(material.instanceData0, tc * ivec2(3.0, 1.0) + ivec2(1.0, 0.0), 0);
    vec4  coefficientsZ = texelFetch(material.instanceData0, tc * ivec2(3.0, 1.0) + ivec2(2.0, 0.0), 0);

    vec3 point = vec3(coefficientsX.x +   coefficientsX.y*t + coefficientsX.z*t2 + coefficientsX.w*t3,
               coefficientsY.x +   coefficientsY.y*t + coefficientsY.z*t2 + coefficientsY.w*t3,
               coefficientsZ.x +   coefficientsZ.y*t + coefficientsZ.z*t2 + coefficientsZ.w*t3);

    return point ;
}


//MAIN
//**********************************************************************************************************************
void main() {
    // Model view position
    vec2 uv_m = uv;
    int iID = gl_InstanceID; // segment
    int vID = gl_VertexID;
    int currentSegment = iID;

    


    #if (!OUTLINE)

        //Getting positions
        vec3 curr;
        float currentS = VPos.x;

        ivec2 tc  = ivec2(currentSegment, 0.0);
        vec2 time = texelFetch(material.instanceData3, ivec2(currentSegment%1350, currentSegment/1350), 0).rg;
        float begT = time.x;
        float endT = time.y;

        vec2 energy = texelFetch(material.instanceData5, ivec2(currentSegment%1350, currentSegment/1350), 0).rg;
        float begE = energy.x;
        float endE = energy.y;

        float T_per_S = (endT - begT)/samples;

        float currentT = begT + (currentS * samples* T_per_S);

        float E_per_S = (endE - begE)/samples;
        float currentE = begE + (currentS * samples* E_per_S);

        importance = texelFetch(material.instanceData8, ivec2(currentSegment, 0.0), 0).r;

        if((currentT >= limitT_min && currentT <= limitT_max)
        && (currentE >= limitE_min && currentE <= limitE_max))
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

        if((currentT > limitT_max || currentT < limitT_min)
        || (currentE > limitE_max || currentE < limitE_min))
        {
            curr = getPositionOnCurveT(0.0, iID); 
            pre = curr;
            next = curr;
        }

        //position
        vec4 curr_viewspace = MVMat * vec4(curr, 1.0);
        vec4 prev_viewspace = MVMat * vec4(pre, 1.0);
        vec4 next_viewspace = MVMat * vec4(next, 1.0);

        //distance
        vec3 end = getPositionOnCurveT(1.0, iID);
        float length = 0.0;
        
        length = sqrt(pow(curr.x - end.x, 2.0) + pow(curr.y - end.y, 2.0) + pow(curr.z - end.z, 2.0));

        qLength = length;

        //tangent
        vec4 AB_tangent_viewspace = next_viewspace - prev_viewspace;

        //normal
        vec3 normal_viewspace = normalize(cross(AB_tangent_viewspace.xyz, curr_viewspace.xyz));

        vec3 binormal = normalize(cross(AB_tangent_viewspace.xyz, curr_viewspace.xyz));
        vec3 normal = normalize(cross(binormal, AB_tangent_viewspace.xyz));

        vNormal = normal;
        vBinormal = binormal;

        float deltaOffset = 1.0f;
        if (vID % 2 != 0)
           deltaOffset = -1.0f;

        //Width 
        float widthT = texelFetch(material.instanceData2, ivec2(currentSegment / ((numSegments+1)/4), 0.0), 0).r;

        //delta
        vec3 directionToMove_viewpsace = normal_viewspace * deltaOffset;
        float distanceToMove_viewspace = (width) /2.0;

        vec4 delta_viewspace = vec4(directionToMove_viewpsace * distanceToMove_viewspace, 0.0);
        vec4 deltaVPos_viewspace = curr_viewspace + delta_viewspace;

        vec4 VPos4 = deltaVPos_viewspace;  
    #fi

    //fragVPos = VPos4.xyz / VPos4.w;
        
    fragUV = uv_m;


    // Projected position
    gl_Position = PMat * VPos4;

    fragVPos = vec3(VPos4) / VPos4.w;

 

        // Pass vertex color to fragment shader
        
        vec4 color = vec4(0.0);
        if(colors)
            color = texture(material.instanceData7, vec2(begE, 0.0));
        else 
            color = texelFetch(material.instanceData1, ivec2(currentSegment%1350, currentSegment/1350), 0);

        #if (TRANSPARENT)
        {
            if(manualOpacity)
                fragVColor = vec4(color.rgb, alpha);
            else
                fragVColor = vec4(color.rgb, begE);
        }
        #else
        if(imp_check)
        {
            if(imp_id == 0.0)
                fragVColor = vec4(vec3(1.0,0.0,0.0), alpha);
            else if(imp_id == 1.0)
                fragVColor = vec4(vec3(0.0,1.0,0.0), alpha);
            else if(imp_id == 2.0)
                fragVColor = vec4(vec3(0.0,0.0,1.0), alpha);
            else
                fragVColor = vec4(vec3(0.5,1.0,1.0), alpha);
        }
        else 
        {
            fragVColor = vec4(color.rgb, alpha);
        }
            
        #fi



 }