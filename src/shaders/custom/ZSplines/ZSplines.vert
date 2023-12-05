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

#if (COLORS)
    in vec4 VColor;
    out vec4 fragVColor;
#fi

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

    sampler2D instanceData0;  // functionCoefficients_X
    sampler2D instanceData1;  // functionCoefficients_Y
    sampler2D instanceData2;  // functionCoefficients_Z
};
uniform Material material;

uniform int numSegments;
uniform int numSubSegments;
uniform float width;


vec3 getPositionOnCurve(int iID)
{
    int vID = gl_VertexID % 2; // if 0 then left, 1 then right

    if((iID + vID) >= (numSegments * numSubSegments)- 1)
      vID = 0;

    int currentSegment = (iID + vID)  / numSubSegments;
    int currentSubSegment = (iID +vID) % numSubSegments;
    ivec2 tc  = ivec2(currentSegment, 0.0);

    float t = (1.0/ float(numSubSegments)) * float(currentSubSegment);
    float t2 = t*t, t3 = t2*t;

    vec4  coefficientsX = texelFetch(material.instanceData0, tc, 0);
    vec4  coefficientsY = texelFetch(material.instanceData1, tc, 0);
    vec4  coefficientsZ = texelFetch(material.instanceData2, tc, 0);

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
        
        //Getting positions
        vec3 curr = getPositionOnCurve(iID);
        vec3 pre; 
        vec3 next;

        if(iID == 0)
            pre = curr;
        else
            pre = getPositionOnCurve(iID - 1);

        if(iID == ( (numSegments * numSubSegments)- 1))
            next = curr;
        else
            next = getPositionOnCurve(iID + 1);


        //position
        vec4 curr_viewspace = MVMat * vec4(curr, 1.0);
        vec4 prev_viewspace = MVMat * vec4(pre, 1.0);
        vec4 next_viewspace = MVMat * vec4(next, 1.0);

        //tangent
        vec4 AB_tangent_viewspace = next_viewspace - prev_viewspace;

        //normal
        vec3 normal_viewspace = normalize(cross(AB_tangent_viewspace.xyz, curr_viewspace.xyz));

        float deltaOffset = 1.0f;
        if (vID == 2 || vID == 3)
           deltaOffset = -1.0f;

        //delta
        vec3 directionToMove_viewpsace = normal_viewspace * deltaOffset;
        float distanceToMove_viewspace = width/2.0;

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

    #if (COLORS)
        // Pass vertex color to fragment shader
        fragVColor = VColor;
    #fi

    #if (CLIPPING_PLANES)
        vViewPosition = -VPos4.xyz;
    #fi
 }