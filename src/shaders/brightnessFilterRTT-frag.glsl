#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform float u_Time;


void main() {

    vec3 OriCol = vec3(texture(u_frame, fs_UV));

    float brightness = OriCol.r * 0.2126 + OriCol.g * 0.7152 + OriCol.b * 0.0722;

    OriCol = brightness * OriCol;

    //Render to FBO
    out_Col = vec4(OriCol, 1.0);
}
