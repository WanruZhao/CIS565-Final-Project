#version 300 es
precision highp float;

uniform sampler2D u_Material;
uniform sampler2D u_Albedo;
uniform sampler2D u_Reflection;
uniform sampler2D u_Refraction;

in vec2 fs_UV;
out vec4 out_Col;

void main() {
    vec3 albedo = texture(u_Albedo, fs_UV).rgb;
    vec3 reflection = texture(u_Reflection, fs_UV).rgb;
    vec3 refraction = texture(u_Refraction, fs_UV).rgb;  
    
    vec4 material = texture(u_Material, fs_UV);
    float specularProp = material[0];
    float diffuseProp = material[1];
    float refractionProp = material[2];
    float emittance = material[3];

    if (emittance > 0.0) {
        out_Col = vec4(albedo, 1.0);
        return;
    }

    vec3 color;
    color = reflection * specularProp + albedo * diffuseProp + refraction * refractionProp;
    out_Col = vec4(color, 1.0);

}


