#version 300 es
precision highp float;

in vec4 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;
in vec2 fs_UV;

in vec3 fs_Nor_world_space;

out vec4 fragColor[3]; // The data in the ith index of this array of outputs
                       // is passed to the ith index of OpenGLRenderer's
                       // gbTargets array, which is an array of textures.
                       // This lets us output different types of data,
                       // such as albedo, normal, and position, as
                       // separate images from a single render pass.

uniform sampler2D tex_Color;


void main() {
    // TODO: pass proper data into gbuffers
    // Presently, the provided shader passes "nothing" to the first
    // two gbuffers and basic color to the third.

    vec3 col = texture(tex_Color, fs_UV).rgb;

    // if using textures, inverse gamma correct
    col = pow(col, vec3(2.2));

    // fragColor[0] : RGBA 32f buffer
    // world space normal.x | world space normal.y | world space normal.z | camera space depth(-near clip ~ -far clip)
    fragColor[0] = vec4(fs_Nor_world_space, fs_Pos.z); // fs_Pos is camera space position here
    
    // fragColor[1] : RGBA 8 bits buffer
    fragColor[1] = vec4(0.0);

    // fragColor[2] : RGBA 8 bits buffer
    // albedo.x | albedo.y | albedo.z | ...
    fragColor[2] = vec4(col, 1.0);
}
