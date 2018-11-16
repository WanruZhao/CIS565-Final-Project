#version 300 es

precision highp float;

uniform float u_Width;

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec4 vs_Col;
in vec2 vs_UV;

out vec2 blurTextureCoords[11];

void main() {
    gl_Position = vs_Pos;

    vec2 centerTexCoords = vs_Pos.xy * 0.5 + 0.5;

    float pixelSize = 1.0 / u_Width;

    for(int i = -5; i <= 5; i++){
      blurTextureCoords[i + 5] = centerTexCoords + vec2(pixelSize * float(i), 0.0);
    }
}
