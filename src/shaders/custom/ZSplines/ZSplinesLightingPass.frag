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
    #if (TEXTURE)
        sampler2D texture0; //MODIFIABLE, VOLATILE! (POSITION TEXTURE)
        sampler2D texture1; //MODIFIABLE, VOLATILE! (NORMAL TEXTURE)
        sampler2D texture2; //MODIFIABLE, VOLATILE! (BINORMAL TEXTURE)
        sampler2D texture3; //MODIFIABLE, VOLATILE! (COLOR TEXTURE)
        sampler2D texture4; //MODIFIABLE, VOLATILE! (SSAO TEXTURE)


    #fi

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
 
#if (TEXTURE)
    in vec2 fragUV;
#fi

out vec4 color;


uniform bool light_ambient;
uniform bool light_diffuse;
uniform bool light_specular;
uniform bool ambientOcc;


//FUNCTIONS
//**********************************************************************************************************************

#if (PLIGHTS)

    float calcAttenuation(float constant, float linear, float quadratic, float distance) {
        return 1.0 / (constant + linear * distance + quadratic * (distance * distance));
    }

    // Calculates the point light color contribution
    vec3 calcPointLight(PLight light) {
        vec3 FragPos = texture(material.texture0, fragUV).rgb;

        float distance = length(light.position - FragPos);
        if(light.distance > 0.0 && distance > light.distance) return vec3(0.0, 0.0, 0.0);

        // Attenuation
        float attenuation = calcAttenuation(light.constant, light.linear, light.quadratic, distance);

        // Combine results
        vec3 diffuse = light.color  * attenuation;

        return diffuse;
    }
#fi

//MAIN
//**********************************************************************************************************************
void main() {

    // Calculate combined light contribution
    vec3 combined = vec3(0.0);

    // retrieve data from G-buffer
    vec3 FragPos = texture(material.texture0, fragUV).rgb;
    vec3 Normal = texture(material.texture1, fragUV).rgb;
    vec4 Color = texture(material.texture3, fragUV).rgba;
    float AmbientOcclusion = texture(material.texture4, fragUV).r;


    #if (DLIGHTS)
        #for lightIdx in 0 to NUM_DLIGHTS

            // ambientLighting
            float ambientStrength = 0.6;
            vec3 ambient = vec3(ambientStrength) * Color.rgb;
            if(ambientOcc)
                ambient = vec3(ambientStrength * AmbientOcclusion) * Color.rgb;


            // diffuseLighting
            vec3 norm = normalize(Normal);
            vec3 lightDir = normalize(dLights[##lightIdx].position - FragPos);
            float diff = max(dot(norm, lightDir), 0.0);
            vec3 diffuse =  diff * dLights[##lightIdx].color * Color.rgb;

            // specularLighting
            float shininess = 32.0;
            float specularStrength = 0.3;
            vec3 viewDir = normalize(-FragPos);
            vec3 reflectDir = reflect(-lightDir, norm);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
            vec3 specular = specularStrength * spec * dLights[##lightIdx].color;

            if(!light_ambient)
                ambient = vec3(0.0);
            if(!light_diffuse)
                diffuse = vec3(0.0);
            if(!light_specular)
                specular = vec3(0.0);
            
            combined+= ambient + diffuse + specular;
        #end
    #fi

    #if (PLIGHTS)
        #for lightIdx in 0 to 2
            combined += calcPointLight(pLights[##lightIdx]);
        #end
    #fi
 
    color = vec4(combined, Color.a); 

    if(ambientOcc && !light_ambient && !light_diffuse && !light_specular)
        color = vec4(AmbientOcclusion, AmbientOcclusion, AmbientOcclusion, Color.a);
  

}
