#version 300 es
precision mediump float;


//UIO
//**********************************************************************************************************************

uniform mat4 MVMat; 
uniform mat4 PMat;  // Projection Matrix
in mat4 MMat;
in vec3 VPos;       // Vertex position

#if (OUTLINE)
    in vec3 VNorm;      // Vertex normal
    uniform float offset;
#fi


out vec4 fragVColor;


#if (PLIGHTS || SLIGHTS)
    out vec3 fragVPos;
#fi

#if (POINTS)
    uniform float pointSize;
#fi

#if (CLIPPING_PLANES)
    out vec3 vViewPosition;
#fi

struct Material {
    vec3 emissive;
    vec3 diffuse;

    sampler2D instanceData0;  // functionCoefficients_XYZ
    sampler2D instanceData1;  // Colors
    sampler2D instanceData2;  // Widths



};
uniform Material material;

uniform int numSegments;
uniform int numSubSegments;
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

        int iID = gl_InstanceID;
        int vID = gl_VertexID;
        int currentSegment = iID;

        //Getting positions
        vec3 curr = getPositionOnCurveT(VPos.x, iID);
        vec3 pre; 
        vec3 next;

        if (iID == 0 && VPos.x == 0.0)
            pre = curr;
        else if (iID != 0 && VPos.x == 0.0)
            pre = getPositionOnCurveT(0.9, iID  - 1);
        else 
            pre = getPositionOnCurveT(VPos.x - 0.1, iID);


        if (iID == numSegments && VPos.x == 1.0)
            next = curr;
        else if (iID != numSegments && VPos.x == 1.0)
            next = getPositionOnCurveT(0.1, iID + 1);
        else 
            next = getPositionOnCurveT(VPos.x + 0.1, iID);


        //position
        vec4 curr_viewspace = MVMat * vec4(curr, 1.0);
        vec4 prev_viewspace = MVMat * vec4(pre, 1.0);
        vec4 next_viewspace = MVMat * vec4(next, 1.0);

        //tangent
        vec4 AB_tangent_viewspace = next_viewspace - prev_viewspace;

        //normal
        vec3 normal_viewspace = normalize(cross(AB_tangent_viewspace.xyz, curr_viewspace.xyz));

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

    #if (OUTLINE)

        vec4 VPos4 = MVMat * MMat * vec4(VPos + VNorm * offset, 1.0);

    #fi

    // Projected position
    gl_Position = PMat * VPos4;

    #if (PLIGHTS || SLIGHTS)
        // Pass vertex position to fragment shader
        fragVPos = vec3(VPos4) / VPos4.w;
    #fi


        // Pass vertex color to fragment shader
        vec4 colorT = texelFetch(material.instanceData1, ivec2(currentSegment / ((numSegments+1)/4), 0.0), 0);
        fragVColor = colorT;


    #if (CLIPPING_PLANES)
        vViewPosition = -VPos4.xyz;
    #fi
 }