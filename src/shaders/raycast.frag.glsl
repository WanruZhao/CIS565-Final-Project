#version 300 es
precision highp float;

uniform vec3 u_Camera;
uniform float u_Height;
uniform float u_Width;
uniform mat4 u_ViewInv;
uniform mat4 u_ProjInv;
uniform float u_Far;

in vec2 fs_UV;
out vec4 out_Col;

// cast ray for every pixel from eye position
void main()
{
    // convert pixel position from screen space to world space
    // calculate ray direction from camera position and pixel position
    vec4 NDC = vec4(0.0, 0.0, 1.0, 1.0);
    // lower left corner is (0, 0) for Frag_Coord
    NDC.x = (gl_FragCoord.x / u_Width) * 2.0 - 1.0;
    NDC.y = (gl_FragCoord.y / u_Height) * 2.0 - 1.0;

    vec4 worldPos = u_ViewInv * u_ProjInv * (NDC * u_Far);

    vec3 rayDir = normalize(worldPos.xyz - u_Camera);
    
    out_Col = vec4(rayDir, 1.0);
}