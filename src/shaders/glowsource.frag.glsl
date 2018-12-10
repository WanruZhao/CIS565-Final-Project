#version 300 es
precision highp float;

uniform sampler2D u_frame;
uniform float u_Threshold;

in vec2 fs_UV;
out vec4 out_Col;

void main()
{
    vec3 color = texture(u_frame, fs_UV).rgb;
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    if(luminance > u_Threshold) { 
        out_Col = vec4(color, 1.0);
    } else {
        out_Col = vec4(vec3(0.0), 1.0);
    }
}