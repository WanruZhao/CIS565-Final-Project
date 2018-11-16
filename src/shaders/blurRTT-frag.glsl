#version 300 es

precision highp float;

uniform sampler2D u_frame;

in vec2 blurTextureCoords[11];
out vec4 out_Col;


void main() {

    vec3 fragColor = vec3(0.0);

    fragColor += texture(u_frame, blurTextureCoords[0]).rgb * 0.0093;
    fragColor += texture(u_frame, blurTextureCoords[1]).rgb * 0.028002;
    fragColor += texture(u_frame, blurTextureCoords[2]).rgb * 0.065984;
    fragColor += texture(u_frame, blurTextureCoords[3]).rgb * 0.121703;
    fragColor += texture(u_frame, blurTextureCoords[4]).rgb * 0.175713;
    fragColor += texture(u_frame, blurTextureCoords[5]).rgb * 0.198596;
    fragColor += texture(u_frame, blurTextureCoords[6]).rgb * 0.175713;
    fragColor += texture(u_frame, blurTextureCoords[7]).rgb * 0.121703;
    fragColor += texture(u_frame, blurTextureCoords[8]).rgb * 0.065984;
    fragColor += texture(u_frame, blurTextureCoords[9]).rgb * 0.028002;
    fragColor += texture(u_frame, blurTextureCoords[10]).rgb * 0.0093;


    //Render to FBO
    out_Col = vec4(fragColor, 1.0);
}
