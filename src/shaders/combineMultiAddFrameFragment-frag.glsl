#version 300 es
precision highp float;

uniform sampler2D u_frame;
uniform sampler2D u_frame1;

uniform sampler2D tex_Frame;

in vec2 fs_UV;
out vec4 out_Col;

void main() {
    vec3 framecolor = texture(tex_Frame, fs_UV).rgb;
    float alpha = texture(tex_Frame, fs_UV).a;

    vec3 color = texture(u_frame, fs_UV).rgb * texture(u_frame1, fs_UV).rgb;

    out_Col = vec4(color * (1.0 - alpha) + framecolor * alpha, 1.0);
}
