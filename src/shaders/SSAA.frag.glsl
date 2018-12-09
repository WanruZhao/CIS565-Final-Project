#version 300 es 
precision highp float;

uniform sampler2D u_frame;

uniform float u_Width;
uniform float u_Height;

in vec2 fs_UV;
out vec4 out_Col;

const float FXAA_SUBPIX_SHIFT = 0.0; //1.0/4.0;
const float FXAA_SPAN_MAX = 8.0;
const float FXAA_REDUCE_MUL = 0.0; //1.0/64.0;
const float FXAA_REDUCE_MIN = 0.0;//1.0/128.0;

// float gaussian(in float x, in float sigma)
// {
// 	return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
// }

// void main()
// {
//     const int samplehalfside = 11;
//     const int totalcount = 2 * samplehalfside + 1;

//     float sigma = 0.5;
//     float powersum = 0.0;
//     float kernel[totalcount];

//     for (int i = 0; i <= samplehalfside; ++i)
//     {
//         kernel[samplehalfside + i] = kernel[samplehalfside - i] = gaussian(float(i), sigma);
//     }

//     for (int i = 0; i < totalcount; ++i)
//     {
//         powersum += kernel[i];
//     }

//     float scalex = 1.0 / (u_Width );
//     float scaley = 1.0 / (u_Height);

//     vec3 color = vec3(0.0);
//     for(int i = -samplehalfside; i <= samplehalfside; i++) {
//         for(int j = -samplehalfside; j <= samplehalfside; j++) {
//             vec2 offset = vec2(float(i) * scalex, float(j) * scaley);
//             color += kernel[samplehalfside + i] * kernel[samplehalfside + j] *
//                     texture(u_frame, (fs_UV + offset)).rgb;
//         }
//     }

//     color /= powersum;

//     out_Col = vec4(color, 1.0);
// }

// Reference: https://www.geeks3d.com/20110405/fxaa-fast-approximate-anti-aliasing-demo-glsl-opengl-test-radeon-geforce/3/
vec3 fxaaPixelShader(in vec2 fragCoord) 
{
    vec2 resolutionInv = vec2(1.0 / u_Width, 1.0 / u_Height);
    vec3 rgbNW = texture(u_frame, (fragCoord + vec2(-1.0, -1.0)) * resolutionInv).rgb;
    vec3 rgbNE = texture(u_frame, (fragCoord + vec2(1.0, -1.0)) * resolutionInv).rgb;
    vec3 rgbSW = texture(u_frame, (fragCoord + vec2(-1.0, 1.0)) * resolutionInv).rgb;
    vec3 rgbSE = texture(u_frame, (fragCoord + vec2(1.0, 1.0)) * resolutionInv).rgb;
    vec3 rgbM = texture(u_frame, fragCoord * resolutionInv).rgb;

    vec3 luma = vec3(0.299, 0.587, 0.114);
    float lumaNW = dot(rgbNW, luma);
    float lumaNE = dot(rgbNE, luma);
    float lumaSW = dot(rgbSW, luma);
    float lumaSE = dot(rgbSE, luma);
    float lumaM = dot(rgbM, luma);

    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = min(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y = -((lumaNW + lumaSW) - (lumaNE + lumaSE));

    float dirReduce = max(
        (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL),
        FXAA_REDUCE_MIN);

    float rcpDirMin = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);
    dir = min(vec2( FXAA_SPAN_MAX,  FXAA_SPAN_MAX), 
          max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), 
          dir * rcpDirMin)) * resolutionInv;

    vec3 rgbA = 0.5 * (
        texture(u_frame, fragCoord * resolutionInv + dir * (1.0/3.0 - 0.5)).xyz +
        texture(u_frame, fragCoord * resolutionInv + dir * (2.0/3.0 - 0.5)).xyz);
    vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture(u_frame, fragCoord * resolutionInv - dir * 0.5).xyz +
        texture(u_frame, fragCoord * resolutionInv + dir * 0.5).xyz);

    float lumaB = dot(rgbB, luma);
    if((lumaB < lumaMin) || (lumaB > lumaMax)) return rgbA;
    else return rgbB;
}

void main()
{
    vec2 uv = gl_FragCoord.xy / vec2(u_Width, u_Height);
    //uv.y = 1.0 - uv.y;
    vec2 fragCoord = uv * vec2(u_Width, u_Height);
    out_Col = vec4(fxaaPixelShader(fragCoord), 1.0);
    out_Col = texture(u_frame, uv);
}