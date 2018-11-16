#version 300 es
precision highp float;

in vec2 fs_UV;
out vec4 out_Col;

uniform sampler2D u_frame;
uniform sampler2D tex_digitalRainFont;

uniform float u_Width;
uniform float u_Height;
uniform float u_Time;
uniform float u_FallSpeed;

const float caracterSize = 8.0;
const float fontx = 10.0;
const float fonty = 925.0;

// Transform color to luminance.
float getLuminance(vec3 color)
{
    return clamp(dot(color, vec3(0.2126, 0.7152, 0.0722)), 0., 1.);
}

void main() {

    float screenx = u_Width;
    float screeny = u_Height;
    float ratio = screeny / fonty;

	float cosTimeZeroOne = 0.1 * u_Time * u_FallSpeed;

    float columnx = float(floor((gl_FragCoord.x) / caracterSize));
    float tileX = float(floor((gl_FragCoord.x) / caracterSize)) * caracterSize / screenx;
    float tileY = float(floor((gl_FragCoord.y) / caracterSize)) * caracterSize / screeny;

    vec2 tileUV = vec2(tileX, tileY);
    vec4 tileColor = texture(u_frame, tileUV);
    // vec4 baseColor = texture(u_frame, fs_UV);

    float tileLuminance = getLuminance(tileColor.rgb);
    
    int st = int(mod(columnx, 4.0));
    float speed = cosTimeZeroOne * (sin(tileX * 314.5) * 0.5 + 0.6); 
    float x = float(mod(gl_FragCoord.x, caracterSize)) / fontx;
    float y = float(mod(speed + gl_FragCoord.y / screeny, 1.0));
    y *= ratio;

    vec4 finalColor =  texture(tex_digitalRainFont, vec2(x, 1.0 - y));
    vec3 high = finalColor.rgb * (vec3(1.2,1.2,1.2) * pow(1.0 - y, 30.0));

    finalColor.rgb *= vec3(pow(tileLuminance, 5.0), pow(tileLuminance, 1.5), pow(tileLuminance, 3.0));
    finalColor.rgb += high;
    finalColor.rgb = clamp(finalColor.rgb, 0., 1.);
    finalColor.a = 1.0;

    // finalColor =  mix(finalColor, tileColor, digitalRainOptions.w);
    // finalColor =  mix(finalColor, baseColor, digitalRainOptions.z);

    out_Col = finalColor;
}
