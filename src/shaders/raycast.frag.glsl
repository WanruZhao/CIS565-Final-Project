#version 300 es
precision highp float;

uniform vec3 u_Camera;
uniform float u_Height;
uniform float u_Width;
uniform mat4 u_ViewInv;
uniform mat4 u_ProjInv;
uniform float u_Far;

out vec4 out_Col;

// cast ray for every pixel from eye position
void main()
{
    // convert pixel position from screen space to world space
    // calculate ray direction from camera position and pixel position

    vec2 pixel = gl_FragCoord.xy;
    pixel.x = pixel.x / u_Width * 2.0 - 1.0;
    pixel.y = 1.0 - pixel.y / u_Height * 2.0;

    vec4 worldPos = u_ViewInv * u_ProjInv * (vec4(pixel, 1.0, 1.0) * u_Far);

    vec3 rayDir = normalize(worldPos.xyz - u_Camera);
    
    out_Col = vec4(rayDir, 1.0);
}