#version 300 es
precision mediump float;


//STRUCT
//**********************************************************************************************************************
#if (DLIGHTS)
struct DLight {
    //bool directional;
    vec3 position;
    vec3 color;
};
#fi
#if (PLIGHTS)
struct PLight {
    //bool directional;
    vec3 position;
    vec3 color;
    float distance;
    //float decay;

    float constant;
    float linear;
    float quadratic;
};
#fi

struct Material {
    vec3 emissive;
    vec3 diffuse;
    
    sampler2D instanceData0;  // functionCoefficients_XYZ
    sampler2D instanceData1;  // Colors
    sampler2D instanceData2;  // Widths
    sampler2D instanceData3;  // Time
    sampler2D instanceData4;  // Radians

};
//UIO
//**********************************************************************************************************************
uniform Material material;

#if (TRANSPARENT)
uniform float alpha;
#else
float alpha = 1.0;
#fi

#if (DLIGHTS)
uniform DLight dLights[##NUM_DLIGHTS];
#fi
#if (PLIGHTS)
uniform PLight pLights[##NUM_PLIGHTS];
#fi

in vec4 fragVColor;
in vec3 fragVPos;
in vec3 vNormal;
in vec3 vBinormal;
in vec3 vViewPosition;
in vec2 fragUV;

out vec4 color;

//FUNCTIONS
//**********************************************************************************************************************

#if (PLIGHTS)

    float calcAttenuation(float constant, float linear, float quadratic, float distance) {
        return 1.0 / (constant + linear * distance + quadratic * (distance * distance));
    }

    // Calculates the point light color contribution
    vec3 calcPointLight(PLight light) {

        float distance = length(light.position - fragVPos);
        if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

        // Attenuation
        float attenuation = calcAttenuation(light.constant, light.linear, light.quadratic, distance);

        // Combine results
        vec3 diffuse = light.color * material.diffuse * attenuation;

        return diffuse;
    }
#fi

//MAIN
//**********************************************************************************************************************
void main() {

    // Calculate combined light contribution
    vec3 combined = vec3(0.0);


    #if (DLIGHTS)
        #for lightIdx in 0 to NUM_DLIGHTS

            float R = texture(material.instanceData4, vec2(fragUV.y, 0.0)).r;
            vec3 normalTheta = vNormal * cos(R) + vBinormal * sin(R);

            // ambientLighting
            float ambientStrength = 0.6;
            vec3 ambient = ambientStrength * dLights[##lightIdx].color;

            // diffuseLighting
            vec3 norm = normalize(normalTheta);
            vec3 lightDir = normalize(dLights[##lightIdx].position - fragVPos);
            float diff = max(dot(norm, lightDir), 0.0);
            vec3 diffuse = diff * dLights[##lightIdx].color;

            // specularLighting
            float shininess = 32.0;
            float specularStrength = 0.9;
            vec3 viewDir = normalize(-fragVPos);
            vec3 reflectDir = reflect(-lightDir, norm);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
            vec3 specular = specularStrength * spec * dLights[##lightIdx].color;

            combined+= ambient + diffuse + specular;
        #end
    #fi

    #if (PLIGHTS)
        #for lightIdx in 0 to NUM_PLIGHTS
            combined += calcPointLight(pLights[##lightIdx]);
        #end
    #fi
 
    color = vec4(combined * fragVColor.rgb, alpha);   

}
