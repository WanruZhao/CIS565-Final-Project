#version 300 es
precision highp float;

uniform sampler2D u_frame;
uniform sampler2D u_frame1;

uniform float u_OriginalSceneWeight;
uniform float u_HighLightWeight;

in vec2 fs_UV;
out vec4 out_Col;


void main() {
    vec3 fragColor = vec3(0.0);

    vec3 sceneColor     = texture(u_frame1, fs_UV).rgb;
    vec3 highlightColor = texture(u_frame, fs_UV).rgb;

    out_Col = vec4(u_OriginalSceneWeight * sceneColor + u_HighLightWeight * highlightColor, 1.0);
}
